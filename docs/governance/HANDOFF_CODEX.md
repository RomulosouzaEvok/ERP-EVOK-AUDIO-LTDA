# Handoff Codex — Migração Product/Item

> ## ⚠️ REGISTRO APPEND-ONLY — cada seção é datada
>
> Este arquivo é um **log de handoffs empilhados**: cada seção descreve o que
> foi entregue numa data e o que se sabia naquele dia. Seções antigas citam
> migrations como "não aplicadas" e arquivos que depois foram renomeados —
> **isso é o registro funcionando**, não defeito. Nada aqui é reescrito
> retroativamente; entradas novas vão ao fim.
>
> Para o estado atual do projeto: `CLAUDE.md`. Para pendências vivas:
> `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md`.
>
> *Banner adicionado em 2026-08-12, junto com a ampliação das guardas
> documentais (`server/tests/helpers/docsGuardConventions.ts`). O documento
> declara-se registro datado: as guardas param de auditar suas afirmações de
> estado, e o leitor é avisado antes de agir sobre elas.*

Documento de handoff entre desenvolvimento (Backend Engineer) e QA/auditoria (Codex agent).

> ## ⚠️ Estado do banco em 2026-08-10 — leia antes de qualquer entrada abaixo
>
> As **160** migrations estão **aplicadas nos dois bancos** (`erp_evok_audio` e
> `erp_evok_audio_test`), commit `e2a8d7e`, e os dois foram medidos como
> **idênticos** — coluna, tipo, default, índice e constraint
> (`node server/scripts/comparar-bancos.cjs`).
>
> **Toda entrada abaixo que diz "migration NÃO aplicada" e é anterior a
> 2026-08-10 está superada.** Não foram reescritas uma a uma: este arquivo é
> registro cronológico de handoff, e reescrever o passado apagaria o histórico.
> Este bloco é a fonte de verdade sobre o estado atual.
>
> O baseline (`server/migrations/20260731-000001-baseline-schema.cjs`) deixou
> de gerar schema a partir dos models compilados e passou a aplicar DDL
> congelado (`server/database/postgresql/00_baseline_frozen.sql`). Ver a
> última seção deste arquivo e `docs/database/DATABASE.md`.

---

## Fase 1 — Fundação de Schema (Concluída)

**Data**: 2026-07-30  
**Escopo**: Criar modelos Sequelize e tabelas SQL para extensões do modelo canônico `Item`.  
**Status**: ✅ Concluído

### Decisão arquitetural
Implementado o padrão **Item (core, intocado) + extensões por domínio**:
- `Item` mantém 12 colunas (hot path do MRP), nunca muda
- `item_categorias` (novo) — categorias para itens (UUID PK, código único, descrição)
- `item_detalhes_comerciais` (novo, 1:1 obrigatória com `Item`) — preço, NCM/CEST, peso, localização, número de desenho, revisão, lote, série
- `item_especificacoes_tecnicas` (novo, 1:1 opcional com `Item`) — `familia_tecnica` (discriminador: ALTO_FALANTE, CABO, AMPLIFICADOR, etc) + `atributos` JSONB (flexível por família)

Esta separação evita:
- Inchar `Item` com campos comerciais/técnicos que MRP nunca usa
- Criar uma tabela genérica de detalhe que muda a cada nova linha de produto
- Necessidade de `ALTER TABLE` ao lançar novos tipos de produto

### Arquivos modificados

#### Criados
- `server/src/models/ItemCategoria.ts` — Model Sequelize com UUID PK, `codigo` unique, `descricao`, timestamps
- `server/src/models/ItemDetalheComercial.ts` — Model Sequelize com FK `item_id` (PK), `preco_venda`, `categoria_id`, NCM/CEST, peso, localização, desenho, revisão, lote/série, timestamps
- `server/src/models/ItemEspecificacaoTecnica.ts` — Model Sequelize com FK `item_id` (PK), `familia_tecnica` VARCHAR(40), `atributos` JSONB com índice GIN, timestamps
- `docs/governance/HANDOFF_CODEX.md` — Este arquivo

#### Modificados
- `server/src/models/index.ts` — Adicionados imports e associações 1:1 de `Item` com `ItemDetalheComercial` e `ItemEspecificacaoTecnica`, `ItemCategoria` com `ItemDetalheComercial`
- `server/database/postgresql/01_schema.sql` — Adicionadas 3 tabelas SQL com índices: `item_categorias`, `item_detalhes_comerciais`, `item_especificacoes_tecnicas`

### Invariantes mantidas
- ✅ `Item.ts` permanece intocado (compatibilidade com MRP)
- ✅ Sem FK constraints diretas em `Item` (apenas comentários em PKs de FK das novas tabelas)
- ✅ DECIMAL(18,6) para quantidades/custos (conforme padrão do projeto)
- ✅ JSONB para `atributos` com índice GIN (facilita busca e evolução de specs por família)
- ✅ Padrão Sequelize: `underscored: true`, `createdAt: 'criado_em'`, `updatedAt: 'atualizado_em'`

### Testes críticos para Codex validar

1. **Sincronização de schema**: verificar que as 3 tabelas SQL (`item_categorias`, `item_detalhes_comerciais`, `item_especificacoes_tecnicas`) existem no banco com coluna/tipo/índice corretos
   ```sql
   \d+ item_categorias
   \d+ item_detalhes_comerciais
   \d+ item_especificacoes_tecnicas
   ```

2. **Modelos Sequelize**: verificar que os 3 modelos carregam sem erro e que `sequelize.sync()` (com env var `DB_FORCE_SYNC=true`, `DB_ALLOW_UNSAFE_ALTER=true`) não altera nada (já está sincronizado)
   ```bash
   npm test server -- --testPathPattern="models|sequelize" --verbose
   ```

3. **Associações**: verificar que:
   - `Item.hasOne(ItemDetalheComercial)` funciona: `item.getDetalheComercial()`
   - `Item.hasOne(ItemEspecificacaoTecnica)` funciona: `item.getEspecificacaoTecnica()`
   - `ItemCategoria.hasMany(ItemDetalheComercial)` funciona: `categoria.getItensDetalhe()`

4. **FK integrity**: inserir um `Item`, depois `ItemDetalheComercial` associado; verificar que dropar o `Item` em cascata remove o detalhe também (ON DELETE CASCADE)

5. **Índices**: confirmar que as queries abaixo usam índices (EXPLAIN ANALYZE):
   ```sql
   SELECT * FROM item_categorias WHERE codigo = '...';
   SELECT * FROM item_detalhes_comerciais WHERE categoria_id = '...' OR ncm = '...';
   SELECT * FROM item_especificacoes_tecnicas WHERE familia_tecnica = 'ALTO_FALANTE';
   ```

6. **JSONB GIN index**: testar busca em atributos JSONB
   ```sql
   SELECT * FROM item_especificacoes_tecnicas 
   WHERE atributos @> '{"fs": 40.5}'::jsonb;
   ```

---

## Fase 2A — Extensão de ItemEstrutura (Concluída)

**Data**: 2026-07-30  
**Escopo**: Adicionar 9 novos campos a ItemEstrutura para suportar workflow, custo e hierarquia de BOM.  
**Status**: ✅ Concluído

### Arquivos modificados

#### Criados
- `server/database/postgresql/02a_extend_item_estruturas.sql` — ALTER TABLE com 9 novos campos, 7 índices, 2 tabelas de suporte
- Tabelas temporárias: `migracao_product_item_map` (crosswalk Product→Item), `migracao_bom_log` (auditoria BOM)

#### Modificados
- `server/src/models/ItemEstrutura.ts` — Adicionadas 9 novos campos com tipos e defaults:
  - `status` ENUM (draft/active/inactive/superseded) — mapeado de BOM.status
  - `approved_by` UUID | null — FK para User (aprovador)
  - `approval_date` DATE | null
  - `unit_cost` DECIMAL(18,6) — cache do custo unitário
  - `total_cost` DECIMAL(18,6) — cache com scrap: qty × unit_cost × (1 + scrap%)
  - `parent_item_estrutura_id` UUID | null — self-ref para hierarquia (sub-BOMs)
  - `component_type` ENUM (raw_material/component/semi_finished/packaging/consumable/other)
  - `is_critical` BOOLEAN
  - `alternative_product_id` UUID | null — FK para Item alternativo
- `server/src/models/index.ts` — Adicionadas 3 associações:
  - `User.hasMany(ItemEstrutura, { foreignKey: 'approved_by', as: 'estruturas_aprovadas' })`
  - `ItemEstrutura.belongsTo(User, { foreignKey: 'approved_by', as: 'aprovadorPor' })`
  - `ItemEstrutura.hasMany(ItemEstrutura, { foreignKey: 'parent_item_estrutura_id', as: 'sub_estruturas' })`
  - `ItemEstrutura.belongsTo(ItemEstrutura, { foreignKey: 'parent_item_estrutura_id', as: 'estruturaPai', onDelete: 'SET NULL' })`
  - `Item.hasMany(ItemEstrutura, { foreignKey: 'alternative_product_id', as: 'estruturas_alternativas' })`
  - `ItemEstrutura.belongsTo(Item, { foreignKey: 'alternative_product_id', as: 'itemAlternativo' })`

### Testes críticos para Codex validar

1. **Schema**: verificar que `item_estruturas` tem 9 novos campos com tipos/defaults corretos
   ```sql
   \d+ item_estruturas
   ```

2. **Índices**: confirmar que os 7 novos índices existem
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'item_estruturas' ORDER BY indexname;
   ```

3. **Tabelas de suporte**: validar `migracao_product_item_map` e `migracao_bom_log`
   ```sql
   \d+ migracao_product_item_map
   \d+ migracao_bom_log
   ```

4. **Sequelize sync**: verificar que `ItemEstrutura.sync({ force: false, alter: false })` não altera nada
   ```bash
   DB_FORCE_SYNC=false npm test -- --testPathPattern="sequelize"
   ```

5. **Associações**: testar que as 3 novas associações carregam corretamente
   ```bash
   npm test -- --testPathPattern="associations"
   ```

---

## Fase 2B — Backfill Product → Item (Scripts Criados)

**Data**: 2026-07-30  
**Escopo**: Criar scripts transacionais para migração de dados Product → Item + extensões.  
**Status**: ✅ Scripts concluídos (execução pendente em ambiente de teste)

### Arquivos criados

#### Scripts de backfill
- `server/src/scripts/backfill/02b_product_to_item.ts` — Migração de Product → Item (+ ItemDetalheComercial + ItemEspecificacaoTecnica)
  - Processa em **lotes de 100 produtos** (cada lote = transação isolada)
  - Mapeamento de campos:
    - `Product.code` → `Item.codigo`
    - `Product.name` → `Item.descricao`
    - `Product.product_type` → `Item.tipo` (finished→PRODUTO_ACABADO, semi_finished→SUBCONJUNTO, component/raw_material→MATERIA_PRIMA)
    - `Product.quantity` → `Item.estoque_atual`
    - `Product.reserved_quantity` → `Item.estoque_reservado`
    - `Product.min_quantity` → `Item.estoque_seguranca` + `lote_minimo`
    - `Product.cost_price` → `Item.custo_padrao`
    - `Product.lead_time` → `Item.lead_time_dias`
    - `Product.status` → `Item.status` (active→ATIVO, inactive→INATIVO)
    - `Product.unit` → `Item.unidade` (default 'un')
  - Para cada Product:
    1. Cria Item (UUID)
    2. Cria ItemDetalheComercial 1:1 (obrigatório):
       - `Product.price` → `preco_venda`
       - `Product.ncm/cest` → `ncm/cest`
       - `Product.weight` → `peso_kg`
       - `Product.location` → `localizacao_estoque`
       - `Product.drawing_number/revision` → `numero_desenho/revisao_tecnica`
       - `Product.lot_number/serial_number` → `lote_rastreabilidade/numero_serie`
    3. Se houver Thiele-Small preenchido (qualquer um dos 13 ts_params_* não NULL):
       - Cria ItemEspecificacaoTecnica (1:1 opcional)
       - `familia_tecnica = 'ALTO_FALANTE'`
       - `atributos` = JSON com 13 campos: fs, qms, qes, qts, vas, sd, xmax, re, le, bl, mms, cms, spl
    4. Registra na `migracao_product_item_map` com status SUCESSO/ERRO
  - **Rollback automático** por lote em caso de falha
  - CLI: `npm run backfill -- 02b [--start 0] [--limit 1000]`

- `server/src/scripts/backfill/02b-bis_category_to_item_categoria.ts` — Migração de categorias
  - Transação **all-or-nothing** (sem lotes)
  - Migra `product_categories` → `item_categorias`
  - Gera código único por categoria (format: `CAT-{id}-{nome}`)
  - Cria `migracao_categoria_map` (crosswalk para referência futura)
  - CLI: `npm run backfill -- 02b-bis`

### Verificação pré-backfill

- Verificar que `migracao_product_item_map` está vazia (ou pronta para re-execução)
- Verificar que `products` tem dados consistentes (sem NULLs em campos obrigatórios)
- Fazer snapshot/backup do banco antes de executar

### Testes críticos para Codex validar (pós-execução)

1. **Contagem**: `count(Product) == count(Item)`
   ```sql
   SELECT COUNT(*) FROM products;
   SELECT COUNT(*) FROM items;
   SELECT COUNT(*) FROM migracao_product_item_map WHERE status = 'SUCESSO';
   ```

2. **ItemDetalheComercial**: todos os Items têm exatamente 1 detalhe comercial
   ```sql
   SELECT COUNT(*) FROM items WHERE id NOT IN (SELECT item_id FROM item_detalhes_comerciais);
   ```

3. **ItemEspecificacaoTecnica**: apenas alto-falantes têm especificação técnica
   ```sql
   SELECT COUNT(*) FROM item_especificacoes_tecnicas WHERE familia_tecnica = 'ALTO_FALANTE';
   ```

4. **Thiele-Small**: integridade de JSON em `atributos`
   ```sql
   SELECT atributos FROM item_especificacoes_tecnicas LIMIT 5;
   ```

5. **Somas**: quantidade e custo coincidem
   ```sql
   SELECT
     SUM(quantity) as total_qty_products,
     SUM(estoque_atual::numeric) as total_qty_items
   FROM (
     SELECT quantity FROM products
     UNION ALL
     SELECT estoque_atual::numeric FROM items
   ) AS t;
   ```

---

## Fase 2C — Backfill BOM → ItemEstrutura (Script Criado)

**Data**: 2026-07-30  
**Escopo**: Script de migração BOM → ItemEstrutura com hierarquia e auditoria.  
**Status**: ✅ Script concluído (execução pendente em ambiente de teste)

### Arquivos criados

#### Script de backfill
- `server/src/scripts/backfill/02c_bom_to_item_estrutura.ts` — Migração de BOM → ItemEstrutura
  - Processa **por BOM** (tudo ou nada, sem lotes)
  - Para cada BOM:
    1. Busca Item pai via crosswalk `migracao_product_item_map`
    2. Se não encontrado: falha com erro rastreável
    3. Para cada BOMItem (ordenado por bom_level, sequence_order):
       - Busca Item componente via crosswalk
       - Se não encontrado: registra SKIP (não falha BOM inteira)
       - Resolve `parent_item_estrutura_id` se houver `parent_item_id`
       - Calcula `total_cost = qty × unit_cost × (1 + scrap%/100)` com Decimal.js
       - Cria ItemEstrutura com mapeamento completo:
         - BOM.status → ItemEstrutura.status (draft/active/inactive/superseded)
         - BOM.approved_by → ItemEstrutura.approved_by (INT→UUID, TODO: implementar user mapping)
         - BOM.approval_date → ItemEstrutura.approval_date
         - BOM.revision → ItemEstrutura.revisao
         - BMI.quantity → ItemEstrutura.quantidade
         - BMI.scrap_percentage → ItemEstrutura.perda_percentual
         - BMI.component_type → ItemEstrutura.component_type (enum igual)
         - BMI.unit_cost → ItemEstrutura.unit_cost
         - BMI.total_cost → ItemEstrutura.total_cost (ou recalculado)
         - BMI.is_critical → ItemEstrutura.is_critical
         - BMI.sequence_order → ItemEstrutura.sequencia
         - BMI.bom_level → ItemEstrutura.nivel
         - BMI.notes → ItemEstrutura.observacoes
       - Registra na `migracao_bom_log` com status SUCESSO/SKIP
    4. Registra sucesso/erro de toda BOM (rollback automático se falhar)
  - **Rollback automático** por BOM em caso de erro
  - **Hierarquia multinível**: resolve parent_item_estrutura_id via ID mapping para sub-BOMs
  - CLI: `npm run backfill -- 02c [--start 0] [--limit 1000]`

### Verificação pré-backfill

- Executar Fase 2B antes (Product → Item)
- Verificar que `migracao_product_item_map` tem todos os produtos mapeados
- Verificar que `bill_of_materials` tem dados consistentes
- Fazer snapshot/backup do banco

### Testes críticos para Codex validar (pós-execução)

1. **Contagem**: `count(BOM) ~= count(ItemEstrutura com item_pai_id único)`
   ```sql
   SELECT COUNT(DISTINCT item_pai_id) FROM item_estruturas;
   SELECT COUNT(DISTINCT bill_of_material_id) FROM migracao_bom_log WHERE status = 'SUCESSO';
   ```

2. **Hierarquia**: sem ciclos (ciclos = profundidade > 50)
   ```sql
   -- Veja 02d_validation.sql, seção "VALIDAÇÃO DE HIERARQUIA"
   ```

3. **Cálculo de custo**: total_cost bate com qty × unit_cost × (1 + scrap%)
   ```sql
   SELECT
     SUM(quantidade::numeric * unit_cost::numeric * (1 + perda_percentual::numeric / 100)) as calc_total,
     SUM(total_cost::numeric) as stored_total,
     ABS(SUM(quantidade::numeric * unit_cost::numeric * (1 + perda_percentual::numeric / 100)) - SUM(total_cost::numeric)) as diff
   FROM item_estruturas
   WHERE total_cost > 0
   GROUP BY TRUE;
   ```

4. **Componentes sem mapeamento**: validar SKIPs (não devem bloquear BOM)
   ```sql
   SELECT COUNT(*) as skipped FROM migracao_bom_log WHERE status = 'SKIP';
   ```

---

## Fase 2D — Validação Pós-Backfill (Script SQL Criado)

**Data**: 2026-07-30  
**Escopo**: Queries SQL para validação de integridade pós-migração.  
**Status**: ✅ Script concluído (execução pendente em ambiente de teste)

### Arquivo criado

- `server/src/scripts/backfill/02d_validation.sql` — 8 blocos de validação (read-only)
  1. **Contagem Product → Item**: total, migrados, falhados, órfãos
  2. **Contagem BOM → ItemEstrutura**: total, sucesso, falhado, estruturas criadas
  3. **Somas**: quantidade e custo por amostragem (produto com maior BOM)
  4. **NULLs**: detecção de campos NULL inesperados (Item, ItemDetalheComercial, ItemEstrutura)
  5. **Órfãos**: referências FK quebradas (item_pai_id, item_componente_id inexistentes)
  6. **Ciclos**: detecção de ciclos em hierarquia via parent_item_estrutura_id
  7. **Distribuição**: comparação de component_type (legado vs novo)
  8. **Resumo executivo**: status de Fase 2B e 2C

### Uso

```bash
# Executar validações
psql -U postgres -d erp_evok -f server/src/scripts/backfill/02d_validation.sql | tee validation_results.log
```

### Critérios de sucesso

- ✅ count(Product) == count(Item) com status='SUCESSO'
- ✅ count(BOM) == count(ItemEstrutura com item_pai_id único) com status='SUCESSO'
- ✅ Nenhum órfão em FK (item_pai_id, item_componente_id)
- ✅ Nenhum ciclo em hierarquia (profundidade < 50)
- ✅ Somas de quantidade/custo batem com aceitação de ±5% (rounding)
- ✅ Distribuição de component_type é razoável (não há outliers óbvios)

---

## Próximas fases (não iniciadas)
- **Fase 2E**: Backfill de categoria_id em ItemDetalheComercial (via migracao_categoria_map)
- **Fase 3**: Workflow de versão em `ItemEstrutura` (decisão: cabeçalho vs tabela de revisão)
- **Fase 4**: Reescrita de FKs em 16 tabelas (expand-contract)
- **Fase 5**: Migração de módulos de aplicação
- **Fase 6**: Descomissionamento de `Product`/`BillOfMaterial`

### Notas para implementação futura
- `ItemEspecificacaoTecnica.atributos` será validado por schema Zod específico por `familia_tecnica` (ex: `ThieleSmallAtributosSchema` para ALTO_FALANTE)
- Campos de `ItemDetalheComercial` devem ser obrigatórios em qualquer `CREATE Item` ou `UPDATE Item` que tenha um detalhe comercial associado (regra de negócio: todo item vendável tem preço, NCM, peso)
- `item_categorias` substitui parcialmente `Category` (modelo legado); backfill deve mapear `product_categories.id` → novo `item_categorias.id` mantendo códigos/descrições

---

## Fase 4.1 — Expand-Contract: inventory_movements (Concluída)

**Data**: 2026-07-30  
**Escopo**: Adicionar coluna `item_id UUID` em paralelo ao `product_id` INTEGER, com backfill via crosswalk e dual-read no código.  
**Status**: ✅ Concluído (4.1a + 4.1b + 4.1c + 4.1d)

### Padrão expand-contract para Fase 4

Fase 4 migra 15 tabelas com `product_id INTEGER` para suportar `item_id UUID` em paralelo. `inventory_movements` é a primeira:

1. **4.1a** (SQL): `ALTER TABLE inventory_movements ADD COLUMN item_id UUID` + 3 índices
2. **4.1b** (TypeScript backfill): mapear `product_id` → `item_id` via `migracao_product_item_map`, transacional por lote (5.000 registros)
3. **4.1c** (SQL validation): 5 blocos de integridade (cobertura, FK, dual-consistency, somas, distribuição)
4. **4.1d** (TypeScript dual-read): repositório aceita `product_id` OU `item_id`, preferindo `item_id`

### Resultado da execução

**Dados de teste**: 15 linhas de `inventory_movements` (3 produtos, tipos `in`/`out`/`adjustment`, referências variadas)

**Backfill**: 15/15 preenchidas com sucesso (100%)

**Validação (04c_validation.sql)**:
- ✅ BLOCO 1: Cobertura = 100% (`PASS`)
- ✅ BLOCO 2: FK Integrity = 0 orphãos (`PASS`)
- ✅ BLOCO 3: Dual Consistency = 0 mismatches (`PASS`)
- ✅ BLOCO 4: Somas por item_id = médias/min/max corretas (`PASS`)
- ✅ BLOCO 5: Distribuição por tipo = 100% em todas as categorias (`PASS`)

### Arquivos criados

1. `server/database/postgresql/04a_inventory_movements_expand.sql` — ALTER TABLE + 3 índices (idempotente, `IF NOT EXISTS`)
2. `server/src/scripts/backfill/04a_inventory_movements_expand.ts` — Backfill script (transacional por lote)
3. `server/src/scripts/backfill/04c_validation.sql` — Validação com 5 blocos de integridade

### Arquivos modificados

1. `server/src/models/InventoryMovement.ts` — Adicionado field `item_id?: string | null` (UUID)
2. `server/src/models/index.ts` — Adicionadas associações `Item.hasMany(InventoryMovement, ...) / InventoryMovement.belongsTo(Item, ...)`
3. `server/src/modules/inventory/infrastructure/sequelize/SequelizeInventoryRepository.ts` — Dual-read: `listMovements()` aceita `?product_id` OU `?item_id`, preferindo `item_id`; `findMovementById()` inclui `Item` associado

### Decisões de design

- **Alias Sequelize**: Nova associação usa `as: 'item_movements'` para evitar colisão com `User.hasMany(InventoryMovement, { as: 'inventory_movements' })`
- **Dual-read logic**: Se ambos `product_id` e `item_id` especificados em query, loga aviso de drift e usa `item_id` (preferred)
- **Backfill skip**: Produtos órfãos (sem mapeamento em crosswalk) deixam `item_id = NULL`; foram 0 neste run
- **Índices**: 3 novos índices em `inventory_movements` para suportar queries futuros por `item_id`

### Testes críticos para Codex validar

1. **Tabela estrutura**: `\d+ inventory_movements` — confirmar coluna `item_id uuid` e 3 índices criados
2. **Dados backfilled**: `SELECT COUNT(CASE WHEN item_id IS NOT NULL THEN 1 END) FROM inventory_movements` → 15
3. **Dual-read runtime**: Chamar `GET /api/inventory/movements?item_id=<uuid>` (modo novo) e `GET /api/inventory/movements?product_id=<int>` (modo legado) — ambos devem retornar registros corretamente
4. **Regressão legada**: Queries antigas com `product_id` continuam funcionando sem erro
5. **Sem duplicação**: Confirmar nenhuma linha tem `product_id` deletado (apenas `item_id` adicionado)

### Roadmap posterior

As próximas 14 tabelas (Fase 4.2–4.15) seguem o mesmo padrão 4 sub-passos (a/b/c/d):
- `purchase_order_items`, `sale_items`, `production_orders`, `production_lot_consumptions`, `bill_of_material_items` (em Fase 5 será removida), `lot_controls`, `serial_numbers`, `non_conformities`, `service_orders`, `assets`, `product_cost_ledgers`, `inventory_count_items` (antes de outros repositórios que a usam).

Cada tabela é sua própria micro-entrega + commit, executadas na ordem de risco (Suppliers → Purchases → Inventory → Sales → Production → ...) que estava documentada em `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md` — **nota de pente-fino 2026-08-06:** esse arquivo não existe mais no repositório; a ordem de execução em si já foi seguida (Fases 1–4.1 concluídas, ver seções acima), este é apenas um registro histórico da referência original.

Só após todas as 15 tabelas expandidas (Fase 4 "expand" finalizada) é que módulos de aplicação serão migrados (Fase 5, com dual-read em repositories e use-cases) e `product_id` será removido das tabelas (Fase 4 "contract" final).

---

## Catálogo Item × Fornecedor + Workflow de Aprovação de Requisição (Concluída)

**Data**: 2026-08-03
**Escopo**: (1) Catálogo N:N `item_suppliers` com endpoints de gestão de
fornecedores por item, histórico agregado de compras e itens por
fornecedor. (2) Workflow de transição de status da Requisição de Compra
(`PATCH /status`) com aprovação restrita a `admin`.
**Status**: ✅ Concluído (typecheck limpo, 202 testes unitários verdes)

### Resumo da feature

**Tarefa 1 — Catálogo item × fornecedor:**
- Nova tabela `item_suppliers` (N:N entre `items` e `suppliers`), com preço
  de referência, moeda, prazo de entrega, MOQ, código do item no catálogo
  do fornecedor, flag `preferred` (no máximo um por item) e soft delete
  (`active`).
- Migration com backfill automático a partir do histórico de
  `purchase_order_items` × `purchase_orders` (preço mais recente por par
  item/fornecedor).
- Endpoints REST completos (list, create, update, deactivate) sob
  `/api/items/:id/suppliers`, mais `/api/items/:id/purchase-history`
  (agregado por fornecedor via `sequelize.query` com replacements) e
  `/api/suppliers/:id/items`.
- Regra de negócio: ao definir `preferred=true`, os demais vínculos ativos
  do mesmo item são zerados na mesma transação Sequelize (commit/rollback).

**Tarefa 2 — Workflow de requisição de compra:**
- `PATCH /api/purchase-requisitions/:id/status`, com máquina de estados
  `draft → pending|canceled` e `pending → approved|canceled`.
- Aprovação (`status=approved`) exige perfil `admin` (validado no
  controller, pois a rota é compartilhada com transições não privilegiadas)
  e registra `approved_by` (usuário logado) + `approval_date` (data atual).
- Transições inválidas retornam 422 (`BusinessRuleError`); requisição
  inexistente retorna 404.

### Arquivos criados

**Migration & Model:**
- `server/migrations/20260803-000001-create-item-suppliers.cjs`
- `server/src/models/ItemSupplier.ts`

**Módulo `items` (catálogo item × fornecedor):**
- `server/src/modules/items/domain/repositories/ItemSupplierRepository.ts`
- `server/src/modules/items/infrastructure/sequelize/SequelizeItemSupplierRepository.ts`
- `server/src/modules/items/application/use-cases/ListItemSuppliersUseCase.ts`
- `server/src/modules/items/application/use-cases/CreateItemSupplierUseCase.ts`
- `server/src/modules/items/application/use-cases/UpdateItemSupplierUseCase.ts`
- `server/src/modules/items/application/use-cases/DeactivateItemSupplierUseCase.ts`
- `server/src/modules/items/application/use-cases/GetItemPurchaseHistoryUseCase.ts`

**Módulo `suppliers` (itens por fornecedor):**
- `server/src/modules/suppliers/application/use-cases/ListSupplierItemsUseCase.ts`

**Módulo `purchaseRequisitions` (workflow de status):**
- `server/src/modules/purchaseRequisitions/application/use-cases/ChangePurchaseRequisitionStatusUseCase.ts`

**Testes:**
- `server/tests/unit/item-suppliers.test.ts`
- `server/tests/unit/purchase-requisition-status.test.ts`

### Arquivos modificados

- `server/src/models/index.ts` — import de `ItemSupplier`, associações
  `Item.hasMany(ItemSupplier, as: 'fornecedores')`,
  `Supplier.hasMany(ItemSupplier, as: 'itens_fornecidos')` e `belongsTo`
  inversos; export de `ItemSupplier`.
- `server/src/modules/items/presentation/validators/itemValidators.ts` —
  `createItemSupplierSchema`, `updateItemSupplierSchema`.
- `server/src/modules/items/presentation/controllers/itemController.ts` —
  `listSuppliers`, `createSupplier`, `updateSupplier`, `removeSupplier`,
  `getPurchaseHistory`.
- `server/src/modules/items/presentation/routes/items.ts` — rotas
  `GET/POST /:id/suppliers`, `PUT/DELETE /:id/suppliers/:linkId`,
  `GET /:id/purchase-history`.
- `server/src/modules/suppliers/presentation/controllers/supplierController.ts`
  — `listItems`.
- `server/src/modules/suppliers/presentation/routes/suppliers.ts` — rota
  `GET /:id/items`.
- `server/src/modules/purchaseRequisitions/domain/repositories/PurchaseRequisitionRepository.ts`
  e `infrastructure/sequelize/SequelizePurchaseRequisitionRepository.ts` —
  novo método `updateRequisition(id, data, transaction?)`.
- `server/src/modules/purchaseRequisitions/presentation/validators/purchaseRequisitionValidators.ts`
  — `changePurchaseRequisitionStatusSchema`.
- `server/src/modules/purchaseRequisitions/presentation/controllers/purchaseRequisitionController.ts`
  — `changeStatus` (valida `admin` para aprovação, chama o use case, loga
  auditoria).
- `server/src/modules/purchaseRequisitions/presentation/routes/purchaseRequisitions.ts`
  — rota `PATCH /:id/status`.

### Documentações atualizadas

- `docs/database/DATABASE.md` — nova seção `### Tabela: item_suppliers` (colunas,
  constraints, regra do `preferred`, referência à migration).
- `docs/projeto/04-USE_CASES.md` — `UC-22: Gerenciar Catálogo Item ×
  Fornecedor` e `UC-23: Workflow de Aprovação da Requisição de Compra`.
- `docs/governance/HANDOFF_CODEX.md` — esta seção.
- JSDoc em todos os arquivos novos (models, repositories, use-cases,
  controllers) descrevendo parâmetros, retornos e exceções lançadas.

### Contratos dos endpoints

**`GET /api/items/:id/suppliers`** (authenticate)
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "item_id": "5f2c...uuid",
      "supplier_id": 10,
      "unit_price": "12.500000",
      "currency": "BRL",
      "lead_time_days": 15,
      "moq": "100.000000",
      "supplier_item_code": "SUP-ABC-123",
      "preferred": true,
      "active": true,
      "notes": null,
      "supplier": { "id": 10, "company_name": "Acme Componentes" }
    }
  ]
}
```

**`POST /api/items/:id/suppliers`** (authenticate + authorize admin/operator) — 201
```json
// Request
{ "supplier_id": 10, "unit_price": 12.5, "lead_time_days": 15, "preferred": true }
// Response
{ "success": true, "data": { "id": 1, "item_id": "...", "supplier_id": 10, "preferred": true, "supplier": { "id": 10, "company_name": "Acme Componentes" } } }
```
Erros: 404 (item ou fornecedor inexistente), 409 (vínculo já existe).

**`PUT /api/items/:id/suppliers/:linkId`** (authenticate + authorize admin/operator)
```json
// Request
{ "unit_price": 13.0, "preferred": true }
// Response
{ "success": true, "data": { "id": 1, "unit_price": "13.000000", "preferred": true, "...": "..." } }
```

**`DELETE /api/items/:id/suppliers/:linkId`** (authenticate + authorize admin/operator) — soft delete
```json
{ "success": true, "data": { "id": 1, "active": false, "preferred": false } }
```

**`GET /api/items/:id/purchase-history`** (authenticate)
```json
{
  "success": true,
  "data": [
    {
      "supplier_id": 10,
      "company_name": "Acme Componentes",
      "orders_count": "3",
      "total_quantity": "450.00",
      "min_price": "11.90",
      "max_price": "13.20",
      "avg_price": "12.40",
      "last_order_date": "2026-07-28"
    }
  ]
}
```

**`GET /api/suppliers/:id/items`** (authenticate)
```json
{
  "success": true,
  "data": [
    { "id": 1, "supplier_id": 10, "item_id": "...", "preferred": true, "item": { "id": "...", "codigo": "TW-25", "descricao": "Tweeter 25mm" } }
  ]
}
```

**`PATCH /api/purchase-requisitions/:id/status`** (authenticate; `status=approved` exige `admin`)
```json
// Request
{ "status": "approved" }
// Response
{ "success": true, "data": { "id": 7, "status": "approved", "approved_by": 3, "approval_date": "2026-08-03", "...": "..." } }
```
Erros: 404 (requisição inexistente), 422 (transição inválida, ex.:
`draft` → `approved`), 403 (não-admin tentando aprovar).

### Instruções de teste

1. **Migrations** (não executado pelo agente, conforme instrução):
   ```bash
   cd server
   npm run migration:up --name 20260803-000001-create-item-suppliers.cjs
   ```
   Validar: `\d+ item_suppliers` (colunas, unique `item_id+supplier_id`,
   FKs corretas) e conferir se o backfill populou linhas a partir de
   `purchase_order_items`/`purchase_orders` existentes.

2. **Regressão automatizada**:
   ```bash
   npm run typecheck        # limpo
   npx jest tests/unit       # 43 suites / 202 testes, 100% verde
   ```

3. **Manual (após subir a API com o banco migrado)**:
   - Criar vínculo item-fornecedor com `preferred=true`, criar um segundo
     vínculo do mesmo item com `preferred=true` e confirmar que o primeiro
     foi desmarcado.
   - Tentar criar vínculo duplicado (mesmo item + fornecedor) → esperar 409.
   - Consultar `GET /:id/purchase-history` para um item com histórico de
     compras e conferir agregação (orders_count, min/max/avg price).
   - Criar requisição em `draft`, tentar `PATCH status=approved`
     diretamente → esperar 422; mover para `pending` e então `approved`
     com usuário `admin` → esperar sucesso com `approved_by`/`approval_date`
     preenchidos; repetir aprovação com usuário não-admin → esperar 403.

### Riscos residuais

- Migration e backfill **não foram executados** neste ambiente (conforme
  instrução do orquestrador); validar manualmente contra um banco com dados
  reais de `purchase_order_items`/`purchase_orders` antes do deploy.
- `GetItemPurchaseHistoryUseCase` usa `sequelize.query` com SQL bruto
  (replacements parametrizados, sem risco de injection) — não passou por
  teste de integração contra Postgres real neste ciclo; testes unitários
  cobrem apenas a camada de use case com repositório mockado.
- `authorize('admin')` não foi aplicado na rota `PATCH /status` (pois a
  rota atende múltiplas transições com regras de permissão diferentes); a
  checagem de `admin` para aprovação está no controller — reforçar com
  teste de integração HTTP em ciclo futuro.

---

**Desenvolvedor**: Claude Code (Backend Engineer)
**Data**: 2026-08-03
**Próximo checkpoint**: Migrar/validar `item_suppliers` em ambiente com
Postgres real; considerar teste de integração HTTP para
`PATCH /purchase-requisitions/:id/status` e para os novos endpoints de
catálogo item × fornecedor.

---

## MRP — Conversão de Ordens Planejadas em Requisição de Compra (Frontend, endpoint backend entregue — ver seção seguinte)

### Resumo da feature

Adicionada na tela `/production/mrp` a capacidade de selecionar ordens
planejadas (geradas pelo MRP) e convertê-las em uma Requisição de Compra,
com seleção múltipla via checkbox, dialog de confirmação com campo de
observações opcional, e feedback com o número da requisição criada e
navegação para `/purchases/requisitions`.

**Importante**: o endpoint `POST /api/mrp/planned-orders/convert` está
sendo desenvolvido em paralelo no backend (fora do escopo desta sessão,
que tocou **apenas `client/`**). O contrato usado no frontend foi definido
pelo orquestrador e implementado como especificação — **não foi verificado
contra o código real do backend**. Validar o contrato assim que o endpoint
estiver disponível.

### Contrato assumido (a validar contra o backend real)

```
POST /api/mrp/planned-orders/convert
Body: { planned_order_ids: string[] (UUIDs, min 1), notes?: string }

Resposta 201:
{
  "success": true,
  "data": {
    "requisition": { "id", "requisition_number", "status", "items": [...] },
    "converted_ids": string[]
  }
}

Erros:
- 404: ordem planejada inexistente
- 422: status inválido para conversão (só RASCUNHO/APROVADA convertem), formato
  { "success": false, "error": { ... } }
```

O tipo `PurchaseRequisition` retornado em `requisition` reaproveita a
interface já existente em `client/src/api/purchaseRequisitions.ts`.

### Arquivos criados/modificados (client/)

- `client/src/api/mrp.ts` — adicionada função `convertPlannedOrders(input)`,
  tipos `ConvertPlannedOrdersInput`/`ConvertPlannedOrdersResult`, e a
  constante `CONVERTIBLE_PLANNED_ORDER_STATUSES = ['RASCUNHO', 'APROVADA']`
  (única fonte de verdade para quais status habilitam conversão — se o
  backend usar valores diferentes, ajustar aqui).
- `client/src/pages/production/MrpPage.tsx`:
  - `PlannedOrderStatusBadge` — badge colorido por status (RASCUNHO cinza,
    APROVADA azul, EM_EXECUCAO âmbar, CONCLUIDA verde, CANCELADA vermelho),
    com fallback `secondary` para status desconhecidos.
  - Coluna de checkbox por linha da tabela de ordens planejadas, habilitada
    apenas quando `isConvertible(order.status)` é verdadeiro; checkbox de
    "selecionar todas" no header considera apenas as linhas convertíveis.
  - Botão "Converter em Requisição (N)" (desabilitado quando `N === 0`)
    abre um `Dialog` de confirmação com campo de observações opcional.
  - `useMutation` chama `convertPlannedOrders`; em sucesso invalida
    `['mrp-planned-orders']` e `['purchase-requisitions']`, limpa seleção,
    fecha o dialog de confirmação e abre um segundo dialog mostrando o
    número da requisição criada com botão "Ver requisição" (`Link` para
    `/purchases/requisitions`, rota já existente em `App.tsx`).
  - Erros tratados com `extractApiErrorMessage` e exibidos no dialog de
    confirmação (não trava a UI, permite tentar novamente).

### O que o Agente QA (ou humano) deve testar

1. **Assim que o endpoint backend estiver no ar**, confirmar que o
   contrato real bate com o assumido acima (especialmente o formato de
   `requisition.items` e o payload de erro 422). Se divergir, ajustar
   `ConvertPlannedOrdersResult` em `client/src/api/mrp.ts`.
2. Gerar um plano MRP, confirmar que ordens com status `RASCUNHO`/`APROVADA`
   mostram checkbox habilitado e as demais (`EM_EXECUCAO`, `CONCLUIDA`,
   `CANCELADA`) mostram checkbox desabilitado.
3. Selecionar 2+ ordens convertíveis, clicar em "Converter em Requisição",
   confirmar no dialog (com e sem observações) e validar que:
   - o botão fica desabilitado/mostra "Convertendo..." durante a mutation;
   - em sucesso, a lista de ordens planejadas é recarregada e a seleção é
     limpa;
   - o dialog de sucesso mostra o `requisition_number` correto e o link
     "Ver requisição" navega para `/purchases/requisitions`.
4. Testar erro 422 (ex.: selecionar ordem que mudou de status entre a
   carga da tela e o clique) e 404 — mensagem amigável deve aparecer no
   dialog via `extractApiErrorMessage`, sem stack trace.
5. Confirmar que `npm run typecheck` (`node ./node_modules/typescript/bin/tsc -b --noEmit`)
   e `npm test` continuam verdes após a integração real com o backend.

**Desenvolvedor**: Claude Code (Frontend Engineer)
**Data**: 2026-08-03

---

## MRP — Conversão de Ordens Planejadas em Requisição de Compra (Backend, Concluído)

**Data**: 2026-08-03
**Escopo**: Endpoint `POST /api/mrp/planned-orders/convert` — fecha o ciclo
MRP → Requisição de Compra. Trabalho realizado **apenas em `server/`**
(sem tocar `client/`).
**Status**: ✅ Concluído — contrato validado contra a especificação assumida
pela sessão de frontend anterior (`converted_ids`, `requisition.items`,
404/422), sem divergências.

### Resumo da feature

Novo caso de uso `ConvertPlannedOrdersToRequisitionUseCase` que:
1. Abre uma transação Sequelize e carrega as ordens planejadas informadas
   com lock pessimista (`SELECT ... FOR UPDATE`), via novo método
   `MrpRepository.findPlannedOrdersByIdsForUpdate(ids, transaction)`.
2. Valida que todas existem (404 `NotFoundError` citando ids ausentes) e
   que estão em status `RASCUNHO` ou `APROVADA` (422 `BusinessRuleError`
   citando ids inválidos).
3. Cria **uma única** Requisição de Compra (`origin='mrp'`,
   `status='pending'`, `priority='normal'`, `requester_id` do usuário
   logado, `notes` = texto informado ou `"Gerada automaticamente do plano
   MRP"`), reaproveitando `PurchaseRequisitionRepository.createRequisition`
   / `createRequisitionItem` do módulo `purchaseRequisitions`.
4. Para cada ordem planejada, busca o fornecedor preferencial ativo do
   item via novo método `ItemSupplierRepository.findPreferredByItem(itemId)`
   (`item_suppliers` com `preferred=true AND active=true`) e sugere
   `suggested_supplier_id`/`unit_price_estimated` quando existir (senão
   `null`, decisão manual do comprador).
5. Atualiza todas as ordens planejadas convertidas para `EM_EXECUCAO` via
   novo método `MrpRepository.updatePlannedOrdersStatus(ids, status, tx)`.
6. Faz commit/rollback automático (padrão `sequelize.transaction(async tx
   => ...)`) e retorna a requisição completa (com itens) + ids convertidos.

### Contrato do endpoint (confirmado)

```
POST /api/mrp/planned-orders/convert
Auth: Bearer JWT — authenticate + authorize('admin', 'operator')

Body (zod .strict()):
{
  "planned_order_ids": ["<uuid>", ...],   // min 1, max 100
  "notes": "string opcional, max 1000"
}

Resposta 201:
{
  "success": true,
  "data": {
    "requisition": {
      "id": 42,
      "requisition_number": "RQ-1735900000000",
      "status": "pending",
      "origin": "mrp",
      "priority": "normal",
      "requester_id": 5,
      "notes": "Gerada automaticamente do plano MRP",
      "items": [
        {
          "id": 101,
          "item_id": "5b1c...-uuid",
          "quantity": "10.000000",
          "required_date": "2026-08-20",
          "suggested_supplier_id": 7,
          "unit_price_estimated": "12.500000",
          "status": "pending"
        }
      ]
    },
    "converted_ids": ["order-uuid-1", "order-uuid-2"]
  }
}

Erros:
- 400 VALIDATION_ERROR — payload fora do schema zod (ids não-UUID, array
  vazio ou > 100, notes > 1000 chars, campos extras)
- 404 NOT_FOUND — alguma ordem planejada não existe (mensagem cita os ids)
- 422 BUSINESS_RULE_VIOLATION — alguma ordem não está em
  RASCUNHO/APROVADA (mensagem + `details.invalid_ids` cita os ids)
```

### Arquivos criados/modificados (server/)

#### Criados
- `server/src/modules/mrp/application/use-cases/ConvertPlannedOrdersToRequisitionUseCase.ts`
- `server/tests/unit/mrp-convert-to-requisition.test.ts` — 4 casos: conversão
  com fornecedor preferencial + fallback null, notas customizadas, bloqueio
  de status inválido (422), ordem inexistente (404)

#### Modificados
- `server/src/modules/mrp/domain/repositories/MrpRepository.ts` — contrato
  `findPlannedOrdersByIdsForUpdate(ids, transaction)` e
  `updatePlannedOrdersStatus(ids, status, transaction)`
- `server/src/modules/mrp/infrastructure/sequelize/SequelizeMrpRepository.ts`
  — implementação com `lock: transaction.LOCK.UPDATE` e `Op.in`
- `server/src/modules/mrp/presentation/validators/mrpValidators.ts` —
  `convertPlannedOrdersSchema` (zod `.strict()`)
- `server/src/modules/mrp/presentation/controllers/mrpController.ts` —
  handler `convertPlannedOrders` com `logAction` (ação
  `convert_to_requisition`, entidade `PurchaseRequisition`)
- `server/src/modules/mrp/presentation/routes/mrp.ts` — nova rota
  `POST /planned-orders/convert` (authenticate + authorize admin/operator)
- `server/src/modules/items/domain/repositories/ItemSupplierRepository.ts`
  e `server/src/modules/items/infrastructure/sequelize/SequelizeItemSupplierRepository.ts`
  — novo método `findPreferredByItem(itemId)`

### Invariantes mantidas
- ✅ Sem nova tabela/migration — reaproveita `mrp_ordens_planejadas`,
  `purchase_requisitions`, `purchase_requisition_items`, `item_suppliers`
  já existentes
- ✅ Toda a operação multi-tabela em uma única transação Sequelize
  (`commit`/`rollback` automático via `sequelize.transaction`)
- ✅ `requester_id` sempre derivado de `req.user.id` (JWT), nunca do body
- ✅ Nenhuma conexão/abstração com o ERP legado (isolamento de banco mantido)

### Documentações atualizadas
- `docs/projeto/04-USE_CASES.md` — novo `UC-24: Conversão de Ordens
  Planejadas do MRP em Requisição de Compra`
- `docs/governance/HANDOFF_CODEX.md` — esta seção

### Testes executados
- `npm run typecheck` — limpo, sem erros
- `npx jest tests/unit/mrp-convert-to-requisition.test.ts` — 4/4 verde
- `npx jest tests/unit` — 44 suites / 206 testes, 100% verde (nenhuma
  regressão)

### Instruções de teste para o próximo agente/humano
1. Subir Postgres local (`docker compose up -d`) e rodar migrations.
2. Gerar um plano MRP (`POST /api/mrp/plan`) para obter ordens `RASCUNHO`.
3. Cadastrar um `item_suppliers` com `preferred=true, active=true` para
   pelo menos um dos itens das ordens planejadas e confirmar que o
   `suggested_supplier_id`/`unit_price_estimated` aparecem na requisição
   gerada; para um item sem vínculo preferencial, confirmar `null`.
4. Chamar `POST /api/mrp/planned-orders/convert` com 2+ `planned_order_ids`
   válidos e conferir: requisição única criada com N itens, ordens
   atualizadas para `EM_EXECUCAO` em `mrp_ordens_planejadas`.
5. Repetir a chamada com os mesmos ids (já `EM_EXECUCAO`) e confirmar 422
   `BUSINESS_RULE_VIOLATION`.
6. Chamar com um id inexistente e confirmar 404 `NOT_FOUND`.
7. Validar fim a fim com o frontend já implementado em
   `client/src/pages/production/MrpPage.tsx` (ver seção anterior deste
   handoff) — o contrato foi conferido e não requer ajustes no client.

**Desenvolvedor**: Claude Code (Backend Engineer)
**Data**: 2026-08-03

---

## Frontend — Conversão de Requisição Aprovada em Pedido(s) de Compra

**Data**: 2026-08-03
**Escopo**: `client/src/pages/purchases/RequisitionsPage.tsx` — botão "Gerar Pedido de Compra" para
requisições `approved`, consumindo o novo endpoint `POST /api/purchase-requisitions/:id/convert`
(desenvolvido em paralelo pelo Backend Engineer; contrato assumido conforme especificação recebida,
**NÃO verificado contra o código real do backend** — validar assim que o endpoint estiver disponível).
**Status**: 🔧 Aguardando validação do endpoint real (contrato assumido)

### Contrato assumido do endpoint (a confirmar)
```
POST /api/purchase-requisitions/:id/convert
Body: { fallback_supplier_id?: number, notes?: string }
201: { success: true, data: { purchase_orders: [{ id, order_number, supplier_id, status, items: [...] }], requisition_id, requisition_status: 'ordered' } }
404: requisição não encontrada
422: { success: false, error: { message, ... } } — quando status != 'approved' OU há itens sem fornecedor resolvível (mensagem lista os itens)
```

### Arquivos modificados
- `client/src/api/purchaseRequisitions.ts` — nova função `convertRequisitionToPurchaseOrders(id, input)`
  e tipos `ConvertRequisitionInput`, `ConvertedPurchaseOrder`, `ConvertRequisitionResult`
- `client/src/pages/purchases/RequisitionsPage.tsx`:
  - Botão "Gerar Pedido de Compra" na listagem, visível apenas para requisições com
    `status === 'approved'` e usuário com role `admin`/`operator` (`canWrite`)
  - Novo componente `ConvertRequisitionDialog`: mostra resumo dos itens da requisição, select
    opcional "Fornecedor padrão (fallback)" (carregado via `suppliersApi.listSuppliers({ limit: 200 })`)
    e campo de observações
  - Ao confirmar: `useMutation` chamando `convertRequisitionToPurchaseOrders`; em sucesso mostra a
    lista de `order_number` de cada pedido gerado, avisando quando mais de um pedido foi criado
    (agrupamento por fornecedor) e um link `Link to="/purchases"`; invalida as queries
    `['purchase-requisitions']` e `['purchases']`
  - Em erro 422: mensagem da API (`extractApiErrorMessage`) exibida dentro do próprio dialog, sem
    fechá-lo, permitindo escolher/alterar o fornecedor fallback e tentar novamente
  - Badge de status `ordered` já existia (`STATUS_VARIANT.ordered = 'secondary'`), distinto de
    `approved` (`success`) — nenhuma alteração de cores necessária

### Invariantes mantidas
- ✅ TypeScript strict, sem `any`
- ✅ Loading state (`convertMutation.isPending`) desabilita os botões durante a requisição
- ✅ Erros tratados via `extractApiErrorMessage`, nunca stack trace cru
- ✅ Nenhum arquivo em `server/` tocado

### Testes executados
- `node ./node_modules/typescript/bin/tsc -b --noEmit` — limpo, sem erros
- `node ./node_modules/vitest/vitest.mjs run` — 4 arquivos de teste, 13/13 testes verdes (sem regressão)
- Nenhuma dependência nova instalada; nenhum commit criado

### Instruções de teste para o próximo agente/humano (QA)
1. Assim que `POST /api/purchase-requisitions/:id/convert` estiver implementado no backend,
   confirmar que o payload de sucesso/erro bate exatamente com o contrato acima; ajustar os tipos em
   `purchaseRequisitions.ts` se houver divergência (ex.: nomes de campos, formato do erro 422).
2. Aprovar uma requisição (`PATCH /api/purchase-requisitions/:id/status` com `approved`) e confirmar
   que o botão "Gerar Pedido de Compra" aparece apenas nesse status, para `admin`/`operator`.
3. Testar o caminho feliz: converter uma requisição com todos os itens tendo fornecedor resolvível —
   confirmar que os `order_number` aparecem no dialog e que a requisição muda para `ordered` na
   listagem após fechar o dialog.
4. Testar o caminho de erro 422 (item sem fornecedor): confirmar que a mensagem da API aparece dentro
   do dialog (não fecha), selecionar um fornecedor no campo fallback e tentar novamente com sucesso.
5. Testar 404 (id inexistente) — deve mostrar mensagem amigável, não stack trace.
6. Conferir que `/purchases` lista os pedidos recém-criados e que as queries de requisições
   (`['purchase-requisitions']`) refletem o novo status sem precisar recarregar a página.

**Desenvolvedor**: Claude Code (Frontend Engineer)
**Data**: 2026-08-03

---

## Backend — Conversão de Requisição Aprovada em Pedido(s) de Compra

**Data**: 2026-08-03
**Escopo**: `POST /api/purchase-requisitions/:id/convert` — converte uma requisição de compra
`approved` em um ou mais pedidos de compra (`purchase_orders`), fechando o ciclo Requisição →
Pedido → Recebimento → Estoque. Contrato confirmado 100% compatível com o assumido pela seção
"Frontend" anterior deste handoff (nenhum ajuste necessário no client).
**Status**: ✅ Concluído

### Regra de negócio implementada
1. Requisição carregada com lock pessimista (`SELECT ... FOR UPDATE`, requisição + itens, sem
   `include` do lado nullable — mesmo padrão de `findPurchaseWithItemsForUpdate`); 404 se não
   existir, 422 `BusinessRuleError` se `status !== 'approved'`.
2. Fornecedor de cada item resolvido em cascata: `suggested_supplier_id` do item da requisição →
   fornecedor preferencial ativo em `item_suppliers` (`findPreferredByItem`) → `fallback_supplier_id`
   do body. Sem resolução → 422 listando os `item_id` (da requisição) sem fornecedor.
3. `product_id` legado (`purchase_order_items` exige INTEGER) resolvido casando
   `products.code = items.codigo`. Sem produto correspondente → 422 listando os `codigo` ausentes,
   orientando a cadastrar o produto.
4. Itens agrupados por fornecedor resolvido; **um `Purchase` por fornecedor**, com `requisition_id`,
   `requester_id = req.user.id`, `status='pending'`, `order_number` gerado pelo mesmo
   `generatePurchaseOrderNumber()` usado em `CreatePurchaseUseCase` (sufixo `-N` quando mais de um
   pedido é criado na mesma conversão, para evitar colisão de `order_number` no mesmo milissegundo).
   `unit_price` de cada item: preço do vínculo `item_suppliers` para aquele fornecedor →
   `unit_price_estimated` do item da requisição → `0`.
5. Requisição atualizada para `status='ordered'`; todos os seus itens também para `status='ordered'`.
6. Toda a operação em uma única transação Sequelize (`commit`/`rollback` no controller).

### Arquivos modificados/criados
- **Criado**: `server/src/modules/purchaseRequisitions/application/use-cases/ConvertRequisitionToPurchaseOrdersUseCase.ts`
  — use case principal (JSDoc completo).
- **Criado**: `server/tests/unit/requisition-convert-to-purchase.test.ts` — 6 testes unitários
  (agrupamento em 2 pedidos, 404, 422 status inválido, 422 sem fornecedor, 422 produto ausente,
  fallback_supplier_id).
- `server/src/modules/purchaseRequisitions/domain/repositories/PurchaseRequisitionRepository.ts` —
  novos métodos abstratos `findRequisitionByIdForUpdate` e `updateRequisitionItem`.
- `server/src/modules/purchaseRequisitions/infrastructure/sequelize/SequelizePurchaseRequisitionRepository.ts`
  — implementação dos dois métodos acima (lock em duas queries sem join, mesmo padrão de
  `SequelizePurchaseRepository`).
- `server/src/modules/purchases/domain/repositories/PurchaseRepository.ts` — novo método abstrato
  `findProductByCode`.
- `server/src/modules/purchases/infrastructure/sequelize/SequelizePurchaseRepository.ts` —
  implementação de `findProductByCode` (`Product.findOne({ where: { code } })`).
- `server/src/modules/purchaseRequisitions/presentation/validators/purchaseRequisitionValidators.ts`
  — novo `convertPurchaseRequisitionSchema` (`.strict()`: `fallback_supplier_id` opcional
  `int().positive()`, `notes` opcional `max(1000)`).
- `server/src/modules/purchaseRequisitions/presentation/controllers/purchaseRequisitionController.ts`
  — novo `exports.convert`, com `logAction` (`action: 'convert'`) após o commit.
- `server/src/modules/purchaseRequisitions/presentation/routes/purchaseRequisitions.ts` — nova rota
  `POST /:id/convert` (`authenticate` + `authorize('admin', 'operator')`).

### Invariantes mantidas
- ✅ Sem nova tabela/migration — reaproveita `purchase_orders`, `purchase_order_items`,
  `purchase_requisitions`, `purchase_requisition_items`, `item_suppliers`, `products`, `items` já
  existentes (inclusive `purchase_orders.requisition_id`, coluna que já existia sem uso ativo)
- ✅ Toda a operação multi-tabela em uma única transação Sequelize com lock pessimista na requisição
- ✅ `requester_id` dos pedidos sempre derivado de `req.user.id` (JWT), nunca do body
- ✅ `order_number` reutiliza o gerador/formato já usado em `CreatePurchaseUseCase`, sem inventar novo
  formato
- ✅ Nenhuma conexão/abstração com o ERP legado (isolamento de banco mantido)
- ✅ `npm run typecheck` limpo antes e depois da mudança

### Documentações atualizadas
- `docs/projeto/04-USE_CASES.md` — novo `UC-25: Conversão de Requisição de Compra Aprovada em
  Pedido(s) de Compra`
- `docs/governance/HANDOFF_CODEX.md` — esta seção

### Testes executados
- `npm run typecheck` — limpo, sem erros (antes e depois da mudança)
- `npx jest tests/unit/requisition-convert-to-purchase.test.ts` — 6/6 verde
- `npx jest tests/unit` — 45 suites / 212 testes, 100% verde (nenhuma regressão)

### Instruções de teste para o próximo agente/humano
1. Subir Postgres local (`docker compose up -d`) e rodar migrations.
2. Criar uma requisição de compra (`POST /api/purchase-requisitions`) com 2+ itens referenciando
   `items` cujo `codigo` tenha um `products.code` correspondente cadastrado.
3. Aprovar a requisição (`PATCH /api/purchase-requisitions/:id/status` com `{"status":"approved"}`,
   perfil `admin`).
4. Cadastrar `item_suppliers` (`preferred=true, active=true`, com `unit_price`) para pelo menos um
   dos itens, deixando outro sem vínculo, para validar os 3 níveis de resolução de fornecedor.
5. Chamar `POST /api/purchase-requisitions/:id/convert` com `fallback_supplier_id` cobrindo o item
   sem vínculo; conferir 201 com `purchase_orders` (1 por fornecedor distinto), `requisition_id` e
   `requisition_status: 'ordered'`.
6. Conferir no banco: `purchase_orders.requisition_id` aponta para a requisição, `purchase_order_items`
   com `product_id`/`item_id`/`unit_price` corretos, `purchase_requisitions.status='ordered'` e todos
   os `purchase_requisition_items.status='ordered'`.
7. Repetir a chamada sobre a mesma requisição (já `ordered`) e confirmar 422 `BUSINESS_RULE_VIOLATION`.
8. Chamar com `id` inexistente e confirmar 404 `NOT_FOUND`.
9. Chamar sobre uma requisição com item cujo `Item.codigo` não tenha `Product` correspondente e
   confirmar 422 listando o(s) código(s) ausente(s).
10. Validar fim a fim com o frontend já implementado em `client/src/pages/purchases/RequisitionsPage.tsx`
    (ver seção "Frontend" anterior deste handoff) — o contrato foi conferido e não requer ajustes no
    client.

**Desenvolvedor**: Claude Code (Backend Engineer)
**Data**: 2026-08-03
**Escopo**: `client/` apenas — nenhum arquivo em `server/` foi tocado.

---

## Frontend — Apontamento de Chão de Fábrica (`/production/shop-floor`)

**Data**: 2026-08-03
**Escopo**: nova tela `client/src/pages/production/ShopFloorPage.tsx`, pensada para uso em
bancada/tablet, consumindo as rotas de tracking já existentes em
`server/src/modules/production/presentation/routes/productionOrders.ts` (contrato verificado por
leitura do controller e do repositório Sequelize antes da implementação, nenhuma rota adivinhada).
**Status**: ✅ Concluído (UI); rotas de tracking já existiam no backend, nenhuma alteração em `server/`.

### Contrato consumido (verificado no backend)
```
GET  /api/production-orders?status=released|in_progress&limit=  → { data: ProductionOrder[] }
GET  /api/production-orders/:id/tracking                        → { data: ProductionOrderTracking[] }
                                                                    (inclui routeStep {id,sequence,step_code,name,work_center}
                                                                     e operator {id,name}, ordenado por sequence ASC)
POST /api/production-orders/:id/tracking            { sequence, production_route_step_id?, notes? }
POST /api/production-orders/tracking/:trackingId/start    { operator_id? }  (employees.id)
POST /api/production-orders/tracking/:trackingId/complete { quantity_good, quantity_scrapped, notes? }
GET  /api/employees?limit=200 → { data: Employee[] }
```

### Arquivos criados
- `client/src/api/productionTracking.ts` — tipos (`ProductionOrderTracking`, `ProductionTrackingStatus`,
  `ProductionRouteStepSummary`, `ProductionTrackingOperator`) e funções `listProductionTracking`,
  `createProductionTracking`, `startProductionTracking`, `completeProductionTracking`
- `client/src/api/employees.ts` — `listEmployees` (`GET /api/employees`) e tipo `Employee`
  (não existia serviço de employees no client ainda)
- `client/src/pages/production/ShopFloorPage.tsx`:
  - Coluna esquerda: lista de OPs com `status in (released, in_progress)` (duas queries combinadas),
    com busca client-side por número da ordem/produto/código
  - Ao selecionar uma OP: painel com card de resumo (produto, total bom acumulado vs quantidade
    planejada) e lista de etapas (`ProductionOrderTracking`) ordenadas por `sequence`, cada uma como
    card com badge de status, nome da etapa/centro de trabalho (`routeStep`), operador, horários de
    início/fim e, se concluída, quantidade boa/refugada e observações
  - `StartTrackingDialog`: select de operador (`employeesApi.listEmployees`, opcional — pode iniciar
    sem atribuir), botão grande "Iniciar etapa"
  - `CompleteTrackingDialog`: campos de quantidade boa, quantidade refugada (validação client-side
    `>= 0` antes de chamar a API) e observações
  - `AddStepDialog`: formulário `react-hook-form` + `zod` (sequência inteira positiva obrigatória,
    observações opcionais) para `POST .../tracking` (etapa manual criada como `pending`)
  - Todos os botões de ação com `min-h-12` e tipografia `text-base`/`text-lg`, pensados para toque em
    tablet de bancada

### Arquivos modificados (mínimos, cirúrgicos)
- `client/src/App.tsx` — import lazy de `ShopFloorPage` + rota `/production/shop-floor`
- `client/src/layouts/AppLayout.tsx` — item de menu "Chão de Fábrica" no grupo Produção (ícone
  `ClipboardList`, já importado) + entrada no mapa de breadcrumbs

### Invariantes mantidas
- ✅ TypeScript strict, sem `any`
- ✅ Loading states em toda query/mutation (`isLoading`, `mutation.isPending`)
- ✅ Erros tratados via `extractApiErrorMessage`, nunca stack trace cru
- ✅ Invalidação de `['production-tracking', productionOrderId]` após start/complete/create tracking
- ✅ Nenhum arquivo em `server/` tocado; nenhuma dependência nova instalada; nenhum commit criado

### Testes executados
- `node ./node_modules/typescript/bin/tsc -b --noEmit` — limpo, sem erros
- `node ./node_modules/vitest/vitest.mjs run` — 4 arquivos de teste, 13/13 testes verdes (sem regressão)

### Instruções de teste para o próximo agente/humano (QA)
1. Confirmar que `/production/shop-floor` aparece no menu "Produção" e que a rota carrega sem erro
   para usuários `admin`/`operator`.
2. Com uma OP em `released` ou `in_progress`: selecioná-la na lista e conferir que o painel de etapas
   carrega (`GET .../tracking`); se não houver etapas, deve aparecer o estado vazio com instrução para
   usar "Adicionar etapa".
3. Testar "Adicionar etapa": sequência inválida (0, negativa, vazia) deve bloquear o submit no client
   antes de chamar a API; sequência válida deve criar a etapa como `pending` e atualizar a lista sem
   reload manual.
4. Testar "Iniciar": com e sem selecionar operador — confirmar que o card da etapa muda para
   `in_progress`, exibe o operador (quando selecionado) e o horário de início.
5. Testar "Concluir": tentar submeter com quantidade boa/refugada vazia ou negativa (deve bloquear no
   client); com valores válidos, confirmar que o card muda para `completed`, mostra as quantidades e
   que o "Total bom acumulado" no topo do painel soma corretamente as etapas concluídas da OP.
6. Confirmar que erros de API (ex.: tentar concluir uma etapa que já foi concluída por outra
   sessão/aba, retornando 400 do `BusinessRuleError`) aparecem como mensagem amigável dentro do
   dialog, sem fechar e sem mostrar stack trace.
7. Testar responsividade em viewport de tablet (largura ~768-1024px): lista de OPs e painel de etapas
   devem empilhar verticalmente (`lg:flex-row` só ativa em telas largas) e os botões permanecerem
   grandes o suficiente para toque.

**Desenvolvedor**: Claude Code (Frontend Engineer)
**Data**: 2026-08-03

---

## Item 8 do levantamento — "Qualidade fecha o loop" (quarentena de recebimento + RNC bloqueia lote)

**Data**: 2026-08-03
**Escopo**: `server/` apenas (client/ não tocado).
**Status**: ✅ Concluído (parcial — realimentação de rating de fornecedor NÃO coberta nesta entrega)

### Resumo da feature

Recebimento de compra deixa de criar lotes (`LotControl`) diretamente
`available`; agora nascem em `quarantine`. O estoque físico
(`products.quantity`) continua entrando normalmente — apenas o **consumo
por lote** fica bloqueado até a inspeção de recebimento liberar. Foram
adicionados os endpoints de inspeção
(`GET /api/inventory/lots`, `POST /api/inventory/lots/:id/release`,
`POST /api/inventory/lots/:id/block`) e a criação de RNC
(`CreateNonConformityUseCase`) passou a bloquear automaticamente, na mesma
transação, o lote referenciado por `lot_number` + `product_id`, quando
encontrado.

Novo valor de enum: `lot_controls.status` ganhou `'quarantine'` (além de
`available`, `reserved`, `consumed`, `blocked`, `expired`).

### Arquivos modificados

#### Criados
- `server/migrations/20260803-000002-add-quarantine-lot-status.cjs` — `ALTER TYPE ... ADD VALUE IF NOT EXISTS 'quarantine'` (fora de transação, mesma técnica de `20260731-000013`). `down()` é no-op documentado (remover valor de enum no PG exige recriar o tipo).
- `server/src/modules/inventory/application/use-cases/ListLotsUseCase.ts` — lista `LotControl` com filtros (`status`, `product_id`) e paginação; inclui `product`/`supplier`.
- `server/src/modules/inventory/application/use-cases/ReleaseLotUseCase.ts` — `quarantine|blocked -> available`.
- `server/src/modules/inventory/application/use-cases/BlockLotUseCase.ts` — `quarantine|available -> blocked`, `reason` obrigatório (mín. 3 chars).
- `server/tests/unit/quality-lot-lifecycle.test.ts` — testes unitários novos (release/block válidos e inválidos; RNC bloqueia lote na transação; RNC não encontra lote e segue sem erro).

#### Modificados
- `server/src/models/LotControl.ts` — `LotControlStatus` e `DataTypes.ENUM` do campo `status` ganharam `'quarantine'`; comment explicando o ciclo de vida.
- `server/src/modules/purchases/application/use-cases/ReceivePurchaseItemsUseCase.ts` — lotes criados/atualizados no recebimento passam a usar `status: 'quarantine'` (era `'available'`) tanto no `create` quanto no `update` de lote existente.
- `server/src/modules/inventory/presentation/controllers/inventoryController.ts` — `listAvailableLots` renomeado/reescrito para `listLots` (usa `ListLotsUseCase`, mantendo compatibilidade retroativa: sem `status` + com `product_id` continua filtrando `available` + saldo > 0); adicionados `releaseLot` e `blockLot` (com `logAction`).
- `server/src/modules/inventory/presentation/routes/inventory.ts` — `GET /lots` agora aponta para `listLots`; adicionadas `POST /lots/:id/release` e `POST /lots/:id/block` (RBAC `admin`, `operator`).
- `server/src/modules/nonConformities/domain/repositories/NonConformitiesRepository.ts` — `create(data, transaction?)` ganhou parâmetro opcional de transação.
- `server/src/modules/nonConformities/infrastructure/sequelize/SequelizeNonConformitiesRepository.ts` — `create` repassa a transação ao `NonConformity.create`.
- `server/src/modules/nonConformities/application/use-cases/CreateNonConformityUseCase.ts` — agora abre uma transação Sequelize própria; cria a RNC e, se `lot_number` + `product_id` forem informados, localiza (com lock `FOR UPDATE`) e bloqueia o `LotControl` correspondente (quando em `available`, `quarantine` ou `reserved`) na mesma transação, registrando `"Bloqueado pela RNC #<id>"` em `notes`. Lote não encontrado não gera erro.
- `server/src/modules/nonConformities/application/use-cases/UpdateNonConformityUseCase.ts` — apenas documentação (`@remarks`): fechar RNC como `effective` **não** desbloqueia lote automaticamente; liberação é sempre manual via `POST /lots/:id/release`.
- `server/tests/unit/integrity-transaction-guards.test.ts` — assert adicional confirmando que `ReceivePurchaseItemsUseCase` cria o lote com `status: 'quarantine'` (antes não havia asserção sobre o status).

### Documentações atualizadas

- `docs/database/DATABASE.md` — nova seção "Tabela `lot_controls` (Rastreabilidade de Lotes + Quarentena de Qualidade)", com diagrama ASCII do lifecycle do enum `status` e tabela de endpoints.
- `docs/projeto/04-USE_CASES.md` — UC-16 (Receber Pedido de Compra) e UC-17 (Realizar Inspeção de Qualidade) atualizados para refletir quarentena e bloqueio de lote pela RNC; novo UC-17B (Liberar/Bloquear Lote).
- `server/src/modules/inventory/README.md` — tabela de endpoints, estrutura de use cases e seção de auditoria atualizadas; nova subseção "Quarentena de lotes de recebimento (item 8)".
- `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` — item 8 da tabela de prioridades marcado como resolvido (parcial — rating de fornecedor pendente).
- JSDoc completo em todos os arquivos novos/modificados (classes, métodos, parâmetros e retornos).

### Instruções de teste

1. **Migration** (não aplicada por este agente, conforme instrução — orquestrador aplica):
   ```bash
   cd server && npm run migration:up
   psql -c "SELECT enum_range(NULL::enum_lot_controls_status);"
   # Esperado: incluir 'quarantine'
   ```
2. **Recebimento de compra**: `POST /api/purchases/:id/receive` com um item novo → verificar que o `LotControl` criado tem `status = 'quarantine'` (não `available`) e que `products.quantity` foi incrementado normalmente.
3. **Listagem de quarentena**: `GET /api/inventory/lots?status=quarantine` → deve retornar os lotes recém-recebidos, com `product` e `supplier` populados.
4. **Liberação**: `POST /api/inventory/lots/:id/release` (perfil `admin`/`operator`) sobre um lote `quarantine` → `200`, `status = available`. Repetir sobre o mesmo lote já `available` → `422`.
5. **Bloqueio**: `POST /api/inventory/lots/:id/block` sem `reason` → `400`. Com `reason` válido sobre lote `quarantine` ou `available` → `200`, `status = blocked`. Sobre lote `consumed` → `422`.
6. **RNC bloqueia lote**: `POST /api/quality/non-conformities` com `product_id` + `lot_number` de um lote existente (`available`/`quarantine`/`reserved`) → lote deve mudar para `blocked` e `notes` deve conter `"Bloqueado pela RNC #<id>"`. Com `lot_number` inexistente → RNC criada normalmente, sem erro.
7. **FEFO da produção não regrediu**: concluir uma OP cujo componente só tem lotes em `quarantine`/`blocked` disponíveis → deve continuar falhando com `BusinessRuleError` ("não há lotes suficientes"), confirmando que o FEFO não seleciona esses status (comportamento pré-existente, apenas re-validado).
8. **Regressão geral**: `npm run typecheck` (limpo) e `npx jest tests/unit` (226/226 verdes, incluindo os 2 arquivos tocados/criados nesta entrega).

### Riscos residuais

- **Rating de fornecedor não realimentado**: o item 8 do levantamento também previa "realimenta rating" (do fornecedor a partir de RNCs de recebimento) — **não implementado** nesta entrega; ficou fora de escopo desta tarefa.
- **`down()` da migration é no-op**: remover o valor `'quarantine'` do enum no PostgreSQL exige recriar o tipo inteiro; se algum lote já estiver nesse status, um rollback destrutivo exigiria migrar essas linhas primeiro. Documentado no próprio arquivo de migration.
- **Testes de integração HTTP não foram criados** para os novos endpoints (`GET/POST /api/inventory/lots*`) — apenas unitários com mocks. Recomenda-se cobertura de integração (`server/tests/integration/`) em sprint futura.
- **RBAC do módulo `inventory`**: os novos endpoints `release`/`block` já exigem `admin`/`operator` (mais restritivo que o restante do módulo, que é apenas `authenticate`), conforme especificado na tarefa.

**Desenvolvedor**: Claude Code (Backend Engineer)

---

## Fase Frontend — Tela de Qualidade (`/quality`) — Item 8 do backlog de telas

**Data**: 2026-08-03
**Escopo**: Construir a tela `/quality` no `client/`, com duas abas: (A) Inspeção de recebimento (lotes em quarentena/bloqueados/liberados) e (B) Não-conformidades (RNC). Consumir exclusivamente os endpoints reais já existentes no backend (`/api/inventory/lots*` e `/api/quality/non-conformities`), verificados por leitura direta do código-fonte antes de implementar.
**Status**: ✅ Concluído (frontend apenas; nenhuma alteração em `server/`)

### Arquivos criados

- `client/src/api/lots.ts` — cliente HTTP para `GET /api/inventory/lots` (filtros `status`, `product_id`, paginação), `POST /api/inventory/lots/:id/release` (`notes` opcional) e `POST /api/inventory/lots/:id/block` (`reason` obrigatório). Tipos `Lot`, `LotStatus`, `LotListParams`.
- `client/src/api/nonConformities.ts` — cliente HTTP para `GET /api/quality/non-conformities` (filtros `status`, `severity`, paginação) e `POST /api/quality/non-conformities`. Tipos `NonConformity`, `NonConformityInput` e os enums reais do model (`origin`, `defect_type`, `severity`, `immediate_action`, `status`).
- `client/src/pages/quality/QualityPage.tsx` — página com duas abas (toggle local, sem sub-rotas), roteando o prefill de RNC vindo da aba de inspeção.
- `client/src/pages/quality/InspectionTab.tsx` — tabela de lotes com filtro por status (`quarantine` default, `blocked`, `available`), badges coloridos (`quarantine` âmbar, `blocked` vermelho, `available` verde, `expired` laranja via classe custom pois o componente `Badge` não tem variante laranja nativa, `consumed`/`reserved` cinza), dialog "Aprovar (liberar)" com campo de observações opcional e dialog "Reprovar (bloquear)" com motivo obrigatório (mínimo 3 caracteres, validado no client) e checkbox "Abrir RNC" que, ao confirmar, aciona `onOpenNonConformity` com os dados do lote pré-preenchidos.
- `client/src/pages/quality/NonConformitiesTab.tsx` — listagem paginada de RNCs com badges de severidade (`critical` vermelho, `major` âmbar, `minor` cinza) e status, dialog "Nova RNC" com todos os campos do `CreateNonConformityUseCase`/model real (`nc_number`, `origin`, `defect_type`, `severity`, `description`, `immediate_action`, `immediate_action_desc`, `product_id` via select de produtos, `supplier_id` via select de fornecedores, `lot_number`, `quantity_affected`), texto auxiliar avisando que RNC com `product_id` + `lot_number` bloqueia o lote automaticamente, e efeito que consome o prefill vindo da aba de inspeção (abre o dialog já preenchido).

### Decisão importante: `nc_number`

O model `NonConformity` (`server/src/models/NonConformity.ts`) define `nc_number` como `allowNull: false, unique: true`, e nem o `CreateNonConformityUseCase` nem o repositório Sequelize geram esse valor automaticamente (não há hook `beforeCreate`/default, nem sequência no schema SQL — a tabela `non_conformities` não aparece em nenhum arquivo de schema versionado, sugerindo criação via `sequelize.sync()`). Diante dessa ambiguidade e para não adivinhar um contrato não documentado, o formulário do frontend **gera um `nc_number` sugerido e editável** (`RNC-AAAAMMDD-XXXX`) e o envia explicitamente no payload de criação. **Ação para QA/backend**: confirmar se deve haver geração server-side (ex.: sequência dedicada) — se sim, o campo do frontend deve virar somente leitura ou ser removido do payload.

### Rotas e navegação

- `client/src/App.tsx` — adicionada `const QualityPage = lazy(() => import('@/pages/quality/QualityPage'))` e rota `/quality` (autenticada, sem restrição de role adicional — mesma política do restante do módulo Operações). Edição mínima, sem tocar na rota `/production/shop-floor` adicionada por outro agente.
- `client/src/layouts/AppLayout.tsx` — item de menu "Qualidade" (ícone `ShieldAlert` do `lucide-react`) no grupo "Operações", entre "MRP" e "Patrimônio"; entrada de breadcrumb `'/quality': ['Qualidade']`.

### Documentação atualizada

- `docs/governance/CRONOGRAMA_FRONTEND_2026-07-31.md` — nova subseção "Qualidade (item 8 do backlog de telas)" sob FE4, item marcado `[x]`.
- `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` — seção "Frontend" atualizada: contagem de "9 módulos com UI completa" → "10 módulos" (incluindo qualidade/RNC) e "12 módulos sem tela" → "11 módulos" (removido qualidade/RNC da lista de lacunas).

### O que o Agente QA (ou humano) deve testar na interface

1. **Navegação**: item "Qualidade" visível no menu lateral (grupo Operações) para todos os perfis autenticados; clicar leva a `/quality`; breadcrumb mostra "Qualidade".
2. **Aba Inspeção de recebimento**:
   - Filtro de status inicia em `quarantine`; trocar para `blocked`/`available` recarrega a tabela.
   - Badges de status com as cores especificadas (âmbar/vermelho/verde/laranja/cinza).
   - Botão "Aprovar" visível apenas para lotes `quarantine`/`blocked`, abre dialog de confirmação com campo de observações opcional; ao confirmar, chama `POST /lots/:id/release` e a tabela é invalidada/recarregada.
   - Botão "Reprovar" visível apenas para lotes `quarantine`/`available`, abre dialog exigindo motivo (tentar submeter vazio ou com menos de 3 caracteres deve bloquear no client com mensagem de erro, sem chamar a API).
   - Marcar o checkbox "Abrir RNC" antes de confirmar o bloqueio deve, após o bloqueio ter sucesso, trocar automaticamente para a aba de RNC com o dialog "Nova RNC" já aberto e os campos `origin=incoming`, `product_id`, `supplier_id`, `lot_number` e `description` pré-preenchidos.
   - Botões restritos a perfis `admin`/`operator` (verificar que um usuário `financial`, se existir no ambiente de teste, não vê as colunas de ação).
3. **Aba Não-conformidades (RNC)**:
   - Filtros de status e severidade funcionam e resetam a página.
   - Badges de severidade/status com as cores especificadas.
   - Dialog "Nova RNC": todos os campos obrigatórios (`nc_number`, `origin`, `defect_type`, `severity`, `description`, `immediate_action`) validados via zod antes do submit; `product_id`/`supplier_id` carregam as listas reais de `/api/products` e `/api/suppliers`; texto auxiliar abaixo do campo "Nº do lote" avisa sobre o bloqueio automático do lote.
   - Criar uma RNC com `product_id` + `lot_number` de um lote existente (`available`/`quarantine`/`reserved`) e confirmar, na aba de Inspeção, que o lote mudou para `blocked` (efeito colateral do backend, já validado na Fase de Quarentena acima — aqui é só a confirmação end-to-end pela UI).
   - Criar uma RNC sem `product_id`/`lot_number` deve funcionar normalmente (campos opcionais).
4. **Estados de loading/erro**: desligar a API (ou simular 500) e verificar que ambas as abas mostram mensagem amigável (sem stack trace) nas tabelas, e que os dialogs de ação exibem a mensagem de erro extraída via `extractApiErrorMessage`.
5. **Regressão**: `node ./node_modules/typescript/bin/tsc -b --noEmit` limpo e os 13 testes existentes (`node ./node_modules/vitest/vitest.mjs run`) continuam verdes — validado nesta entrega, nenhuma dependência nova foi instalada.

### Riscos residuais / fora de escopo

- Nenhum teste automatizado (vitest) foi criado especificamente para `QualityPage`/`InspectionTab`/`NonConformitiesTab` nesta entrega — apenas os 13 testes pré-existentes foram validados como não quebrados. Recomenda-se cobertura dedicada em sprint futura.
- A ambiguidade do `nc_number` (ver seção acima) deve ser resolvida com o time de backend antes do Go-Live definitivo da tela de qualidade.
- Não há tela de edição/fechamento de RNC (`PUT /api/quality/non-conformities/:id`, `DELETE .../:id`) — está fora do escopo desta tarefa (item 8 pediu apenas listagem + criação).

**Desenvolvedor**: Claude Code (Frontend Engineer)
**Data**: 2026-08-03

---

## Relatório de Variação de Custo (`GET /api/reports/cost-variance`) — Item 7 do levantamento

**Data**: 2026-08-03
**Escopo**: `server/` apenas (módulo `reports`). Nenhuma alteração em `client/`, `migrations/` ou `src/models/`.
**Status**: ✅ Concluído

### Resumo da feature

Novo endpoint `GET /api/reports/cost-variance?start_date&end_date` (autenticado,
período default 30 dias via `resolveReportPeriod`), seguindo 1:1 o padrão dos
relatórios de manufatura já existentes (`production`, `purchasing`):

- **`by_product`**: para cada produto com lançamento em `product_cost_ledgers`
  no período, compara `standard_cost` (`items.custo_padrao` via join
  `products.code = items.codigo`, `LEFT JOIN` com fallback `products.cost_price`
  quando não há item correspondente) contra `avg_real_cost` (média ponderada
  por quantidade dos lançamentos do ledger no período). Retorna
  `variance_abs`/`variance_rate` (protegido por `safeRate`) e é ordenado por
  `|variance_rate|` decrescente.
- **`purchase_price_variance`**: para cada par produto × fornecedor com
  compras não canceladas no período, compara `catalog_price`
  (`item_suppliers.unit_price` do vínculo item×fornecedor, `null` quando não
  há catálogo) contra `avg_paid_price` (média ponderada por quantidade de
  `purchase_order_items.unit_price`). `variance_abs`/`variance_rate` são
  `null` quando `catalog_price` é `null`.
- **`totals`**: `products_with_variance` (produtos com `|variance_rate| > 0.05`)
  e `avg_variance_rate` (variação média ponderada por quantidade, entre os
  produtos de `by_product`).

### Arquivos criados/modificados

- `server/src/modules/reports/domain/repositories/ReportsRepository.ts` —
  adicionados os stubs `findCostVarianceByProduct` e
  `findPurchasePriceVarianceByProductSupplier` (contrato).
- `server/src/modules/reports/infrastructure/sequelize/SequelizeReportsRepository.ts` —
  implementação SQL parametrizada (raw `sequelize.query`) dos dois métodos
  acima. Join dual-schema documentado inline (produto pode não ter item;
  item pode não ter catálogo de fornecedor).
- `server/src/modules/reports/application/use-cases/GetCostVarianceReportUseCase.ts`
  (novo) — orquestra `resolveReportPeriod`/`safeRate`, monta o contrato de
  resposta, ordena `by_product` e calcula os totais.
- `server/src/modules/reports/presentation/controllers/reportController.ts` —
  novo handler `exports.costVariance`.
- `server/src/modules/reports/presentation/routes/reports.ts` — nova rota
  `router.get('/cost-variance', authenticate, reportController.costVariance)`.
- `server/tests/unit/cost-variance-report.test.ts` (novo) — 5 testes:
  variância calculada e ordenada por `|variance_rate|`, `standard_cost = 0`
  protegido (sem NaN/Infinity), período sem lançamentos (`[]`/zeros),
  `purchase_price_variance` com `catalog_price` presente e com
  `catalog_price = null` (`variance_abs`/`variance_rate` devem ser `null`).

### Documentações atualizadas

- `docs/projeto/04-USE_CASES.md` — novo **UC-26: Relatório de Variação de
  Custo**, descrevendo endpoint, fluxo de cálculo, regras de negócio e
  proteção contra divisão por zero.
- `docs/governance/HANDOFF_CODEX.md` — esta seção.

### Contrato JSON (resposta)

```jsonc
{
  "success": true,
  "data": {
    "report_type": "cost_variance",
    "generated_at": "2026-08-03T12:00:00.000Z",
    "period": { "start_date": "2026-07-04", "end_date": "2026-08-03" },
    "by_product": [
      {
        "product_id": 12,
        "code": "ALTO-FALANTE-10",
        "name": "Alto-falante 10\"",
        "standard_cost": 100,
        "avg_real_cost": 105,
        "entries_count": 3,
        "total_quantity": 40,
        "variance_abs": 5,
        "variance_rate": 0.05
      }
    ],
    "purchase_price_variance": [
      {
        "product_id": 12,
        "code": "ALTO-FALANTE-10",
        "name": "Alto-falante 10\"",
        "supplier_id": 7,
        "company_name": "Fornecedor CI EVOK",
        "catalog_price": 90,
        "avg_paid_price": 99,
        "total_quantity": 50,
        "variance_abs": 9,
        "variance_rate": 0.1
      }
    ],
    "totals": { "products_with_variance": 1, "avg_variance_rate": 0.05 }
  }
}
```

### Instruções de teste

1. **Automatizado**: `cd server && npx jest tests/unit` — validado nesta
   entrega, 48 suites / 237 testes 100% verdes (incluindo os 5 novos de
   `cost-variance-report.test.ts`).
2. **Typecheck**: `cd server && npm run typecheck` — limpo (sem erros TS).
3. **Manual (requer banco com dados)**:
   - `GET /api/reports/cost-variance` sem parâmetros → período default 30
     dias, `200 OK`, contrato acima.
   - `GET /api/reports/cost-variance?start_date=2026-01-01&end_date=2026-01-31`
     → período customizado.
   - `start_date` maior que `end_date` → `422`/`ValidationError` (mesmo
     comportamento de `/production` e `/purchasing`).
   - Sem token → `401`.
   - Produto com `custo_padrao` do item cadastrado (0 e não-zero) para
     confirmar fallback e proteção `variance_rate = 0` quando padrão é 0.
   - Par item×fornecedor sem `item_suppliers` cadastrado → confirmar
     `catalog_price: null` e `variance_abs`/`variance_rate: null` em
     `purchase_price_variance`.

### Riscos residuais

- Não há teste de integração HTTP (supertest) dedicado a esta rota — apenas
  unitário do use case (mesma cobertura dos relatórios `production`/
  `purchasing` já existentes, que também não têm teste de integração
  próprio). Considerar cobertura E2E em sprint futura se o relatório virar
  crítico para decisão de precificação.
- `avg_variance_rate` em `totals` pondera apenas por `total_quantity` de
  `by_product` (não inclui `purchase_price_variance`); se o negócio quiser
  uma métrica combinada, é necessário alinhar a fórmula antes de expor em
  dashboard.

**Desenvolvedor**: Claude Code (Backend Engineer)
**Data**: 2026-08-03

---

## Camada de aplicação de Centros de Trabalho e Carga-Máquina (Concluída)

**Data**: 2026-08-03
**Escopo**: Novo módulo `server/src/modules/workCenters` (Clean Architecture) com
CRUD de centros de trabalho, substituição transacional de turnos e relatório
de carga-máquina (capacidade × carga por horizonte de dias). Não alterou
models/migrations (já existentes: `WorkCenter`, `WorkCenterShift`,
`ProductionRouteStep.work_center_id`) nem o módulo `reports`.
**Status**: ✅ Concluído

### Resumo da feature

- **CRUD** (`domain/repositories/WorkCenterRepository.ts` +
  `infrastructure/sequelize/SequelizeWorkCenterRepository.ts` +
  use cases `ListWorkCentersUseCase`, `GetWorkCenterByIdUseCase`,
  `CreateWorkCenterUseCase`, `UpdateWorkCenterUseCase`):
  - `GET /api/work-centers?active=&page=&limit=` — lista paginada com `shifts` incluídos.
  - `GET /api/work-centers/:id` — busca por id com `shifts` incluídos.
  - `POST /api/work-centers` — cria (zod strict); `code` é normalizado
    (`trim().toUpperCase()`) no use case antes da checagem de unicidade;
    `409 ConflictError` se `code` duplicado.
  - `PUT /api/work-centers/:id` — atualiza campos parciais + `active`;
    revalida unicidade de `code` se alterado (ignorando o próprio registro).
- **Turnos** (`ReplaceWorkCenterShiftsUseCase`):
  - `PUT /api/work-centers/:id/shifts` — substitui todos os turnos do
    centro em transação Sequelize (`delete` + `insert` sequencial, commit/
    rollback no controller). Valida `end_time > start_time` e ausência de
    sobreposição de turnos no mesmo `weekday`; viola → `422 BusinessRuleError`.
- **Carga-máquina** (`GetWorkCenterLoadUseCase`):
  - `GET /api/work-centers/load?days=1..60` (default 7) — para cada centro
    ativo:
    - `capacity_hours`: se há turnos cadastrados, soma as horas de cada
      turno ponderada pela ocorrência do seu `weekday` no horizonte de
      `days` dias a partir de hoje, × `machines_count` × `efficiency_factor`.
      **Sem turnos cadastrados**, usa fallback
      `capacity_hours_per_day * days * machines_count * efficiency_factor`
      — conta todos os `days` dias do horizonte, **inclusive fins de
      semana** (documentado também no código: sem turnos não há como
      inferir quais dias são produtivos).
    - `load_hours`: SQL raw parametrizado
      (`SequelizeWorkCenterRepository.aggregateLoadByWorkCenter`) que soma,
      por `work_center_id`, `GREATEST(quantity - quantity_produced, 0) *
      (standard_time_minutes + setup_time_minutes) / 60` das etapas de
      `production_route_steps` (`work_center_id` não nulo, `is_active =
      true`) cujo roteiro (`production_routes.product_id`) corresponde ao
      `product_id` da OP, filtrando OPs em
      `planned/released/in_progress/paused`. `setup_time_minutes` é somado
      uma vez por etapa (não por unidade), conforme especificado.
    - `utilization_rate = load_hours / capacity_hours`, protegido:
      `null` quando `capacity_hours === 0`.
    - Resposta ordenada por `utilization_rate` desc (centros com `null`
      tratados como o menor valor, ficam ao final).
- **Rota registrada** em `server/app.ts`:
  `app.use('/api/work-centers', require('./src/modules/workCenters/presentation/routes/workCenters'))`,
  logo após `production-orders`. A rota `GET /load` é declarada **antes**
  de `GET /:id` no router para não ser capturada pelo parâmetro `:id`.

### Contrato de resposta — `GET /api/work-centers/load`

```json
{
  "success": true,
  "data": {
    "horizon_days": 7,
    "centers": [
      {
        "id": 1,
        "code": "CNC-01",
        "name": "CNC 01",
        "machines_count": 2,
        "capacity_hours": 112,
        "load_hours": 20,
        "utilization_rate": 0.1786,
        "steps_count": 3
      }
    ]
  }
}
```

### Arquivos criados

- `server/src/modules/workCenters/domain/repositories/WorkCenterRepository.ts`
- `server/src/modules/workCenters/infrastructure/sequelize/SequelizeWorkCenterRepository.ts`
- `server/src/modules/workCenters/application/use-cases/ListWorkCentersUseCase.ts`
- `server/src/modules/workCenters/application/use-cases/GetWorkCenterByIdUseCase.ts`
- `server/src/modules/workCenters/application/use-cases/CreateWorkCenterUseCase.ts`
- `server/src/modules/workCenters/application/use-cases/UpdateWorkCenterUseCase.ts`
- `server/src/modules/workCenters/application/use-cases/ReplaceWorkCenterShiftsUseCase.ts`
- `server/src/modules/workCenters/application/use-cases/GetWorkCenterLoadUseCase.ts`
- `server/src/modules/workCenters/presentation/validators/workCenterValidators.ts`
- `server/src/modules/workCenters/presentation/controllers/workCenterController.ts`
- `server/src/modules/workCenters/presentation/routes/workCenters.ts`
- `server/tests/unit/work-centers.test.ts` (12 testes)

### Arquivos modificados

- `server/app.ts` — registrada a rota `/api/work-centers`.
- `docs/governance/HANDOFF_CODEX.md` — esta seção.

### Instruções de teste

1. **Automatizado**: `cd server && npx jest tests/unit` — 49 suites / 249
   testes 100% verdes (incluindo os 12 novos de `work-centers.test.ts`:
   `code` duplicado → 409, turnos sobrepostos/`end_time<=start_time` → 422,
   cálculo de capacidade com e sem turnos, `utilization_rate` protegida,
   ordenação desc com `null` ao final).
2. **Typecheck**: `cd server && npm run typecheck` — limpo (sem erros TS).
3. **Manual (requer banco com dados)**:
   - `POST /api/work-centers` com `code` já existente (mesmo em minúsculo/
     com espaços) → `409`.
   - `PUT /api/work-centers/:id/shifts` com dois turnos sobrepostos no
     mesmo `weekday` → `422`; com `end_time` menor/igual a `start_time` →
     `422`; com turnos válidos → `200` e turnos antigos substituídos
     (conferir tabela `work_center_shifts`).
   - `GET /api/work-centers/load?days=7` com um centro que tem
     `WorkCenterShift` cadastrado e um sem: conferir que o cálculo de
     `capacity_hours` segue os dois caminhos (turnos vs. fallback diário).
   - Criar uma OP (`planned`) cujo produto tenha um `ProductionRoute`
     ativo com etapas apontando `work_center_id` para um centro de
     trabalho: conferir que `load_hours` e `steps_count` refletem a soma
     esperada e que `utilization_rate` bate com `load_hours/capacity_hours`.
   - Sem token → `401`; usuário sem perfil `admin`/`operator` tentando
     `POST`/`PUT` → `403`.

### Riscos residuais

- Quando um produto tem mais de um `ProductionRoute` (ex.: revisões
  concorrentes/históricas), a agregação de carga soma etapas de **todos**
  os roteiros vinculados ao `product_id` da OP, pois o schema atual não
  amarra a OP a uma revisão específica de roteiro
  (`production_orders` não tem `production_route_id`). Se o negócio criar
  roteiros duplicados sem inativar os antigos (`status != 'active'`), a
  carga pode ficar superestimada. Mitigação recomendada (fora do escopo
  desta entrega): filtrar por `production_routes.status = 'active'` na
  agregação, ou adicionar `production_route_id` em `production_orders`.
- Fallback de capacidade sem turnos conta literalmente todos os `days` do
  horizonte (inclusive sábados/domingos), podendo superestimar a
  capacidade de centros que não operam em fins de semana e ainda não
  cadastraram `WorkCenterShift`. Documentado no código e nesta seção;
  correção natural é o time de PCP cadastrar os turnos reais.
- Não há teste de integração HTTP (supertest) dedicado às rotas — apenas
  cobertura unitária dos use cases (mesmo padrão dos demais módulos
  recentes deste handoff, ex.: `cost-variance`, `purchase-requisitions`).
- Não foram tocados `docs/database/04-DICIONARIO_DADOS.md`/`docs/database/DATABASE.md` nem
  `docs/projeto/04-USE_CASES.md`: os models `WorkCenter`/`WorkCenterShift`
  e a coluna `production_route_steps.work_center_id` já estavam prontos e
  documentados por outro agente antes desta tarefa (instrução explícita
  para não tocar em models/migrations); nenhuma regra de negócio nova foi
  criada que exigisse novo caso de uso em `04-USE_CASES.md` além do que já
  está descrito acima nesta seção de handoff.

**Desenvolvedor**: Claude Code (Backend Engineer)

---

## Fase — Frontend: aba "Custos" em Relatórios + tela "Centros de Trabalho" (Concluída)

**Data**: 2026-08-03
**Escopo**: Consumir no `client/` os dois endpoints já entregues no backend
(`GET /api/reports/cost-variance` e o módulo `work-centers`), sem alterar
nenhum arquivo de `server/`.
**Status**: ✅ Concluído

### A) Aba "Custos" em `src/pages/reports/ReportsPage.tsx`

- Terceira aba (`Produção` / `Compras` / **`Custos`**), reaproveitando o
  mesmo filtro de período (`start_date`/`end_date`) já existente na página.
- Tiles: "Produtos com variância > 5%" (`totals.products_with_variance`,
  tom vermelho se > 0) e "Variância média ponderada" (`totals.avg_variance_rate`).
- Tabela "Custo real vs padrão" (`by_product`): código, nome, padrão (BRL),
  real médio (BRL), variância % colorida (vermelho se > +5%, verde se <= 0).
- Tabela "Preço de compra vs catálogo" (`purchase_price_variance`): produto,
  fornecedor, catálogo (BRL ou `—` quando `catalog_price` é `null`), pago
  médio (BRL), variância % (`—` quando não há catálogo).
- Nova função `getCostVarianceReport` + interfaces `CostVarianceReport`,
  `CostVarianceByProduct`, `PurchasePriceVarianceByProductSupplier`,
  `CostVarianceTotals` em `src/api/reports.ts` (contrato conferido em
  `server/src/modules/reports/application/use-cases/GetCostVarianceReportUseCase.ts`).

### B) Nova tela `/production/work-centers` (`src/pages/production/WorkCentersPage.tsx`)

- **Carga-máquina**: seletor de horizonte (7/14/30 dias,
  `GET /api/work-centers/load?days=`), tabela com centro, máquinas,
  capacidade (h), carga (h) e barra de utilização proporcional
  (`div` com largura em %, cor verde `<80%`, âmbar `80–100%`, vermelho `>100%`).
- **Centros de trabalho**: tabela com CRUD (`GET/POST/PUT /api/work-centers`)
  via dialog `react-hook-form` + `zod` (código, nome, descrição, máquinas,
  capacidade h/dia, fator de eficiência, `active` no modo edição). Erro
  `409` (código duplicado) exibido via `extractApiErrorMessage`.
- **Dialog de turnos**: `useFieldArray` para adicionar/remover linhas
  (dia da semana Domingo..Sábado, horário início/fim `HH:MM`), salvar
  substitui todos os turnos (`PUT /api/work-centers/:id/shifts`); erro
  `422` de sobreposição/`end_time<=start_time` exibido no dialog sem fechá-lo.
- RBAC: ações de escrita (criar/editar centro, salvar turnos) visíveis
  apenas para `admin`/`operator` (mesmo padrão de `hasRole` já usado em
  `SuppliersPage`/`MrpPage`); leitura (carga-máquina, listagem, turnos)
  disponível para qualquer role autenticado.
- Nova camada `src/api/workCenters.ts` com interfaces `WorkCenter`,
  `WorkCenterShift`, `WorkCenterLoadRow`, `WorkCenterLoadReport` e as
  funções `listWorkCenters`, `getWorkCenterById`, `createWorkCenter`,
  `updateWorkCenter`, `replaceWorkCenterShifts`, `getWorkCenterLoad`
  (contrato conferido em `server/src/modules/workCenters/presentation/{routes,controllers,validators}`).

### Arquivos criados

- `client/src/api/workCenters.ts`
- `client/src/pages/production/WorkCentersPage.tsx`

### Arquivos modificados

- `client/src/api/reports.ts` — função `getCostVarianceReport` + tipos.
- `client/src/pages/reports/ReportsPage.tsx` — terceira aba "Custos".
- `client/src/App.tsx` — import lazy de `WorkCentersPage` + rota
  `/production/work-centers` dentro do layout autenticado.
- `client/src/layouts/AppLayout.tsx` — item "Centros de Trabalho" no grupo
  Produção da sidebar (ícone `Factory`, já importado) + entrada em
  `BREADCRUMBS`.
- `docs/governance/CRONOGRAMA_FRONTEND_2026-07-31.md` — marcado item de Centros de
  Trabalho como concluído na seção FE4.
- `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` — itens 5 e 7 da tabela de
  prioridades marcados como entregues (Centros de Trabalho e Custo real
  vs padrão), seção de frontend atualizada.

### Instruções de teste (Codex / QA)

1. **Automatizado**: `cd client && node ./node_modules/typescript/bin/tsc -b --noEmit`
   (limpo) e `node ./node_modules/vitest/vitest.mjs run` (13 testes, todos
   verdes — nenhum teste novo foi adicionado nesta entrega, apenas UI de
   consumo dos endpoints já testados no backend).
2. **Manual — aba Custos** (`/reports`, aba "Custos"):
   - Com produtos que tenham `product_cost_ledgers` no período: conferir
     tile de contagem `>5%` e cor da variância por linha (vermelho/verde).
   - Sem `catalog_price` (item sem `item_suppliers.unit_price` cadastrado):
     conferir `—` nas colunas de catálogo e variância da segunda tabela.
   - Trocar o período (mesmo filtro das outras abas) e confirmar refetch.
3. **Manual — Centros de Trabalho** (`/production/work-centers`):
   - Criar centro com `code` já existente → mensagem de erro 409 legível
     no dialog (sem fechar).
   - Trocar horizonte 7/14/30 e conferir que a tabela de carga-máquina
     recarrega e a barra de utilização muda de cor conforme a faixa.
   - Abrir dialog de turnos de um centro, adicionar dois turnos
     sobrepostos no mesmo dia da semana e salvar → erro 422 exibido no
     dialog; corrigir e salvar novamente → sucesso, dialog fecha e a
     tabela de carga-máquina reflete a nova capacidade.
   - Logar como `operator`/role sem permissão de escrita e confirmar que
     os botões de criar/editar centro não aparecem (mas a leitura de
     carga-máquina/listagem continua visível).

### Riscos residuais

- Nenhum teste automatizado de frontend (Vitest) foi criado especificamente
  para a aba Custos ou para `WorkCentersPage` nesta entrega — cobertura
  automatizada continua restrita ao backend (use cases já testados). Se o
  padrão do projeto passar a exigir teste de componente por tela, este é
  um débito a considerar.
- A tela de Centros de Trabalho não expõe paginação (usa `limit: 100`, o
  mesmo teto de listagem simples que outras telas menores do sistema);
  se o número de centros de trabalho crescer muito, será necessário
  adicionar paginação real na tabela.

**Desenvolvedor**: Claude Code (Senior Frontend Engineer & UI Architect)

---

## Fase — Schema: Engenharia (P&D, Desenhos) + Testes Acústicos (Concluída)

**Data**: 2026-08-03
**Escopo**: Criar migrations Sequelize e models TypeScript para 3 novas tabelas
de suporte a engenharia de produto e qualidade acústica, sem tocar em
`server/src/modules/`. Nenhuma migration foi aplicada nesta entrega
(apenas gerada e validada via `tsc --noEmit`).
**Status**: ✅ Concluído (schema + models); migrations **NÃO aplicadas** ainda.

### Novas tabelas

1. **`engineering_projects`** — projetos de P&D/NPI (novo produto, melhoria,
   customização, pesquisa), com estágio do PDP (`concept → design → prototype
   → testing → homologation → production`), status, prioridade, orçamento
   (`NUMERIC(15,2)`) e custo real acumulado. FK opcional para `products.id`
   (`ON DELETE SET NULL`) e para `users.id` (`project_manager_id`,
   `ON DELETE SET NULL`).
2. **`product_drawings`** — desenhos técnicos (CAD) vinculados a um produto
   (`product_id` FK `ON DELETE CASCADE`), com `UNIQUE(drawing_number, revision)`,
   tipo de desenho (`assembly/detail/exploded/schematic/bom`), status de ciclo
   de vida (`draft/released/obsolete/canceled`) e aprovador (`approved_by`
   FK `users.id`, `ON DELETE SET NULL`).
3. **`acoustic_test_results`** — resultados de teste de laboratório acústico
   (impedância, resposta em frequência, THD, potência RMS/pico, vida útil,
   polaridade, ruído, Thiele-Small), com `parameters`/`curve_data` em `JSONB`,
   `result`/`specification_min`/`specification_max` em `NUMERIC(12,4)`,
   `passed` booleano obrigatório, FK obrigatórias para `products.id`
   (`ON DELETE RESTRICT`) e `users.id` (`tester_id`, `ON DELETE RESTRICT`),
   e FKs opcionais para `production_orders.id` e `non_conformities.id`
   (ambas `ON DELETE SET NULL` — permite ligar um teste reprovado a uma NC
   já existente).

### Arquivos criados

- `server/migrations/20260803-000005-create-engineering-tables.cjs` — cria
  `engineering_projects` e `product_drawings` (com `up`/`down` completos e
  `DROP TYPE` dos ENUMs no rollback).
- `server/migrations/20260803-000006-create-acoustic-tests.cjs` — cria
  `acoustic_test_results` (com `up`/`down` completos e `DROP TYPE` do ENUM
  `test_type` no rollback).
- `server/src/models/EngineeringProject.ts`
- `server/src/models/ProductDrawing.ts`
- `server/src/models/AcousticTestResult.ts`

### Arquivos modificados

- `server/src/models/index.ts` — imports dos 3 novos models; associações:
  - `Product.hasMany(EngineeringProject, { as: 'engineering_projects' })` /
    `EngineeringProject.belongsTo(Product)`
  - `User.hasMany(EngineeringProject, { foreignKey: 'project_manager_id', as: 'managed_engineering_projects' })`
  - `Product.hasMany(ProductDrawing, { as: 'drawings' })` / `ProductDrawing.belongsTo(Product)`
  - `User.hasMany(ProductDrawing, { foreignKey: 'approved_by', as: 'approved_product_drawings' })`
  - `Product.hasMany(AcousticTestResult, { as: 'acoustic_test_results' })` / `AcousticTestResult.belongsTo(Product)`
  - `ProductionOrder.hasMany(AcousticTestResult, { as: 'acoustic_test_results' })` / `belongsTo(ProductionOrder)`
  - `User.hasMany(AcousticTestResult, { foreignKey: 'tester_id', as: 'acoustic_tests_performed' })`
  - `NonConformity.hasMany(AcousticTestResult, { as: 'acoustic_test_results' })` / `belongsTo(NonConformity)`
  - Exports atualizados: `EngineeringProject, ProductDrawing, AcousticTestResult`.
- `docs/database/DATABASE.md` — 3 novas seções no Dicionário de Dados
  (`engineering_projects`, `product_drawings`, `acoustic_test_results`) e
  8 novas linhas na tabela de Relacionamentos.

### Convenções respeitadas

- `underscored: true` em todos os models → migrations com `created_at`/`updated_at`
  (nunca `createdAt`).
- `products.id`, `users.id`, `production_orders.id`, `non_conformities.id` são
  todos `INTEGER` (não UUID) — FKs tipadas corretamente como `INTEGER`.
- Campos monetários/quantitativos usam `NUMERIC`/`DECIMAL` (nunca `FLOAT`):
  `budget`/`actual_cost` em `NUMERIC(15,2)`; `result`/`specification_min`/
  `specification_max` em `NUMERIC(12,4)` (camada de migration usa
  `Sequelize.NUMERIC`, camada de model Sequelize usa `DataTypes.DECIMAL` —
  ambos mapeiam para `NUMERIC` no PostgreSQL, conforme padrão já usado em
  `WorkCenter`/`ProductionOrder`).
- Nomenclatura de migration segue o padrão `20260803-000004-create-work-centers.cjs`.

### Pendências para o próximo agente (Codex/QA ou Backend Engineer)

1. **Aplicar as migrations** (não foi feito nesta entrega):
   ```bash
   cd server
   npm run migration:up
   npm run migration:status   # confirmar 000005 e 000006 aplicadas
   ```
2. **Testar rollback** (`down()`) de ambas as migrations em ambiente de
   desenvolvimento antes de ir para produção, validando que os `DROP TYPE`
   dos ENUMs não quebram se houver alguma dependência residual.
3. Nenhum controller/rota/use-case foi criado — os 3 models existem apenas
   na camada de dados. Módulos de aplicação (`server/src/modules/engineering/`,
   `server/src/modules/quality/acousticTests/` ou equivalente) ficam para uma
   entrega futura, incluindo RBAC e validação de payload.
4. Avaliar se `acoustic_test_results.parameters` deve ter uma validação de
   schema JSONB (ex.: os 13 parâmetros Thiele-Small) na camada de aplicação,
   já que o banco apenas garante `JSONB` válido, não a forma do conteúdo.

**Desenvolvedor**: Claude Code (Senior PostgreSQL DBA & Data Architect)
**Data**: 2026-08-03

---

## Fase Seguinte — Módulos de Aplicação `engineering` e `laboratory` (Concluída)

**Data**: 2026-08-03
**Escopo**: Atender a pendência nº 3 da fase anterior — criar os módulos de
aplicação (Clean Architecture) para os 3 models já existentes na camada de
dados (`EngineeringProject`, `ProductDrawing`, `AcousticTestResult` via
`ItemEspecificacaoTecnica`).
**Status**: ✅ Concluído (sem tocar em `client/`, models ou migrations —
apenas `server/src/modules/`, `server/app.ts` e documentação)

### Módulos criados

#### `server/src/modules/engineering/` — rotas sob `/api/engineering`
- **Projetos de Engenharia (P&D)**: `GET/POST /projects`, `GET/PUT /projects/:id`
- **Desenhos Técnicos**: `GET/POST /drawings`, `PUT /drawings/:id`,
  `POST /drawings/:id/release` (draft→released, seta `approved_by`/`approval_date`),
  `POST /drawings/:id/obsolete` (released→obsolete)
- **Ficha Técnica Thiele-Small**: `GET/PUT /items/:itemId/technical-spec`
  (upsert em `ItemEspecificacaoTecnica`, 13 parâmetros T-S validados como
  números opcionais dentro do JSONB `atributos`)

#### `server/src/modules/laboratory/` — rotas sob `/api/laboratory`
- `POST /tests` — registra `AcousticTestResult`; `passed` calculado
  automaticamente (result vs. faixa de especificação); `tester_id` sempre do
  JWT; cria RNC via `CreateNonConformityUseCase` (reaproveitado, sem
  duplicar lógica) quando `passed=false` e `create_rnc_on_fail=true`
- `GET /tests` — listagem paginada com filtros e includes `product`/`tester`
- `GET /tests/summary` — agregado por `test_type` (total/passed/failed/pass_rate),
  SQL raw parametrizado

### Arquitetura (padrão Clean Architecture, replicado de `modules/workCenters`)
Cada módulo segue: `domain/repositories` (contrato abstrato) →
`infrastructure/sequelize` (implementação concreta) → `application/use-cases`
(regras de negócio, uma classe por caso de uso, recebe o repositório por
injeção no construtor) → `presentation/{validators,controllers,routes}`
(Zod `strict()`, controllers finos delegando aos use cases, `logAction` em
todos os writes).

### Montagem de rotas em `server/app.ts`
```ts
app.use('/api/engineering/bom', require('./src/modules/bom/presentation/routes/bom'));
// IMPORTANTE: registrado APOS '/api/engineering/bom' para nao capturar suas rotas.
app.use('/api/engineering', require('./src/modules/engineering/presentation/routes/engineering'));
app.use('/api/laboratory', require('./src/modules/laboratory/presentation/routes/laboratory'));
```
O router de `bom` continua montado **antes** do novo router de `engineering`
— o Express resolve `app.use` na ordem declarada, então
`/api/engineering/bom/*` cai no router de BOM, e `/api/engineering/projects`,
`/api/engineering/drawings`, `/api/engineering/items/:itemId/technical-spec`
caem no novo router. Nenhuma rota pré-existente foi alterada ou quebrada.

### Reaproveitamento de lógica (sem duplicação)
`CreateAcousticTestUseCase` (laboratory) instancia diretamente
`CreateNonConformityUseCase` + `SequelizeNonConformitiesRepository` do módulo
`nonConformities` já existente, para criar a RNC no fail — herdando de graça
o bloqueio automático de lote (`LotControl`) quando `lot_number`+`product_id`
casam com um lote em status bloqueável. Nenhuma regra de RNC foi duplicada.

### Arquivos criados
```
server/src/modules/engineering/domain/repositories/EngineeringRepository.ts
server/src/modules/engineering/infrastructure/sequelize/SequelizeEngineeringRepository.ts
server/src/modules/engineering/application/use-cases/ListProjectsUseCase.ts
server/src/modules/engineering/application/use-cases/GetProjectByIdUseCase.ts
server/src/modules/engineering/application/use-cases/CreateProjectUseCase.ts
server/src/modules/engineering/application/use-cases/UpdateProjectUseCase.ts
server/src/modules/engineering/application/use-cases/ListDrawingsUseCase.ts
server/src/modules/engineering/application/use-cases/CreateDrawingUseCase.ts
server/src/modules/engineering/application/use-cases/UpdateDrawingUseCase.ts
server/src/modules/engineering/application/use-cases/ReleaseDrawingUseCase.ts
server/src/modules/engineering/application/use-cases/ObsoleteDrawingUseCase.ts
server/src/modules/engineering/application/use-cases/GetTechnicalSpecUseCase.ts
server/src/modules/engineering/application/use-cases/UpsertTechnicalSpecUseCase.ts
server/src/modules/engineering/presentation/validators/engineeringValidators.ts
server/src/modules/engineering/presentation/controllers/engineeringController.ts
server/src/modules/engineering/presentation/routes/engineering.ts

server/src/modules/laboratory/domain/repositories/LaboratoryRepository.ts
server/src/modules/laboratory/infrastructure/sequelize/SequelizeLaboratoryRepository.ts
server/src/modules/laboratory/application/use-cases/CreateAcousticTestUseCase.ts
server/src/modules/laboratory/application/use-cases/ListAcousticTestsUseCase.ts
server/src/modules/laboratory/application/use-cases/GetAcousticTestsSummaryUseCase.ts
server/src/modules/laboratory/presentation/validators/laboratoryValidators.ts
server/src/modules/laboratory/presentation/controllers/laboratoryController.ts
server/src/modules/laboratory/presentation/routes/laboratory.ts

server/tests/unit/engineering-module.test.ts
server/tests/unit/laboratory-tests.test.ts
```

### Arquivos modificados
- `server/app.ts` — registro dos 2 novos routers (`/api/engineering` e
  `/api/laboratory`), preservando `/api/engineering/bom` já montado
- `docs/projeto/04-USE_CASES.md` — adicionados UC-ENG-01 a UC-ENG-03 e
  UC-LAB-01/UC-LAB-02

### Testes e validação
- `npm run typecheck` (server): **limpo**, 0 erros
- `npx jest tests/unit`: **51 suítes, 271 testes, 100% verde** (sem
  regressões nas suítes pré-existentes)
- Novos testes cobrem: 409 em `project_code`/`drawing_number+revision`
  duplicados; transições válidas/inválidas de `release`/`obsolete` (422
  `BusinessRuleError`); 404 (`NotFoundError`) em item/desenho/projeto
  inexistente; cálculo automático de `passed` (dentro/fora da faixa, faixa
  parcial); 422 (`ValidationError`) quando não há `result` nem faixa; criação
  de RNC no fail com `create_rnc_on_fail=true` (e não-criação nos demais
  casos); `tester_id` sempre do JWT

### Pendências / riscos residuais para o próximo agente
1. **Migrations não aplicadas neste turno** (fora de escopo — instrução
   explícita de não rodar docker/migrations). Confirmar com
   `npm run migration:status` antes de exercitar os endpoints via HTTP real.
2. Nenhum teste de integração HTTP (supertest) foi criado para os novos
   endpoints — apenas unitários com mocks de repositório. Recomenda-se
   suíte de integração antes do Go-Live, cobrindo RBAC (`admin`/`operator`)
   e os contratos JSON reais.
3. `ItemEspecificacaoTecnica.atributos` continua sem validação de schema
   JSONB no banco (apenas `JSONB` válido); a validação dos 13 parâmetros
   Thiele-Small agora existe na camada de aplicação (Zod), mas campos extras
   são aceitos via `.catchall()` — decisão consciente para não travar itens
   de outras famílias técnicas (CABO, AMPLIFICADOR) que usam o mesmo upsert.
4. `IDOR`/`company_id` (bloqueador P0 já mapeado no CLAUDE.md) não foi
   endereçado nestes módulos — os novos endpoints seguem o mesmo padrão de
   autenticação/autorização (`authenticate` + `authorize`) do restante do
   sistema, sem isolamento multi-tenant (fora do escopo desta tarefa).

**Desenvolvedor**: Claude Code (Senior Backend Engineer)
**Data**: 2026-08-03

---

## Frontend — Onda 1 da proposta de departamentos: Logística (Estoque + Recebimento) + separação Produto×Estoque

**Data**: 2026-08-03
**Escopo**: `client/` apenas (nenhuma alteração em `server/`). Nova página
`/logistics/estoque` (4 abas), nova página `/logistics/recebimento`,
remoção da movimentação de estoque de `ProductsPage` (agora exclusiva de
Logística) e navegação/breadcrumbs correspondentes.
**Status**: ✅ Concluído — `tsc -b --noEmit` limpo, suíte de testes 13/13 verde.

### Componentes criados

- `src/pages/logistics/InventoryPage.tsx` — página com 4 abas (`Saldos`,
  `Extrato`, `Lotes`, `Contagens`), mesmo padrão de abas por botão usado em
  `QualityPage.tsx`.
- `src/pages/logistics/BalancesTab.tsx` — tiles de indicadores (abaixo do
  mínimo via `GET /api/inventory/low-stock`; lotes em quarentena/bloqueados
  via `GET /api/inventory/lots?status=quarantine|blocked`, usando apenas
  `pagination.total`, `limit: 1`; valor em estoque via
  `GET /api/inventory/stock-report`, campo `summary.total_value`) + tabela de
  produtos (`GET /api/products`, busca + paginação) com colunas
  código/nome/saldo/reservado/mínimo/situação (pill `OK`/`Abaixo do mínimo`)
  + ação "Movimentar" que abre `StockMovementDialog` — **este dialog foi
  reaproveitado integralmente de `ProductsPage.tsx`** (mesmo endpoint
  `POST /api/products/movements`, mesmo payload `{ product_id, type, quantity,
  description }`), apenas com as `queryKey`s de invalidação atualizadas para
  os novos caches de Logística. A coluna "Reservado" está fixa em `-`: o
  backend atual não expõe reserva por produto (só agregada/global), documentado
  inline no componente.
- `src/pages/logistics/ExtractTab.tsx` — `GET /api/inventory/movements`
  paginado (`type` é `in|out|adjustment` no backend, badge de cor por tipo),
  colunas data/produto/tipo/quantidade/motivo/referência
  (`reference_type`/`reference_id`, quando presentes).
- `src/pages/logistics/LotsTab.tsx` — somente leitura, filtro por `status`
  (`GET /api/inventory/lots?status=`), badges coloridos (`available` verde,
  `quarantine` âmbar, `blocked` vermelho, `consumed` cinza, `expired`
  laranja) — reutiliza o mapeamento de `InspectionTab.tsx` de `/quality`, mas
  **sem** os botões de liberar/bloquear (aviso explícito no comentário do
  arquivo: ações continuam exclusivas da Qualidade).
- `src/pages/logistics/CountsTab.tsx` — card simples com botão/link para
  `/products/inventory-counts` (página não movida nesta onda).
- `src/pages/logistics/ReceivingPage.tsx` — fila de recebimento: como
  `GET /api/purchases` só aceita um único `status` por requisição (sem OR,
  confirmado em `ListPurchasesUseCase`/`SequelizePurchaseRepository`), a fila
  faz **duas** queries (`status=sent` e `status=partial`) e combina/ordena
  client-side por `expected_date` (destaque vermelho quando vencida).
- `src/pages/logistics/ReceivingConferenceDialog.tsx` — dialog de
  conferência: `useFieldArray` com pedida/já recebida (somente leitura) +
  campo "receber agora" + `lot_number`/`expires_at` opcionais por item, e
  `invoice_number` obrigatório no nível do formulário. Submit em
  `POST /api/purchases/:id/receive` com o payload exato de
  `receivePurchaseItemsSchema` do backend
  (`{ invoice_number, items: [{ item_id, quantity, lot_number?, expires_at? }] }`
  — `item_id` é o id do `PurchaseItem`, não do produto). Após sucesso, exibe
  aviso "Lotes recebidos entram em quarentena para inspeção (Qualidade)" com
  link para `/quality` e invalida `purchases`/`lots`/`products`/`movements`.

### API client (`src/api/`)

- `inventory.ts`: adicionado `getStockReport()` (`GET /api/inventory/stock-report`,
  shape `{ summary: { total_products, total_items, total_value,
  low_stock_count }, products }` confirmado em `GetStockReportUseCase.ts` —
  **não paginado**, retorna todos os produtos ativos); `InventoryMovement`
  ganhou `reference_id`/`reference_type`; `type` virou o union
  `'in' | 'out' | 'adjustment'` (confirmado em
  `SequelizeInventoryRepository.listMovements`); `listMovements` aceita
  `type`/`start_date`/`end_date` além de `product_id`.
- `purchases.ts`: **correção de contrato** — `receivePurchaseItems` estava
  divergente do backend (faltava `invoice_number`, obrigatório, e usava
  `product_id` implícito em vez de deixar claro que `item_id` é o id do
  `PurchaseItem`). Assinatura nova:
  `receivePurchaseItems(id, { invoice_number, items })`. Adicionado
  `getPurchase(id)` (`GET /api/purchases/:id`, usado pelo dialog de
  conferência). **Efeito colateral**: `PurchasesPage.tsx` (`ReceiveItemsDialog`)
  também foi ajustado para o novo contrato (campo de NF adicionado ao
  formulário existente) — sem essa correção o recebimento nessa tela já
  legada quebraria em runtime com 400 (`invoice_number` ausente).

### `ProductsPage.tsx` — separação Produto×Estoque

- Removidos: `StockMovementDialog` (movido, não perdido — agora vive em
  `BalancesTab.tsx`), estado `movementProduct`, botão "Movimentar" na linha
  da tabela, coluna "Estoque" (substituída por "Unidade", já disponível no
  payload de `Product`).
- Mantido: cadastro, foto, QR Code, Fornecedores (dialog/sheet existente),
  inativação.
- Adicionado aviso `text-sm text-muted-foreground` no topo da página, com
  link para `/logistics/estoque`.
- Docstring do componente atualizada para refletir o novo escopo (cadastro,
  não operação de estoque).

### Navegação (`App.tsx` / `AppLayout.tsx`)

- Rotas lazy `/logistics/estoque` → `InventoryPage` e `/logistics/recebimento`
  → `ReceivingPage`, dentro do `AppLayout` protegido (mesmo padrão de
  `Suspense`/`PageFallback` das demais rotas).
- Nova seção "Logística" na sidebar, posicionada antes de "Operações", com
  ícones `Warehouse` (Estoque) e `PackageCheck` (Recebimento) do
  `lucide-react` (confirmados existentes na versão instalada).
- Breadcrumbs `'/logistics/estoque': ['Logística', 'Estoque']` e
  `'/logistics/recebimento': ['Logística', 'Recebimento']`.

### O que o Agente QA (ou humano) deve testar

1. **Saldos**: abrir `/logistics/estoque`, conferir se os 4 tiles carregam
   (abaixo do mínimo, quarentena, bloqueados, valor em estoque) e se a busca
   de produtos filtra corretamente; testar "Movimentar" (entrada e saída) e
   confirmar que o saldo na tabela atualiza sem F5 (invalidação de cache).
2. **Extrato**: confirmar paginação e que o badge de tipo bate com a
   movimentação real (entrada verde, saída vermelha, ajuste cinza).
3. **Lotes**: trocar o filtro de situação e confirmar que não há botões de
   ação nesta aba (ações continuam só em `/quality`).
4. **Contagens**: clicar no botão e confirmar que navega para
   `/products/inventory-counts` (rota inalterada).
5. **Recebimento**: criar/usar um pedido de compra em status `sent`, abrir
   `/logistics/recebimento`, clicar "Conferir", preencher NF + quantidade
   (com e sem lote/validade) e confirmar. Validar: (a) erro amigável se NF
   ficar vazia; (b) erro amigável se nenhuma quantidade for informada; (c)
   após sucesso, o pedido some da fila (ou migra para "Recebido parcial" se
   restou saldo) e o lote aparece em `quarantine` na aba Lotes de
   `/logistics/estoque` e em `/quality`.
6. **ProductsPage**: confirmar que não há mais ação de movimentação nem
   coluna "Estoque"; validar que o aviso/link para Logística funciona.
7. **PurchasesPage legada**: o dialog de recebimento antigo (dentro de
   `/purchases`) agora também exige NF — validar que não regrediu.
8. Regressão: `node ./node_modules/typescript/bin/tsc -b --noEmit` e
   `node ./node_modules/vitest/vitest.mjs run` (13 testes) devem continuar
   limpos.

**Desenvolvedor**: Claude Code (Senior Frontend Engineer)

---

## Frontend — Laboratório (`/laboratory`) e Engenharia (`/engineering`) (2026-08-03)

**Escopo**: duas telas novas em `client/`, sem alteração no backend. Rotas
consumidas conforme contratos já existentes em
`server/src/modules/laboratory/presentation` e
`server/src/modules/engineering/presentation` (routes/validators/controllers
lidos antes de codar, nenhum payload/rota foi adivinhado).

### Arquivos criados

#### Serviços de API (client/src/api/)
- `laboratory.ts` — tipos `AcousticTestType` (9 valores), `AcousticTestResult`,
  `AcousticTestInput`, `AcousticTestSummaryRow`; funções `listAcousticTests`
  (`GET /api/laboratory/tests`), `createAcousticTest`
  (`POST /api/laboratory/tests`), `getAcousticTestsSummary`
  (`GET /api/laboratory/tests/summary`).
- `engineering.ts` — tipos `EngineeringProject*` (stage/status/priority/type),
  `ProductDrawing*` (type/status), `ThieleSmallParams` (13 parâmetros:
  `fs_hz`, `qms`, `qes`, `qts`, `vas_l`, `sd_cm2`, `xmax_mm`, `re_ohms`,
  `le_mh`, `bl_tm`, `mms_g`, `cms_mm_n`, `spl_db` — nomes conferidos em
  `engineeringValidators.ts::thieleSmallParamsSchema`); funções para
  projetos (`list/get/create/updateEngineeringProject`), desenhos
  (`list/create/updateProductDrawing`, `release/obsoleteProductDrawing`) e
  ficha técnica (`get/upsertItemTechnicalSpec`).

#### Páginas — Laboratório (client/src/pages/laboratory/)
- `LaboratoryPage.tsx` — container com 2 abas (padrão idêntico a
  `QualityPage.tsx`: `TabButton` local, sem lib de tabs externa).
- `RegisterTestTab.tsx` — formulário (react-hook-form + zod): produto
  (`SelectNative` via `GET /api/products`), série/lote opcionais, tipo de
  teste (9 valores com labels pt-BR), resultado + unidade, faixa de
  especificação opcional, observações, checkbox
  "Abrir RNC automaticamente se reprovar" (`create_rnc_on_fail`,
  default `true`). Após `POST /api/laboratory/tests`, exibe um banner de
  veredito (verde "APROVADO" / vermelho "REPROVADO", calculado pelo
  backend em `test.passed`) com link para `/quality` quando
  `test.non_conformity_id` vier preenchido (RNC aberta automaticamente).
- `TestHistoryTab.tsx` — filtros (produto, tipo de teste, veredito, série)
  sobre `GET /api/laboratory/tests` (paginado) + tiles de resumo agregados
  client-side a partir de `GET /api/laboratory/tests/summary` (total,
  aprovados, reprovados, pass rate geral) e uma tabela de pass rate por
  tipo de teste. Colunas da tabela principal: data, produto, série/lote,
  tipo, medido+unidade, faixa, veredito (badge), RNC (link se houver).

#### Páginas — Engenharia (client/src/pages/engineering/)
- `EngineeringPage.tsx` — container com 3 abas + link de atalho para
  `/production/bom` (não existe tela de roteiros hoje, então só o link de
  BOM foi incluído, conforme instrução).
- `ProjectsTab.tsx` — CRUD de `EngineeringProject`
  (`GET/POST/PUT /api/engineering/projects`): tabela com código, nome,
  tipo, produto, fase (badge das 6 fases do PDP `concept → production`),
  prazo e prioridade (cor por nível). Dialog único serve criação (sem
  campos de fase/status, que só existem em edição) e edição (com
  fase/status/prioridade editáveis — avanço de fase é feito editando o
  projeto). Campo `project_manager_id` **omitido do formulário**: não há
  endpoint de listagem de usuários exposto para uso genérico em combos on
  the client (só `admin`/`users` restrito), então o campo foi deixado de
  fora para não expor uma UX quebrada; o schema do backend já o aceita
  como opcional, então isso não bloqueia nada.
- `DrawingsTab.tsx` — CRUD de `ProductDrawing`
  (`GET/POST/PUT /api/engineering/drawings`), com filtro por produto e
  status, badges de status (draft cinza/secondary, released
  verde/success, obsolete âmbar/warning, canceled vermelho/destructive).
  Ações "Liberar" (`POST /:id/release`) e "Tornar obsoleto"
  (`POST /:id/obsolete`) restritas a `admin` (`hasRole('admin')`) com
  dialog de confirmação antes de disparar a mutação (ambas ações são
  irreversíveis/têm efeito de negócio). Edição só é oferecida enquanto o
  desenho está em `draft`.
- `TechnicalSpecTab.tsx` — seletor de item via `ItemSearchSelect` (já
  existente, reaproveitado sem alteração) + `GET/PUT
  /api/engineering/items/:itemId/technical-spec`. Formulário com os 13
  parâmetros Thiele-Small em grid responsivo (2/3/4 colunas) com label +
  unidade (ex.: "Fs (Hz)", "Vas (L)", "Sd (cm²)") e campo de família
  técnica (`familia_tecnica`, texto livre — o modelo não expõe um enum
  fechado de famílias). Campos numéricos são mantidos como string no
  formulário (evita coerção/arredondamento prematuro do JS) e só
  convertidos para `Number` no envio do payload, meta de precisão
  numérica do projeto.

### Navegação (edições mínimas, sem tocar nas rotas de Logística)
- `client/src/App.tsx` — 2 lazy imports (`LaboratoryPage`,
  `EngineeringPage`) + 2 rotas `<Suspense>` (`/laboratory`,
  `/engineering`), inseridas entre `/quality` e `/reports`.
- `client/src/layouts/AppLayout.tsx` — 2 itens de sidebar na seção
  "Operações" (`Laboratório` com ícone `FlaskConical`, `Engenharia` com
  ícone `DraftingCompass`, ambos de `lucide-react`) logo após
  "Qualidade"; 2 entradas novas em `BREADCRUMBS`
  (`'/laboratory': ['Laboratório']`, `'/engineering': ['Engenharia']`).
  Nenhuma rota/nav de Logística foi tocada.

### Decisões de UX/RBAC
- Registro de teste e upsert de ficha técnica: liberados para
  `admin`/`operator` (mesma matriz do backend,
  `authorize('admin', 'operator')`).
- Liberar/tornar obsoleto desenho: só `admin` na UI (mesma matriz do
  backend, `authorize('admin')`), com `hasRole('admin')` controlando a
  visibilidade dos botões — a validação real continua sendo feita pela
  API.
- Todos os formulários usam `react-hook-form` + `zod`, com loading state
  em todos os botões de submit/ação assíncrona e mensagens de erro via
  `extractApiErrorMessage` (nunca stack trace cru).

### Resultados de qualidade
- `node ./node_modules/typescript/bin/tsc -b --noEmit` → limpo (0 erros).
- `node ./node_modules/vitest/vitest.mjs run` → 13 testes (4 arquivos)
  continuam passando, nenhuma regressão.
- Nenhuma dependência nova instalada; nenhum commit criado.

### O que o Agente QA (ou humano) deve testar
1. **Registrar teste**: abrir `/laboratory`, preencher um teste com
   resultado dentro da faixa (deve aprovar) e outro fora da faixa com o
   checkbox de RNC marcado (deve reprovar E mostrar o link "RNC #N — Ver
   em Qualidade"); confirmar que a RNC realmente aparece em `/quality`.
2. **Histórico**: aplicar cada filtro (produto, tipo, veredito, série)
   isoladamente e em combinação; conferir que os tiles de resumo batem
   com a soma da tabela de pass rate por tipo.
3. **Projetos P&D**: criar um projeto (código duplicado deve mostrar o
   409 da API de forma amigável), editar avançando a fase
   `concept → design → ... → production` e trocar o status para
   `completed`/`canceled`, conferir badges e cor de prioridade.
4. **Desenhos técnicos**: criar um desenho em `draft`, editar, liberar
   (confirma dialog, vira `released`, perde botão Editar/Liberar) e então
   tornar obsoleto (confirma dialog, vira `obsolete`). Testar com usuário
   `operator` que os botões Liberar/Tornar obsoleto não aparecem.
5. **Ficha técnica T-S**: buscar um item via `ItemSearchSelect`, salvar
   parcialmente alguns dos 13 campos, recarregar e confirmar que só os
   campos preenchidos vêm de volta; testar com item que não tenha ficha
   ainda (deve permitir criar/upsert) e item já com ficha (deve
   pré-carregar os valores).
6. Regressão: `node ./node_modules/typescript/bin/tsc -b --noEmit` e
   `node ./node_modules/vitest/vitest.mjs run` (13 testes) devem continuar
   limpos.

**Desenvolvedor**: Claude Code (Senior Frontend Engineer)
**Data**: 2026-08-03

---

## Onda 3 — Expedição, Cockpit de Compras e Projeção de Fluxo de Caixa (Concluída)

**Data**: 2026-08-03
**Escopo**: `server/` apenas (client/ não tocado).
**Status**: ✅ Concluído — `npm run typecheck` limpo, `npx jest tests/unit` 100% verde (278/278, 52 suítes), sem regressões.

### Resumo da feature

1. **Expedição de venda (status `shipped`)**: novo valor de enum
   `sales.status` via `ALTER TYPE ... ADD VALUE`. Máquina de estados
   (`ChangeSaleStatusUseCase.VALID_TRANSITIONS`) passou a permitir
   `invoiced → shipped`; `shipped` é terminal (nenhuma transição sai dele,
   inclusive cancelamento é bloqueado com 422 e mensagem dedicada).
2. **Cockpit de Compras**: `GET /api/purchases/cockpit` (rota registrada
   antes de `/:id`) retorna 4 métricas agregadas via SQL raw
   parametrizado: requisições pendentes, pedidos em aberto
   (contagem + valor), chegadas da semana e pedidos em atraso.
3. **Projeção de Fluxo de Caixa**: `GET
   /api/finance/cash-flow-projection?days=7..90` (default 30, `authorize
   ('admin', 'financial')`) agrupa os títulos em aberto
   (`accounts_receivable`/`accounts_payable` com `payment_date IS NULL` e
   `status != 'canceled'`) por semana (segunda a domingo), com saldo
   líquido e acumulado por semana, mais um bucket separado de vencidos
   não pagos.

### Arquivos alterados/criados

**Migração:**
- `server/migrations/20260803-000007-add-shipped-sale-status.cjs` (novo) — `ALTER TYPE "enum_sales_status" ADD VALUE IF NOT EXISTS 'shipped'` fora de transação (padrão de `20260803-000002-add-quarantine-lot-status.cjs`); `down()` no-op documentado.

**Modelo/tipos:**
- `server/src/models/Sale.ts` — enum de `status` inclui `'shipped'`; cabeçalho JSDoc atualizado com o fluxo completo.
- `server/src/types/erp.d.ts`, `server/src/types/models.d.ts` — `SaleStatus`/`SaleAttributes.status` incluem `'shipped'`.

**Módulo `sales`:**
- `server/src/modules/sales/application/use-cases/ChangeSaleStatusUseCase.ts` — `VALID_TRANSITIONS.invoiced` ganhou `'shipped'`; `VALID_TRANSITIONS.shipped = []`; bloqueio explícito de `shipped → canceled` com `BusinessRuleError` (422) e mensagem dedicada, antes do erro genérico de transição inválida.
- `server/src/modules/sales/presentation/validators/saleValidators.ts` — `updateSaleStatusSchema` e `listSalesQuerySchema` aceitam `'shipped'`.

**Módulo `purchases`:**
- `server/src/modules/purchases/domain/repositories/PurchaseRepository.ts` — novo método abstrato `getCockpitMetrics()`.
- `server/src/modules/purchases/infrastructure/sequelize/SequelizePurchaseRepository.ts` — implementação com 4 queries SQL raw parametrizadas (`sequelize.query` + `QueryTypes.SELECT`, sem interpolação de input externo).
- `server/src/modules/purchases/application/use-cases/GetPurchaseCockpitUseCase.ts` (novo) — wrapper fino sobre o repositório.
- `server/src/modules/purchases/presentation/controllers/purchaseController.ts` — novo handler `cockpit`.
- `server/src/modules/purchases/presentation/routes/purchases.ts` — `GET /cockpit` registrada ANTES de `GET /:id`.

**Módulo `financial`:**
- `server/src/modules/financial/presentation/validators/financialValidators.ts` — novo `cashFlowProjectionQuerySchema` (`days` 7–90, default 30).
- `server/src/modules/financial/domain/repositories/FinancialRepository.ts` — novo método abstrato `getOpenTitlesForProjection(days)`.
- `server/src/modules/financial/infrastructure/sequelize/SequelizeFinancialRepository.ts` — implementação com 4 queries SQL raw parametrizadas (títulos em aberto no horizonte + agregados de vencidos).
- `server/src/modules/financial/application/use-cases/GetCashFlowProjectionUseCase.ts` (novo) — bucketiza por semana (segunda-feira), calcula `net`/`cumulative_net`, `due_next_7_days` e `totals.overdue_*`.
- `server/src/modules/financial/presentation/controllers/financialController.ts` — novo handler `cashFlowProjection`.
- `server/src/modules/financial/presentation/routes/finance.ts` — `GET /cash-flow-projection` com `authorize('admin', 'financial')`.

**Testes:**
- `server/tests/unit/onda3-shipping-cockpit-cashflow.test.ts` (novo, 7 testes) — cobre as 3 features (transições de status, cockpit, projeção).

### Documentações atualizadas

- `docs/projeto/04-USE_CASES.md` — 3 novos casos de uso: `UC-27` (Expedir Venda Faturada), `UC-28` (Consultar Cockpit de Compras), `UC-29` (Consultar Projeção de Fluxo de Caixa).
- `docs/database/DATABASE.md` — enum de `sales.status` documentado com `'shipped'` e referência à migration.
- `docs/arquitetura/API.md` — `GET /api/sales` (query `status`), `PUT /api/sales/:id/status` (regras de `shipped`), `GET /api/purchases/cockpit` (novo, com contrato JSON completo) e `GET /api/finance/cash-flow-projection` (novo, com contrato JSON completo).
- `server/src/modules/sales/README.md` — máquina de estados, endpoint `PUT /:id/status` e lista de testes atualizados.
- `server/src/modules/purchases/README.md` — endpoint `GET /cockpit` documentado (tabela de endpoints + seção dedicada "Cockpit de Compras (Onda 3)") e lista de testes atualizada.
- `server/src/modules/financial/README.md` — endpoint `GET /cash-flow-projection` documentado (tabela de endpoints + regra de negócio dedicada) e lista de testes atualizada.
- JSDoc: todos os arquivos novos/alterados (use cases, controllers, repositórios, validators, migration) têm cabeçalho/comentários JSDoc explicando parâmetros e retorno.

### Contratos JSON (resumo)

**`PUT /api/sales/:id/status`** com `{ "status": "shipped" }`:
- Sucesso (200): `{ success: true, data: <Sale com status: "shipped"> }` — apenas a partir de `invoiced`.
- Erro (422): `confirmed → shipped` ou qualquer origem != `invoiced` → `BusinessRuleError` genérico de transição inválida.
- Erro (422): `shipped → canceled` → `BusinessRuleError` com mensagem "Venda já foi expedida (status shipped) e não pode ser cancelada."

**`GET /api/purchases/cockpit`**:
```json
{
  "success": true,
  "data": {
    "pending_requisitions": 3,
    "open_orders": { "count": 5, "total_amount": 45230.50 },
    "arriving_this_week": 2,
    "overdue": 1
  }
}
```

**`GET /api/finance/cash-flow-projection?days=30`**:
```json
{
  "success": true,
  "data": {
    "horizon_days": 30,
    "totals": {
      "receivable": 25000.00,
      "payable": 18000.00,
      "net": 7000.00,
      "overdue_receivable": 1200.00,
      "overdue_payable": 300.00
    },
    "due_next_7_days": { "receivable": 4000.00, "payable": 2500.00 },
    "weeks": [
      { "week_start": "2026-08-03", "week_end": "2026-08-09", "receivable": 4000.00, "payable": 2500.00, "net": 1500.00, "cumulative_net": 1500.00 }
    ]
  }
}
```

### Instruções de teste

1. **Migration** (não rodada nesta sessão, por instrução explícita — precisa ser aplicada antes de testar em ambiente real):
   ```bash
   cd server
   npm run migration:up --name 20260803-000007-add-shipped-sale-status.cjs
   ```
2. **Expedição**: criar venda `confirmed`, emitir NF-e (`POST /:id/nfe`, vira `invoiced`), então `PUT /:id/status` com `{"status":"shipped"}` → 200. Tentar `PUT /:id/status` com `{"status":"canceled"}` na mesma venda → 422 com a mensagem dedicada. Tentar `shipped` a partir de uma venda `confirmed` → 422 genérico.
3. **Cockpit de compras**: com dados reais de `purchase_requisitions`/`purchase_orders`, chamar `GET /api/purchases/cockpit` autenticado e conferir que os 4 números batem com queries manuais equivalentes (`SELECT COUNT(*) ...`).
4. **Projeção de fluxo de caixa**: chamar `GET /api/finance/cash-flow-projection?days=30` com usuário `admin`/`financial` (outro papel deve receber 403); variar `days` fora de 7–90 (deve dar 400); conferir que a soma de `weeks[].net` mais os vencidos bate com `totals.net` e que `cumulative_net` da última semana é igual à soma de todos os `net` do horizonte.
5. Regressão: `cd server && npm run typecheck && npx jest tests/unit` (devem continuar limpos: 0 erros TS, 278 testes verdes).

### Riscos residuais

- A migration `20260803-000007-add-shipped-sale-status.cjs` **não foi executada** nesta sessão (instrução explícita de não rodar migrations/docker) — precisa ser aplicada em cada ambiente antes de qualquer venda ser marcada como `shipped`, senão o `ALTER TYPE` do Postgres rejeitará o valor.
- Nenhum teste de integração (Postgres real) foi criado para as 3 features desta onda — apenas unitários com repositório mockado. Recomenda-se cobertura de integração em sprint futura (mesmo padrão de `server/tests/integration/sale-quote-confirm.test.ts`).
- RBAC do cockpit de compras segue o padrão já existente do módulo (`authenticate` apenas, sem `authorize` por papel) — mesma pendência já documentada no README do módulo `purchases`.
- A projeção de fluxo de caixa não desconta juros/multa/desconto (`interest`/`fine`/`discount` de `AccountReceivable`) do valor projetado — usa apenas o campo `amount` (valor total do título), mesmo critério dos demais relatórios financeiros existentes (`GetCashFlowUseCase`).

**Desenvolvedor**: Claude Code (Senior Backend Engineer)
**Data**: 2026-08-03

---

## Frontend — Onda 3: Expedição, Cockpit de Compras e Fluxo de Caixa (Concluída)

**Data**: 2026-08-03
**Escopo**: `client/` apenas (backend consumido tal como entregue na Onda 3 de backend acima; nenhuma rota de Logística/Laboratório/Engenharia existente foi alterada).
**Status**: ✅ `node ./node_modules/typescript/bin/tsc -b --noEmit` limpo; `node ./node_modules/vitest/vitest.mjs run` 13/13 testes verdes (4 arquivos), sem regressões.

### Resumo da feature

1. **Expedição (`/logistics/expedicao`)**: nova página `ShippingPage.tsx` com fila de vendas `confirmed`/`invoiced` (duas chamadas `GET /api/sales?status=` combinadas no cliente — a API só filtra um status por vez, mesmo padrão já usado em `ReceivingPage.tsx`), colunas nº venda/cliente/itens/total/status NF-e/status da venda, dialog "Ver itens" com picking list (produto + quantidade) via `GET /api/sales/:id` (novo `getSale` em `src/api/sales.ts`), botão "Marcar como embarcada" (`PUT /api/sales/:id/status` com `{status:'shipped'}`, reaproveitando `updateSaleStatus` já existente) habilitado apenas quando `status === 'invoiced' && nfe_status === 'authorized'`, com `window.confirm` antes de disparar. Quando `invoiced` sem NF-e autorizada, mostra aviso inline "Emita a NF-e na tela de Vendas antes de embarcar" com link para `/sales`. Toggle "Fila de embarque" / "Embarcadas" (esta última consulta `status=shipped` e badge verde "Embarcada").
2. **Cockpit de Compras (`/purchases`)**: 4 tiles clicáveis acima da tabela existente, usando `Card`/`CardContent` — "Requisições pendentes" (navega para `/purchases/requisitions`), "Pedidos em aberto" (N · R$ total; alterna um filtro client-side na tabela local pelos status `pending/approved/sent/partial`, mesmo critério do backend), "Chegando em 7 dias" (verde) e "Atrasados" (vermelho, navega para `/logistics/recebimento`). Nova função `getPurchaseCockpit` + tipo `PurchaseCockpit` em `src/api/purchases.ts`.
3. **Fluxo de Caixa (projeção) em `/financial`**: nova seção `CashFlowProjectionSection` (mesmo arquivo `FinancialPage.tsx`, componente interno) com `SelectNative` para horizonte 30/60/90 dias, 5 tiles (Entradas previstas verde, Saídas previstas vermelho, Saldo projetado com cor conforme sinal, Vencendo em 7d âmbar, Em atraso vermelho somando `overdue_receivable + overdue_payable`) e tabela semanal (semana formatada `dd/mm–dd/mm`, a receber, a pagar, saldo da semana, acumulado em negrito/vermelho se negativo). Página já é `RoleRoute roles={['admin','financial']}` — nenhuma mudança de permissão. Nova função `getCashFlowProjection` + tipos `CashFlowProjection`/`CashFlowProjectionWeek` em `src/api/financial.ts`.
4. **Navegação**: item "Expedição" (ícone `Send`) no grupo Logística da sidebar, rota lazy `/logistics/expedicao` em `App.tsx`, breadcrumb `['Logística', 'Expedição']` em `AppLayout.tsx`.

### Arquivos alterados/criados

**Novo:**
- `client/src/pages/logistics/ShippingPage.tsx` (novo) — página de expedição completa (fila + dialog de picking list `ShippingItemsDialog`).

**API client:**
- `client/src/api/sales.ts` — `SaleStatus` ganhou `'shipped'`; nova função `getSale(id)` (`GET /api/sales/:id`).
- `client/src/api/purchases.ts` — novo tipo `PurchaseCockpit` e função `getPurchaseCockpit()` (`GET /api/purchases/cockpit`).
- `client/src/api/financial.ts` — novos tipos `CashFlowProjection`/`CashFlowProjectionWeek` e função `getCashFlowProjection(days)` (`GET /api/finance/cash-flow-projection`).

**Páginas alteradas:**
- `client/src/pages/sales/SalesPage.tsx` — `STATUS_VARIANT`/`STATUS_LABEL` (records exaustivos por `SaleStatus`) ganharam a chave `shipped` (badge `success`, label "Embarcada"); sem outras mudanças de comportamento.
- `client/src/pages/purchases/PurchasesPage.tsx` — import de `useNavigate`, `Card`/`CardContent`, ícones `ClipboardList`/`PackageOpen`/`CalendarClock`/`AlertOctagon`; novo estado `openOrdersOnly` + `visiblePurchases` (memo) filtrando a tabela local; novo componente `PurchaseCockpitTiles` renderizado acima da tabela; paginação escondida quando o filtro local de "pedidos em aberto" está ativo (a paginação do servidor não bate mais com a lista filtrada no cliente).
- `client/src/pages/financial/FinancialPage.tsx` — import de `SelectNative` e ícones `TrendingUp`/`TrendingDown`/`Scale`/`AlarmClock`/`AlertTriangle`; parágrafo antigo sobre limitação da API de fluxo de caixa substituído pela nova seção `CashFlowProjectionSection`.

**Navegação:**
- `client/src/App.tsx` — `const ShippingPage = lazy(...)` + rota `/logistics/expedicao`.
- `client/src/layouts/AppLayout.tsx` — ícone `Send` importado; item "Expedição" no grupo Logística; entrada em `BREADCRUMBS`.

**Documentação:**
- `docs/governance/CRONOGRAMA_FRONTEND_2026-07-31.md` — checklist FE1 (Onda 3 — Expedição), FE3 (cockpit de compras) e FE5 (fluxo de caixa projetado) marcados `[x]` com descrição da entrega.
- `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` — seção "Frontend" com 3 novos itens (Expedição, Cockpit de Compras, Fluxo de caixa projetado).

### Decisões de UX/RBAC

- **Sem endpoint de listagem por múltiplos status**: seguido o mesmo padrão de `ReceivingPage.tsx` — duas (ou três, incluindo `shipped`) chamadas `useQueries` combinadas no cliente, em vez de propor mudança de contrato no backend.
- **Botão de embarque com dupla condição** (`status === 'invoiced' && nfe_status === 'authorized'`): evita embarcar venda faturada sem nota fiscal válida, mesmo que o backend permita a transição de status isoladamente (a validação de NF-e é só de UI/UX, não substitui regra de negócio no servidor).
- **Filtro de "pedidos em aberto" é local, não uma nova query paginada**: como pedido pela tarefa ("aplica filtro local da tabela se houver, senão só navega/scrolla"), evitando uma segunda fonte de paginação para o mesmo recurso.
- **RBAC do fluxo de caixa**: nenhuma mudança — a rota `/financial` já está sob `<RoleRoute roles={['admin', 'financial']}>` em `App.tsx`; o backend também exige `authorize('admin', 'financial')` no `GET /cash-flow-projection`, então um `operator` autenticado recebe 403 do servidor mesmo se acessasse a URL diretamente.

### Resultados de qualidade

- `node ./node_modules/typescript/bin/tsc -b --noEmit` → sem erros.
- `node ./node_modules/vitest/vitest.mjs run` → 4 arquivos de teste, 13/13 passando (nenhum teste novo foi adicionado nesta onda; suíte existente permaneceu intacta).
- Nenhuma dependência nova instalada; nenhum commit criado (por instrução).

### O que o Agente QA (ou humano) deve testar

1. **Expedição**: criar venda `confirmed` → confirmar (`invoiced`, se aplicável) → verificar que aparece na fila de `/logistics/expedicao` com aviso de NF-e pendente e botão de embarque desabilitado/ausente. Emitir NF-e na tela de Vendas, voltar para Expedição e confirmar que o botão "Marcar como embarcada" aparece; clicar, confirmar no dialog, e verificar que a venda migra para a aba "Embarcadas" com badge verde. Testar "Ver itens" para conferir que a picking list bate com os itens da venda.
2. **Cockpit de Compras**: em `/purchases`, verificar que os 4 tiles carregam os números corretos (comparar com `GET /api/purchases/cockpit` chamado direto); clicar em "Requisições pendentes" e "Atrasados" e confirmar a navegação; clicar em "Pedidos em aberto" e confirmar que a tabela abaixo filtra para `pending/approved/sent/partial` (clicar de novo remove o filtro).
3. **Fluxo de Caixa**: em `/financial` (logado como `admin` ou `financial`), trocar o seletor de horizonte entre 30/60/90 dias e confirmar que os tiles e a tabela semanal atualizam; testar com um usuário `operator` que a rota `/financial` continua bloqueada (comportamento pré-existente, não alterado nesta onda).
4. Regressão: `cd client && node ./node_modules/typescript/bin/tsc -b --noEmit && node ./node_modules/vitest/vitest.mjs run` (devem continuar limpos).

### Riscos residuais

- A migration de backend que adiciona `'shipped'` ao enum `sales.status` (`20260803-000007-add-shipped-sale-status.cjs`) precisa estar aplicada no ambiente antes de testar o fluxo de embarque — sem ela, a API rejeitará a transição com erro do Postgres, não um 422 amigável.
- Nenhum teste automatizado (Vitest) foi criado especificamente para `ShippingPage`, o cockpit de compras ou a seção de fluxo de caixa — a suíte atual (13 testes) cobre outras áreas do client. Recomenda-se cobertura dedicada em sprint futura.
- O filtro local de "pedidos em aberto" em `/purchases` opera apenas sobre a página corrente da tabela (20 registros); pedidos em aberto em outras páginas não aparecem até o usuário navegar até elas — comportamento aceito pela tarefa ("aplica filtro local da tabela se houver"), mas vale considerar um filtro server-side (`status IN (...)`) em iteração futura.

**Desenvolvedor**: Claude Code (Senior Frontend Engineer)
**Data**: 2026-08-03

---

## Requisitos de Negócio Prontos — Controle de Acesso por Área + 5 Fluxos Complementares (Fase de Descoberta, Concluída)

**Data**: 2026-08-03
**Papel**: Business Analyst / Requirements Engineer (fase de descoberta —
nenhum código foi tocado nesta entrega, apenas documentação em `docs/`)
**Status**: ✅ Requisitos especificados, **com as 6 decisões de negócio já
confirmadas pelo dono** — pronto para implementação, sem bloqueio de
schema (ver seção "Decisões do dono" abaixo)

### Escopo desta entrega

Especificação completa de:
1. **Controle de Acesso por Área/Departamento** — perfis de acesso
   configuráveis (módulo × nível ver/operar/aprovar), dois níveis por
   usuário (operador/gestor), bloqueio total (menu + API 403) fora do
   perfil, tratamento de módulos agregadores (Dashboard/Relatórios/
   Rastreabilidade).
2. **Requisição de Amostra da Engenharia** — variante de origem na
   Requisição de Compra já existente (`engineering_sample`), vínculo
   opcional a projeto de P&D, destino físico resolvido pelo item 4.
3. **Handoff Entre Departamentos com Semáforo** — padronização de um
   indicador de status (verde/amarelo/vermelho) calculado no backend,
   aditivo às listagens já existentes (Recebimento, Qualidade, Expedição,
   RNC), sem criar motor de notificação novo.
4. **Múltiplos Depósitos (Insumos, Acabados, Laboratório)** — saldo por
   depósito, novo tipo de movimentação `transfer` com aprovação de
   gestor, roteamento automático por evento (recebimento, conclusão de
   OP, expedição), separação explícita entre "depósito" (onde) e
   "status do lote/quarentena" (se pode ser consumido).
5. **Emissão de NF-e pelo Vendas** — formalização do caso de uso já
   implementado tecnicamente (`server/src/modules/fiscal`), com a nova
   camada de permissão por perfil (**decidido: restrito a gestor**, emissão
   e cancelamento).
6. **Alertas Didáticos de Pré-Requisitos (UC-43, transversal)** — padrão
   de UX obrigatório para toda tela do sistema: checklist preventivo
   (✓/✗ com motivo visível) antes de tentar uma ação, e tradução de
   qualquer erro `4xx` em alerta de 3 partes (O QUE / POR QUE / O QUE
   FAZER), sempre listando **todas** as pendências de uma vez — nunca um
   erro genérico ou código de erro cru exposto ao usuário. Único bloco
   desta entrega que **não exige migration de schema** (é sobre
   apresentação de regras já existentes, não regra nova).

### Onde estão os documentos (ler nesta ordem antes de codar)

1. **`docs/business/01-USE_CASES.md`** — UC-30 a UC-43, formato
   atores/pré-condições/fluxo principal/alternativos/exceções + critérios
   de aceite em BDD (Given/When/Then) para cada um. O topo do arquivo
   consolida as 6 decisões de negócio já confirmadas pelo dono em
   2026-08-03 (não reabrir); o índice no final lista o único ponto ainda
   em aberto (UC-40, não bloqueante).
2. **`docs/business/BUSINESS_RULES.md`** — regras estáticas: matriz
   módulo × permissão (§1, ponto de partida editável pelo admin), regra
   do perfil único (§2), regra do admin global (§3), regra dos dois
   níveis com as fórmulas de autorização (§4), regra de auditoria (§5),
   módulos agregadores (§6), invariantes de precisão/isolamento/
   rastreabilidade (§7), risco de convivência com checagens de `role`
   legadas (§8), regras da amostra de engenharia (§9), regras do
   semáforo (§10), regras de NF-e (§11), regras de múltiplos depósitos
   incluindo a invariante `soma(saldos por depósito) = saldo total` (§12).
3. **`docs/governance/TODO.md`** — 6 blocos de tarefas técnicas ordenadas
   (Bloco 1: Perfis/autorização; Bloco 2: Amostra de Engenharia; Bloco 3:
   Semáforo de handoff; Bloco 4: Múltiplos Depósitos; Bloco 5: Permissão
   de NF-e; Bloco 6: Alertas Didáticos de Pré-Requisitos — sem
   dependência de schema, pode iniciar em paralelo a qualquer outro),
   cada bloco dividido em AdmDBA (schema/migrations) → Backend →
   Frontend → QA, com ordem de execução recomendada ao final.

### Decisões do dono — CONFIRMADAS em 2026-08-03 (não bloqueiam mais o início de código)

As 6 decisões antes propostas foram levadas ao dono e confirmadas.
Nenhuma delas está mais em aberto — a implementação pode iniciar sem
esperar por elas:

1. **UC-32** — desativar um perfil de acesso com usuários ativos
   vinculados: **BLOQUEAR** (422) até o admin realocar todos os usuários
   para outro perfil. A alternativa mais permissiva foi descartada.
2. **UC-35-Exceção** — usuário sem perfil atribuído: **BLOQUEIO TOTAL**
   com aviso didático, mostrando apenas "Meu Perfil". Texto oficial
   aprovado: *"Seu acesso ainda não foi configurado — procure o
   administrador."*
3. **UC-36** — troca de perfil de usuário logado: **VALE NO PRÓXIMO
   LOGIN** — a sessão ativa **não** é derrubada (`permission_version`
   **não será implementado** nesta entrega, fica registrado apenas como
   melhoria futura opcional). Consequência aceita, registrada por
   instrução explícita do dono: o usuário com sessão ativa no momento da
   troca continua com o conjunto de permissões antigo até logout/
   expiração natural do token. Mitigação recomendada para revogação
   urgente: o admin pode **desativar o usuário** (`active=false`),
   mecanismo já existente em `server/src/middlewares/auth.ts` que já
   força logout imediato (`401 — Usuário inativo`).
4. **UC-41** — emissão **e** cancelamento de NF-e: restritos ao nível
   `aprovar`/**gestor** do perfil de Vendas, sem distinção entre as duas
   operações.
5. **UC-42 (item E)** — consumo do Depósito de Laboratório em testes
   destrutivos: **VINCULADO AO TESTE** — o registro do teste destrutivo
   (`AcousticTestResult`) debita o depósito automaticamente, na mesma
   transação (padrão recomendado pelo orquestrador, confirmado pelo
   dono).
6. **`BUSINESS_RULES.md` §12 item 11** — permissão por depósito dentro do
   perfil: **LISTA SIMPLES** de depósitos permitidos
   (`warehouses_visible`) dentro da própria linha de permissão do módulo,
   sem tabela própria de associação perfil×depósito (decisão do
   orquestrador, confirmada pelo dono).

**Único ponto ainda em aberto** (não fazia parte deste lote de 6, não
bloqueia início de desenvolvimento): UC-40 — se o campo `handoff_signal`
aditivo nas listagens já existentes é suficiente, ou se o dono também
espera um contador/badge de notificação por módulo no menu lateral.

### Riscos levantados (documentados nos arquivos, resumo aqui)

- **Convivência de autorizações** (`BUSINESS_RULES.md` §8): o sistema já
  tem checagens de `role` global hard-coded em alguns controllers (ex.:
  aprovação de requisição exige `role=admin` hoje, ver UC-23 em
  `docs/projeto/04-USE_CASES.md`). O novo middleware de módulo/nível de
  área não substitui essas checagens automaticamente — se não forem
  conciliadas explicitamente, um usuário "gestor" no novo modelo pode
  continuar levando 403 em endpoints que só entendem `role=admin`.
  Recomendação registrada: o novo modelo deve **substituir** as checagens
  pontuais legadas em endpoints de aprovação, não conviver com elas.
- **Backfill de depósitos** (`TODO.md` Bloco 4.1): não há hoje segregação
  de saldo por tipo de produto — migrar todo `products.quantity` atual
  para o depósito `INSUMOS` é o caminho mais simples, mas produtos já
  acabados prontos para expedição ficariam no depósito errado até ajuste
  manual pós-migração. Alternativa (migrar por `product_type`) e ambas as
  opções foram registradas para decisão do dono/PCP antes do backfill real.
- **Módulo de RH ausente da matriz** (`BUSINESS_RULES.md` §1): o
  inventário de módulos fornecido nesta tarefa não incluía um módulo de
  RH nas rotas de API — a matriz sugerida deixou a coluna RH sem
  preenchimento contra os módulos de manufatura/vendas. Pendência
  registrada como item de TODO técnico antes da implementação do Bloco 1.
- **Cobertura de rotas existentes** (`TODO.md` 1.2): aplicar o novo
  middleware de autorização por módulo em todas as rotas já existentes é
  um trabalho extenso (múltiplos módulos), sugerido como sub-tarefas
  paralelas por módulo para não virar um único PR gigante e arriscado.
- **Frontend descarta `details` de erro hoje** (`BUSINESS_RULES.md` §13.4):
  `extractApiErrorMessage` em `client/src/api/httpClient.ts` usa apenas
  `error.message`, descartando `error.details` já retornado por alguns
  endpoints (ex.: `ConvertRequisitionToPurchaseOrdersUseCase` já lista os
  itens sem fornecedor em `details`, mas a tela hoje não exibe isso
  estruturado). O Bloco 6 do TODO propõe um novo utilitário
  (`translateApiError`) para parar de descartar essa informação — é
  aditivo, não quebra nenhum fluxo existente que hoje só usa a `message`.
- **Endpoints que validam e falham na primeira condição** (`BUSINESS_RULES.md`
  §13.3): alguns use cases hoje lançam erro na primeira regra violada, em
  vez de coletar todas as pendências — isso conflita com a exigência do
  dono de "lista completa, não o primeiro erro". Nem todo endpoint
  precisará ser reescrito imediatamente (pode ser evolução incremental,
  priorizada pela lista de `BUSINESS_RULES.md` §13.5), mas é um retrabalho
  de backend real, não apenas de frontend.

### Instrução para o próximo agente (Programador/AdmDBA)

1. As 6 decisões de negócio já estão confirmadas (ver seção acima) — pode
   iniciar diretamente a criação de migrations/schema sem nova rodada de
   validação com o dono para esses 6 pontos específicos. Resta apenas o
   ponto técnico de backfill de depósitos por tipo de produto (ver
   "Riscos levantados" abaixo), que é uma decisão operacional a validar
   com o dono/PCP no momento do backfill real, não uma decisão de
   arquitetura.
2. Seguir a ordem de execução recomendada em `docs/governance/TODO.md`
   (Bloco 1 → Bloco 4 → Bloco 2 → Bloco 3 → Bloco 5, com o Bloco 6 podendo
   rodar em paralelo a qualquer um dos anteriores).
3. Ao concluir cada bloco, consolidar os UCs efetivamente implementados
   (com o contrato real de endpoint, que pode divergir ligeiramente do
   especificado) em `docs/projeto/04-USE_CASES.md`, continuando a
   numeração a partir de UC-30 (ou do próximo UC livre no momento), e
   registrar a entrega nesta mesma seção de `docs/governance/HANDOFF_CODEX.md`, no
   padrão já usado pelas entregas anteriores deste arquivo.

**Desenvolvedor**: Claude Code (Business Analyst / Requirements Engineer)

---

## Bloco 6 (Frontend) — Componentes Padrão + Retrofit de 4 Telas (UC-43)

**Data**: 2026-08-03
**Escopo**: `client/` apenas (não tocou `server/`). Implementação dos
componentes padrão do Padrão de Alerta Didático de 3 Partes
(`docs/business/BUSINESS_RULES.md` §13, UC-43) e retrofit das 4 telas de
maior impacto operacional listadas em `docs/governance/TODO.md` Bloco 6.2.
**Status**: ✅ Concluído (componentes + 4/9 telas priorizadas; 5 telas
restantes do §13.5 ficam para próxima entrega — ver `TODO.md`)

### Componentes/utilitários criados

- `client/src/lib/translateApiError.ts` — utilitário `translateApiError(error, title, context?, fallbackReason?)`
  que lê o contrato completo de erro do backend
  (`{ success: false, error: { code, message, details? } }`, ver
  `server/src/errors/AppError.ts` / `errorHandler.ts`) e retorna
  `{ title, reasons: string[], action?: { label, to } }`. **Aditivo** —
  não altera nem remove `extractApiErrorMessage` em
  `client/src/api/httpClient.ts`, que continua funcionando e sendo usado
  em pontos fora do escopo deste retrofit (ex.: leitura de detalhes de
  venda no `ShippingItemsDialog`, criação de requisição em
  `RequisitionsPage`). `reasons` cobre **todos** os itens de `details`
  quando o backend retorna um array (`details: [...]`) ou um objeto cujos
  valores são arrays (`details: { item_ids_without_supplier: [...] }`,
  formato hoje usado por `ConvertRequisitionToPurchaseOrdersUseCase`) —
  nunca só o primeiro (Regra 3, §13.3). Mapa de ação por `ErrorContext`
  (união de 9 strings, uma por caso de `BUSINESS_RULES.md` §13.5) em vez
  de por `code` de erro, porque o `code` retornado hoje é quase sempre
  genérico (`BUSINESS_RULE_VIOLATION`/`VALIDATION_ERROR`) — o contexto de
  tela é o discriminador real de qual link de "O QUE FAZER" mostrar.
  Sem `context`/sem `details`, cai em uma ação de fallback genérica
  (nunca deixa o botão de ação sem orientação, fluxo alternativo do
  UC-43). Testado em `client/src/lib/translateApiError.test.ts` (8 casos:
  lista completa de reasons a partir de array, a partir de objeto com
  arrays, fallback para `message` sem `details`, resolução de ação por
  contexto, ação de fallback sem contexto, formato de erro string legado,
  erro não-Axios, `fallbackReason` customizado).
- `client/src/components/DidacticAlert.tsx` — componente visual
  `<DidacticAlert error={DidacticError} />`: título em negrito (O QUE),
  lista `<ul>` com todos os `reasons` (POR QUE), link/texto de `action`
  (O QUE FAZER) via `react-router` `Link` quando `action.to` está
  preenchido. Variante única `destructive` (fundo/borda vermelho claro),
  ícone `AlertTriangle`, `role="alert"`.
- `client/src/components/PrerequisiteChecklist.tsx` — componente
  `<PrerequisiteChecklist items={PrerequisiteItem[]} />` (`{ label, ok,
  detail?, action? }`), renderiza `✓` verde/`✗` vermelho com `detail`
  sempre visível na própria linha (nunca tooltip) e link de ação por
  item. Exporta `hasPendingPrerequisite(items)` para uso direto no
  `disabled` do botão de ação principal da tela consumidora. **Ainda não
  consumido por nenhuma tela** — as 4 telas retrofitadas nesta entrega
  cobrem o Fluxo B do UC-43 (alerta pós-erro do backend); o Fluxo A
  (checklist preventivo antes da tentativa) depende de decisão técnica
  por caso sobre reaproveitar `GET`s existentes vs. criar endpoint de
  pré-checagem dedicado (`TODO.md` §6.1, item ainda `[ ]`) — próximo
  agente deve montar esse cruzamento de dados por tela antes de consumir
  o componente.

### Telas retrofitadas (4, priorizadas por impacto operacional)

1. `client/src/pages/production/CompleteProductionOrderDialog.tsx` —
   mutation de conclusão de OP (`onError`) migrada de
   `extractApiErrorMessage`/`<p>` cru para `translateApiError(..., 'complete-production-order')`
   + `<DidacticAlert>`. Título dinâmico com `order_number`.
2. `client/src/pages/logistics/ShippingPage.tsx` — `window.alert()` da
   `shipMutation` (marcar venda como embarcada) **removido**, substituído
   por estado `shipError: DidacticError | null` + `<DidacticAlert>`
   renderizado acima da tabela. Mutation agora recebe `{ id, saleLabel }`
   para compor o título com o identificador da venda. O aviso inline
   preventivo de "NF-e não autorizada" (que já existia por linha) foi
   reescrito no formato de 3 partes (O QUE + POR QUE com o status atual
   da NF-e + O QUE FAZER com link para `/sales`), mantendo-se como texto
   inline por linha (não virou `DidacticAlert` cheio, por já ser um
   padrão compacto por-item aceito pelo UC-43 Fluxo A).
3. `client/src/pages/purchases/RequisitionsPage.tsx` — dois pontos
   migrados: (a) `ConvertRequisitionDialog` (gerar pedido de compra) —
   este é o caso central do UC-43 (`BUSINESS_RULES.md` §13.5 item 4):
   quando o backend retorna `details: { item_ids_without_supplier: [...] }`
   com múltiplos itens sem fornecedor resolvível, `translateApiError`
   monta a lista completa e `DidacticAlert` exibe todos de uma vez, com
   link para o contexto `convert-requisition`; (b) `statusMutation`
   (aprovar/cancelar requisição) — `window.alert()` **removido**,
   substituído por `statusError: DidacticError | null` renderizado no
   topo da página, mutation recebe `requisitionLabel` para o título.
4. `client/src/pages/logistics/ReceivingConferenceDialog.tsx` — mutation
   de confirmação de recebimento migrada para `translateApiError(...,
   'receive-purchase')` + `<DidacticAlert>`, cobrindo o caso "recebimento
   sem nota fiscal" (`BUSINESS_RULES.md` §13.5 item 5). Título usa
   `order_number` do pedido de compra.

### Telas do §13.5 ainda não retrofitadas (próxima entrega)

Restam 5 dos 9 casos priorizados em `docs/governance/TODO.md` §6.2 (ver
checklist atualizado lá): `ProductionOrdersPage.tsx` (liberar OP),
`RegisterTestTab.tsx` (teste de laboratório sem resultado/faixa),
`MrpPage.tsx` (conversão de ordem MRP já em execução), `InspectionTab.tsx`
(liberar/bloquear lote em status terminal). O padrão de migração é sempre
o mesmo: trocar `extractApiErrorMessage`/`window.alert`/`<p
className="text-destructive">` por `translateApiError(error, title,
context)` + `<DidacticAlert error={...} />`, adicionando o `title`
dinâmico com o identificador do documento (a tela é quem sabe qual
ação/documento estava em curso, não é derivável do erro).

### O que o Agente QA (ou humano) deve testar na interface

1. **`ConvertRequisitionDialog` (Requisições → Gerar Pedido de Compra)** —
   cenário principal do UC-43: criar/usar uma requisição aprovada com ao
   menos 2 itens sem fornecedor preferencial nem `suggested_supplier_id`,
   tentar converter sem informar fornecedor de fallback. Confirmar que o
   alerta lista **todos** os itens sem fornecedor (não apenas o
   primeiro) e que o link de ação aponta para a rota correta.
2. **`ShippingPage`** — tentar embarcar uma venda com NF-e não autorizada
   (status `processing`/`denied`/`pending`) via linha da tabela: o aviso
   inline deve mostrar o status atual da NF-e e link para `/sales`. Forçar
   um erro `422` na chamada de embarque (ex.: venda que muda de estado
   entre o carregamento da lista e o clique) e confirmar que aparece o
   `DidacticAlert` no topo, não mais um `window.alert()` nativo do
   browser.
3. **`ReceivingConferenceDialog`** — tentar confirmar recebimento sem
   preencher o número da NF (o campo tem validação client-side via zod,
   mas force também um erro de backend, ex.: reenviando um recebimento já
   processado) e confirmar o formato de 3 partes no lugar do `<p>` cru
   anterior.
4. **`CompleteProductionOrderDialog`** — tentar concluir uma OP com um
   componente sem lote selecionado e confirmar a mensagem didática; testar
   também um erro real de backend (ex.: quantidade de consumo maior que o
   saldo do lote) para validar que `translateApiError` extrai `details`
   corretamente quando o backend já os popula.
5. **Regressão**: confirmar que nenhuma das 4 telas usa mais
   `window.alert()` para erros de mutation, e que `extractApiErrorMessage`
   continua funcionando nos pontos não migrados dessas mesmas telas
   (criação de requisição em `RequisitionsPage`, carregamento de itens em
   `ShippingItemsDialog`) — não deve haver regressão nesses fluxos.

### Qualidade

- `node ./node_modules/typescript/bin/tsc -b --noEmit` — limpo, sem erros.
- `node ./node_modules/vitest/vitest.mjs run` — 21 testes passando (13
  pré-existentes intactos + 8 novos de `translateApiError.test.ts`).
- Nenhuma dependência nova instalada; nenhum commit criado (conforme
  instrução da tarefa).

**Desenvolvedor**: Claude Code (Senior Frontend Engineer / UI Architect)
**Data**: 2026-08-03

---

## Bloco 1.2 — Middleware `authorizeModule` + CRUD de Perfis de Acesso + Piloto (Concluído)

**Data**: 2026-08-03
**Escopo**: `docs/governance/TODO.md` Bloco 1.2 (backend). Fonte de
verdade: `docs/business/BUSINESS_RULES.md` §1-§8, `docs/business/01-USE_CASES.md`
UC-30 a UC-38. Trabalho restrito a `server/` (não tocado: `client/`,
migrations).
**Status**: ✅ Concluído (retrofit completo dos demais módulos e telas de
frontend permanecem pendentes, ver "Riscos residuais" abaixo)

### Resumo da feature

1. **Middleware `authorizeModule(moduleKey, requiredLevel = 'operate')`**
   em `server/src/middlewares/auth.ts`, aditivo (não substitui
   `authenticate`/`authorize`). `authenticate` foi estendido para
   carregar `AccessProfile` + `AccessProfilePermission` do usuário em uma
   única query (`include` aninhado), anexando `req.user.permissions`
   (mapa `module → 'operate'|'approve'`), `req.user.accessProfileId` e
   `req.user.accessProfileName` — sem N+1 por request.

   **Decisão de arquitetura aplicada (substitui o plano original do
   Bloco 1.1 de uma coluna `users.access_level`, que não existe no
   schema e não foi criada por este agente):** o nível gestor/operador de
   um usuário mora no **perfil**, não no usuário — `level = 'approve'`
   numa `AccessProfilePermission` caracteriza gestor daquele módulo,
   `level = 'operate'` caracteriza operador. Ver nota completa em
   `docs/business/BUSINESS_RULES.md` §4.

   Fórmulas implementadas: `role='admin'` sempre libera (curto-circuito,
   §3); sem `access_profile_id`/perfil inativo → 403 `NO_ACCESS_PROFILE`
   (UC-35-Exceção, aviso didático); módulo ausente da matriz → 403
   `MODULE_ACCESS_DENIED`; `requiredLevel='approve'` com `level='operate'`
   no perfil → 403 `APPROVAL_LEVEL_REQUIRED`. Toda negação é auditada
   (`logAction`, `action: 'access_denied'`, lazy-required para não
   quebrar testes que mockam apenas `models/index`).

2. **Novo módulo `server/src/modules/accessProfiles`** (Clean
   Architecture: domain/application/infrastructure/presentation), CRUD
   completo de Perfis de Acesso (UC-30 a UC-32):
   - `GET /api/access-profiles/modules` — lista os 26 module keys válidos
     (fonte única `server/src/shared/domain/accessModules.ts`)
   - `GET /api/access-profiles` — lista com permissões + `userCount`
   - `GET /api/access-profiles/:id`
   - `POST /api/access-profiles` — 409 nome duplicado, 422 sem permissão/
     módulo inválido, transação perfil+permissões
   - `PUT /api/access-profiles/:id` — substitui matriz de permissões
     integralmente em transação, audita matriz anterior completa
   - `DELETE /api/access-profiles/:id` — soft delete; 422 com lista de
     usuários ativos vinculados se houver (UC-32 decidido)

3. **`PUT /api/users/:id/access-profile`** (UC-33) — novo use case
   `AssignAccessProfileUseCase` no módulo `users` existente; valida
   perfil ativo, audita `oldValues`/`newValues`, não invalida sessão
   (UC-36 decidido).

4. **`GET /api/auth/me/permissions`** (UC-34, parcial) — novo use case
   `GetMyPermissionsUseCase` no módulo `auth`; retorna `{ modules,
   profile }` a partir de `req.user.permissions` já resolvido, sem query
   extra; `admin` recebe todos os módulos em `'approve'`.

5. **Aplicação piloto de `authorizeModule`** em dois módulos (validação
   do padrão, não o retrofit completo — que é tarefa própria do TODO):
   - `laboratory` (`module: 'laboratorio'`): leituras exigem visibilidade
     (qualquer nível), `POST /tests` exige `operate`.
   - `engineering` (`module: 'engenharia'`): leituras exigem
     visibilidade; criação/edição de projetos e desenhos exigem
     `operate`; `release`/`obsolete` de desenho técnico exigem `approve`
     (era `authorize('admin')` isolado — agora admin global OU gestor de
     engenharia, com o `authorize('admin')` legado mantido em camada,
     conforme risco §8).

6. Auditoria (`logAction`) em todos os writes: criação/edição/desativação
   de perfil, atribuição de perfil a usuário, e tentativas de acesso
   negado pelo middleware.

### Arquivos criados

- `server/src/shared/domain/accessModules.ts` — 26 module keys + labels
  pt-BR (fonte única compartilhada middleware ↔ módulo)
- `server/src/modules/accessProfiles/domain/repositories/AccessProfilesRepository.ts`
- `server/src/modules/accessProfiles/infrastructure/sequelize/SequelizeAccessProfilesRepository.ts`
- `server/src/modules/accessProfiles/application/use-cases/ListAccessProfilesUseCase.ts`
- `server/src/modules/accessProfiles/application/use-cases/GetAccessProfileByIdUseCase.ts`
- `server/src/modules/accessProfiles/application/use-cases/CreateAccessProfileUseCase.ts`
- `server/src/modules/accessProfiles/application/use-cases/UpdateAccessProfileUseCase.ts`
- `server/src/modules/accessProfiles/application/use-cases/DeactivateAccessProfileUseCase.ts`
- `server/src/modules/accessProfiles/application/use-cases/validatePermissions.ts`
- `server/src/modules/accessProfiles/presentation/controllers/accessProfilesController.ts`
- `server/src/modules/accessProfiles/presentation/routes/accessProfiles.ts`
- `server/src/modules/accessProfiles/README.md`
- `server/src/modules/auth/application/use-cases/GetMyPermissionsUseCase.ts`
- `server/src/modules/users/application/use-cases/AssignAccessProfileUseCase.ts`
- `server/tests/unit/access-profiles.test.ts` (20 testes)

### Arquivos modificados

- `server/src/middlewares/auth.ts` — `authenticate` estendido (eager-load
  de perfil+permissões), novo `authorizeModule` exportado
- `server/app.ts` — registrada `app.use('/api/access-profiles', ...)`
- `server/src/modules/auth/presentation/controllers/authController.ts` — `getMyPermissions`
- `server/src/modules/auth/presentation/routes/auth.ts` — `GET /me/permissions`
- `server/src/modules/users/presentation/controllers/userController.ts` — `assignAccessProfile`
- `server/src/modules/users/presentation/routes/users.ts` — `PUT /:id/access-profile`
- `server/src/modules/users/README.md` — endpoint documentado
- `server/src/modules/laboratory/presentation/routes/laboratory.ts` — `authorizeModule` piloto
- `server/src/modules/engineering/presentation/routes/engineering.ts` — `authorizeModule` piloto
- `docs/governance/TODO.md` — Bloco 1.2 marcado `[x]` (exceto item de
  convivência com `role` legado nos demais módulos, ainda `[ ]`), Bloco 1.5
  QA marcado com os testes unitários entregues
- `docs/business/BUSINESS_RULES.md` §4 — nota de implementação sobre a
  decisão de onde mora o nível gestor/operador
- `docs/projeto/04-USE_CASES.md` — UC-30 a UC-34 consolidados (versão
  resumida, com nota apontando `01-USE_CASES.md`/`BUSINESS_RULES.md` como
  fonte normativa completa para UC-35 a UC-43, ainda não implementados)
- `docs/database/DATABASE.md` — nota de escopo de `access_profiles`/
  `access_profile_permissions` atualizada (removida a referência a
  `access_level` como pendência de schema)
- `docs/arquitetura/API.md` — nova seção "1.2 Perfis de Acesso (Access Profiles)",
  `GET /api/auth/me/permissions` e `PUT /api/users/:id/access-profile`
  documentados em "1. Autenticação"/"1.1 Usuários"

### Documentações atualizadas

`docs/governance/TODO.md`, `docs/business/BUSINESS_RULES.md`,
`docs/projeto/04-USE_CASES.md`, `docs/database/DATABASE.md`, `docs/arquitetura/API.md`,
`server/src/modules/accessProfiles/README.md` (novo),
`server/src/modules/users/README.md`, JSDoc completo em todos os arquivos
`.ts` criados/modificados (middleware, use cases, controllers, rotas).

### Testes executados

- `npm run typecheck` (`tsc -p tsconfig.json --noEmit`) — limpo, sem erros.
- `npx jest tests/unit` — **53 suites / 298 testes, 100% verde**, incluindo
  os 20 novos de `tests/unit/access-profiles.test.ts` (middleware:
  admin sempre passa, `NO_ACCESS_PROFILE`, `MODULE_ACCESS_DENIED`,
  `APPROVAL_LEVEL_REQUIRED`, `operate` não aprova, `approve` aprova, 401
  sem `req.user`; CRUD: 409 duplicado, 422 sem permissão/módulo inválido,
  auditoria com matriz completa na edição, 422 desativação com usuários
  vinculados listados, desativação bem-sucedida; atribuição: auditoria
  com valor anterior/novo, 422 perfil inativo, 404 perfil inexistente,
  remoção com `null`) — **sem regressões** nos 278 testes pré-existentes.
- Nenhuma migration/docker executado (fora do escopo desta tarefa, schema
  já aplicado conforme instrução).
- Nenhum commit criado (conforme instrução da tarefa).

### Instruções de teste para o próximo agente/humano

1. Validar manualmente (ou via Supertest) o fluxo HTTP completo com um
   perfil real: criar um perfil "Analista de Laboratório" com
   `{ laboratorio: 'operate' }` via `POST /api/access-profiles`, atribuir
   a um usuário `operator` via `PUT /api/users/:id/access-profile`, logar
   com esse usuário e confirmar que `GET /api/laboratory/tests` responde
   200 e `POST /api/laboratory/tests` também, mas que um endpoint de outro
   módulo (ex.: `GET /api/financial/payable`, ainda sem `authorizeModule`
   aplicado) segue com o comportamento anterior (não quebrou).
2. Testar `PUT /api/engineering/drawings/:id/release` com um usuário cujo
   perfil tem `{ engenharia: 'operate' }` (deve continuar barrado, agora
   com 403 `APPROVAL_LEVEL_REQUIRED` do middleware, antes mesmo do
   `authorize('admin')` legado) e depois com `{ engenharia: 'approve' }`
   (deve passar do middleware, mas ainda cair no `authorize('admin')`
   legado se o usuário não for admin — **este é o ponto de atenção**: a
   convivência entre as duas checagens nos módulos piloto ainda não foi
   resolvida, ver "Riscos residuais").
3. Testar `DELETE /api/access-profiles/:id` de um perfil com usuários
   ativos vinculados e confirmar `error.details.users` completo; realocar
   os usuários e confirmar que a segunda tentativa retorna 200.
4. Testar `GET /api/auth/me/permissions` logado como `admin` (deve trazer
   todos os 26 módulos em `'approve'`) e como usuário sem perfil (deve
   trazer `{ modules: {}, profile: null }`).
5. Rodar `npx jest tests/unit` e `npm run typecheck` para confirmar que a
   base segue estável antes de prosseguir com o retrofit dos demais
   módulos.

### Riscos residuais / pendências não resolvidas nesta entrega

- **Convivência `authorizeModule` × `authorize(role)` legado nos módulos
  piloto:** nesta entrega, ambas as checagens foram **mantidas** em
  `laboratory`/`engineering` (compostas em camada — `authorizeModule`
  roda antes). Isso significa que em `engineering`, um usuário com
  perfil "Engenheiro" nível `approve` no módulo `engenharia` ainda leva
  403 em `release`/`obsolete` de desenho se não for `role='admin'`
  globalmente (o `authorize('admin')` legado não foi removido). O TODO
  (§8/Bloco 1.2) já documentava esse risco como decisão de implementação
  a validar — **não foi resolvido aqui**, apenas reafirmado; próxima
  tarefa deve decidir se o `authorize(role)` legado é removido nesses
  dois endpoints ou se a UX de erro deve ser ajustada.
- **Retrofit incompleto:** `authorizeModule` só foi aplicado a
  `laboratory`/`engineering`. Os demais 20+ módulos de rota continuam
  usando apenas `authorize(role)`. Nenhuma rota teve seu comportamento de
  autorização **reduzido** por esta entrega — apenas os dois módulos
  piloto ganharam uma camada adicional (mais restritiva, nunca mais
  permissiva).
- **Frontend (Bloco 1.4) não iniciado:** menu dinâmico, tela "Acesso
  Negado", telas de gestão de perfis — fora do escopo desta tarefa
  (proibido tocar `client/`).
- **Seed de perfis operacionais (11 perfis da matriz §1, incluindo a
  pendência do módulo `rh`)** continua não realizado — apenas o perfil
  "Administrador Geral" existe desde o Bloco 1.1.
- **Testes de integração HTTP fim-a-fim** (Supertest, com app real e rota
  montada) não foram criados nesta entrega — apenas testes unitários do
  middleware e dos use cases com mocks. Recomendado para a próxima
  iteração antes do retrofit completo.

**Desenvolvedor**: Claude Code (Senior Backend Engineer / Tech Lead de Documentação)
**Data**: 2026-08-03

---

## Bloco 1.4 — Frontend: Menu Dinâmico e Gestão de Perfis de Acesso (Concluído)

**Data**: 2026-08-03
**Escopo**: `client/` apenas (leitura de `server/` e `docs/` para confirmar contratos reais, sem alterá-los).
**Status**: ✅ Concluído (UC-30 a UC-35 no frontend, UC-38 fica pendente — ver "Fora de escopo").

### Contratos de API confirmados por leitura (antes de codar)

- `server/src/shared/domain/accessModules.ts` — 26 `AccessModuleKey`, usados
  literalmente em `client/src/api/accessProfiles.ts` (`AccessModuleKey`
  type) e no mapeamento de itens de menu do `AppLayout`.
- `server/src/modules/accessProfiles/presentation/routes/accessProfiles.ts`
  — `GET/POST /api/access-profiles`, `GET /api/access-profiles/modules`,
  `GET/PUT/DELETE /api/access-profiles/:id`, todas `admin`-only.
- `server/src/modules/accessProfiles/domain/repositories/AccessProfilesRepository.ts`
  — shape de `AccessProfileListItem` (`id, nome, descricao,
  allowedWarehouses, active, permissions[], userCount`), usado 1:1 no tipo
  `AccessProfile` do client.
- `server/src/modules/auth/application/use-cases/GetMyPermissionsUseCase.ts`
  + `server/src/modules/auth/presentation/routes/auth.ts` —
  `GET /api/auth/me/permissions` retorna `{ modules: {module: nivel},
  profile: {id, nome} | null }`; `admin` recebe todos os 26 módulos em
  `'approve'`.
- `server/src/modules/users/presentation/routes/users.ts` +
  `AssignAccessProfileUseCase.ts` — `PUT /api/users/:id/access-profile`
  (não `PATCH`, confirmado por leitura), body `{ access_profile_id: number
  | null }`; 422 se perfil inativo, 404 se inexistente.
- `SequelizeUsersRepository.list` **não** faz `include` de `AccessProfile`
  — `GET /api/users` retorna apenas `accessProfileId` (número/null), sem o
  nome do perfil. O client resolve o nome cruzando com
  `listAccessProfiles()` (query React Query separada, `UsersPage.tsx`).

### Arquivos criados

- `client/src/api/accessProfiles.ts` — client de API: tipos
  (`AccessModuleKey`, `AccessModuleLevel`, `AccessProfile`,
  `AccessProfilePermission`, `MyPermissions`) + funções
  `listAccessProfiles`, `listAccessModules`, `getAccessProfile`,
  `createAccessProfile`, `updateAccessProfile`, `deactivateAccessProfile`,
  `assignAccessProfile`, `getMyPermissions`.
- `client/src/pages/users/AccessProfilesPage.tsx` — tela "Usuários >
  Perfis de Acesso" (UC-30/UC-31/UC-32): listagem com nº de módulos/nº de
  usuários/status; dialog de criar/editar com a matriz de 26 módulos ×
  nível (radio "Sem acesso"/"Operar"/"Aprovar" por linha, rótulos pt-BR de
  `GET /api/access-profiles/modules`); desativação com `window.confirm` +
  `translateApiError`/`DidacticAlert` para o 422 didático de usuários
  vinculados (UC-32).
- `client/src/pages/AccessDeniedPage.tsx` — componente único com duas
  variantes: `accessDenied` (navegação direta a módulo fora do perfil,
  UC-35) e `noProfile` (usuário sem `access_profile_id`, texto oficial do
  dono "Seu acesso ainda não foi configurado — procure o administrador",
  UC-35-Exceção).
- `client/src/context/AuthContext.permissions.test.tsx` — 3 testes novos
  (mock de `@/api/accessProfiles`): mapa de permissões aplicado
  corretamente, fallback de segurança em falha de rede, usuário sem perfil
  recebe mapa vazio.

### Arquivos modificados

- `client/src/context/AuthContext.tsx` — adiciona `permissions`,
  `accessProfile`, `isPermissionsLoading`, `permissionsFetchFailed`,
  `hasModuleAccess(module)` ao contexto. Após `getMe()` (bootstrap) ou
  `login()`, chama `GET /api/auth/me/permissions`
  (`accessProfilesApi.getMyPermissions`). **Fallback de segurança
  documentado em JSDoc**: se essa chamada falhar (erro de rede/500 — não é
  o caso normal "sem perfil", que responde 200 com `modules: {}`),
  `permissionsFetchFailed = true` e o erro é logado no console
  (`console.error`), mas a sessão **não** é derrubada e `hasModuleAccess`
  não trava ninguém — cabe ao consumidor (`AppLayout`) decidir usar a regra
  antiga de `role` nesse caso.
- `client/src/layouts/AppLayout.tsx` — `NavItem` ganhou campo opcional
  `module?: AccessModuleKey`; cada item do menu existente foi mapeado para
  sua module key (ex.: Estoque→`estoque`, MRP→`mrp`,
  Relatórios→`relatorios.producao` como aproximação — UC-38 sub-permissões
  de relatório por tipo não foi modelado no menu ainda, ver "Fora de
  escopo"). `itemVisible()` decide visibilidade: `roles` (se houver) E
  (sem `module` OU `hasModuleAccess` OU fallback de role ativo — admin ou
  `permissionsFetchFailed`). Adicionado item "Perfis de Acesso" em
  Administração. Quando usuário não-admin está sem perfil configurado (mapa
  de permissões vazio, sem falha de rede), o `<main>` renderiza
  `<AccessDeniedPage variant="noProfile" />` no lugar do `<Outlet />` — o
  header (trocar senha/sair) continua acessível, mas nenhum módulo de
  negócio é exibido.
- `client/src/routes/ProtectedRoute.tsx` — novo `ModuleRoute({ module })`:
  guard de rota que bloqueia navegação direta por URL a um módulo fora do
  perfil, renderizando `<AccessDeniedPage variant="accessDenied" />` (não a
  página do módulo, nunca tenta renderizar dados parciais — UC-35). Mesmo
  critério de liberação do menu (admin sempre libera; fallback de rede
  libera; caso contrário exige `hasModuleAccess`).
- `client/src/App.tsx` — cada grupo de rotas de módulo (produtos, estoque,
  recebimento, expedição, vendas, compras, requisições, produção, mrp,
  chão de fábrica, centros de trabalho, qualidade, laboratório, engenharia,
  relatórios, patrimônio, financeiro, rastreabilidade) foi envolvido em
  `<Route element={<ModuleRoute module="..." />}>`. Nova rota
  `/users/access-profiles` (dentro do `<RoleRoute roles={['admin']} />`
  já existente, ao lado de `/users`/`/audit-logs`).
- `client/src/api/users.ts` — `User` ganhou `accessProfileId?: number |
  null` (campo aditivo, reflete o que `GET /api/users` já retorna hoje sem
  mudança de backend).
- `client/src/pages/users/UsersPage.tsx` — nova coluna "Perfil" (resolve o
  nome cruzando com `listAccessProfiles()`; mostra "Não se aplica (admin)"
  para `role=admin`, badge "Sem perfil" quando `accessProfileId` é `null`);
  novo botão "Atribuir perfil" por linha, abrindo dialog com `SelectNative`
  de perfis **ativos** (`PUT /api/users/:id/access-profile`), aviso textual
  de que a mudança vale no próximo login (UC-36) e tratamento didático do
  erro (`translateApiError`/`DidacticAlert`) para 404/422 (perfil
  inexistente/inativo).

### Decisões tomadas nesta entrega

1. **Tela em `client/src/pages/users/AccessProfilesPage.tsx`** (não aba
   dentro de `UsersPage.tsx`) — seguindo o padrão já usado no projeto de
   uma página por entidade (`SuppliersPage`, `ClientsPage`, etc.), com link
   próprio no menu ("Administração > Perfis de Acesso") e rota
   `/users/access-profiles`, mantendo `UsersPage.tsx` focado em usuários.
2. **Matriz de permissões como radio button por linha** (não checkbox
   duplo `ver`/`aprovar`) — mais simples de mapear 1:1 para o `level`
   `'operate'|'approve'` do backend (que já não modela `'none'`/`'view'`
   como valores persistidos, apenas a ausência de linha = `none`); "Sem
   acesso" desmarca a permissão (não envia `module` no payload).
3. **`ModuleRoute` como guard adicional, não substituto de `RoleRoute`** —
   onde já existia `RoleRoute` (ex.: `/financial`), o `ModuleRoute` foi
   aninhado por dentro, preservando a checagem de role legada (mesmo padrão
   de convivência em camadas usado no backend, `authorizeModule` +
   `authorize(role)`).
4. **Relatórios mapeado para `relatorios.producao`** no menu (aproximação
   provisória) — o backend já modela `relatorios.producao/.compras/.custos/
   .financeiro` como sub-chaves independentes (UC-38), mas a tela
   `ReportsPage.tsx` ainda é uma página única sem segmentação por tipo de
   relatório; um retrofit fino (checar sub-permissão por aba/relatório
   dentro da página) fica registrado como próximo passo, não bloqueante
   para este bloco.

### Fora de escopo desta entrega (não implementado, registrado para não gerar retrabalho ambíguo)

- **UC-38 (Dashboard/Relatórios/Rastreabilidade filtrados por interseção)**
  — o backend ainda não filtra os cards do Dashboard nem valida
  sub-permissões de relatório (`docs/governance/TODO.md` §1.3, ainda `[ ]`
  no backend); o frontend, portanto, não tem o que consumir ainda além do
  bloqueio total já implementado pelo `ModuleRoute` em `/reports`.
- **Seletor de nível operador/gestor no dialog de atribuição de perfil**
  (`docs/governance/TODO.md` linha "Tela de edição de usuário: seletor de
  perfil + nível") — **não implementado nesta entrega** porque a coluna
  `users.access_level` (`operador`/`gestor`) mencionada no Bloco 1.1/1.2 do
  TODO **não existe no schema atual** (decisão de arquitetura do backend:
  o nível já é resolvido pelo `level` da permissão do perfil —
  `operate`/`approve` —, não por um campo separado no usuário; ver JSDoc de
  `authorizeModule` e a nota "Desvio de arquitetura" em
  `docs/governance/TODO.md` §1.2). Não há campo de nível de usuário para
  selecionar; o dialog de atribuição só oferece o perfil.
- **Contador/badge de notificação por módulo no menu** (UC-40, ainda em
  aberto com o dono, ver rodapé de `docs/governance/TODO.md`) — não
  implementado, fora do escopo desta entrega.

### Testes

- `node ./node_modules/vitest/vitest.mjs run` — **24 testes passando** (21
  pré-existentes intactos + 3 novos em
  `client/src/context/AuthContext.permissions.test.tsx`).
- `npx tsc -b` (build completo) — sem erros.
- `npm run lint` (oxlint) — sem erros novos (apenas os 4 warnings
  `react(only-export-components)` pré-existentes em outros arquivos, não
  relacionados a esta entrega).
- Não foram criados testes de `AccessProfilesPage`/`UsersPage`/`AppLayout`
  em si (render completo com Radix/Table) — os 3 testes novos cobrem a
  lógica central (`hasModuleAccess`, fallback, mapa vazio) via
  `AuthContext`, que é o ponto de decisão único consumido por
  `AppLayout`/`ModuleRoute`. Recomendado para o QA/próxima iteração: teste
  de integração leve do `AppLayout` (menu renderizado com mock de
  `permissions`) e do `ModuleRoute` (redirecionamento para
  `AccessDeniedPage` em URL direta).

### O que o Agente QA (ou humano) deve testar na interface

1. Login como `admin`: menu completo igual a hoje (retrocompatibilidade),
   incluindo "Perfis de Acesso" em Administração.
2. Criar um perfil "Almoxarife" com `{ estoque: operate, producao: view
   (⇒ marcar como "Operar", já que não há "ver" nesta modelagem) }`,
   atribuir a um usuário `operator` existente via `UsersPage > Atribuir
   perfil`, fazer logout/login com esse usuário: menu deve mostrar apenas
   Estoque/Produção.
3. Com esse mesmo usuário logado, digitar a URL `/financial` diretamente:
   deve cair na tela "Acesso negado" (não a página financeira).
4. Criar um usuário `operator` novo, **sem** atribuir perfil, fazer login:
   deve ver a tela "Seu acesso ainda não foi configurado — procure o
   administrador" e nenhum item de menu de módulo (apenas trocar
   senha/sair no header).
5. Tentar desativar um perfil com usuário(s) ativo(s) vinculado(s): deve
   aparecer o alerta didático de 3 partes (não um erro cru), listando os
   usuários afetados; reatribuir os usuários para outro perfil e desativar
   novamente deve funcionar.
6. Simular falha de rede em `GET /api/auth/me/permissions` (ex.: interceptar
   e forçar erro 500 via devtools) com um usuário `operator`/`financial`
   que tinha menu funcionando antes: o menu deve continuar aparecendo pela
   regra antiga de `role` (não deve travar em tela branca nem em "acesso
   não configurado") — checar o console por um `console.error` de aviso.

**Desenvolvedor**: Claude Code (Senior Frontend Engineer / UI Architect)

---

## Bloco 1.2 — Retrofit `authorizeModule` em Todos os Módulos de Rota (2026-08-04)

### Resumo da feature

Extensão do middleware `authorizeModule` (introduzido como piloto em
`laboratory`/`engineering`) para **todos** os demais arquivos de rota de
módulos de negócio em `server/src/modules/*/presentation/routes/*.ts`,
**substituindo** (não empilhando) o `authorize(role)` legado, conforme a
decisão registrada em `docs/business/BUSINESS_RULES.md` §8. Escopo
estritamente limitado a arquivos de rota + testes — nenhuma
migration/model/use-case/controller foi tocado (trabalho paralelo de
outro agente).

**Mapeamento rota → módulo aplicado:**

| Rota (prefixo) | Módulo (`AccessModuleKey`) | Observação |
|---|---|---|
| `products`, `items` | `produtos` | item mestre mapeado ao mesmo módulo |
| `inventory-counts` | `contagens` | `approve/reject` exigem nível `approve` |
| `sales` | `vendas` | ver pendência de `expedicao` abaixo |
| `clients` | `clientes` | `delete` exige `approve` |
| `purchases` | `compras` | **exceto** `POST /:id/receive` → `recebimento` |
| `purchase-requisitions` | `requisicoes` | `PATCH /:id/status` exige `approve` |
| `suppliers` | `fornecedores` | `delete` exige `approve` |
| `production-orders` | `producao` | **exceto** `/tracking/*` e `/:id/tracking` → `chao_de_fabrica` |
| `bom` (engineering/bom) | `bom` | — |
| `mrp` | `mrp` | — |
| `work-centers` | `centros_de_trabalho` | — |
| `quality/non-conformities` | `qualidade` | `delete` exige `approve` |
| `inventory` (movements/stock-report/low-stock/lots) | `estoque` | **exceto** `lots/:id/release` e `lots/:id/block` → `qualidade` (`approve`, UC-37) |
| `assets` | `patrimonio` | `delete` exige `approve` |
| `traceability` | `rastreabilidade` | somente leitura |
| `finance` | `financeiro` | escritas exigem `operate` |
| `reports/{sales,inventory,customers,cash-flow}` | `relatorios.financeiro` | — |
| `reports/production` | `relatorios.producao` | — |
| `reports/purchasing` | `relatorios.compras` | — |
| `reports/cost-variance` | `relatorios.custos` | — |
| `dashboard` | `dashboard` | módulo agregador (§6.1) |
| `mobile-inventory` | `estoque` | mesmo módulo de `/api/inventory/movements` |
| `items/:id/suppliers` | `produtos` | sub-recurso do item mestre |

**Mantidos fora do escopo (por decisão do enunciado):**
- `intelligentAuditor`: `authorize('admin')` preservado (admin only).
- `users`, `audit-logs`, `access-profiles`, `auth`: continuam
  admin-only por `role` — fora do catálogo de 26 módulos de área (§1).
- `webhooks`: rotas públicas de integração externa (n8n, Focus NF-e).
- `categories`, `departments`, `employees`, `fiscal`, `maintenance`,
  `serviceOrders`: sem módulo de permissão correspondente na matriz
  atual de `BUSINESS_RULES.md` §1 (mesma pendência de "RH" já anotada
  no documento) — fora do escopo desta tarefa.

### Exceções e pendências anotadas

1. **`PUT /api/sales/:id/status` (transição para `shipped`)** — não é
   possível diferenciar por payload na definição estática da rota qual
   transição de status pertence ao módulo `vendas` versus `expedicao`
   (a tela de expedição usa o mesmo endpoint). A rota inteira permanece
   mapeada em `vendas`; decisão fina (endpoint dedicado ou inspeção de
   payload) registrada como pendência em `docs/governance/TODO.md`.
2. **`purchaseRequisitionController.changeStatus`** — o controller
   mantém a checagem hard-coded `req.user.role !== 'admin'` para
   `status = 'approved'` (não removida: escopo desta tarefa restrito a
   arquivos de rota, sem tocar controllers). A rota já exige
   `authorizeModule('requisicoes', 'approve')`, mas um usuário com
   perfil "Gestor de Compras" (`level = 'approve'`, não `role =
   'admin'`) ainda pode ser bloqueado pelo controller legado —
   **risco residual de UX/regra de negócio já documentado em
   `BUSINESS_RULES.md` §8**, requer decisão de outro agente/humano sobre
   remover a checagem do controller.
3. Os pilotos `laboratory`/`engineering` mantêm o modo aditivo
   (`authorizeModule` + `authorize(role)` compostos) — não foram
   alterados nesta tarefa (decisão prévia registrada na entrega deles),
   apenas confirmados pelo novo teste de guarda.

### Documentações atualizadas

- `docs/governance/TODO.md` — Bloco 1.2 marcado como retrofit completo
  (checklist `[x]`), com o mapeamento rota→módulo, a lista de exceções e
  a pendência de `sales`/`expedicao` registrada como item aberto.
- `docs/governance/HANDOFF_CODEX.md` — esta seção.
- JSDoc de cabeçalho atualizado em cada arquivo de rota alterado (20
  arquivos), documentando o módulo aplicado, o nível exigido por rota e,
  quando aplicável, a exceção de módulo-dono-da-ação (`recebimento` em
  `purchases`, `chao_de_fabrica` em `production-orders`,
  `qualidade` em `inventory` lots, sub-tipos de relatório em `reports`).

### Arquivos de rota alterados

`server/src/modules/{products,items,inventory (inventory.ts +
inventoryCounts.ts),sales,clients,purchases,purchaseRequisitions,
suppliers,production (productionOrders.ts),bom,mrp,workCenters,
nonConformities,assets,traceability,financial,reports,dashboard,
mobileInventory}/presentation/routes/*.ts`

### Testes

- `server/tests/unit/rbac-critical-routes.test.ts` — **reescrito**
  integralmente: mock de `authenticate`/`authorizeModule` (antes mockava
  `authorize(role)`, que não existe mais nestas rotas) simulando a
  fórmula de `BUSINESS_RULES.md` §4 via header de teste
  `x-test-permissions` (mapa `{ modulo: nivel }`); cobre 401 (sem
  token), 403 sem módulo, 403 nível insuficiente (rotas `approve`), 200
  com nível correto e 200 para `role = admin` (curto-circuito §3). 18
  testes, cobrindo os módulos críticos de escrita (produtos, vendas,
  recebimento, estoque, qualidade/lotes, contagens, produção,
  chão-de-fábrica, itens, BOM, MRP, financeiro, requisições, centros de
  trabalho, patrimônio, fornecedores, clientes, não-conformidades).
- `server/tests/unit/module-authorization-map.test.ts` — **novo** teste
  de guarda anti-regressão (leitura de arquivo + regex, sem montar
  Express): garante que todo módulo listado usa `authorizeModule` em
  pelo menos uma chamada por arquivo de rota e que nenhum deles (exceto
  os pilotos `laboratory`/`engineering`) ainda chama `authorize(role)`
  para escrita comum; também garante 100% de cobertura consciente das
  pastas de `src/modules` (exigidos + excluídos documentados).

**Resultados:** `npm run typecheck` limpo (0 erros); `npx jest
tests/unit` → 54 suites / 329 testes, 100% verde.

### Instruções de teste (próximo agente/humano)

1. Rodar `npm run typecheck` e `npx jest tests/unit` em
   `server/` — devem permanecer limpos após qualquer alteração
   subsequente nestas rotas.
2. Validar manualmente (ou via teste de integração futuro) o cenário de
   UC-37 (Qualidade libera lote criado pelo Recebimento): um usuário com
   perfil "Almoxarife"/"Recebimento" sem `qualidade: approve` deve
   receber 403 em `POST /api/inventory/lots/:id/release`; um usuário
   com perfil "Qualidade" nível gestor (`qualidade: approve`) deve
   conseguir liberar/bloquear o lote.
3. Validar o cenário de requisição de compra: um usuário com perfil
   "Gestor de Compras" (`requisicoes: approve`) tentando `PATCH
   /api/purchase-requisitions/:id/status` para `approved` — hoje ainda
   é bloqueado pelo controller legado (`role !== 'admin'`), reproduzindo
   o risco documentado no item 2 de "Exceções e pendências" acima;
   confirmar com o dono do produto se a checagem do controller deve ser
   removida em uma próxima tarefa.
4. Nenhuma migration/model foi tocada — não é necessário rodar
   `npm run migration:status`/`up` para validar esta entrega.
5. `NÃO` foi rodado Docker nem houve commit, conforme instrução da
   tarefa — próximo agente decide se/quando commitar.

**Desenvolvedor**: Claude Code (Senior Backend Engineer — retrofit RBAC)
**Data**: 2026-08-03

---

## Bloco 4 (Backend) — Saldo por Depósito, Recebimento/Produção Dual-Write e Transferências (2026-08-04)

**Data**: 2026-08-04
**Escopo**: `docs/governance/TODO.md` Bloco 4.2 (parcial), UC-42 em
`docs/business/01-USE_CASES.md`, `docs/business/BUSINESS_RULES.md` §12.
**Status**: ✅ Concluído (escopo desta tarefa — expedição/venda e teste
destrutivo de laboratório ficam para uma próxima entrega, ver "Fora de
escopo" abaixo).

### Resumo da feature

Implementado o dual-write de saldo por depósito (`ProductWarehouseStock`)
para os fluxos de **Recebimento de Compra** e **Produção (consumo de
componentes + conclusão de OP)**, além do fluxo completo de
**Transferência entre Depósitos** com aprovação de gestor. A invariante
`soma(product_warehouse_stock) = products.quantity` é preservada em toda
transação: `products.quantity` continua a única fonte de verdade lida
por MRP/telas legadas, e `ProductWarehouseStock` é atualizada em paralelo
na MESMA transação Sequelize.

**Migration nova:** `server/migrations/20260804-000002-warehouse-transfers.cjs`
— adiciona `'transfer'` ao enum `inventory_movements.type` e cria a
tabela `warehouse_transfers` (`product_id`, `from_warehouse_id`,
`to_warehouse_id` com `CHECK (from<>to)`, `quantity` com `CHECK (>0)`,
`reason` obrigatório, `user_id`, `approved_by` nullable, `status`
`pending|approved|rejected`).

**Model novo:** `server/src/models/WarehouseTransfer.ts` + associações em
`server/src/models/index.ts` (`Product`, `Warehouse` origem/destino,
`User` solicitante/aprovador).

**Service novo:** `server/src/services/warehouseStockService.ts` —
`addToWarehouse`/`removeFromWarehouse` (transacionais, lock pessimista
`LOCK.UPDATE` sobre a linha `product_id+warehouse_id`, criando a linha
com saldo zero se ainda não existir) e `getWarehouseByCode` (resolve
`INSUMOS`/`ACABADOS`/`LABORATORIO` por código, 404 se inexistente/
inativo). `removeFromWarehouse` lança `BusinessRuleError` (422) didático
citando produto, depósito e saldo atual quando o saldo do depósito é
insuficiente — nunca deixa o saldo ficar negativo.

**Integrações dual-write:**
- `ReceivePurchaseItemsUseCase` — entrada vai para `INSUMOS` por padrão;
  aceita `warehouse_code` opcional (`'INSUMOS'|'LABORATORIO'`) no
  payload de `POST /api/purchases/:id/receive` para o caso de amostra de
  engenharia (roteamento 100% automático por `origin` da requisição
  fica para o Bloco 2, ainda não implementado). O lote (`LotControl`)
  criado/atualizado ganha `warehouse_id`; o `InventoryMovement` também.
- `ChangeProductionOrderStatusUseCase` — consumo de componentes debita
  sempre `INSUMOS` (`removeFromWarehouse` antes de
  `consumeLotsForComponent`, 422 didático se insuficiente); produto
  acabado recebido credita sempre `ACABADOS`; o lote de produto acabado
  (`createFinishedLot`) ganha `warehouse_id = ACABADOS`.
- `CreateInventoryMovementUseCase` (`POST /api/inventory/movements`) —
  aceita `warehouse_code` opcional (default `INSUMOS`); saída (`type:
  'out'`) valida saldo do depósito ANTES de debitar `products.quantity`
  (422 se insuficiente); entrada credita o depósito depois do
  `InventoryService.adjust`.
- `InventoryService.consume`/`receive`/`adjust`
  (`server/src/services/inventoryService.ts`) — ganharam parâmetro
  opcional `warehouseId`/`options.warehouseId` (aditivo, backward
  compatible) para estampar `warehouse_id` no `InventoryMovement`
  criado.

**Transferências (fluxo completo):**
- `POST /api/inventory/transfers` (`authorizeModule('estoque',
  'operate')`) → `CreateWarehouseTransferUseCase`: valida
  `quantity > 0`, `reason` não vazio, `from_warehouse_code !=
  to_warehouse_code`; cria em `status='pending'`, sem alterar nenhum
  saldo.
- `PUT /api/inventory/transfers/:id/approve` (`authorizeModule('estoque',
  'approve')`) → `ApproveWarehouseTransferUseCase`: transação própria no
  controller; debita origem/credita destino via
  `warehouseStockService` (422 didático se saldo de origem insuficiente
  NO MOMENTO da aprovação — pode ter mudado desde a solicitação); gera
  2 `InventoryMovement` (`type='transfer'`, `reference_type='transfer'`,
  `reference_id=warehouse_transfers.id`); `products.quantity` NUNCA é
  tocado (transferência não altera o total do produto, apenas onde ele
  está).
- `PUT /api/inventory/transfers/:id/reject` (mesma autorização) →
  `RejectWarehouseTransferUseCase`: exige `reason`, não altera saldo.
- `GET /api/inventory/transfers?status=` → `ListWarehouseTransfersUseCase`.
- `GET /api/inventory/warehouse-stock?product_id=&warehouse_code=&page=&limit=`
  → `ListWarehouseStockUseCase` (linhas produto×depósito, com `product`
  e `warehouse` incluídos).
- `GET /api/inventory/warehouses` → `ListWarehousesUseCase` (depósitos
  ativos).

Todas as rotas novas em
`server/src/modules/inventory/presentation/routes/inventory.ts`, sob o
prefixo já existente `/api/inventory` (não foi criado um módulo/prefixo
`warehouses` dedicado — decisão desta entrega para reaproveitar
`authorizeModule('estoque', ...)` já retrofitado no módulo `inventory`).

### Desvios de contrato desta entrega (vs. desenho original do TODO)

1. **Endpoints:** o desenho original do TODO.md sugeria
   `GET/POST /api/warehouses`, `GET/POST /api/warehouse-transfers`,
   `PATCH .../approve|reject`. Esta entrega usa
   `/api/inventory/warehouses` (somente leitura — CRUD de depósito não
   implementado), `/api/inventory/transfers` e `PUT` (não `PATCH`) para
   approve/reject, para reaproveitar o módulo `inventory` já com
   `authorizeModule` retrofitado.
2. **`transfer_id`:** não foi criada uma coluna `transfer_id` (UUID)
   dedicada em `inventory_movements` — o par já existente
   `reference_type='transfer'`/`reference_id=warehouse_transfers.id`
   cumpre o mesmo papel de vincular os dois lançamentos (`out`/`in`) de
   uma transferência.
3. **Roteamento automático de amostra de engenharia:** o Bloco 2
   (UC-39, `origin='engineering_sample'` em `purchase_requisitions`)
   ainda não existe — o parâmetro `warehouse_code` no payload de
   `POST /api/purchases/:id/receive` é a forma manual de sinalizar o
   destino `LABORATORIO` até o Bloco 2 automatizar a detecção.

### Fora de escopo desta entrega (registrado no TODO.md)

- Expedição de venda debitando exclusivamente `ACABADOS` (Fluxo D,
  UC-42) — `ChangeSaleStatusUseCase` ainda não integrado.
- Débito automático de teste destrutivo no Depósito de Laboratório
  (Fluxo E, UC-42-E) — depende do módulo `laboratory`/
  `AcousticTestResult`.
- CRUD completo de depósito (`POST/PUT /api/warehouses`) — apenas
  leitura (`GET`) foi implementada; cadastro segue via seed/migration.
- Filtro `?warehouse_id=` em `GET /api/inventory/movements`.
- Frontend (telas de depósito/transferência/saldo) — 100% fora de
  escopo desta tarefa (backend apenas).

### Arquivos alterados/criados

**Criados:**
- `server/migrations/20260804-000002-warehouse-transfers.cjs`
- `server/src/models/WarehouseTransfer.ts`
- `server/src/services/warehouseStockService.ts`
- `server/src/modules/inventory/application/use-cases/CreateWarehouseTransferUseCase.ts`
- `server/src/modules/inventory/application/use-cases/ApproveWarehouseTransferUseCase.ts`
- `server/src/modules/inventory/application/use-cases/RejectWarehouseTransferUseCase.ts`
- `server/src/modules/inventory/application/use-cases/ListWarehouseTransfersUseCase.ts`
- `server/src/modules/inventory/application/use-cases/ListWarehouseStockUseCase.ts`
- `server/src/modules/inventory/application/use-cases/ListWarehousesUseCase.ts`
- `server/tests/unit/warehouse-stock.test.ts` (19 testes novos)

**Modificados:**
- `server/src/models/index.ts` (import + associações de `WarehouseTransfer`)
- `server/src/services/inventoryService.ts` (`warehouseId` opcional em `consume`/`receive`/`adjust`/`createMovement`)
- `server/src/modules/purchases/application/use-cases/ReceivePurchaseItemsUseCase.ts` (dual-write, `warehouseCode` opcional)
- `server/src/modules/purchases/presentation/validators/purchaseValidators.ts` (`warehouse_code` no schema de recebimento)
- `server/src/modules/purchases/presentation/controllers/purchaseController.ts` (repassa `warehouse_code`)
- `server/src/modules/production/application/use-cases/ChangeProductionOrderStatusUseCase.ts` (dual-write INSUMOS/ACABADOS)
- `server/src/modules/inventory/application/use-cases/CreateInventoryMovementUseCase.ts` (dual-write, `warehouse_code` opcional)
- `server/src/modules/inventory/presentation/validators/inventoryValidators.ts` (`warehouse_code` + schemas de transferência)
- `server/src/modules/inventory/presentation/controllers/inventoryController.ts` (6 controllers novos: transfers CRUD-lite + warehouse-stock + warehouses)
- `server/src/modules/inventory/presentation/routes/inventory.ts` (6 rotas novas)
- `server/tests/unit/production-order-lifecycle.test.ts` (mock de `warehouseStockService`)
- `server/tests/unit/integrity-transaction-guards.test.ts` (mock de `warehouseStockService`)

### Documentações atualizadas

- `docs/governance/TODO.md` — Bloco 4.1 (itens de `warehouse_transfers`
  e enum `transfer` marcados `[x]`), Bloco 4.2 (reescrito com o que foi
  entregue vs. desvios vs. pendente), Bloco 4.4 (QA, testes marcados
  `[x]` com referência ao arquivo de teste).
- `docs/business/01-USE_CASES.md` — UC-42: nota de implementação
  adicionada ao final (o que foi/não foi entregue no backend) e ajuste
  do cenário BDD de transferência (`transfer_id` → `reference_type`/
  `reference_id`, refletindo a modelagem real).
- `docs/database/DATABASE.md` — seção de Múltiplos Depósitos expandida: tabela
  `warehouse_transfers` documentada, novo valor de enum
  `inventory_movements.type`, tabela de endpoints novos, nota de
  integração backend (o que foi/não foi conectado).
- JSDoc: todos os arquivos novos (`WarehouseTransfer.ts`,
  `warehouseStockService.ts`, 6 use cases novos) têm cabeçalho de
  módulo + JSDoc de parâmetros/retorno/exceptions nos métodos públicos.
  Métodos alterados (`ReceivePurchaseItemsUseCase.execute`,
  `CreateInventoryMovementUseCase.execute`) tiveram o JSDoc atualizado
  com os novos parâmetros/exceptions.

### Instruções de teste (próximo agente/humano)

1. Rodar `npm run typecheck` e `npx jest tests/unit` em `server/` —
   ambos devem permanecer limpos (55 suites / 349 testes nesta entrega).
2. Validar manualmente (ou via teste de integração futuro contra
   Postgres real):
   - Recebimento de compra sem `warehouse_code` → saldo de `INSUMOS`
     sobe; com `warehouse_code='LABORATORIO'` → saldo de `LABORATORIO`
     sobe, `INSUMOS` permanece inalterado.
   - Conclusão de OP com componentes: saldo de `INSUMOS` cai a
     quantidade consumida, saldo de `ACABADOS` sobe a quantidade
     produzida; `products.quantity` de cada produto bate com a soma dos
     dois depósitos.
   - Transferência: criar (`pending`, saldo inalterado) → aprovar
     (saldo migra entre depósitos, total do produto inalterado) →
     tentar aprovar de novo (`BusinessRuleError`, já não está mais
     `pending`) → rejeitar uma nova transferência `pending` (saldo
     inalterado, motivo obrigatório).
   - `POST /api/inventory/transfers` com `from_warehouse_code ===
     to_warehouse_code` → 422 `ValidationError`.
   - Consumo/movimentação manual de saída maior que o saldo do depósito
     informado → 422 didático citando produto, depósito e saldo atual
     (mesmo que `products.quantity` global tivesse saldo suficiente em
     outro depósito — a mensagem não deve confundir os dois números).
3. **Migration não executada nesta entrega** (instrução explícita da
   tarefa: não rodar Docker/migrations). Antes do próximo deploy,
   confirmar que `20260804-000002-warehouse-transfers.cjs` roda
   corretamente em sequência após `20260804-000001-create-warehouses.cjs`
   (`npm run migration:up` em ambiente com Postgres disponível).
4. `NÃO` foi rodado Docker nem houve commit, conforme instrução da
   tarefa — próximo agente decide se/quando commitar.

### Riscos residuais

- Sem teste de integração real contra Postgres (todos os testes desta
  entrega usam mocks/fakes in-memory) — a migration em si
  (`20260804-000002`) não foi validada rodando contra um banco real
  nesta sessão.
- Expedição de venda ainda não debita de `ACABADOS` especificamente —
  enquanto isso não for implementado, o saldo por depósito de produtos
  vendidos pode divergir do saldo real fisicamente esperado em
  `ACABADOS` (o total via `products.quantity` continua correto, apenas
  a segregação por depósito fica incompleta até essa integração).
- Rollback de falha parcial em `ApproveWarehouseTransferUseCase` depende
  inteiramente da transação Sequelize do controller
  (`sequelize.transaction()` em `inventoryController.approveTransfer`)
  — não há teste de integração cobrindo rollback real de banco nesta
  entrega, apenas a garantia de que uma exceção lançada por
  `removeFromWarehouse` propaga antes de qualquer `addToWarehouse`/
  `InventoryMovement.create` (comportamento testado via mocks).

**Desenvolvedor**: Claude Code (Senior Backend Engineer — Múltiplos Depósitos)

---

## Bloco 4 — Múltiplos Depósitos: Frontend (UC-42)

**Data**: 2026-08-04
**Escopo**: Telas de Logística consumindo os endpoints REST já entregues em
`server/src/modules/inventory/presentation/routes/inventory.ts`
(`GET /warehouses`, `GET /warehouse-stock`, `GET/POST /transfers`,
`PUT /transfers/:id/approve`, `PUT /transfers/:id/reject`) e o parâmetro
opcional `warehouse_code` em `POST /api/purchases/:id/receive` e
`POST /api/inventory/movements`.
**Status**: ✅ Concluído (item 4.3 do `docs/governance/TODO.md`, exceto CRUD
de "Configurações > Depósitos", fora do escopo desta entrega — ver nota
abaixo).

### Arquivos criados

- `client/src/api/warehouses.ts` — `listWarehouses`, `listWarehouseStock`,
  `listTransfers`, `createTransfer`, `approveTransfer`, `rejectTransfer`,
  com os tipos `Warehouse`, `WarehouseStockRow`, `WarehouseTransfer`,
  `WarehouseTransferStatus`. Confirmado por leitura direta do controller/
  validators do backend (não adivinhado): todos os endpoints estão sob
  `/api/inventory/*`, não em um prefixo `/api/warehouses` próprio, e
  approve/reject usam `PUT` (não `PATCH`).
- `client/src/pages/logistics/TransfersTab.tsx` — nova aba "Transferências"
  em `/logistics/estoque`: tabela (produto, de → para, quantidade, motivo,
  solicitante, badge de status `pending` âmbar/`approved` verde/`rejected`
  vermelho) + dialog "Nova transferência" (produto via `SelectNative`
  alimentado por `productsApi.listProducts({limit: 200})`, mesmo padrão já
  usado em `RegisterTestTab.tsx` — não existe combobox de busca dedicado no
  projeto) + dialog de rejeição com motivo obrigatório. Botões
  Aprovar/Rejeitar só renderizam quando `hasRole('admin') ||
  permissions?.estoque === 'approve'` (shape real confirmado em
  `client/src/context/AuthContext.tsx`: `permissions` é
  `Partial<Record<AccessModuleKey, AccessModuleLevel>>`). Erros de mutation
  usam `translateApiError`/`DidacticAlert` (padrão UC-43), cobrindo o 422
  de saldo insuficiente na aprovação.

### Arquivos modificados

- `client/src/api/inventory.ts` — nova função `createMovement` (`POST
  /api/inventory/movements`, aceita `warehouse_code`). **Decisão
  importante**: `productsApi.createStockMovement` (`POST
  /api/products/movements`) NÃO aceita `warehouse_code` (confirmado lendo
  `productMovementSchema`/`productController.movement` — só
  `product_id/type/quantity/description`); por isso a movimentação manual
  de estoque em Logística passou a usar `POST /api/inventory/movements`
  (`CreateInventoryMovementUseCase`, com dual-write real em
  `product_warehouse_stock`), não mais o endpoint de `products`.
- `client/src/api/purchases.ts` — `receivePurchaseItems` agora aceita
  `warehouse_code?: 'INSUMOS' | 'LABORATORIO'` (mesmo enum do
  `receivePurchaseItemsSchema` do backend).
- `client/src/api/lots.ts` — `Lot.warehouse_id: number | null` adicionado.
  **Confirmado por leitura de `ListLotsUseCase.ts`**: o endpoint `GET
  /api/inventory/lots` NÃO inclui a associação `warehouse` (só `product`/
  `supplier`), então o nome do depósito é resolvido no client cruzando
  `warehouse_id` com `listWarehouses()` (mapa id→nome), não vindo populado
  do backend.
- `client/src/pages/logistics/LotsTab.tsx` — nova coluna "Depósito"
  (mapeada via `warehouseNameById`, fallback `#<id>` se o depósito não
  estiver na lista ativa, `-` se `warehouse_id` for `null`, caso de lotes
  legados pré-Bloco-4).
- `client/src/pages/logistics/BalancesTab.tsx` — aba "Saldos" ganhou
  seletor de depósito (`Todos` / por `warehouse.code`). Com "Todos"
  selecionado, mantém a visão legada (`GET /api/products`, saldo total).
  Com um depósito específico, troca a tabela inteira para
  `GET /api/inventory/warehouse-stock?warehouse_code=` (colunas
  Código/Nome/Depósito/Saldo) — **decisão**: não foi feita a variante
  "Todos + colunas por depósito" mencionada como alternativa na tarefa,
  porque exigiria N chamadas (uma por depósito) ou um endpoint agregado que
  não existe; a troca binária de visão evita custo de rede desnecessário e
  já cobre o caso de uso (consultar saldo de um depósito específico). Tiles
  de quarentena/bloqueados inalterados. `StockMovementDialog` (movimentação
  manual) ganhou seletor de depósito (default `INSUMOS`) e passou a chamar
  `inventoryApi.createMovement` em vez de `productsApi.createStockMovement`.
- `client/src/pages/logistics/ReceivingConferenceDialog.tsx` — novo campo
  "Depósito de destino" (`INSUMOS` default / `LABORATORIO`), enviado como
  `warehouse_code` no payload de `POST /api/purchases/:id/receive`.
  Invalida `warehouse-stock` no sucesso.
- `client/src/pages/logistics/InventoryPage.tsx` — nova aba
  "Transferências" registrada.

### O que o QA/humano deve testar na interface

1. **Saldos por depósito**: em `/logistics/estoque` → aba Saldos, trocar o
   seletor de "Todos" para "Insumos"/"Acabados"/"Laboratório" e conferir
   que a tabela muda de formato (colunas Depósito/Saldo) e os valores
   batem com `product_warehouse_stock` no banco. Buscar por
   nome/código deve ficar desabilitado (campo `disabled`) quando um
   depósito estiver selecionado (a busca só existe na visão "Todos").
2. **Movimentação manual com depósito**: aba Saldos → "Movimentar" em um
   produto → selecionar um depósito diferente de Insumos → confirmar que o
   saldo daquele depósito específico (não só `products.quantity`) reflete a
   entrada/saída após reload. Testar saída maior que o saldo do depósito
   selecionado → esperar 422 didático (mensagem cita depósito e saldo
   atual, não trava a tela com erro cru).
3. **Lotes com depósito**: aba Lotes → conferir coluna "Depósito" populada
   corretamente para lotes recebidos após o Bloco 4 (lotes antigos devem
   mostrar "-").
4. **Transferências — fluxo completo**: aba Transferências → "Nova
   transferência" → tentar selecionar o mesmo depósito em De/Para (deve
   bloquear no client antes de enviar, mensagem no campo "Para") → criar
   uma transferência válida → conferir que aparece como "Pendente" (âmbar)
   e **não** altera nenhum saldo ainda. Logado como usuário com
   `estoque:approve` (ou `admin`): botões Aprovar/Rejeitar devem aparecer;
   logado como usuário só com `estoque:operate`: botões não devem
   aparecer. Aprovar uma transferência com saldo de origem insuficiente
   (alterar saldo por fora antes de aprovar) → esperar `DidacticAlert` com
   o 422, transferência continua `pending`. Rejeitar uma transferência
   pendente sem preencher o motivo → bloqueado pelo Zod no client antes do
   submit.
5. **Recebimento com depósito de destino**: em `/logistics/recebimento`,
   abrir a conferência de um pedido, selecionar "Laboratório" como depósito
   de destino, confirmar recebimento → saldo deve subir em
   `LABORATORIO`, não em `INSUMOS`.
6. **Regressão**: os 24 testes de frontend (`npm test` em `client/`)
   continuam verdes; `npx tsc -b` limpo; `npm run lint` sem novos warnings
   (os 4 warnings pré-existentes de `only-export-components` não são desta
   entrega).

### Fora de escopo desta entrega (registrado, não implementado)

- Tela "Configurações > Depósitos" (CRUD de depósito) — o backend também
  não expõe `POST/PUT /api/warehouses` ainda (ver Bloco 4.2 acima,
  "não foi implementado"); depósitos continuam cadastrados apenas via
  seed/migration.
- Filtro de depósito na tela de Expedição e na tela de Contagem/inventário
  mobile — a tarefa desta entrega cobriu especificamente Estoque
  (Saldos/Lotes/Transferências), Recebimento e movimentação manual.
- "Exibir saldo por depósito nas telas de produto/item" (fora de
  `/logistics/estoque`) — não coberto; o saldo por depósito hoje só é
  visível em Logística → Estoque.
- Filtro `?warehouse_id=` em `GET /api/inventory/movements` (extrato) não
  existe no backend ainda (confirmado no `TODO.md`), então a aba "Extrato"
  não ganhou seletor de depósito nesta entrega.

**Desenvolvedor**: Claude Code (Senior Frontend Engineer — Múltiplos
Depósitos, telas de Logística)

---

## Blocos 2, 3 e 5 (Backend) — Amostra da Engenharia, Semáforo de Handoff e NF-e Restrita a Gestor (2026-08-04)

**Escopo:** exclusivamente `server/` (nenhum arquivo de `client/` tocado).
Fonte da verdade: `docs/governance/TODO.md` Blocos 2/3/5; UC-39/UC-40/UC-41
em `docs/business/01-USE_CASES.md`; `BUSINESS_RULES.md` §9/§10/§11.

### Resumo da feature

**Bloco 2 — Requisição de Amostra da Engenharia (UC-39):**
- `purchase_requisitions.origin` já era `VARCHAR(80)` livre (confirmado
  antes de codar) — nenhuma migration de `ALTER TYPE` foi necessária para
  o novo valor. Nova migration
  `server/migrations/20260804-000003-requisition-engineering-project.cjs`
  adiciona **apenas** `engineering_project_id` (INT nullable, FK
  `engineering_projects.id` `ON DELETE SET NULL`) + índice.
- Valor de origem usado: **`'engenharia_amostra'`** (decisão explícita
  desta entrega, diverge do rascunho anterior `'engineering_sample'` do
  `TODO.md`, que foi atualizado para refletir a nomenclatura real).
- `createPurchaseRequisitionSchema` aceita `engineering_project_id`
  opcional (coerce int positivo); `CreatePurchaseRequisitionUseCase`
  valida a existência do projeto quando informado (404 didático), para
  qualquer `origin`.
- `ConvertRequisitionToPurchaseOrdersUseCase`: quando
  `requisition.origin === 'engenharia_amostra'`, o(s) pedido(s) de compra
  gerado(s) recebem a marcação automática em `notes`: "AMOSTRA ENGENHARIA
  — receber no Depósito do Laboratório" (concatenada com a nota
  informada/padrão). Nenhuma coluna nova em `purchase_orders`.
- `ReceivePurchaseItemsUseCase`: quando `warehouseCode` não é informado
  explicitamente E o pedido tem `requisition_id` apontando para uma
  requisição `origin='engenharia_amostra'`, o depósito de destino default
  passa a ser `LABORATORIO` (antes: sempre `INSUMOS` por default, exigia
  sinalização manual). `warehouseCode` explícito continua prevalecendo.
- **Decisão de permissão confirmada:** criar requisição de amostra
  permanece no módulo `requisicoes` (não existe módulo `engenharia`
  dedicado) — a Engenharia recebe a permissão de `requisicoes` no perfil
  dela. Nenhuma rota nova, nenhuma mudança de `authorizeModule`.

**Bloco 3 — Semáforo de Handoff (UC-40):**
- Utilitário compartilhado `server/src/shared/domain/handoffSignal.ts`:
  `calculateHandoffSignal(kind, entity, now?)` → `'green'|'yellow'|'red'`,
  implementando a tabela normativa de `BUSINESS_RULES.md` §10 para 4
  cadeias (`purchase`, `lot`, `sale`, `non_conformity`) + 1 cadeia
  aditiva (`purchase_requisition`, pedida nominalmente no enunciado desta
  tarefa, `pending` → `yellow`).
- 5 listagens enriquecidas com o campo aditivo `handoff_signal` (não
  quebra contrato — campo novo em cada linha de `rows`):
  `ListPurchasesUseCase`, `ListPurchaseRequisitionsUseCase`,
  `ListLotsUseCase`, `ListSalesUseCase`, `ListNonConformitiesUseCase`.
- `GET /api/dashboard/handoffs` (`authorizeModule('dashboard')`) novo:
  `GetDashboardHandoffsUseCase` +
  `SequelizeDashboardRepository.getHandoffsSummary()` (SQL parametrizado
  leve, mesmo padrão de `getCockpitMetrics`), retornando
  `{ recebimento: { pending }, requisicoes: { awaiting_approval },
  expedicao: { ready_to_ship }, qualidade: { quarantine, open_rncs } }`.

**Bloco 5 — NF-e Restrita a Gestor (UC-41):**
- `POST /api/sales/:id/nfe` (emissão) alterado de `authorizeModule('vendas',
  'operate')` para `authorizeModule('vendas', 'approve')` — alinhado à
  decisão do dono (§11: emissão E cancelamento exigem gestor, sem
  distinção). `POST /api/sales/:id/nfe/cancel` já estava em `approve`
  (retrofit anterior do Bloco 1.2) — nenhuma mudança de código, apenas
  comentário da rota atualizado. `GET /api/sales/:id/nfe` (consulta)
  **não foi alterado**, continua acessível a qualquer nível de `vendas`.

### Arquivos alterados/criados

**Novos:**
- `server/migrations/20260804-000003-requisition-engineering-project.cjs`
- `server/src/shared/domain/handoffSignal.ts`
- `server/src/modules/dashboard/application/use-cases/GetDashboardHandoffsUseCase.ts`
- `server/tests/unit/handoff-signal.test.ts`

**Modificados:**
- `server/src/models/PurchaseRequisition.ts` (campo `engineering_project_id`)
- `server/src/models/index.ts` (associação `EngineeringProject` ↔ `PurchaseRequisition`)
- `server/src/modules/purchaseRequisitions/presentation/validators/purchaseRequisitionValidators.ts`
- `server/src/modules/purchaseRequisitions/application/use-cases/CreatePurchaseRequisitionUseCase.ts`
- `server/src/modules/purchaseRequisitions/application/use-cases/ConvertRequisitionToPurchaseOrdersUseCase.ts`
- `server/src/modules/purchaseRequisitions/application/use-cases/ListPurchaseRequisitionsUseCase.ts`
- `server/src/modules/purchaseRequisitions/infrastructure/sequelize/SequelizePurchaseRequisitionRepository.ts` (include `engineeringProject`)
- `server/src/modules/purchases/application/use-cases/ReceivePurchaseItemsUseCase.ts`
- `server/src/modules/purchases/application/use-cases/ListPurchasesUseCase.ts`
- `server/src/modules/sales/application/use-cases/ListSalesUseCase.ts`
- `server/src/modules/sales/presentation/routes/sales.ts` (nível `approve` na emissão)
- `server/src/modules/inventory/application/use-cases/ListLotsUseCase.ts`
- `server/src/modules/nonConformities/application/use-cases/ListNonConformitiesUseCase.ts`
- `server/src/modules/dashboard/domain/repositories/DashboardRepository.ts`
- `server/src/modules/dashboard/infrastructure/sequelize/SequelizeDashboardRepository.ts`
- `server/src/modules/dashboard/presentation/controllers/dashboardController.ts`
- `server/src/modules/dashboard/presentation/routes/dashboard.ts`

### Documentações atualizadas

- `docs/governance/TODO.md` — Blocos 2, 3 e 5 marcados `[x]` item a item,
  com todos os desvios de nomenclatura/escopo documentados inline.
- `docs/projeto/04-USE_CASES.md` — consolidados UC-39 (parcial —
  backend), UC-40 (parcial — backend) e UC-41 (completo — backend).
- `docs/database/DATABASE.md` — nova entrada para o incremento de
  `purchase_requisitions.engineering_project_id` (a tabela completa não
  estava documentada neste arquivo antes desta entrega — pendência
  anterior, fora de escopo corrigir agora).
- `docs/governance/HANDOFF_CODEX.md` — esta seção.

### Contratos (não quebrados)

- `POST /api/purchase-requisitions`: aceita `engineering_project_id`
  opcional (novo, aditivo); `origin` continua string livre (nenhuma
  mudança de tipo).
- `GET /api/purchases`, `GET /api/purchase-requisitions`,
  `GET /api/inventory/lots`, `GET /api/sales`,
  `GET /api/quality/non-conformities`: cada linha de `rows` ganha
  `handoff_signal` (aditivo).
- `GET /api/dashboard/handoffs`: endpoint novo (não existia).
- `POST /api/purchases/:id/receive`: `warehouse_code` continua opcional;
  comportamento muda apenas quando **omitido** e a origem é
  `engenharia_amostra` (antes: sempre `INSUMOS`; agora: `LABORATORIO`
  neste caso específico).
- `POST /api/sales/:id/nfe`: **mudança de autorização** (não de payload)
  — de `operate` para `approve`. Usuários com apenas `operate` em
  `vendas` que antes emitiam NF-e agora recebem `403`
  (`APPROVAL_LEVEL_REQUIRED`) — mudança de comportamento intencional
  (UC-41), não uma regressão.

### Instruções de teste

1. `cd server && npm run typecheck` — deve permanecer limpo (validado
   nesta entrega).
2. `cd server && npx jest tests/unit` — deve permanecer 100% verde
   (validado nesta entrega: 56 suítes, 375 testes, incluindo os 26 novos
   casos de `handoff-signal.test.ts`).
3. **Não validado nesta entrega (requer banco Postgres real ou ambiente
   de integração):**
   - Rodar a migration `20260804-000003-requisition-engineering-project.cjs`
     (`npm run migration:up`) e confirmar a coluna/índice/FK no banco.
   - Criar uma requisição com `origin='engenharia_amostra'` e
     `engineering_project_id` de um projeto existente → aprovar →
     converter em pedido → conferir que o(s) pedido(s) tem a nota
     "AMOSTRA ENGENHARIA..." → registrar o recebimento SEM informar
     `warehouse_code` → conferir que o saldo sobe em `LABORATORIO`, não
     em `INSUMOS` (via `GET /api/inventory/warehouse-stock`).
   - Criar uma requisição com `engineering_project_id` inexistente →
     confirmar `404` didático.
   - Consultar `GET /api/purchases`, `/api/purchase-requisitions`,
     `/api/inventory/lots`, `/api/sales`,
     `/api/quality/non-conformities` e confirmar que cada linha tem
     `handoff_signal` coerente com os dados reais.
   - Consultar `GET /api/dashboard/handoffs` autenticado e comparar os 5
     contadores com os dados reais do banco.
   - Tentar emitir NF-e (`POST /api/sales/:id/nfe`) com um usuário cujo
     perfil tem `vendas: 'operate'` (não `approve`) → confirmar `403`.
     Repetir com `approve` (ou `admin`) → confirmar sucesso.
   - Regressão: `GET /api/sales/:id/nfe` continua acessível a `operate`.

### Riscos residuais / fora de escopo

- Nenhuma tela de frontend foi criada/alterada (Blocos 2.3, 3.2, 5.2 —
  fora do escopo desta tarefa, restrita a `server/`).
- Bloco 2.4/3.4/5.3 (QA): testes E2E de integração real com banco
  (fluxo completo requisição → pedido → recebimento → depósito;
  emissão/cancelamento de NF-e por nível) não foram criados nesta
  entrega — apenas cobertura unitária dos use cases/utilitário. O teste
  de integração pré-existente `sale-nfe-issuance.test.ts` não foi
  alterado e continua `describe.skip` sem `TEST_PRODUCT_ID` no ambiente.
- `PurchaseRequisition` não estava documentada em `docs/database/DATABASE.md`
  antes desta entrega — o dicionário de dados completo dessa tabela
  (colunas pré-existentes) continua pendente como débito técnico anterior
  a esta tarefa, não coberto aqui.

**Desenvolvedor**: Claude Code (Senior Backend Engineer — Amostra da
Engenharia, Semáforo de Handoff, NF-e restrita a gestor)

---

## Frontend — Semáforo de Handoff (UC-40), Contador de Menu e Amostra de
## Engenharia na Requisição (UC-39) — 2026-08-04

Entrega restrita a `client/` (consumo dos contratos já expostos pelo
backend nas seções anteriores — `handoff_signal` aditivo nas listagens e
`GET /api/dashboard/handoffs`). Nenhum arquivo de `server/` foi tocado.

### Componentes criados

- `client/src/components/HandoffDot.tsx` — `HandoffDot({ signal })`:
  bolinha colorida (verde/âmbar/vermelho) com `title`/`aria-label`
  explicando o significado ("No fluxo / a caminho", "Aguardando ação",
  "Atrasado / problema"), nunca apenas a cor crua. Tipo `HandoffSignal`
  (`'green'|'yellow'|'red'`) reexportado e usado pelos api clients.
- `client/src/api/dashboard.ts` (novo arquivo — não existia client para o
  módulo `dashboard`) — `getDashboardHandoffs()` consome
  `GET /api/dashboard/handoffs`, tipado com `DashboardHandoffsSummary`
  (`{ recebimento: { pending }, requisicoes: { awaiting_approval },
  expedicao: { ready_to_ship }, qualidade: { quarantine, open_rncs } }`).

### A) Semáforo aplicado nas filas (coluna extra, só a bolinha)

Campo `handoff_signal?: HandoffSignal` adicionado aos tipos de:
`client/src/api/purchases.ts` (`Purchase`), `purchaseRequisitions.ts`
(`PurchaseRequisition`), `sales.ts` (`Sale`), `lots.ts` (`Lot`),
`nonConformities.ts` (`NonConformity`) — todos aditivos, sem quebrar
contrato existente.

Coluna aplicada (primeira coluna, header vazio `<TableHead className="w-6" />`,
renderização condicional `signal && <HandoffDot signal={signal} />` para
não quebrar linhas de respostas antigas sem o campo) em:
- `client/src/pages/purchases/PurchasesPage.tsx`
- `client/src/pages/purchases/RequisitionsPage.tsx`
- `client/src/pages/logistics/ReceivingPage.tsx` — usa `handoff_signal`
  já vindo em cada linha combinada (`sent`+`partial`, ambas via
  `GET /api/purchases`), sem recalcular nada client-side.
- `client/src/pages/logistics/ShippingPage.tsx`
- `client/src/pages/quality/InspectionTab.tsx`
- `client/src/pages/quality/NonConformitiesTab.tsx`

Todos os `colSpan` de linhas de loading/erro/vazio foram ajustados (+1)
para a nova coluna.

### B) Contador no menu (versão mínima e reversível — UC-40 rodapé)

`client/src/layouts/AppLayout.tsx`: `NavItem` ganhou `badgeKey?:
'recebimento'|'requisicoes'|'expedicao'|'qualidade'`, aplicado aos itens
Recebimento, Requisições, Expedição e Qualidade. `useQuery(['dashboard-handoffs'],
getDashboardHandoffs, { enabled: hasDashboardAccess, refetchInterval: 60_000,
retry: false })` — `enabled` só quando o usuário tem acesso ao módulo
`dashboard` (mesma regra `usingRoleFallback || hasModuleAccess('dashboard')`
já usada no restante do layout). **Falha da chamada nunca quebra o
menu**: sem `onError`/`retry` agressivo, `handoffs` fica `undefined` e
`badgeCount()` retorna `undefined` → nenhum badge renderizado, item de
menu normal. Badge visual: círculo pequeno com o número, ao lado do
label, `title` com o total. `qualidade` soma `quarantine + open_rncs`
(2 contadores do endpoint em 1 badge, já que o menu tem 1 único item
Qualidade).

**Decisão registrada**: a pergunta original do dono ("é necessário
contador/badge, além do `handoff_signal`?") continua sem resposta formal
— esta é a versão mínima implementada por instrução explícita desta
tarefa, marcada como tal em `docs/governance/TODO.md`. Reversível: basta
remover o `useQuery`/`badgeCount` do `AppLayout` sem tocar em nenhum
outro contrato.

### C) Amostra da Engenharia na Requisição (UC-39)

`client/src/pages/purchases/RequisitionsPage.tsx`:
- Campo `origin` (antes `<Input>` livre) virou `<SelectNative>` com
  opções pré-definidas (`manual`, `mrp`, `estoque_baixo`, `op`,
  **`engenharia_amostra`** = "Amostra de Engenharia") — `origin`
  continua string livre no payload (backend não mudou o schema), a UI
  apenas guia o operador em vez de aceitar texto arbitrário.
- Quando `origin === 'engenharia_amostra'`: aparece bloco condicional
  (âmbar) com select opcional "Projeto de P&D"
  (`GET /api/engineering/projects`, via `engineeringApi.listEngineeringProjects`,
  `enabled: open && isEngineeringSample` — só busca quando o dialog está
  aberto e a origem selecionada) + aviso "Pedidos desta requisição serão
  recebidos no Depósito do Laboratório."
- Payload de criação inclui `engineering_project_id` (número, opcional)
  quando um projeto é selecionado — client type `CreateRequisitionInput`
  atualizado em `purchaseRequisitions.ts`.
- Tipos de retorno atualizados: `PurchaseRequisition.engineering_project_id`
  e `engineeringProject?: { id, project_code, name } | null` (shape
  confirmado em `SequelizePurchaseRequisitionRepository.ts`, associação
  `as: 'engineeringProject'`).
- Listagem: badge "Amostra" (`variant="outline"`) ao lado do número da
  requisição quando `origin === 'engenharia_amostra'`.
- Detalhe (`RequisitionDetailSheet`): campo Origem mostra
  "Amostra de Engenharia" + badge; linha extra "Projeto de P&D vinculado"
  (só aparece para essa origem); aviso do Depósito do Laboratório
  repetido no rodapé do detalhe.

### Qualidade

- `npx tsc -b --noEmit` — limpo, sem erros.
- `npm run lint` (oxlint) — apenas os 4 warnings pré-existentes de
  `only-export-components` (arquivos não tocados nesta entrega).
- `npm test` (vitest) — 24/24 testes verdes (nenhum teste novo criado
  nesta entrega; nenhuma regressão).
- Nenhuma dependência nova instalada.

### O que o Agente QA/humano deve testar na interface

1. **Semáforo**: em Compras, Requisições, Recebimento, Expedição,
   Qualidade → Inspeção e Qualidade → RNC, confirmar que a bolinha
   aparece na primeira coluna de cada linha e que passar o mouse mostra
   o tooltip explicando a cor. Casos a validar manualmente:
   - Pedido de compra com `expected_date` vencida e sem `delivery_date`
     → bolinha vermelha na fila de Recebimento.
   - Requisição `pending` → bolinha amarela.
   - Lote `quarantine` → amarela; `blocked` → vermelha; `available` →
     verde.
   - Venda `invoiced` com NF-e autorizada → verde; `nfe_status
     ='processing'` → amarela; NF-e negada/cancelada → vermelha.
   - RNC `open`/`analysis` → amarela; `closed` com
     `effectiveness_result != 'effective'` → vermelha.
2. **Badge do menu**: logar com um perfil que tenha acesso ao módulo
   `dashboard` e confirmar que os badges de Recebimento/Requisições/
   Expedição/Qualidade aparecem com os números corretos (comparar com
   `GET /api/dashboard/handoffs`) e atualizam após ~60s sem reload
   manual. Logar com um perfil sem acesso a `dashboard` e confirmar que
   nenhum badge aparece, sem erro no console travando o menu. Simular
   falha de rede (offline) e confirmar que o menu continua funcional,
   apenas sem os números.
3. **Amostra de Engenharia**: criar uma requisição com origem "Amostra de
   Engenharia", confirmar que o aviso do Depósito do Laboratório aparece,
   selecionar (e não selecionar) um projeto de P&D, salvar, e conferir
   que a listagem mostra o badge "Amostra" e o detalhe mostra o projeto
   vinculado (ou "Nenhum"). Repetir sem projeto de P&D selecionado —
   confirmar que a requisição é criada normalmente (campo é opcional).

**Desenvolvedor**: Claude Code (Senior Frontend Engineer & UI Architect —
Semáforo de Handoff, Contador de Menu, Amostra de Engenharia)

---

## Identidade Visual EVOK ÁUDIO — Telas de Logística (polish visual)

**Data**: 2026-08-04
**Escopo**: puramente visual/CSS (classes Tailwind), sem alteração de lógica
de negócio, chamadas de API ou validações. Continuação do restyle iniciado em
`LoginPage.tsx`, `AppLayout.tsx` (sidebar/header) e `DashboardPage.tsx` (não
tocados nesta entrega) usando os tokens de marca definidos em
`client/src/index.css` (`--brand`, `--brand-vivid`, `--brand-dark`,
`--brand-foreground`, mapeados via `@theme inline` para `bg-brand`,
`text-brand`, `border-brand`, etc).

### Telas restilizadas

1. **`client/src/pages/logistics/InventoryPage.tsx`** (`/logistics/estoque`):
   cabeçalho convertido para o padrão "faixa de marca" (`rounded-xl border
   bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5`) com selo
   `bg-brand/10 text-brand` contendo o ícone `Boxes` (mesmo padrão do
   `KpiCard` de `DashboardPage.tsx`). Abas (`TabButton`) ganharam ícone
   (`Boxes`/`ScrollText`/`Layers`/`ClipboardList`/`ArrowLeftRight`) e estado
   ativo/hover trocado de `border-primary`/cinza para `border-brand
   text-brand` / `hover:bg-brand/5 hover:text-brand`.
2. **`client/src/pages/logistics/ReceivingPage.tsx`** (`/logistics/recebimento`):
   mesmo cabeçalho em faixa de marca com selo `PackageSearch`. Botão
   "Conferir" já herdava o verde via `Button variant="default"` (token
   `--primary`) — nenhuma mudança necessária ali.
3. **`client/src/pages/logistics/ShippingPage.tsx`** (`/logistics/expedicao`):
   cabeçalho convertido para faixa de marca com selo `Truck`, mantendo os
   botões de filtro "Fila de embarque"/"Embarcadas" (`variant="default"` já
   herda o verde quando ativo).
4. **`client/src/pages/logistics/WarehousesPage.tsx`** (`/logistics/warehouses`,
   Bloco 4/UC-42): mesma faixa de marca com selo `Warehouse`. Lógica de
   criação/edição de depósito (já testada) não foi tocada.

### Regressão

- `cd client && npx vitest run` — 6 arquivos de teste, 24/24 testes verdes
  (nenhuma regressão; nenhum teste novo criado nesta entrega, pois é
  alteração puramente visual).
- `cd client && npm run build` (`tsc -b && vite build`) — build limpo, sem
  erros de tipagem.

### O que o Agente QA/humano deve testar na interface

1. Navegar por `/logistics/estoque`, `/logistics/recebimento`,
   `/logistics/expedicao` e `/logistics/warehouses` e confirmar visualmente
   que o cabeçalho de cada tela segue o mesmo padrão visual do Dashboard
   (faixa verde suave com selo de ícone) e que nenhuma funcionalidade
   (filtros, abas, dialogs de criação/edição/conferência, mutations)
   quebrou.
2. Em `/logistics/estoque`, confirmar que a aba ativa aparece destacada em
   verde (borda inferior + texto) e que passar o mouse sobre as abas
   inativas mostra um leve destaque verde antes de clicar.
3. Confirmar que os botões de ação que já usavam `variant="default"`
   (Conferir, Marcar como embarcada, Novo depósito, filtros de fila) mantêm
   o comportamento e agora aparecem em verde da marca.

**Desenvolvedor**: Claude Code (Senior Frontend Engineer & UI Architect —
Identidade Visual EVOK ÁUDIO, telas de Logística)
**Data**: 2026-08-04

---

## Reconciliação de Governança — `docs/governance/TODO.md` vs. Código Real (2026-08-04)

**Objetivo:** o `TODO.md` (Bloco 1–6) é atualizado incrementalmente por
múltiplos agentes ao longo do dia; alguns itens ficaram desatualizados
porque o código avançou em entregas posteriores sem que a linha do TODO
correspondente fosse revisitada. Esta tarefa foi uma auditoria de
reconciliação **documental** (sem alteração de código) — para cada item
`[ ]` do TODO, confirmou-se por leitura de código/rotas/testes se ele já
estava implementado antes de corrigir a tag.

### Itens corrigidos de `[ ]` para `[x]` (código já existia, TODO estava desatualizado)

1. **Bloco 4.2 — `POST/PUT /api/warehouses` (CRUD de depósito, backend).**
   Rotas reais: `POST /api/inventory/warehouses` e `PUT
   /api/inventory/warehouses/:id`
   (`server/src/modules/inventory/presentation/routes/inventory.ts`),
   use cases `CreateWarehouseUseCase.ts`/`UpdateWarehouseUseCase.ts`.
   Testado em `server/tests/unit/warehouse-crud.test.ts` (9/9 verde).
2. **Bloco 4.3 — Tela "Configurações > Depósitos" (CRUD, frontend).**
   `client/src/pages/logistics/WarehousesPage.tsx`, consumindo
   `client/src/api/warehouses.ts` (`createWarehouse`/`updateWarehouse`/
   `listWarehouses`).
3. **Bloco 4.2 — Filtro `?warehouse_id=` em `GET /api/inventory/movements`.**
   Implementado em
   `server/src/modules/inventory/presentation/controllers/inventoryController.ts`
   (`list`) → `ListInventoryMovementsUseCase.execute`. Testado em
   `server/tests/unit/warehouse-crud.test.ts` (describe dedicado ao
   filtro).
4. **Bloco 4.3 — Saldo por depósito na tela de produto/item.** Botão
   "Saldo por depósito" + `ProductWarehouseStockDialog` em
   `client/src/pages/products/ProductsPage.tsx`, consumindo `GET
   /api/inventory/warehouse-stock?product_id=`. **Nota:** esta alteração
   estava presente apenas na árvore de trabalho (não commitada) no
   momento da auditoria — confirmar `git log`/`git status` antes de
   considerá-la definitivamente mesclada em `main`.
5. **Bloco 1.3 — Relatórios: `authorizeModule` por sub-tipo
   (`relatorios.producao`/`.compras`/`.custos`/`.financeiro`).** Item
   duplicava trabalho já entregue no retrofit completo do Bloco 1.2.
   Confirmado em `server/src/modules/reports/presentation/routes/reports.ts`.
6. **Bloco 1.3 — Rastreabilidade: módulo próprio `rastreabilidade`
   (não herdado).** Também já entregue no retrofit do Bloco 1.2.
   Confirmado em
   `server/src/modules/traceability/presentation/routes/traceability.ts`.

### Itens revisados e confirmados como corretamente `[ ]` (código de fato ainda não existe)

Verificados por leitura direta de código/grep e mantidos sem alteração
(evidência já estava correta no TODO): `permission_version` (decisão
deliberada de não implementar), diferenciação de `PUT
/api/sales/:id/status` para `shipped`, filtro de cards do Dashboard por
módulo, testes de integração HTTP (Supertest) do Bloco 1.5, tela
"Engenharia > Solicitar Amostra" dedicada, badge "Amostra" no
Recebimento, alerta de quantidade atípica, script de validação
pós-backfill (`*_validation.sql`), endpoint
`GET /api/products/:id/stock-by-warehouse` dedicado (o caso de uso é
coberto por `GET /api/inventory/warehouse-stock?product_id=`, mas a rota
aninhada específica não existe), ocultação de botões de NF-e por nível no
frontend, e todo o retrofit de telas do Bloco 6.2/6.3
(`ProductionOrdersPage.tsx`, `RegisterTestTab.tsx`, `MrpPage.tsx`,
`InspectionTab.tsx` ainda não usam `translateApiError`).

### Testes rodados para validar as evidências

- `npx jest tests/unit/warehouse-crud.test.ts` — 9/9 verde
- `npx jest tests/unit/warehouse-stock.test.ts` — 29/29 verde
- `npx jest tests/unit/module-authorization-map.test.ts
  tests/unit/access-profiles.test.ts tests/unit/handoff-signal.test.ts`
  — 69/69 verde (todos rodados de dentro de `server/`)

### Coordenação com agentes paralelos

Esta tarefa foi executada em paralelo a um agente de frontend trabalhando
em `client/src/pages/logistics/*.tsx` e a um DBA auditando
`server/src/models/Warehouse*.ts`/`server/migrations/`. Nenhum arquivo de
código foi alterado por esta tarefa — apenas `docs/governance/TODO.md` e
este handoff.

**Desenvolvedor**: Claude Code (Engenheiro de Governança e Documentação —
reconciliação `docs/governance/TODO.md`)
**Data**: 2026-08-04

---

## Triagem de Segurança 2026-08-04 — Fechamento de 3 Pendências Menores

### Resumo da feature

Fechamento de 3 pendências de baixa severidade apontadas em uma triagem
de segurança pontual do repositório (nenhum P0 novo encontrado):

1. **Validação de `:id` em `PUT /api/inventory/warehouses/:id`** — o
   controller passava `req.params.id` direto ao use case sem validar que
   é numérico. Não era uma vulnerabilidade de SQL injection (Sequelize
   parametriza), mas um id inválido propagava um erro imprevisível do
   driver Postgres em vez do `400`/`404` padronizado esperado. Corrigido
   adicionando `idParamSchema` (`z.coerce.number().int().positive()`) em
   `server/src/modules/inventory/presentation/validators/inventoryValidators.ts`
   e aplicando-o em `exports.updateWarehouse`
   (`server/src/modules/inventory/presentation/controllers/inventoryController.ts`),
   seguindo o mesmo padrão Zod + `handleZodError` já usado pelos demais
   endpoints do arquivo.

2. **Cobertura RBAC ausente para o CRUD de Depósitos** — `POST
   /api/inventory/warehouses` e `PUT /api/inventory/warehouses/:id`
   (ambos exigindo `authenticate` + `authorizeModule('estoque',
   'approve')`, ver `server/src/modules/inventory/presentation/routes/inventory.ts:37-38`)
   não tinham nenhum teste de integração cobrindo 401/403/sucesso.
   Adicionados 6 casos novos em
   `server/tests/integration/legacy-routes-rbac-regression.test.ts`
   (dentro de `describe('CRUD de Depositos (authorizeModule
   estoque/approve)')`), seguindo exatamente o estilo já usado no arquivo
   (criação de usuário via `User.create`, login real via
   `POST /api/auth/login`, chamadas via `supertest`). O caso de 403 cria
   um `AccessProfile`/`AccessProfilePermission` reais com
   `estoque: 'operate'` (sem `approve`) para reproduzir o cenário de um
   almoxarife comum tentando executar uma ação restrita a gestor da área.

3. **Risco residual `react-router@7.18.2` (client)** — registrado
   formalmente, sem upgrade de major version (decisão explicitamente
   adiada para o gate G6):
   - `docs/governance/TODO.md`, nova seção "Pendências de Segurança /
     Gate G6", com o advisory (`GHSA-qwww-vcr4-c8h2`), a avaliação de
     aplicabilidade (vetor RSC/Server Actions provavelmente não se aplica
     a esta SPA Vite, mas isso ainda precisa de confirmação formal — não
     tratar como aceito), o achado correlato do `node_modules` local
     dessincronizado do lockfile, e a ação recomendada (upgrade
     `>=8.3.0` pós-UAT ou aceitação formal de risco no G6 + garantia de
     `npm ci` no pipeline).
   - `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`, nova entrada datada "2026-08-04 —
     Triagem de Segurança (fechamento de 3 pendências menores)" (entradas
     antigas do diário não foram alteradas).

### Arquivos alterados

- `server/src/modules/inventory/presentation/validators/inventoryValidators.ts`
  — novo `idParamSchema`, exportado.
- `server/src/modules/inventory/presentation/controllers/inventoryController.ts`
  — `updateWarehouse` agora valida `req.params.id` com `idParamSchema`
  antes de chamar `UpdateWarehouseUseCase`.
- `server/tests/unit/warehouse-crud.test.ts` — novo `describe('idParamSchema
  ...')` com 2 casos (aceita id válido, rejeita não numérico/zero/negativo/decimal/ausente).
- `server/tests/integration/legacy-routes-rbac-regression.test.ts` — novo
  `describe('CRUD de Depositos (authorizeModule estoque/approve)')` com 6
  casos (401/403/2xx para `POST` e `PUT /warehouses/:id`).
- `docs/governance/TODO.md` — nova seção "Pendências de Segurança / Gate
  G6" com o item `[ ]` do risco residual `react-router`.
- `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` — nova entrada datada 2026-08-04
  (apenas apêndice, nenhuma entrada anterior foi reescrita).
- `docs/governance/HANDOFF_CODEX.md` — esta seção.

### Documentações atualizadas

- `docs/governance/TODO.md` (novo item `[ ]` de risco residual).
- `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` (nova entrada 2026-08-04).
- JSDoc dos novos blocos de teste (comentários explicando o gap coberto)
  em `legacy-routes-rbac-regression.test.ts`.
- `docs/database/DATABASE.md` e `docs/projeto/04-USE_CASES.md` **não foram
  alterados** — nenhuma mudança de schema/regra de negócio ocorreu nesta
  triagem (apenas validação defensiva de input e testes).

### Instruções de teste para o próximo agente/humano

1. `cd server && npm run typecheck` — deve passar sem erros (validado
   nesta sessão).
2. `cd server && npx jest warehouse-crud` — deve passar 11/11 (validado
   nesta sessão: 9 pré-existentes + 2 novos de `idParamSchema`).
3. `cd server && npx jest tests/integration/legacy-routes-rbac-regression.test.ts`
   — **exige** `RUN_INTEGRATION=true`, `TEST_API_URL` (API real rodando),
   `TEST_AUTH_TOKEN` (token admin válido) e PostgreSQL acessível. Nesta
   sessão nenhum desses pré-requisitos estava disponível, então os 9
   testes do arquivo (3 pré-existentes + 6 novos) rodaram como
   `describe.skip` — **não foram executados de fato**. O próximo agente
   com acesso a um ambiente de integração completo deve rodar este
   arquivo e confirmar 401/403/2xx nos 6 casos novos de depósito antes de
   considerar a Tarefa 2 (RBAC de depósitos) validada ponta a ponta.
4. Testar manualmente (ou via Postman/Insomnia) `PUT
   /api/inventory/warehouses/abc` (id não numérico) com token admin válido
   — deve retornar `400` com o envelope `{ success: false, error: {
   code: 'VALIDATION_ERROR', ... } }` (via `ValidationError`/`handleZodError`),
   nunca `500`.

### Riscos residuais

- **Cobertura de integração da Tarefa 2 não executada de fato** neste
  ambiente (sem Postgres/API rodando) — código foi revisado
  cuidadosamente contra o padrão existente do arquivo, mas só será
  100% confirmado quando rodado contra infraestrutura real.
- **`react-router` continua na versão vulnerável** — risco aceito
  temporariamente e registrado para decisão formal no gate G6 (não é uma
  remediação, é um registro de risco pendente).
- **`node_modules` do `client/` dessincronizado do lockfile** — risco
  observado mas não corrigido nesta sessão (fora do escopo: não é
  código/doc, é estado local do ambiente); pipeline de build deve usar
  `npm ci`.

**Desenvolvedor**: Claude Code (Engenheiro Sênior — Triagem de Segurança)
**Data**: 2026-08-04

---

## Consolidação de Governança — 4 entregas paralelas de 2026-08-04

Rodada de verificação (Tech Lead de Governança/Documentação) sobre 4 entregas
feitas por agentes distintos em paralelo hoje. Cada item abaixo foi conferido
lendo o código/teste real antes de marcar qualquer coisa em
`docs/governance/TODO.md` — nenhuma lista recebida foi aceita sem checagem.

### 1. MRP fecha o ciclo — `POST /api/mrp/planned-orders/convert`

Confirmado real: `server/src/modules/mrp/application/use-cases/ConvertPlannedOrdersToRequisitionUseCase.ts`
(converte ordens `RASCUNHO`/`APROVADA` em 1 única requisição, sugere
fornecedor preferencial via `ItemSupplierRepository.findPreferredByItem`,
marca as ordens `EM_EXECUCAO` na mesma transação), rota
`server/src/modules/mrp/presentation/routes/mrp.ts` com
`authorizeModule('mrp', 'operate')`, 4 testes em
`server/tests/unit/mrp-convert-to-requisition.test.ts` (conversão com
fornecedor sugerido, notas customizadas, 422 `BusinessRuleError` para
status inválido, 404 `NotFoundError` para ordem inexistente), documentado
em `docs/arquitetura/API.md` §13. Item 3 da tabela em `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`
marcado ✅ resolvido (parcial — trigger 100% automático plano→requisição
sem intervenção do planejador segue fora do escopo).

### 2. Bloco 2 — Amostra da Engenharia (UC-39), frontend + QA

Confirmado real, 6 itens: `client/src/pages/engineering/SampleRequestTab.tsx`
(nova aba "sample-request" em `EngineeringPage.tsx`), badge "Amostra —
Engenharia" em `client/src/pages/logistics/ReceivingPage.tsx` (compara
`purchase.requisition?.origin === 'engenharia_amostra'`), alerta não
bloqueante de quantidade > 50 unidades no mesmo form
(`ATYPICAL_QUANTITY_THRESHOLD`), e 5 testes em
`server/tests/unit/engineering-sample-requisition.test.ts` (422 sem
justificativa, 422 justificativa em branco, persistência do vínculo com
`engineering_project_id`, 404 projeto inválido, e cadeia unit-level
amostra→pedido→recebimento roteando automaticamente para `LABORATORIO` sem
`warehouse_code` explícito). A justificativa reaproveita o campo `notes`
já existente em `purchase_requisitions` — **decisão confirmada, não é
regressão**: não existe coluna dedicada `justificativa`, documentado desde
a decisão 2.1 de `docs/governance/TODO.md`.

### 3. Bloco 4 — Testes de invariante de depósitos + 1 gap real descoberto

Novo arquivo `server/tests/unit/warehouse-invariants.test.ts`. Dos 4 itens
pendentes na seção 4.4 do TODO:
- **Expedição só lê `ACABADOS`** (mesmo com saldo positivo do mesmo produto
  em `INSUMOS`) — coberto, 2 casos.
- **Quarentena/bloqueio/liberação de lote nunca move depósito** (só muda
  `LotControl.status`) — coberto, 3 casos (`BlockLotUseCase`/
  `ReleaseLotUseCase`).
- **Teste destrutivo com `consumed_quantity` debita `LABORATORIO`** — já
  estava coberto em `warehouse-stock.test.ts`/`laboratory-tests.test.ts`;
  confirmado que não há duplicação em `warehouse-invariants.test.ts`.
- **[GAP REAL, PRÓXIMA TAREFA] Contagem cíclica escopada a um único
  depósito** — **NÃO é apenas um teste faltando, é funcionalidade não
  implementada**: `InventoryCount`/`InventoryCountItem` não têm coluna
  `warehouse_id` (confirmado — grep em ambos os modelos não retorna
  nenhuma ocorrência de `warehouse`), e `ApproveInventoryCountUseCase`
  ajusta a variância via `InventoryService.adjust(item.product_id, ...)`,
  que altera o saldo **global** de `Product.quantity` (dual-write legado),
  não uma linha de `product_warehouse_stock`. Ou seja, hoje uma contagem
  feita fisicamente em um depósito específico ajusta o total do produto em
  todos os depósitos.
  **Próxima tarefa de desenvolvimento a despachar:**
  1. Migration adicionando `warehouse_id` a `InventoryCount`/`InventoryCountItem`.
  2. `CreateInventoryCountUseCase` gravando o depósito contado.
  3. `ApproveInventoryCountUseCase` ajustando `product_warehouse_stock` do
     depósito específico (via `warehouseStockService`), não `Product.quantity`.
  4. Tela de Contagem/Inventário mobile enviando o depósito selecionado.
  5. Só então escrever o teste de invariante correspondente.

### 4. Logo oficial da marca no login

`client/src/pages/LoginPage.tsx` importa `@/assets/brand/evok-logo.png`
(raio verde + wordmark "VOK ÁUDIO"), renderizado sobre fundo branco (o
wordmark é preto e sumiria sobre fundo escuro).

### Checklist G6

`docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md` foi reconciliado por outro agente
anteriormente — confirmado (grep) que não há nenhuma menção a Bloco 2,
Bloco 4 ou ao endpoint `planned-orders/convert` nesse arquivo, logo não há
contradição com o que foi registrado nesta rodada.

### Documentos atualizados nesta consolidação

- `docs/governance/TODO.md` — Bloco 2 (seções 2.3 Frontend e 2.4 QA, 7 itens
  `[ ]` → `[x]` com evidência de arquivo/teste); Bloco 4 (seção 4.4 QA, 3
  itens `[ ]` → `[x]`, 1 item reescrito como gap de desenvolvimento real
  em vez de teste faltando).
- `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` — item 3 da tabela de lacunas
  marcado ✅ resolvido (parcial), no mesmo padrão `~~riscado~~` dos demais.
- `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` — nova entrada datada 2026-08-04
  (apêndice, entradas antigas preservadas).
- Este arquivo (`docs/governance/HANDOFF_CODEX.md`).

### Próximos passos para o time humano

1. Despachar a tarefa de desenvolvimento da contagem cíclica por depósito
   (ver item 3 acima) — é a única entrega desta rodada que não fechou.
2. Rodar `npx jest mrp-convert-to-requisition engineering-sample-requisition
   warehouse-invariants` para confirmar os 3 arquivos de teste passam no
   ambiente de CI/local antes do próximo checkpoint de Go-Live.
3. Avaliar se o trigger 100% automático plano MRP → requisição (sem
   seleção manual do planejador) entra no roadmap do próximo bloco.

**Consolidado por**: Claude Code (Tech Lead de Governança/Documentação)

---

## Consolidação de Governança — Onda 2, segunda rodada de 5 entregas paralelas de 2026-08-04

Segunda rodada de agentes rodando em paralelo, consolidada nesta sessão de
governança. Cada evidência foi verificada por leitura direta do código/
testes reais antes de qualquer item ser marcado `[x]` — nenhuma foi aceita
apenas pela lista recebida do agente que despachou a rodada.

### 1. Bloco 4 — schema de contagem cíclica por depósito (PARCIAL — não fechado)

Migration `server/migrations/20260804-000006-add-warehouse-id-to-inventory-counts.cjs`
aplicada: coluna `inventory_counts.warehouse_id` (FK `warehouses.id`,
nullable por legado — 4 linhas pré-existentes sem noção de depósito,
backfill para `INSUMOS`), índice `idx_inventory_counts_warehouse_id`.
Model `server/src/models/InventoryCount.ts` com `warehouse_id` e
associação `belongsTo(Warehouse, { foreignKey: 'warehouse_id', as:
'warehouse' })`. Documentado em `docs/database/DATABASE.md` §"Coluna nova:
inventory_counts.warehouse_id". `InventoryCountItem` deliberadamente
**não** ganhou coluna própria — todo item herda o depósito do cabeçalho.

**Por que não foi fechado no TODO:** o passo que efetivamente faz a
contagem impactar o saldo por depósito (`ApproveInventoryCountUseCase`
ajustar `product_warehouse_stock` em vez de `Product.quantity` global)
estava sendo desenvolvido por outro agente **em paralelo, ao mesmo tempo**
desta consolidação — marcar `[x]` agora seria prematuro e potencialmente
incorreto. `docs/governance/TODO.md` registra explicitamente "schema
pronto, use case em andamento" nesse item.

### 2. Bloco 1.2 — bug real corrigido: expedição não valida mais NF-e cancelada pós-emissão

`server/src/modules/sales/application/use-cases/ChangeSaleStatusUseCase.ts`:
a transição `invoiced -> shipped` agora exige `sale.nfe_status ===
'authorized'`, lançando `BusinessRuleError` 422 com `details.nfe_status`
quando falha. **Bug real, não apenas gap de teste:** antes desta
correção, uma venda cuja NF-e foi cancelada *depois* de emitida
(`nfe_status` muda para `cancelled`, mas `sale.status` não reverte de
`invoiced`) podia ser embarcada indevidamente, porque a máquina de
estados genérica (`VALID_TRANSITIONS`) só examina `sale.status`. Testado
em `server/tests/unit/onda3-shipping-cockpit-cashflow.test.ts` (5 casos).

### 3. Bloco 5 — RBAC de NF-e completo (backend já correto + 3 testes novos + frontend)

Backend confirmado já correto por leitura de código:
`authorizeModule('vendas', 'approve')` em `POST /api/sales/:id/nfe` e
`POST /api/sales/:id/nfe/cancel`
(`server/src/modules/sales/presentation/routes/sales.ts`). 3 testes novos
fecham a lacuna de QA do Bloco 5 (§5.3) em
`server/tests/unit/sales-nfe-rbac.test.ts`:
1. operador nível `operate` tenta emitir NF-e → 403
   `APPROVAL_LEVEL_REQUIRED` + log `access_denied`;
2. gestor nível `approve` emite NF-e → middleware libera, `IssueSaleNfeUseCase`
   completa com `nfe_status: 'authorized'`;
3. gestor cancela NF-e de venda `shipped` → `nfe_status` vira `cancelled`,
   `sale.status` permanece `shipped` (nenhuma regra liga as duas coisas).

Frontend: `client/src/pages/sales/SalesPage.tsx` calcula `canApproveNfe =
hasRole('admin') || permissions?.vendas === 'approve'` (mesma fórmula do
middleware do backend) e condiciona a exibição dos botões "Emitir NF-e"/
"Cancelar NF-e" a esse flag, com mensagem explicativa no lugar quando
ocultos.

### 4. Bloco 1 — dashboard filtrado por módulo + preview de perfil na edição de usuário

`client/src/pages/DashboardPage.tsx`: `canSee(module)` replica o padrão de
fallback de `AppLayout.itemVisible`
(`usingRoleFallback = permissionsFetchFailed || hasRole('admin')`, nunca
esconde cards por falha de infraestrutura); cards e queries
(`canSeeProdutos`/`canSeeCompras`/`canSeeProducao`/`canSeeFinanceiro`)
condicionados a `hasModuleAccess(module)`.

`client/src/pages/users/UsersPage.tsx`: dialog "Atribuir perfil" ganhou
pré-visualização somente-leitura (`selectedProfilePreview`, alimentada por
`accessProfilesApi.listAccessModules`) mostrando os módulos/níveis
(`LEVEL_LABEL`) que o perfil selecionado concede. Confirmado por leitura
de código: **não existe e não deveria existir** um campo `access_level`
avulso no usuário — decisão de arquitetura já registrada no Bloco 1.2
(nível 100% resolvido pela matriz do perfil), não é um gap novo.

### 5. Bloco 6 — retrofit de 4 telas + checklist de conformidade (2 parciais + 1 item novo)

`ProductionOrdersPage.tsx`, `RegisterTestTab.tsx`, `MrpPage.tsx`,
`InspectionTab.tsx` migradas para `translateApiError`/`DidacticAlert`
(confirmado por leitura de código nas 4). Checklist de conformidade §6.3
rodado nas 9 telas priorizadas (5 já conformes + as 4 novas):

- **`RegisterTestTab.tsx`** — parcial: alerta não-bloqueante, decisão
  consciente de não travar o submit do formulário.
- **`InspectionTab.tsx`** — parcial: backend
  (`ReleaseLotUseCase`/`BlockLotUseCase`) lança `BusinessRuleError` só com
  `message` em texto livre (confirmado por leitura direta do use case),
  sem `details` estruturado — `translateApiError` cai no fallback
  genérico em vez de um dado específico do lote.

Item novo criado em `docs/governance/TODO.md` §6.1: "auditar e estruturar
`details` no erro de `ReleaseLotUseCase`/`BlockLotUseCase`" — amarrado ao
item 9 já existente da lista de priorização ("Liberação/bloqueio de lote
em status terminal"), não duplica.

### Coordenação com agentes paralelos

2 outros agentes seguiam trabalhando em `server/src/modules/inventory/**`
e `server/src/modules/products/**` (código) durante esta consolidação —
esta sessão só editou arquivos `.md`, sem risco de conflito.

### Documentos atualizados nesta consolidação

- `docs/governance/TODO.md` — Bloco 1.2 (nota de bug corrigido em
  `shipped`), Bloco 1.3 (dashboard filtrado `[x]`), Bloco 1.4 (edição de
  usuário `[x]`), Bloco 4.1 (nota "schema pronto, use case em andamento" —
  item permanece `[ ]`), Bloco 5 completo (§5.2 frontend e §5.3 QA, 5 itens
  `[ ]` → `[x]`), Bloco 6 (§6.2 4 telas `[ ]` → `[x]` com 2 notas parciais,
  §6.3 checklist `[ ]` → `[x]`, §6.1 item novo `[ ]` criado).
- `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` — nova entrada datada 2026-08-04
  (apêndice "Onda 2, segunda rodada em paralelo"; entradas antigas
  preservadas).
- Este arquivo (`docs/governance/HANDOFF_CODEX.md`).

### Próximos passos para o time humano

1. Aguardar a conclusão do ajuste paralelo de `ApproveInventoryCountUseCase`
   (item 1 acima) e então fechar o item de contagem cíclica por depósito
   em `docs/governance/TODO.md` (Bloco 4) — hoje só o schema está pronto.
2. Rodar `npx jest sales-nfe-rbac onda3-shipping-cockpit-cashflow` para
   confirmar os 2 arquivos de teste novos desta rodada passam no ambiente
   de CI/local.
3. Despachar o item novo de `docs/governance/TODO.md` §6.1 (`details`
   estruturado em `ReleaseLotUseCase`/`BlockLotUseCase`) numa próxima
   rodada de Bloco 6.
4. Avaliar se a UX não-bloqueante de `RegisterTestTab.tsx` (aviso sem
   travar submit) deve virar bloqueio duro — decisão de produto, não
   técnica.

**Consolidado por**: Claude Code (Tech Lead de Governança/Documentação)

---

## Consolidação de Governança — Onda 3+4: Bloco 4 fechado, suíte de integração saudável, e correção de um bug crítico P0 real de produção (2026-08-04)

Rodada final de governança do dia, fechando os 3 gaps deixados em aberto
pela consolidação anterior ("Onda 2"). Toda evidência abaixo foi
verificada por leitura direta de código/migrations/testes e por execução
ao vivo dos comandos citados, antes de qualquer item ser marcado `[x]` em
`docs/governance/TODO.md`.

### 1. Bloco 4 (UC-42, Múltiplos Depósitos) fechado por completo

O item pendente da rodada anterior — "contagem cíclica escopada a um
único depósito, schema pronto, use case em ajuste paralelo" — está
concluído full-stack:

- **Schema** (já existente, sem alteração): migration
  `server/migrations/20260804-000006-add-warehouse-id-to-inventory-counts.cjs`
  — `inventory_counts.warehouse_id` (FK `warehouses.id`, nullable por
  legado, backfill das 4 linhas pré-existentes para `INSUMOS`).
- **Use case de criação:** `CreateInventoryCountUseCase.ts`
  (`server/src/modules/inventory/application/use-cases/`) agora exige
  `warehouse_id` no payload — 400 se ausente.
- **Use case de aprovação:** `ApproveInventoryCountUseCase.ts` ajusta a
  variância apenas no depósito especificamente contado
  (`count.warehouse_id`), via `WarehouseStockService.addToWarehouse`/
  `removeFromWarehouse`, mantendo `InventoryService.adjust` (que grava
  `Product.quantity`, hot path do MRP) como a soma dos saldos por
  depósito — nunca mais um ajuste "cego" no total global.
- **Validador:** `createInventoryCountSchema`
  (`server/src/modules/inventory/presentation/validators/inventoryValidators.ts`)
  rejeita `warehouse_id` ausente com mensagem didática.
- **Teste:** `server/tests/unit/warehouse-invariants.test.ts`, describe
  `'Invariante 3 — contagem ciclica (CreateInventoryCountUseCase/
  ApproveInventoryCountUseCase) escopada a um unico deposito'`.
- **Frontend:** `client/src/pages/products/InventoryCountsPage.tsx`
  ganhou seletor de depósito obrigatório no formulário de criação, coluna
  "Depósito" na listagem e no detalhe da contagem, tratamento didático de
  erro `422` e um banner com a identidade visual EVOK (gradiente
  `bg-brand`) no topo da tela.

As 2 últimas pendências do Bloco 4 também foram fechadas nesta rodada:

- **`GET /api/products/:id/stock-by-warehouse`** — novo endpoint
  (`server/src/modules/products/presentation/routes/products.ts`,
  `authorizeModule('estoque')`), use case
  `GetProductStockByWarehouseUseCase.ts`. Decisão documentada: retorna
  **todos** os depósitos ativos, mesmo com saldo zero — diferente do
  endpoint por query param (`GET /api/inventory/warehouse-stock?product_id=`),
  que só lista linhas existentes em `product_warehouse_stock`. Os dois
  endpoints coexistem por atenderem telas com necessidades de exibição
  diferentes.
- **Script de validação pós-backfill**
  `server/src/scripts/backfill/04l_product_warehouse_stock_validation.ts`
  — **rodado ao vivo contra Postgres real nesta sessão**: `4/4` blocos
  PASS (cobertura de backfill, integridade referencial, invariante de
  soma `products.quantity = SOMA(product_warehouse_stock.quantity)`,
  ausência de saldo negativo). No momento desta execução o banco de
  desenvolvimento tinha 106 produtos, todos com a invariante correta.

Com isso, **Bloco 4 (UC-42) está fechado** em `docs/governance/TODO.md` —
todos os itens de schema (4.1), backend (4.2), frontend (4.3) e QA (4.4)
marcados `[x]`, exceto o retrofit do inventário mobile por QR Code para
múltiplos depósitos, explicitamente fora do escopo desta entrega e
registrado como pendência futura.

### 2. Suíte de integração saudável pela primeira vez contra Postgres real

Uma rodada completa de `node server/scripts/run-api-suite.cjs integration`
contra o container `evok-postgres` encontrou 5 suítes falhando. Causa
raiz identificada e corrigida em cada caso — nenhuma era regressão de
produto:

- **3 suítes** falhavam por falta de saldo no depósito `ACABADOS` no
  fixture global de setup da suíte (o Bloco 4 fez a expedição/venda
  passar a debitar especificamente `ACABADOS`, e o fixture global não
  garantia saldo lá) — corrigido em `server/scripts/run-api-suite.cjs`
  (garante saldo mínimo de 100.000 un em `ACABADOS` antes da suíte
  rodar).
- **2 suítes** falhavam por fragilidade pré-existente de fixture
  (`category_id: 1` hardcoded — frágil em qualquer banco de
  desenvolvimento reutilizado/de longa duração onde a sequência de
  `categories.id` já avançou além de 1) — corrigido com uma fixture
  dedicada nova, `server/tests/integration/helpers/categoryFixtures.ts`
  (`ensureFixtureCategoryId`), que resolve a primeira categoria ativa
  existente via `GET /api/categories` em vez de assumir um id fixo.

### 3. BUG CRÍTICO P0 real de produção encontrado e corrigido

No processo de investigar as falhas de integração acima, foi descoberto
que **`POST /api/inventory/movements`** — o endpoint de lançamento manual
de entrada/saída de estoque, usado no dia a dia operacional do
almoxarifado — **derrubava o processo Node.js inteiro** em qualquer
chamada bem-sucedida. Isto não é um bug de teste: é um risco operacional
do mesmo escopo de gravidade dos bloqueadores P0 originais do go-live —
qualquer lançamento manual de estoque em produção derrubaria o servidor
para **todos** os usuários simultâneos, não apenas para quem fez a
requisição.

**Causa raiz:**
`server/src/modules/inventory/presentation/controllers/inventoryController.ts`
(`exports.create`) desestruturava `{ movement }` do retorno de
`CreateInventoryMovementUseCase.execute(...)`, mas esse use case só
retorna `{ movementId }` — `movement` ficava `undefined`. O código
seguinte tentava usar esse valor e lançava um `TypeError` **depois** de a
transação de banco já ter sido commitada; o tratamento de erro então
tentava fazer `rollback()` de uma transação já commitada — uma operação
inválida que derrubava o processo Node inteiro em vez de apenas
responder com um erro HTTP.

**Correção** (feita diretamente nesta sessão de governança, não por um
subagente): o controller agora busca o movimento completo via
`GetInventoryMovementByIdUseCase` usando o `movementId` retornado pelo
use case, antes de responder `201`.

**Validação ao vivo, feita pessoalmente:** subi o servidor real
compilado (`node dist/index.js`), autentiquei como admin via `POST
/api/auth/login`, chamei `POST /api/inventory/movements` com um
lançamento manual real de entrada/saída — recebi `201` com o servidor
**sobrevivendo** (antes desta correção, o mesmo passo derrubava o
processo). Em seguida rodei a suíte completa novamente para garantir
zero regressão.

### Resultado final confirmado (comandos rodados diretamente nesta sessão)

```
cd server && npx jest tests/unit
  → Test Suites: 60 passed, 60 total | Tests: 417 passed, 417 total

cd server && node scripts/run-api-suite.cjs integration
  → Test Suites: 23 passed, 23 total | Tests: 54 passed, 54 total

cd server && npx tsx src/scripts/backfill/04l_product_warehouse_stock_validation.ts
  → BLOCO 1/2/3/4: ✅ PASS (4/4) — invariante de soma validada em 106 produtos
```

### Documentos atualizados nesta consolidação

- `docs/governance/TODO.md` — Bloco 4 §4.1 (script de validação `[ ]` →
  `[x]`, endpoint `stock-by-warehouse` `[ ]` → `[x]`), Bloco 4 §4.4
  (contagem cíclica `[ ]` → `[x]`, fechando o bloco), seção "Pendências
  de Segurança / Gate G6" com 2 itens novos `[x]` (bug P0 corrigido, e
  saúde da suíte de integração).
- `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` — nova entrada datada 2026-08-04
  (apêndice "Onda 3+4"; entradas antigas preservadas, nenhuma reescrita).
- Este arquivo (`docs/governance/HANDOFF_CODEX.md`).

### Próximos passos para o time humano

1. Revisar e aprovar formalmente o fechamento do Bloco 4 (UC-42) — não há
   mais pendências técnicas conhecidas além do inventário mobile por QR
   Code (explicitamente fora do escopo).
2. Confirmar em code review a correção do bug P0 de
   `POST /api/inventory/movements` — dado o risco (derrubava o processo
   inteiro em produção), recomenda-se um segundo par de olhos antes do
   próximo deploy, mesmo já validado ao vivo nesta sessão.
3. Avaliar se o script de validação pós-backfill
   (`04l_product_warehouse_stock_validation.ts`) deve entrar em um
   pipeline de CI/monitoramento periódico pós-Go-Live, não apenas rodar
   manualmente.
4. Retrofit do inventário mobile por QR Code para múltiplos depósitos
   (único item remanescente do Bloco 4) — despachar como tarefa nova
   quando priorizado.

**Consolidado por**: Claude Code (Tech Lead de Governança/Documentação)

---

## Rodada de 5 frentes paralelas — 2026-08-04 (governança/consolidação)

Rodada grande concluída no mesmo dia, com 5 agentes trabalhando em
paralelo em frentes independentes. Cada entrega abaixo foi verificada
nesta consolidação por leitura direta do código-fonte/testes e execução
real da suíte (não apenas pelo relato de cada agente). Detalhe completo
em `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` (apêndice "2026-08-04 — Rodada de 5
frentes paralelas") e `docs/governance/TODO.md`.

### 1. Bloco 6.1 — `details` estruturado (9 endpoints priorizados, `BUSINESS_RULES.md` §13.5)

Fechado por completo. 6 casos já estavam corretos (liberação de OP,
conclusão de OP, embarque sem NF-e, conversão de requisição sem
fornecedor, conversão MRP em execução, aprovação de requisição fora de
sequência) — confirmados por leitura de código; testes existentes
reforçados para travar o formato de `details` contra regressão. 3
corrigidos nesta rodada:

- `server/src/modules/purchases/application/use-cases/ReceivePurchaseItemsUseCase.ts`
  — `details: { purchase_id, order_number, field: 'invoice_number' }`.
- `server/src/modules/laboratory/application/use-cases/CreateAcousticTestUseCase.ts`
  — `details: { product_id, test_type, missing_fields }`.
- `server/src/modules/inventory/application/use-cases/ReleaseLotUseCase.ts`
  / `BlockLotUseCase.ts` — `details: { lot_id, current_status,
  allowed_statuses }`, fechando também a nota de conformidade parcial de
  `InspectionTab.tsx` deixada pela Onda 2.

### 2. Bloco 1.5 — 4 testes de integração/E2E de permissões

- `server/tests/integration/rbac-module-access-denied.test.ts`
- `server/tests/integration/auth-me-permissions.test.ts` — reinterpretação
  deliberada e documentada explicitamente no arquivo: "Dashboard só
  mostra cards do perfil" é renderização React, não testável via
  Supertest; o teste valida o contrato `GET /api/auth/me/permissions`
  consumido pelo Dashboard.
- `server/tests/integration/reports-cross-module-permission.test.ts`
- `server/tests/integration/quality-releases-receiving-lot.test.ts` — E2E
  completo do UC-37 (recebimento cria lote em quarentena, só Qualidade
  libera, não Recebimento).

### 3. Roadmap item 3 — trigger automático do MRP

Opt-in por item (`items.conversao_automatica`, migration
`20260804-000010`), `UC-24b` em `docs/projeto/04-USE_CASES.md`. Decisão
de design: **nunca 100% automático** — risco de compra sem revisão
humana. `GenerateMrpPlanUseCase` fecha automaticamente, na mesma
transação do plano, as ordens de itens com a flag; itens sem a flag
seguem exigindo conversão manual. Testado em
`server/tests/unit/mrp-auto-convert.test.ts` (4/4). **Pendência residual
pequena:** falta endpoint/UI para ligar a flag por item (só via banco).

### 4. Roadmap item 8 — rating de fornecedor via RNC

`suppliers.quality_score` — calculado, nunca editável via API — migration
`20260804-000011-add-supplier-quality-score.cjs`, recalculado
sincronamente na criação de RNC vinculada a lote com fornecedor
(`CreateNonConformityUseCase.recalculateSupplierQualityScore`), fórmula
`MAX(0, 100 - (rncs_count / receipts_count * 100))`. Documentado por
completo em `docs/database/DATABASE.md`. Testado em
`server/tests/unit/quality-lot-lifecycle.test.ts` (20/20). **Risco
residual importante:** sem backfill retroativo — RNCs fechadas antes
desta entrega não contam no cálculo inicial (default neutro 100.00).

### 5. Roadmap item 7 (parcial) — schema de mão-de-obra/overhead no custeio

Só o schema (`work_centers.cost_per_hour` + `production_cost_settings`,
migrations `20260804-000007/-000008/-000009`) — **cálculo real ainda não
implementado**. Contrato documentado em `docs/database/DATABASE.md`, apontando
`ChangeProductionOrderStatusUseCase.completeOrder()` como o lugar certo.
**Não marcado como resolvido** no roadmap — é a próxima tarefa de
custeio.

### Achado operacional — risco de processo com migrations paralelas

2 agentes colidiram numerando migrations como `20260804-000007` para
arquivos diferentes; um renomeou para `-000011`, o que deixou
`SequelizeMeta` dessincronizada do arquivo em disco (a migration já
tinha sido aplicada sob o nome antigo por uma corrida de `migration:up`
concorrente). Corrigido diretamente via `UPDATE` em `SequelizeMeta` para
casar com o nome do arquivo atual — sem re-executar a migration.
Confirmado via `npm run migration:status`: `000001` a `000011` todas
`up`, sem lacunas. **Recomendação para o time humano em rodadas
futuras:** um agente por vez rodando `migration:generate`/`migration:up`
quando há múltiplos agentes de schema na mesma sessão, ou revisão manual
de `migration:status` ao final da rodada.

### Resultado final confirmado (comandos rodados diretamente nesta consolidação)

```
cd server && npx jest tests/unit
  → Test Suites: 61 passed, 61 total | Tests: 431 passed, 431 total

cd server && node scripts/run-api-suite.cjs integration
  → Test Suites: 27 passed, 27 total | Tests: 65 passed, 65 total

cd server && npm run migration:status
  → todas as migrations até 20260804-000011 em estado "up", sem lacunas
```

### Documentos atualizados nesta consolidação

- `docs/governance/TODO.md` — Bloco 6.1 fechado `[x]` por completo, Bloco
  1.5 (4 itens) fechado `[x]`, nova seção "Rodada de 5 Frentes Paralelas
  — 2026-08-04" com o achado de processo sobre migrations.
- `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` — item 3 (trigger automático)
  marcado `feito`, item 8 (rating de fornecedor) marcado `feito` com
  risco residual de backfill em destaque, item 7 mantido `feito
  (parcial)` com a distinção clara "schema pronto, cálculo pendente".
- `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` — nova entrada datada 2026-08-04
  (apêndice "Rodada de 5 frentes paralelas"; entradas antigas
  preservadas, nenhuma reescrita).
- Este arquivo (`docs/governance/HANDOFF_CODEX.md`).

### Próximos passos para o time humano

1. Implementar o cálculo real de mão-de-obra/overhead em
   `ChangeProductionOrderStatusUseCase.completeOrder()` usando o schema
   já pronto (`work_centers.cost_per_hour` + `production_cost_settings`)
   — roadmap item 7, próxima tarefa de custeio.
2. Endpoint/UI para ligar `items.conversao_automatica` por item (hoje só
   via UPDATE direto no banco) — pendência residual pequena do item 3.
3. Avaliar se algum RNC histórico relevante para o rating inicial de
   fornecedor deve ser backfillado manualmente (risco residual do item
   8) ou se o comportamento prospectivo-only é aceitável para o negócio.
4. Reforçar o processo de múltiplos agentes de schema na mesma sessão
   (ver achado operacional acima) antes da próxima rodada paralela.

**Consolidado por**: Claude Code (Tech Lead de Governança/Documentação)

---

## Encerramento do dia — 2026-08-04

Rodada grande de múltiplas ondas de agentes hoje (Blocos 1-6, retrofit
`authorizeModule`, múltiplos depósitos, triagem de segurança, e correção
de um bug crítico P0 de produção). Duas consolidações finais fecharam o
dia: o risco residual de segurança `react-router@7.18.2`
(`GHSA-qwww-vcr4-c8h2`) foi resolvido via upgrade real para
`react-router@8.3.0` (`npm audit` confirma 0 vulnerabilidades), e a tela
de contagem cíclica (`InventoryCountsPage.tsx`) ganhou seletor de
depósito obrigatório e identidade visual EVOK. Detalhe completo de cada
item em `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` (apêndice "2026-08-04 —
Fechamento do risco residual react-router") e `docs/governance/TODO.md`.
**Data**: 2026-08-04

---

## Custeio real de mão-de-obra/overhead + rastreabilidade por lote/QR — 2026-08-04

Duas frentes de roadmap fechadas nesta data (`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`,
itens 6 e 7 da tabela de prioridades), verificadas por leitura direta do
código/testes antes de marcar qualquer coisa. A seção "Rodada de 5
frentes paralelas — 2026-08-04" logo acima deste bloco havia deixado o
item 7 explicitamente como "próxima tarefa de custeio" (ver "Próximos
passos", item 1) — esta entrega fecha exatamente essa pendência, e
também o item 6.

### 1. Custeio real (roadmap item 7)

Schema já existia (`work_centers.cost_per_hour`, tabela
`production_cost_settings`, migrations `20260804-000007/-000008/-000009`).
Nesta entrega entrou o **cálculo**:

- `server/src/services/costingService.ts` — novo método
  `registerAdditionalProductionCost()`.
- `server/src/modules/production/application/use-cases/ChangeProductionOrderStatusUseCase.ts`
  — `completeOrder()` agora calcula, na MESMA transação da conclusão da
  OP:
  - **Mão-de-obra:** horas apontadas (`production_order_tracking`,
    `finished_at - started_at`) × `work_centers.cost_per_hour` da etapa
    (via `production_route_steps.work_center_id`), com fallback
    `production_cost_settings.default_labor_rate_per_hour` quando a
    etapa não tem centro de trabalho estruturado vinculado.
  - **Overhead:** `overhead_rate_percent / 100` aplicado sobre a base
    configurada em `overhead_calculation_basis`
    (`material_labor`/`labor_only`/`material_only`).
  - Lançamentos gravados em `ProductCostLedger` com
    `source_type: 'production_labor'`/`'production_overhead'`, separados
    do lançamento de material (`'production'`, já existia).
- Contrato completo e justificativa de cada decisão de modelagem já
  documentados em `docs/database/DATABASE.md`, seção "Cálculo implementado (item
  7/9 — mão-de-obra e overhead)".
- Teste dedicado: `server/tests/unit/production-labor-overhead-cost.test.ts`
  (6 casos, `costingService` real não mockado — mão-de-obra via
  `work_centers.cost_per_hour`, fallback global, OP sem apontamento, 3
  bases de overhead).

**Bug real encontrado e corrigido no caminho:**
`SequelizeReportsRepository.findCostVarianceByProduct`
(`server/src/modules/reports/infrastructure/sequelize/SequelizeReportsRepository.ts:225`)
triplicava a contagem de `quantity` quando existiam múltiplos
lançamentos-irmãos (material + mão-de-obra + overhead) da mesma OP
compartilhando `source_id` — a média ponderada simples somava a
quantidade 3x para o mesmo lote produzido, diluindo `avg_real_cost`
incorretamente. Corrigido com uma CTE que colapsa as linhas-irmãs por
`(product_id, source_id)` antes de agregar por produto. **QA deve
validar isto ao vivo:** gerar uma OP com apontamento real (mão-de-obra
via um centro de trabalho com `cost_per_hour` configurado), concluí-la, e
conferir que o relatório de custos em `/reports` (aba "Custos") mostra a
variância correta agora — sem a triplicação antiga de `quantity`.

**Risco residual real, sem mitigação:** não há backfill retroativo — OPs
concluídas antes desta entrega não ganham custo de mão-de-obra/overhead
(permanecem só com custo de material). OEE completo (disponibilidade +
qualidade, além do eixo de custo) continua fora de escopo.

### 2. Rastreabilidade por lote/QR no chão de fábrica (roadmap item 6)

Backend reaproveitou 100% a infraestrutura de QR já existente
(`qrCodeService.ts`, `GenerateEntityQrCodeUseCase.ts`, hoje usada em
Ativos) e o model `ProductionLotConsumption` já existente — nenhuma
tabela nova. Endpoints novos em
`server/src/modules/inventory/presentation/routes/inventory.ts`:

- `GET /api/inventory/lots/by-code/:lot_number` — lookup por código
  legível (`server/src/modules/inventory/application/use-cases/GetLotByCodeUseCase.ts`),
  com desambiguação opcional por `product_id`.
- `GET /api/inventory/lots/:id/qrcode` — gera QR para etiqueta física,
  reaproveitando `GenerateEntityQrCodeUseCase`.

Teste dedicado: `server/tests/unit/lot-traceability-qrcode.test.ts` (9
casos).

Frontend: novo componente
`client/src/pages/production/CompleteOrderWithLotScanDialog.tsx` —
conclusão de OP com leitura/digitação de código de lote consumido
(resolvido via lookup ao endpoint acima) e lote produzido via
`finished_lot_number` — integrado em `ShopFloorPage.tsx` (botão "Concluir
OP (ler lote)", abre o QR da etiqueta pós-conclusão via `QrCodeDialog`
reaproveitado de Ativos). Botão de reimpressão de QR adicionado em
`client/src/pages/logistics/LotsTab.tsx`.

**Decisão consciente, não é gap:** leitura por câmera (`getUserMedia`)
não foi implementada — o leitor físico USB/Bluetooth de código de
barras/QR, padrão em chão de fábrica, já preenche o campo de texto como
se fosse digitação.

### Validação — confirmada ao vivo nesta consolidação

```
cd server && npx jest tests/unit
  → Test Suites: 63 passed, 63 total | Tests: 446 passed, 446 total

cd server && node scripts/run-api-suite.cjs integration
  → Test Suites: 27 passed, 27 total | Tests: 65 passed, 65 total

cd client && npx vitest run
  → Test Files: 6 passed (6) | Tests: 24 passed (24)
```

### Documentos atualizados nesta consolidação

- `docs/governance/TODO.md` — nova seção "Custeio real de
  mão-de-obra/overhead + rastreabilidade por lote/QR — 2026-08-04", nota
  na seção "Rodada de 5 Frentes Paralelas" apontando que o item 7 deixou
  de ser "próxima tarefa" e passou a `feito`.
- `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` — itens 6 e 7 da tabela de
  prioridades marcados `feito`, linha `production` da tabela de módulos
  parciais atualizada.
- `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` — nova entrada datada 2026-08-04
  (apêndice; entradas antigas preservadas, nenhuma reescrita).
- Este arquivo (`docs/governance/HANDOFF_CODEX.md`).

### O que QA deve validar

1. **Custeio:** criar uma OP, apontar produção com etapas vinculadas a
   um centro de trabalho com `cost_per_hour` configurado (ou usar o
   fallback `default_labor_rate_per_hour` de `production_cost_settings`),
   concluir a OP, e conferir em `/reports` → aba "Custos" que
   `avg_real_cost` reflete material + mão-de-obra + overhead
   corretamente (não triplicado).
2. **Rastreabilidade:** no chão de fábrica (`/production/shop-floor`),
   concluir uma OP usando o fluxo "Concluir OP (ler lote)" — informar
   lote(s) consumido(s) por código e o `finished_lot_number` do lote
   produzido; verificar que o QR da etiqueta gerado pós-conclusão abre
   corretamente e que `GET /api/inventory/lots/by-code/:lot_number`
   resolve o lote informado.
3. Confirmar que nenhuma OP concluída antes desta entrega teve seu custo
   de material alterado (backfill não foi aplicado por design — apenas
   novo custo de mão-de-obra/overhead passa a ser lançado a partir de
   agora).

**Consolidado por**: Claude Code (Tech Lead de Governança/Documentação)
**Data**: 2026-08-04

---

## Frontend — Levantamento MRP/Requisições/Qualidade e fechamento do loop CAPA (Bloco 8)

**Data**: 2026-08-04
**Escopo**: Levantamento do estado real das telas de MRP, Requisição de Compra e Qualidade (Fase 2/P1 do roadmap `CLAUDE.md`) + construção do único gap real encontrado com backend pronto e sem UI.

### Levantamento (achado principal)

As 3 telas pedidas neste escopo **já estavam completas e roteadas** (não
foi um levantamento desatualizado — `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`
já marcava os itens 1–9 do top 10 como `feito`, confirmado por leitura de
código):
- `client/src/pages/production/MrpPage.tsx` (rota `/production/mrp`):
  geração de plano por demanda, listagem de ordens planejadas com
  seleção múltipla, conversão em requisição de compra
  (`POST /api/mrp/planned-orders/convert`). Completo.
- `client/src/pages/purchases/RequisitionsPage.tsx` (rota
  `/purchases/requisitions`): criação, listagem com filtro de status,
  aprovação, cancelamento, conversão em pedido de compra agrupado por
  fornecedor, suporte a amostra de engenharia (`origin=engenharia_amostra`
  + projeto de P&D). Completo.
- `client/src/pages/quality/QualityPage.tsx` (rota `/quality`, abas
  `InspectionTab.tsx` + `NonConformitiesTab.tsx`): inspeção de
  recebimento (liberar/bloquear lote em quarentena, com abertura de RNC
  pré-preenchida) e criação/listagem de RNC. **Gap real encontrado aqui**
  (ver abaixo).

### Gap real encontrado e resolvido: tratativa CAPA de RNC

**Achado:** o backend de não-conformidades
(`server/src/modules/nonConformities/`) já expõe `PUT
/api/quality/non-conformities/:id` (`UpdateNonConformityUseCase`,
`ALLOWED_FIELDS`: `root_cause`, `root_cause_category`,
`corrective_action`, `status`, `responsible_id`, `closed_by` automático)
e `DELETE /api/quality/non-conformities/:id` (fechamento direto), mas o
frontend só implementava `POST` (criar) e `GET` (listar) — não havia
nenhuma forma de avançar o fluxo CAPA (`open` → `analysis` →
`corrective_action` → `effectiveness_check` → `closed`) pela interface.
Uma RNC criada ficava presa para sempre em `open` do ponto de vista da
UI, mesmo o backend suportando o ciclo completo.

**Implementado:**
- `client/src/api/nonConformities.ts` — tipos `NonConformityRootCauseCategory`,
  `NonConformityEffectivenessResult`, campos completos do model
  (`root_cause`, `corrective_action`, `responsible_id`,
  `effectiveness_result` etc.) adicionados à interface `NonConformity`;
  novas funções `updateNonConformity()` (`PUT`) e `closeNonConformity()`
  (`DELETE`, não usado ainda na UI — reservado para um botão futuro de
  "encerrar diretamente").
- `client/src/lib/translateApiError.ts` — novo `ErrorContext`
  `'treat-non-conformity'` (aponta de volta para `/quality`), seguindo o
  padrão didático de 3 partes já usado no resto do projeto.
- `client/src/pages/quality/NonConformitiesTab.tsx` — linha da tabela
  agora é clicável (mesmo padrão de `RequisitionsPage.tsx`) e abre
  `NonConformityTreatmentSheet`: painel de detalhe completo (produto,
  fornecedor, severidade, tipo de defeito, ação imediata, lote,
  quantidade afetada, status, resultado de eficácia quando existir) +
  formulário de tratativa (categoria 6M da causa raiz, causa raiz,
  ação corretiva, responsável via `SelectNative` de usuários ativos,
  avanço de status). RNC `closed`/`canceled` vira somente-leitura (sem
  formulário). Aviso explícito de que fechar a RNC **não** libera lote
  bloqueado automaticamente (decisão já documentada no backend,
  `UpdateNonConformityUseCase` JSDoc) — a liberação continua manual na
  aba Inspeção.

### Telas que dependiam de endpoint ainda não pronto no backend

Nenhuma. Catálogo item×fornecedor N:N (`itemSuppliers.ts`) e conversão
MRP→OP já têm UI e backend prontos (ver
`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`, itens 1 e 3 da tabela de
prioridades). O agente paralelo de backend não tinha, no momento desta
sessão, nenhum endpoint novo aguardando UI dentro do escopo MRP/
Requisições/Qualidade — o único gap encontrado (CAPA de RNC) já tinha
backend 100% pronto, sem dependência cruzada.

### Arquivos alterados

- `client/src/api/nonConformities.ts`
- `client/src/lib/translateApiError.ts`
- `client/src/pages/quality/NonConformitiesTab.tsx`

### Validação rodada

- `npx tsc --noEmit -p client` — sem erros.
- `npm run lint` (oxlint) em `client/` — sem novos warnings/erros (apenas
  4 warnings pré-existentes de fast-refresh, não relacionados).
- `npx vitest run` em `client/` — 24/24 testes passando (6 arquivos),
  nenhuma regressão.
- Backend (`localhost:5000/health/live`) e frontend
  (`localhost:5173`) confirmados no ar (`200`) durante a sessão.

### O que QA deve testar na interface

1. Em `/quality` → aba "Não-conformidades (RNC)", criar uma RNC nova
   (ou usar uma já existente em `open`).
2. Clicar na linha da RNC (ou no botão "Tratativa") — deve abrir o
   painel lateral com todos os dados e o formulário de tratativa.
3. Preencher causa raiz (com categoria 6M), ação corretiva, atribuir um
   responsável, avançar o status para `analysis` → salvar → reabrir a
   RNC e confirmar que os campos persistiram.
4. Avançar até `closed` — confirmar que o backend grava `closed_by`/
   `closed_at` automaticamente (não há campo para isso no formulário,
   é implícito) e que, ao reabrir, o painel vira somente-leitura com o
   aviso "não pode mais ser editada por aqui".
5. Confirmar que fechar a RNC **não** libera automaticamente nenhum lote
   bloqueado vinculado — a liberação deve continuar exigindo ação manual
   na aba "Inspeção de recebimento".
6. Testar com um usuário sem papel `admin`/`operator` (ex.: `financial`)
   — a linha deve continuar clicável para visualizar o detalhe, mas o
   formulário de tratativa não deve aparecer (somente leitura).

**Consolidado por**: Claude Code (Frontend Engineer)
**Data**: 2026-08-04

---

## Bloco 6 — Fechamento dos Itens Pendentes (Decisão de Pré-Checagem, Retrofit Final, Testes de Regressão)

**Data**: 2026-08-04
**Escopo**: Fechar os `[ ]` remanescentes do Bloco 6 (`docs/governance/TODO.md`) — decisão técnica de pré-checagem por caso (§6.1), retrofit das 2 telas do lote das 9 que ainda não estavam 100% migradas (§6.2), e os 3 testes de regressão pendentes (§6.3). Não tocou em nenhuma outra frente do roadmap (MRP, Fase 2, Fase 3).

### 1. Decisão técnica de pré-checagem (§6.1)

Avaliados os 6 pontos críticos cobertos pelo padrão, lendo as rotas `GET`
reais hoje disponíveis (`server/src/modules/**/presentation/routes/*.ts`)
contra o que o `details` de cada erro `422` exige. **Decisão: não criar
nenhum endpoint `GET .../:id/prerequisites` novo nesta entrega** — em 5
dos 6 casos o reaproveitamento de `GET`s existentes é direto (conclusão de
OP via `GET /:id/tracking`, embarque via `GET /sales/:id/nfe`, conversão e
aprovação de requisição via `GET /purchase-requisitions/:id`, liberação/
bloqueio de lote via `GET /inventory/lots`). No 6º caso (liberar OP), o
dado que falta (disponibilidade de material calculada contra estoque real)
não está hoje exposto por nenhum `GET` — a decisão registrada foi montar
o checklist no frontend cruzando `GET /production-orders/:id` (itens da
BOM) com `GET /inventory/stock-report` (saldo por item, rota já existente)
em vez de duplicar a regra de negócio de reserva em um endpoint de
simulação dedicado. Detalhamento completo caso a caso em
`docs/governance/TODO.md` §6.1. **Aplicação do `PrerequisiteChecklist`
nas 6 telas usando esses GETs não fazia parte desta rodada** — fica
registrada como próximo incremento natural.

### 2. Retrofit final das telas (§6.2)

Auditadas as telas novas dos Blocos 1–5 (`AccessProfilesPage.tsx`,
`WarehousesPage.tsx`, `TransfersTab.tsx`) e as 6 telas retrofitadas com o
semáforo de handoff do Bloco 3 (`PurchasesPage.tsx`,
`RequisitionsPage.tsx`, `ReceivingPage.tsx`, `ShippingPage.tsx`,
`InspectionTab.tsx`, `NonConformitiesTab.tsx`). As 3 telas novas dos
Blocos 1/4 já nasceram usando `translateApiError`/`DidacticAlert` —
nenhuma mudança necessária. Duas das 6 telas com semáforo ainda usavam
`extractApiErrorMessage`/`window.alert` (herdado de antes do Bloco 6, fora
do lote original de 9 telas priorizadas):
- `client/src/pages/purchases/PurchasesPage.tsx` — migrados `createMutation`
  (criar pedido), `statusMutation` (`window.alert` → `DidacticAlert`, era o
  único `window.alert` restante fora dos 9 casos já fechados) e o
  `ReceiveItemsDialog` local (dialog redundante ao
  `ReceivingConferenceDialog.tsx`, que já estava conforme).
- `client/src/pages/quality/NonConformitiesTab.tsx` — migrado o
  `createMutation` do formulário de nova RNC (o formulário de tratativa
  CAPA, adicionado em sessão paralela, já estava conforme).
- `client/src/pages/logistics/ReceivingPage.tsx` — sem mutation própria
  (delega para `ReceivingConferenceDialog.tsx`, já conforme); nenhuma
  mudança necessária.

### 3. Testes de regressão (§6.3)

- **Múltiplos pré-requisitos juntos**: 2 casos novos em
  `server/tests/unit/production-order-lifecycle.test.ts` —
  `ChangeProductionOrderStatusUseCase` com 3 `missing_items` simultâneos
  na liberação de OP e 3 `open_steps` simultâneos na conclusão de OP,
  ambos verificando a lista completa (não só o primeiro item).
- **Corrigir pré-requisito reflete no recheck**: 1 caso novo em
  `server/tests/unit/quality-lot-lifecycle.test.ts` — `ReleaseLotUseCase`
  libera um lote `blocked`, depois simula a releitura já `available` e
  confirma que a tentativa seguinte usa o `current_status` atualizado (sem
  cache stale).
- **Regressão de `alert()` cru**: novo arquivo
  `client/src/test/didacticAlertRegression.test.ts` — varredura estática
  (via `import.meta.glob` com `?raw`, sem `node:fs`, que exigiria
  `@types/node` não instalado no client) das 9 telas do retrofit,
  confirmando ausência de `window.alert()`/`alert()` cru e presença de
  `translateApiError`/`DidacticAlert` em toda tela com `useMutation`.

### Arquivos alterados

- `client/src/pages/purchases/PurchasesPage.tsx`
- `client/src/pages/quality/NonConformitiesTab.tsx`
- `server/tests/unit/production-order-lifecycle.test.ts`
- `server/tests/unit/quality-lot-lifecycle.test.ts`
- `client/src/test/didacticAlertRegression.test.ts` (novo)
- `docs/governance/TODO.md` (Bloco 6 — §6.1/§6.2/§6.3 fechados)

### Validação rodada

- `npx tsc -b --noEmit` em `client/` — sem erros.
- `npx vitest run` em `client/` — 7 arquivos, 60 testes, todos passando
  (42 pré-existentes + 18 novos do teste de regressão).
- `npm run test:unit` em `server/` — 64 suítes, 456 testes, todos
  passando (452 pré-existentes + 4 novos).

### O que QA/próximo agente deve testar

1. `PurchasesPage.tsx`: forçar um erro de transição de status inválida
   (ex.: tentar avançar um pedido `received`) e confirmar que aparece
   `DidacticAlert` (3 partes) em vez do `window.confirm`/`alert` antigo.
2. `PurchasesPage.tsx`: no dialog "Receber itens", tentar confirmar sem
   informar nota fiscal — confirmar que o erro aparece no formato
   didático, não mais como texto simples vermelho.
3. `NonConformitiesTab.tsx`: tentar registrar uma RNC com dados inválidos
   (ex.: sem descrição) e confirmar o novo formato de erro no dialog de
   criação.
4. Rodar `npx vitest run src/test/didacticAlertRegression.test.ts` sempre
   que uma dessas 9 telas for editada — falha imediatamente se alguém
   reintroduzir `window.alert()`/`alert()` cru ou remover
   `translateApiError`/`DidacticAlert` de uma mutation existente.
5. Próximo incremento natural (fora do escopo desta entrega): aplicar
   `PrerequisiteChecklist` nas 6 telas usando os `GET`s já mapeados em
   §6.1 do TODO, fechando o padrão preventivo (Regra 1, §13.1) além do
   reativo (Regra 2, §13.2) já 100% coberto.

**Consolidado por**: Claude Code (Backend/Frontend Engineer — fechamento Bloco 6)
**Data**: 2026-08-04

---

## Backend — Catálogo item×fornecedor (confirmação) + MRP fecha o ciclo para OP (Fase 2/P1)

**Data**: 2026-08-04
**Escopo**: Duas frentes do roadmap Fase 2 (P1) do `CLAUDE.md`/`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` §3. Somente `server/` — nenhum arquivo de `client/` tocado.

### 1. Catálogo item×fornecedor (N:N) — já estava 100% pronto, sem trabalho novo

Levantamento confirmou que este item já tinha CRUD completo de ponta a
ponta (migration `20260803-000001-create-item-suppliers.cjs`, model
`ItemSupplier.ts`, use cases
`server/src/modules/items/application/use-cases/{List,Create,Update,Deactivate}ItemSupplierUseCase.ts`
+ `GetItemPurchaseHistoryUseCase.ts`, controller `itemController.ts`,
validators e rotas):

```
GET    /api/items/:id/suppliers
POST   /api/items/:id/suppliers
PUT    /api/items/:id/suppliers/:linkId
DELETE /api/items/:id/suppliers/:linkId
GET    /api/items/:id/purchase-history
```

Nenhuma alteração feita aqui — apenas confirmação por leitura direta do
código para não duplicar trabalho (item 1 da tabela de prioridades do
levantamento já estava marcado `feito` desde 2026-08-03, commit
`490d512`).

### 2. MRP fecha o ciclo — conversão plano → Ordem de Produção (gap real, implementado)

O ciclo MRP → Requisição de Compra (para itens `MATERIA_PRIMA`, de
compra) já existia (`ConvertPlannedOrdersToRequisitionUseCase.ts` +
auto-conversão opt-in via `items.conversao_automatica`, entregues em
2026-08-04 em rodada anterior). **Faltava o caminho irmão**: ordens
planejadas de itens de fabricação própria (`SUBCONJUNTO`/
`PRODUTO_ACABADO`) não tinham nenhuma forma de virar Ordem de Produção —
só o operador criando a OP manualmente do zero, sem nenhum vínculo com o
plano MRP que identificou a necessidade.

**Implementado:**

- `server/src/modules/mrp/application/use-cases/ConvertPlannedOrdersToProductionOrderUseCase.ts`
  (novo) — analogamente a `ConvertPlannedOrdersToRequisitionUseCase`:
  recebe uma lista de `planned_order_ids`, valida status convertível
  (`RASCUNHO`/`APROVADA`), valida que o item é de fabricação própria
  (rejeita `MATERIA_PRIMA` com `BusinessRuleError` orientando a usar a
  conversão para requisição), resolve o produto legado correspondente e
  cria **uma OP por ordem planejada** (diferente da requisição, que
  agrupa N ordens em 1 cabeçalho — OP não tem conceito de "OP
  consolidada"). Ao final, marca as ordens planejadas convertidas como
  `EM_EXECUCAO`, tudo na mesma transação Sequelize.
- `ItemRepository.findLegacyProductByItemId()` (novo método, interface +
  implementação Sequelize) — resolve o `product_id` (INTEGER, tabela
  legada `products`) correspondente a um `item_id` (UUID, tabela
  canônica `items`) por casamento de código/SKU
  (`items.codigo === products.code`). **Mesma estratégia dual-read já em
  uso** por `SequelizeItemRepository.listMrpInventoryPositions()` — não
  inventei um mecanismo novo, reaproveitei o que já existia.
- Rota nova: `POST /api/mrp/planned-orders/convert-to-production`
  (`authorizeModule('mrp', 'operate')`, mesmo nível de permissão da
  conversão para requisição), controller
  `mrpController.convertPlannedOrdersToProduction`, schema Zod
  `convertPlannedOrdersToProductionSchema` (idêntico em forma ao de
  requisição: `planned_order_ids[]` + `notes` opcional).

**Por que não reaproveitei `CreateProductionOrderUseCase` (rota normal
de OP) diretamente:** aquele use case valida disponibilidade de material
via `BomService.checkAvailability` (regra pensada para criação manual,
"não deixe o operador criar uma OP sem material"). Uma ordem vinda do
MRP já nasceu do cálculo de necessidade líquida contra estoque real —
recalcular disponibilidade aqui seria redundante e poderia bloquear
exatamente o caso de uso que a MRP existe para resolver (gerar a OP
*porque* falta material, não apesar disso). Segui o mesmo padrão do
helper de requisição (`createRequisitionFromPlannedOrders.ts`): criação
direta via repositório, sem duplicar regras de outro caminho de entrada.

### 3. Bug de schema real encontrado e corrigido no caminho (bloqueava TODA criação de OP, não só a nova rota)

Ao testar a conversão manualmente contra a API rodando (Docker), a
criação da primeira OP falhou com:

```
null value in column "start_date" of relation "production_orders" violates not-null constraint
```

**Causa raiz:** `server/src/models/ProductionOrder.ts` declarava
`start_date`, `completion_date`, `sales_order_id`, `responsible_id`,
`notes`, `created_by`, `item_id` **sem `allowNull: true` explícito**
(ex.: `start_date: DataTypes.DATEONLY` em vez de
`{ type: DataTypes.DATEONLY, allowNull: true }`). O Sequelize assume
`allowNull: false` por omissão. A migration baseline
(`20260731-000001-baseline-schema.cjs`) cria a tabela física lendo
exatamente `attribute.allowNull` do model via `getAttributes()` — o
resultado foi `NOT NULL` **sem default** em colunas que a entidade de
domínio (`ProductionOrderEntity.toCreatePersistence()`), a interface
TypeScript do próprio model (`string | null`) e todas as FKs
(`ON DELETE SET NULL`, que só faz sentido em coluna nullable) sempre
trataram como opcionais.

**Efeito real, confirmado ao vivo:** isso quebrava **também a rota
normal** `POST /api/production-orders` (`CreateProductionOrderUseCase`)
sempre que o payload não populava manualmente cada um desses 7 campos —
o caso comum de uma OP nova (planejada, sem `start_date` ainda, sem
venda/responsável/criador vinculado). Não era um bug introduzido por
esta entrega; a nova rota apenas foi o primeiro código a exercitar esse
caminho de criação de forma automatizada e revelar o problema pré-existente.

**Correção:**
- `server/src/models/ProductionOrder.ts` — `allowNull: true` explícito
  nos 7 campos.
- `server/migrations/20260804-000012-fix-production-orders-nullable-columns.cjs`
  (novo) — `ALTER TABLE production_orders ALTER COLUMN ... DROP NOT NULL`
  para as mesmas 7 colunas na tabela física já existente. Aplicada e
  validada contra o Postgres do Docker local (`evok-postgres`).

**Validação ao vivo pós-correção** (API rebuildada no Docker,
`evok-api`): criado item canônico + produto legado + BOM (`ItemEstrutura`)
de teste, gerado plano MRP demandando o item pai (gera ordem planejada
`RASCUNHO` para o subconjunto filho), convertido via
`POST /api/mrp/planned-orders/convert-to-production` → OP
`OP-2026-0001` criada com `product_id`/`item_id` corretos e ordem
planejada marcada `EM_EXECUCAO`. Confirmado também que a rota normal
`POST /api/production-orders` deixou de falhar por schema (passa a
falhar apenas pela regra de negócio esperada, "produto sem BOM legada
ativa", quando aplicável).

### Arquivos alterados/criados

- `server/src/modules/mrp/application/use-cases/ConvertPlannedOrdersToProductionOrderUseCase.ts` (novo)
- `server/src/modules/items/domain/repositories/ItemRepository.ts` (método `findLegacyProductByItemId`)
- `server/src/modules/items/infrastructure/sequelize/SequelizeItemRepository.ts` (implementação)
- `server/src/modules/mrp/presentation/controllers/mrpController.ts` (`convertPlannedOrdersToProduction`)
- `server/src/modules/mrp/presentation/validators/mrpValidators.ts` (`convertPlannedOrdersToProductionSchema`)
- `server/src/modules/mrp/presentation/routes/mrp.ts` (rota nova)
- `server/src/models/ProductionOrder.ts` (correção de nullability)
- `server/migrations/20260804-000012-fix-production-orders-nullable-columns.cjs` (novo)
- `server/tests/unit/mrp-convert-to-production-order.test.ts` (novo, 7 casos)

### Validação rodada

```
cd server && npm run typecheck        → sem erros
cd server && npm run test:unit        → 64 suítes, 456 testes, todos passando
cd server && npm run test:integration → mrp.test.ts e purchase-requisitions.test.ts
                                          passando contra API real (Docker);
                                          demais falhas pré-existentes de
                                          fixtures/estado de dados de outros
                                          módulos, não relacionadas a esta entrega
                                          (confirmado por leitura de log antes e
                                          depois da mudança)
```

Rebuild + restart do container `evok-api` (`docker compose build api && docker compose up -d api`)
e migration aplicada localmente via `DB_HOST=localhost npm run migration:up`
para validar a correção de schema contra o Postgres real do Docker.

### Riscos residuais

1. **`findLegacyProductByItemId` depende de código/SKU idêntico entre
   `items.codigo` e `products.code`.** Itens canônicos criados fora do
   backfill oficial (`02b_product_to_item.ts`) sem produto legado
   correspondente (ou com código divergente) não conseguem gerar OP via
   MRP — a `BusinessRuleError` resultante é clara e orienta o operador,
   mas não há fallback automático. Isso é o mesmo risco estrutural já
   documentado no levantamento como item 10 ("Unificar schema
   legado/novo") — não é uma regressão desta entrega, é a mesma bomba
   latente de sempre, agora tocada por um novo caminho de código.
2. **Migration `20260804-000012` não foi aplicada em nenhum ambiente
   além do Docker local desta sessão.** Antes do próximo deploy,
   confirmar que `npm run migration:up` roda limpo contra qualquer
   ambiente de staging/produção existente (o `down` desta migration
   reintroduz `NOT NULL`, mas não deve ser necessário — não há motivo de
   negócio para reverter esta correção).
3. Não existe endpoint/UI para disparar a conversão em lote a partir da
   tela `/production/mrp` (mesma pendência já registrada para a
   conversão em requisição — fica para o agente de frontend).

### O que QA/próximo agente deve testar

1. `POST /api/mrp/plan` com uma demanda cujo item raiz tenha BOM
   (`ItemEstrutura`) apontando para um item `SUBCONJUNTO`/`PRODUTO_ACABADO`
   — confirmar que a ordem planejada resultante do componente pode ser
   convertida via `POST /api/mrp/planned-orders/convert-to-production`.
2. Repetir o mesmo teste com um item `MATERIA_PRIMA` — confirmar que a
   conversão para OP é rejeitada com `422` e mensagem orientando o uso de
   `POST /api/mrp/planned-orders/convert` (requisição).
3. `POST /api/production-orders` (rota normal, fora do MRP) para um
   produto com BOM legada ativa — confirmar que a criação não falha mais
   por `start_date`/`completion_date`/etc. NOT NULL.
4. Rodar `npm run migration:status` em qualquer ambiente antes de aplicar
   `migration:up`, para confirmar que `20260804-000012` está `down` e
   será aplicada.

**Consolidado por**: Claude Code (Backend Engineer — Fase 2/P1 MRP + item×fornecedor)

---

## Correção — Rate-limit de login/API por conta (não por IP compartilhado) — 2026-08-04/05

### Problema relatado

Usuário reportou (com print) receber "Muitas requisições. Tente novamente
em 15 minutos." na tela de login sem ter feito muitas tentativas —
sensação de que o clique "não pegou" e travou o sistema.

### Causa raiz

`server/app.ts` usava `express-rate-limit` com a chave padrão (IP do
request) tanto no `authLimiter` (`/api/auth/login`, 10 tentativas/15min)
quanto no `apiLimiter` (`/api`, 100 requisições/15min). Numa fábrica com
~100-150 colaboradores atrás do mesmo IP público/NAT corporativo, essa
cota é **compartilhada por todo o prédio**: um colega errando a senha, ou
várias abas do ERP fazendo refetch (TanStack Query refetch-on-focus) ao
trocar de tela rapidamente, esgota a cota de todo mundo atrás daquele IP
por 15 minutos — mesmo digitando a senha certa depois.

### Correção

1. **`authLimiter`/`passwordRecoveryLimiter`** (login, forgot/reset
   password): chave composta `IP + email` normalizado
   (`loginAttemptKey`), via `ipKeyGenerator` do próprio
   `express-rate-limit` (IPv6-safe). Um usuário errando a senha não
   consome mais a cota dos colegas atrás do mesmo IP; um atacante
   testando N contas do mesmo IP ainda soma normalmente por conta visada
   (proteção de brute-force preservada).
2. **`apiLimiter`** (`/api` geral): chave por **usuário autenticado**
   (`apiRequestKey` decodifica — não verifica, a validação de assinatura
   real continua em `authenticate` — o `sub`/`id` do Bearer token e usa
   `user:<id>` como chave), caindo para IP só quando não há token
   decodificável. Teto subido de 100 para 300 req/15min (100 era baixo
   para um ERP com várias abas/queries em paralelo por usuário).
3. **Bug de ordenação corrigido no caminho:** os `app.use(<rota>,
   <limiter>)` estavam registrados **antes** de `app.use(express.json())`
   — `req.body` chegava sempre `undefined` nos limiters, então
   `loginAttemptKey` nunca conseguia ler `email` e todo login caía no
   fallback por IP (a correção acima não tinha efeito prático até esse
   reorder). Motivo do bug ser sutil de detectar sem teste real: nenhum
   teste automatizado existente exercita rate-limit end-to-end contra a
   API rodando (os testes de integração mockam ou rodam com
   `NODE_ENV=test`, que usa `max: 100000`).

### Validação

- `npx tsc --noEmit` limpo, `npm run test:unit` 64 suítes/456 testes
  passando (sem teste dedicado de rate-limit — nenhum existia antes;
  não adicionado nesta correção pontual, ver nota abaixo).
- Validado ao vivo contra o container Docker (`evok-api` rebuildado):
  conta A estourando 10 tentativas de login recebe `429` a partir da
  11ª; conta B, mesma máquina/IP, continua recebendo `401` normal
  (credencial inválida) sem herdar o bloqueio de A.

### Pendência para próximo agente

- Nenhum teste automatizado cobre o comportamento do rate-limit em si
  (nem antes, nem depois desta correção) — considerar um teste de
  integração dedicado que sobe a app real (não mockada) e bate
  `/api/auth/login` N+1 vezes com emails diferentes, confirmando
  isolamento de chave. Não foi adicionado nesta entrega por ser uma
  correção pontual e urgente (usuário bloqueado em produção/homolog).
- `TRUST_PROXY` continua exigindo configuração manual correta em
  produção atrás de proxy reverso (nginx/load balancer) — sem isso,
  `req.ip` é sempre o IP do proxy e a chave por IP (fallback) volta a
  colapsar todos os requests sem Bearer token válido em uma única chave.
  Não é um problema novo desta mudança, já documentado em
  `server/src/config/runtimeEnv.ts`.

**Consolidado por**: Claude Code (correção pontual, 2026-08-04/05)
**Data**: 2026-08-04

---

## Planejamento — Reorganização de menu por departamento + classificação de item (2026-08-05)

Sessão com o dono do produto revisou o menu lateral (departamentos
misturados: "Logística"/"Operações" deveriam ser um só; Requisições
longe de Compras; Relatórios genérico; Patrimônio sem departamento
próprio) e a modelagem de `Item`/`Asset`/documento fiscal (falta
categoria de uso-e-consumo/MRO e ativo imobilizado; devolução ao
fornecedor registrada mas sem consequência real; produto digital sem
onde existir no schema). Cada decisão foi validada contra prática de
mercado (SAP item master data, RMA/QMS, legislação fiscal NF-e/NFS-e)
antes de ser fechada — 2 pontos confirmados, 2 corrigidos (nem todo
software é Ativo; NFS-e não é "campo simples", é regime fiscal
diferente, mas escopo real da EVOK é só recebimento).

**Nenhum código foi alterado nesta sessão** — é planejamento puro. O
plano de execução completo, com todas as decisões e blocos técnicos
(schema → backend → frontend), está em
[`docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md`](TODO_REORGANIZACAO_DEPARTAMENTOS.md).
Qualquer agente retomando este trabalho deve começar lendo aquele
documento, não este resumo — ele é a fonte de verdade executável
(checkboxes por bloco, ordem de execução, ponto em aberto não
bloqueante).

**Consolidado por**: Claude Code (planejamento, 2026-08-05)

---

## Bloco A — Schema: classificação de item + ativo/licença + NF-e/NFS-e + módulos RBAC (2026-08-05)

Execução do "Bloco A — Schema" de
[`docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md`](TODO_REORGANIZACAO_DEPARTAMENTOS.md).
Todas as migrations abaixo já foram **aplicadas** no Postgres local
(`npm run migration:up`, dentro de `server/`). `npx tsc --noEmit` e
`npm run test:unit` passam limpos (64 suites, 456 testes).

### Migrations criadas (`server/migrations/`)

1. `20260805-000001-add-item-tipo-uso-consumo-ativo.cjs` — `ALTER TYPE
   "item_tipo" ADD VALUE` para `USO_E_CONSUMO` e `ATIVO_IMOBILIZADO`
   (enum físico chama-se `item_tipo`, não `enum_items_tipo` — foi criado
   via SQL raw na baseline `01_schema.sql`/`20260731-000001-baseline-schema.cjs`,
   diferente do padrão automático do Sequelize). Sem backfill, mesmo
   padrão de `20260803-000002-add-quarantine-lot-status.cjs` (raw query
   fora de transação, `down()` no-op documentado).
2. `20260805-000002-add-asset-type-license.cjs` — `ALTER TYPE
   "enum_assets_asset_type" ADD VALUE 'license'`.
3. `20260805-000003-add-asset-license-and-purchase-item.cjs` —
   `assets.license_expires_at` (DATEONLY nullable) e
   `assets.purchase_item_id` (INTEGER nullable, FK →
   `purchase_order_items.id`, `ON DELETE SET NULL`, índice
   `idx_assets_purchase_item_id`). **Desvio do enunciado do TODO**: o
   TODO cita a tabela como `purchase_items`, mas a tabela física real
   (ver `server/src/models/PurchaseItem.ts`, `tableName:
   'purchase_order_items'`) é `purchase_order_items` — a FK aponta para
   o nome real.
4. `20260805-000004-add-invoice-type-payable-and-purchase.cjs` —
   `accounts_payable.invoice_type` e `purchase_orders.invoice_type`,
   cada um com seu próprio enum Postgres nomeado pelo Sequelize
   (`enum_accounts_payable_invoice_type` /
   `enum_purchase_orders_invoice_type`), valores `'nfe'`/`'nfse'`,
   nullable, sem backfill. **Nota técnica importante para quem for criar
   migrations parecidas**: `addColumn` com `type: Sequelize.ENUM(...)`
   **e** `comment` juntos gera `unterminated quoted string` no Postgres
   local (Sequelize 6.37 monta `CREATE TYPE`/`ALTER TABLE`/`COMMENT ON
   COLUMN` como uma única string multi-statement que quebra). Correção
   aplicada: `addColumn` sem `comment`, e o comentário da coluna é
   setado depois via `COMMENT ON COLUMN ...` isolado (raw query simples).
5. `20260805-000005-add-asset-id-non-conformities.cjs` —
   `non_conformities.asset_id` (INTEGER nullable, FK → `assets.id`, `ON
   DELETE SET NULL`, índice `idx_non_conformities_asset_id`).

### `PurchaseRequisition.department_id` — já existia, nada a fazer

O item 4 do Bloco A (`PurchaseRequisition.department_id`) **já estava
implementado** desde a migration original de criação da tabela
(`20260802-000002-purchase-requisitions.cjs`): coluna INTEGER nullable
com FK `purchase_requisitions_department_id_fkey → departments(id) ON
DELETE SET NULL` já presente no banco, e o model
`server/src/models/PurchaseRequisition.ts` já declara o campo. **Nenhuma
migration nova foi criada para este item.**

Backfill não foi feito: as 8 requisições existentes no banco local têm
`department_id` NULL. Avaliação pedida no TODO (backfill via
`requester_id` → `Employee.department_id`) não foi executada nesta
entrega porque preencher dados históricos é decisão de aplicação/negócio
(potencialmente errada se o solicitante mudou de departamento depois da
requisição), não uma correção estrutural de schema — fica para quem
implementar o Bloco C (`CreatePurchaseRequisitionUseCase` passa a
preencher o campo automaticamente dali para frente; requisições antigas
continuam NULL, mesma lógica de "não forçar dado que não se tem" já
usada para `access_profile_id`).

### Models Sequelize atualizados

- `server/src/models/Item.ts` — `ItemTipo` ganhou `'USO_E_CONSUMO' |
  'ATIVO_IMOBILIZADO'`, `DataTypes.ENUM(...)` da coluna `tipo`
  atualizado na mesma ordem.
- `server/src/models/Asset.ts` — `asset_type` ganhou `'license'`;
  colunas `license_expires_at: string | null` e `purchase_item_id:
  number | null` adicionadas à interface e à definição.
- `server/src/models/AccountPayable.ts` e `server/src/models/Purchase.ts`
  — `invoice_type: 'nfe' | 'nfse' | null` adicionado a ambos.
- `server/src/models/NonConformity.ts` — `asset_id: number | null`
  adicionado à interface, à definição e aos `indexes` do model (mesmo
  padrão de `product_id`/`production_order_id`).
- `server/src/models/PurchaseRequisition.ts` — não modificado (campo já
  existia).

### Catálogo de módulos RBAC (`server/src/shared/domain/accessModules.ts`)

Adicionadas as chaves `manutencao` (label "Manutenção") e `garantia`
(label "Garantia/Assistência Técnica") ao tipo `AccessModuleKey` e à
lista `ACCESS_MODULES`, entre `patrimonio` e `rastreabilidade` (mesma
posição relativa do menu proposto no TODO). **Não é migration de
banco** — não há CHECK constraint no Postgres sobre
`access_profile_permissions.module` (validação é só em código, via
`isValidAccessModuleKey`), então não havia nada para alterar no schema
além do catálogo TypeScript. O SSOT agora tem 28 módulos (26 originais +
2 novos); comentário de cabeçalho do arquivo atualizado.

**Escopo explicitamente fora desta entrega** (fica para os blocos
seguintes, conforme o TODO): retrofit de `authorizeModule('manutencao'
| 'garantia', ...)` nas rotas de `maintenance.ts`/`serviceOrders.ts`
(Bloco D); qualquer lógica de negócio que reaja aos novos campos —
estorno de estoque/mudança de status de Asset na devolução ao
fornecedor (Bloco B), preenchimento automático de `department_id` em
requisições novas (Bloco C), telas de menu/formulário (Blocos E/F).

### Teste ajustado

`server/tests/unit/items-models.test.ts` — assertiva de
`Item.rawAttributes.tipo.values` atualizada para incluir os 2 valores
novos do enum (teste existente, não um teste novo criado para esta
entrega).

**Consolidado por**: Claude Code (AdmDBA, Bloco A, 2026-08-05)

---

## Bloco D — Backend: retrofit RBAC de Manutenção e Garantia (Concluída)

**Data**: 2026-08-05
**Escopo**: [`docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md`](TODO_REORGANIZACAO_DEPARTAMENTOS.md),
Bloco D. Depende do Bloco A (chaves `manutencao`/`garantia` já
adicionadas ao catálogo `server/src/shared/domain/accessModules.ts`).
**Status**: ✅ Concluído

### Resumo da feature

As rotas dos módulos `maintenance` (Manutenção) e `serviceOrders`
(Garantia/Assistência Técnica) ainda usavam o RBAC legado por papel
global (`authorize('admin', 'operator')`/`authorize('admin')`),
ignorando o sistema de perfis de acesso por área já retrofitado em
todos os outros módulos (`authorizeModule`). Este bloco troca os dois
roteadores para o padrão atual, usando exatamente a mesma estrutura já
aplicada ao módulo `patrimonio`
(`server/src/modules/assets/presentation/routes/assets.ts`, usado como
referência direta).

### Arquivos modificados

- `server/src/modules/maintenance/presentation/routes/maintenance.ts`
  — `authorize('admin', 'operator')`/`authorize('admin')` substituídos
  por `authorizeModule('manutencao', 'operate')` (create/update) e
  `authorizeModule('manutencao', 'approve')` (delete). GET (`list`,
  `getById`) passou a exigir `authorizeModule('manutencao')`, que antes
  não tinha nenhuma checagem de RBAC além de `authenticate` (qualquer
  usuário autenticado conseguia listar ordens de manutenção) — agora
  exige que o `AccessProfile` do usuário inclua o módulo `manutencao`
  (nível de leitura implícito, mesmo padrão de `assets.ts`).
- `server/src/modules/serviceOrders/presentation/routes/serviceOrders.ts`
  — mesmo retrofit, usando `authorizeModule('garantia', ...)` nos
  mesmos níveis. Mesma observação: GET antes só exigia `authenticate`,
  agora exige o módulo `garantia` no perfil.
- `server/tests/integration/rbac-maintenance-service-orders-access-denied.test.ts`
  (novo) — teste de regressão RBAC HTTP fim-a-fim (Supertest + servidor
  + PostgreSQL reais via `server/scripts/run-api-suite.cjs`), seguindo
  exatamente o padrão de
  `server/tests/integration/rbac-module-access-denied.test.ts`: cria um
  usuário `operator` com `AccessProfile` que só tem o módulo `vendas`
  (nunca `manutencao`/`garantia`) e confirma 403 `MODULE_ACCESS_DENIED`
  em GET/POST/PUT/DELETE de `/api/maintenance` e `/api/service-orders`,
  sem vazamento de dados (`response.body.data` undefined) e sem
  side-effects (nada é criado/alterado/removido); confirma também que
  o token admin do fixture da suíte segue autorizado (`GET` não retorna
  403) nos dois módulos.

### Documentações atualizadas

- `docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md` — Bloco D
  marcado `[x]` com nota de conclusão e resultado dos testes.
- `docs/governance/HANDOFF_CODEX.md` — esta entrada.

Nenhum JSDoc de model/schema/caso de uso precisou de atualização — não
houve mudança de regra de negócio, apenas troca do mecanismo de
autorização nas rotas (os cabeçalhos JSDoc dos próprios arquivos de
rotas foram atualizados para descrever o novo RBAC).

### Instruções de teste

1. `cd server && npx tsc --noEmit` — deve passar limpo.
2. `cd server && npm run test:unit` — 456/456 passando (nenhuma
   regressão).
3. `cd server && npm run test:integration:strict` — sobe a API própria
   na porta 3101 via `server/scripts/run-api-suite.cjs` (não usa os containers
   Docker `evok-api`/`evok-postgres`, que podem continuar rodando em
   paralelo sem conflito). O novo arquivo
   `rbac-maintenance-service-orders-access-denied.test.ts` deve mostrar
   10/10 testes passando. **Atenção**: nesta rodada, 7 suítes de
   integração não relacionadas a este bloco falharam (`clients-suppliers-financial-bom-validation`,
   `product-movement-concurrency`, `entity-photo-qrcode`,
   `bom-component-type-regression`, `sale-quote-confirm`,
   `sale-nfe-issuance`, `sale-cancel-concurrency`) — confirmado via
   `git diff --stat` que nenhuma delas toca em arquivo alterado por
   este bloco; a causa está em mudanças concorrentes de outros agentes
   (Blocos B/C, módulos `mrp`/`items`/`purchaseRequisitions`) rodando
   em paralelo no mesmo working tree. Não foram investigadas nem
   corrigidas aqui — ficam para quem estiver de posse desses blocos.
4. Validação manual opcional: logar como usuário cujo `AccessProfile`
   não inclui `manutencao`/`garantia` e confirmar 403 ao acessar
   `/api/maintenance` e `/api/service-orders`; logar como admin e
   confirmar acesso normal.

### Riscos residuais

- GET de `maintenance`/`serviceOrders` passou a exigir o módulo no
  perfil (antes bastava estar autenticado) — qualquer perfil de
  usuário em produção que dependa de acessar essas rotas sem o módulo
  `manutencao`/`garantia` atribuído explicitamente perderá acesso após
  o deploy. Nenhum perfil de acesso existente foi migrado/ajustado
  neste bloco (fora de escopo — é decisão de negócio de quem administra
  perfis, não uma correção estrutural).
- As 7 falhas de integração pré-existentes citadas acima permanecem
  não corrigidas; não bloqueiam este bloco mas bloqueiam um
  `test:integration:strict` 100% verde até os outros blocos em paralelo
  fecharem.

**Consolidado por**: Claude Code (Bloco D, 2026-08-05)
**Data**: 2026-08-05

---

## Bloco C — Backend: requisição por departamento (Concluída)

**Data**: 2026-08-06
**Escopo**: [`docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md`](TODO_REORGANIZACAO_DEPARTAMENTOS.md),
Bloco C. Depende do Bloco A (`PurchaseRequisition.department_id` já
existia desde a migration original da tabela, coluna + FK + model já
prontos — nenhuma migration nova neste bloco).
**Status**: ✅ Concluído

### Resumo da feature

Decisão do dono do produto: cada departamento (Logística, Produção,
Manutenção, Qualidade) tem sua própria fila de requisição de compra,
filtrada automaticamente por `department_id` — não uma fila única
global. Este bloco fecha a parte de backend: (1) `department_id` passa
a ser sempre resolvido a partir do `Employee` vinculado ao usuário
autenticado no momento da criação (nunca aceito do cliente, mesmo
raciocínio anti-spoofing já usado para `requester_id`/`approved_by`);
(2) o endpoint de listagem aceita `department_id` como filtro de query
para as telas por departamento do Bloco E.

### Arquivos modificados

- `server/src/modules/purchaseRequisitions/application/use-cases/CreatePurchaseRequisitionUseCase.ts`
  — passa a importar `Employee` de `models/index` (junto do já existente
  `EngineeringProject`) e resolver `department_id` via
  `Employee.findOne({ where: { user_id: input.requester_id } })` antes
  de montar o payload de `createRequisition`. Se o usuário autenticado
  não tiver `Employee` vinculado (ex.: admin sem cadastro de
  funcionário), `department_id` fica `null` e a requisição é criada
  normalmente — não é bloqueante. JSDoc do método `execute` atualizado
  explicando a regra.
- `server/src/modules/purchaseRequisitions/presentation/validators/purchaseRequisitionValidators.ts`
  — `department_id` **removido** de `createPurchaseRequisitionSchema`
  (não é mais aceito no body de criação; o schema é `.strict()`, então
  um body que envie `department_id` agora é rejeitado como campo
  desconhecido). `department_id` **adicionado** a
  `listPurchaseRequisitionQuerySchema` como filtro opcional de query
  (`z.coerce.number().int().positive().optional()`) — comentários
  explicam a distinção: no create é campo de identidade (nunca do
  cliente), na listagem é filtro de leitura (sem risco de spoofing).
- `server/src/modules/purchaseRequisitions/application/use-cases/ListPurchaseRequisitionsUseCase.ts`
  — `department_id` adicionado ao tipo `ListPurchaseRequisitionsInput` e
  repassado para `requisitionRepository.listRequisitions(...)`. JSDoc
  da classe atualizado.
- `server/src/modules/purchaseRequisitions/infrastructure/sequelize/SequelizePurchaseRequisitionRepository.ts`
  — `listRequisitions` aplica `where.department_id = filters.department_id`
  quando informado, mesmo padrão dos filtros existentes (`status`,
  `origin`, `requester_id`).
- `server/tests/unit/purchase-requisition-department.test.ts` (novo) —
  cobre: (a) criação preenche `department_id` a partir do `Employee`
  vinculado ao usuário logado; (b) valor de `department_id` enviado pelo
  cliente é ignorado (anti-spoofing) — o resultado final vem sempre do
  `Employee` resolvido; (c) `department_id` fica `null` quando o usuário
  autenticado não tem `Employee` vinculado; (d) listagem repassa o
  filtro `department_id` ao repositório; (e) listagem sem `department_id`
  não quebra e não filtra.
- `server/tests/unit/engineering-sample-requisition.test.ts` — ajustado
  para mockar `Employee.findOne` (resolvendo `null` por padrão) junto do
  mock já existente de `EngineeringProject`, já que o use case agora
  também chama `Employee.findOne` no fluxo de amostra de engenharia
  (mesmo `execute`, sem branch novo). Sem mudança de comportamento nos
  testes existentes, apenas o mock ficou completo — todos os 11 testes
  do arquivo continuam passando.

### Documentações atualizadas

- `docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md` — Bloco C
  marcado `[x]` com nota de conclusão e detalhamento por item.
- `docs/governance/HANDOFF_CODEX.md` — esta entrada.
- JSDoc atualizado diretamente em `CreatePurchaseRequisitionUseCase.ts`
  e `ListPurchaseRequisitionsUseCase.ts` (cabeçalhos de classe/método
  explicando a nova regra). Nenhum caso de uso de
  `docs/projeto/04-USE_CASES.md` precisou de alteração — este bloco é
  refinamento de como um campo já existente (`department_id`) é
  preenchido/filtrado, não uma regra de negócio nova documentada lá.

### Instruções de teste

1. `cd server && npx tsc --noEmit` — passou limpo.
2. `cd server && npm run test:unit` — 461/461 passando (nenhuma
   regressão; 456 pré-existentes + 4 novos deste bloco + 1 caso do
   arquivo de amostra de engenharia recontado por causa do mock extra).
3. Validação manual opcional: `POST /api/purchase-requisitions` com um
   usuário cujo `Employee.department_id` seja conhecido e confirmar que
   a requisição criada aponta o `department_id` correto mesmo sem
   enviar o campo no body (e que enviar `department_id` no body agora
   retorna 400 de payload inválido, campo desconhecido); `GET
   /api/purchase-requisitions?department_id=<id>` e confirmar que só
   retorna requisições daquele departamento.

### Riscos residuais

- As 8 requisições locais com `department_id` NULL citadas no Bloco A
  (criadas antes deste bloco) continuam `NULL` — nenhum backfill foi
  feito aqui (decisão do Bloco A, mantida: é aceitável, fila de
  departamento simplesmente não vai listar essas requisições antigas
  quando filtrada; ficam visíveis normalmente na listagem sem filtro).
- Usuários autenticados sem `Employee` vinculado (ex.: contas
  administrativas criadas direto em `users` sem registro em
  `employees`) sempre criam requisição com `department_id = null` — se
  o frontend do Bloco E decidir que toda tela de departamento **exige**
  `department_id` não-nulo para aparecer em alguma fila, esses usuários
  ficam de fora; não foi tratado aqui por ser decisão de UX do Bloco E.

**Consolidado por**: Claude Code (Bloco C, 2026-08-06)
**Data**: 2026-08-06

---

## Correção — Idempotência de migrations contra banco novo (achado ao isolar `server/.env.test`) — 2026-08-05

**Data**: 2026-08-05
**Escopo**: `server/migrations/*.cjs`
**Status**: ✅ Concluído

### Causa raiz

Ao investigar uma falha de segurança (a suíte de testes de integração
rodava contra o mesmo banco de desenvolvimento `erp_evok_audio` e
sobrescrevia a senha do admin real), criamos um banco isolado dedicado
a testes (`server/.env.test`, `DB_NAME=erp_evok_audio_test`) e tentamos
aplicar todas as migrations do zero contra ele
(`npx sequelize-cli db:migrate`).

Isso expôs um problema sistêmico pré-existente, sem relação com o bug
de segurança em si: a migration baseline
(`server/migrations/20260731-000001-baseline-schema.cjs`) cria tabelas
**dinamicamente a partir dos models Sequelize atuais** (lê
`dist/src/models/*.js` já buildado). Como consequência, um banco criado
HOJE do zero já nasce com todas as colunas/tabelas que os models
*atuais* definem — inclusive campos que só deveriam existir depois de
migrations posteriores (mais recentes) rodarem. A baseline não reflete
o estado histórico em que cada migration foi originalmente escrita;
reflete sempre o presente.

Resultado prático: qualquer migration posterior à baseline que faça
`createTable`/`addColumn`/`addConstraint`/`addIndex` assumindo que a
coluna/tabela ainda não existe falha com erro
`column/constraint/table "X" already exists` ao rodar contra um banco
novo — mesmo que essas mesmas migrations rodem sem problema no banco de
desenvolvimento existente (onde já foram aplicadas uma vez, em ordem,
há semanas).

Este bug é **anterior** e **independente** do achado de segurança do
`.env.test` — ele sempre existiu, só nunca havia sido testado (nenhum
banco havia sido recriado do zero desde que a baseline dinâmica foi
introduzida em 2026-07-31).

### Padrão de correção aplicado

Idempotência via checagem de existência antes de cada operação DDL:

1. Antes de `createTable('tabela', ...)`: checar
   `(await queryInterface.showAllTables()).includes('tabela')` — se já
   existe, pular a criação inteira da tabela (e das
   constraints/índices/seeds associados criados junto dela no mesmo
   bloco).
2. Antes de `addColumn('tabela', 'coluna', ...)`: checar
   `!(await queryInterface.describeTable('tabela')).coluna`.
3. Antes de `addIndex(...)`: checar se o nome já existe em
   `await queryInterface.showIndex('tabela')`.
4. Backfills de dados (INSERT/UPDATE) mantidos como estavam — já eram
   idempotentes por natureza (`ON CONFLICT DO NOTHING`,
   `WHERE coluna IS NULL`), confirmado caso a caso.
5. `down()` de cada migration preservado exatamente como estava — nada
   mudou em rollback, só no `up()`.

### Migrations corrigidas (6 arquivos)

- `server/migrations/20260803-000004-create-work-centers.cjs` — guard
  em `createTable('work_centers'/'work_center_shifts')`,
  `addColumn('production_route_steps', 'work_center_id')` e índice
  associado.
- `server/migrations/20260803-000008-create-access-profiles.cjs` —
  guard em `createTable('access_profiles'/'access_profile_permissions')`
  e `addColumn('users', 'access_profile_id')`; seed do perfil
  "Administrador Geral" isolado em função própria, chamada
  incondicionalmente (idempotente via `ON CONFLICT DO NOTHING`).
- `server/migrations/20260804-000001-create-warehouses.cjs` — guard em
  `createTable('warehouses'/'product_warehouse_stock')`,
  `addColumn('inventory_movements', 'warehouse_id')` e
  `addColumn('lot_controls', 'warehouse_id')` + índices associados.
- `server/migrations/20260804-000006-add-warehouse-id-to-inventory-counts.cjs`
  — guard em `addColumn('inventory_counts', 'warehouse_id')` e índice
  `idx_inventory_counts_warehouse_id`.
- `server/migrations/20260804-000011-add-supplier-quality-score.cjs` —
  guard em `addColumn('suppliers', 'quality_score')`.
- `server/migrations/20260805-000003-add-asset-license-and-purchase-item.cjs`
  — guard em `addColumn('assets', 'license_expires_at')`,
  `addColumn('assets', 'purchase_item_id')` e índice
  `idx_assets_purchase_item_id`.
- `server/migrations/20260805-000004-add-invoice-type-payable-and-purchase.cjs`
  — guard independente em `addColumn('accounts_payable', 'invoice_type')`
  e `addColumn('purchase_orders', 'invoice_type')` (cada um cria seu
  próprio tipo ENUM Postgres, `COMMENT ON COLUMN` movido para dentro do
  bloco condicional de cada coluna).
- `server/migrations/20260805-000005-add-asset-id-non-conformities.cjs`
  — guard em `addColumn('non_conformities', 'asset_id')` e índice
  `idx_non_conformities_asset_id`.

(8 arquivos ao todo — os 3 primeiros já haviam sido corrigidos em uma
etapa anterior desta mesma investigação, antes desta entrada de
handoff; os 5 seguintes foram corrigidos nesta rodada, ao continuar o
ciclo de recriar o banco `erp_evok_audio_test` do zero e reaplicar
migrations até não haver mais erro de "already exists".)

### Validação

1. Ciclo repetido de `DROP DATABASE erp_evok_audio_test` → `CREATE
   DATABASE erp_evok_audio_test OWNER evok_admin` →
   `DB_NAME=erp_evok_audio_test NODE_ENV=test npm run migration:up` até
   as 50 migrations aplicarem limpo do zero, sem nenhum erro
   `already exists`. `DB_NAME=erp_evok_audio_test npm run
   migration:status` confirma todas as 50 migrations como `up`.
2. `cd server && npx tsc --noEmit` — passou limpo (sem erros de tipo).
3. `cd server && npm run test:unit` (contra o banco de desenvolvimento
   normal `erp_evok_audio`, sem `DB_NAME` sobrescrito) — 67 suítes / 473
   testes, todos passando, nenhuma regressão introduzida pelas
   checagens de idempotência.
4. `cd server && npm run migration:status` no banco de desenvolvimento
   — todas as migrations continuam `up` (nada foi re-executado ali;
   as migrations já estavam aplicadas e o Sequelize não re-roda
   migrations já registradas em `SequelizeMeta`, então o guard de
   idempotência é só relevante para bancos novos, mas não altera o
   comportamento do banco existente).

### Riscos residuais / fora de escopo desta correção

- Não foi rodado `npm run test:integration` / `run-api-suite.cjs`
  contra `erp_evok_audio_test` nesta etapa — isso é validado por uma
  etapa separada da investigação de segurança do `.env.test`, fora do
  escopo desta entrada.
- Se novas migrations forem adicionadas no futuro seguindo o padrão
  antigo (sem guard de idempotência), o mesmo problema pode reaparecer
  para qualquer coluna/tabela que a baseline dinâmica já tenha
  absorvido até aquele momento. Recomenda-se que todo novo
  `addColumn`/`createTable`/`addIndex` em migrations siga o padrão
  estabelecido aqui (ou que a baseline deixe de ser dinâmica — decisão
  arquitetural maior, fora do escopo desta correção pontual).

**Consolidado por**: Claude Code (correção de idempotência de
migrations, 2026-08-05)
**Data**: 2026-08-05

---

## Auditoria de segurança — reset destrutivo de senha do admin via suíte de integração (2026-08-05)

### Incidente

O dono do produto ficou bloqueado da própria conta (`admin@evokaudio.com.br`,
"Email ou senha incorretos" mesmo digitando a senha correta) sem nenhum
aviso. Investigação encontrou a causa em minutos: `password_version`
incrementado e `updated_at` do usuário batendo exatamente com o horário em
que subagentes rodavam `npm run test:integration` em background para os
Blocos B/C/D de `docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md`.

### Causa raiz (2 problemas empilhados)

1. **`server/scripts/run-api-suite.cjs:108-116` (`ensureFixtures`)**
   buscava o usuário **pelo e-mail real** `admin@evokaudio.com.br` — o
   mesmo usado no dia a dia, não um usuário de teste sintético — e
   sobrescrevia senha/role via `.update()` direto no model Sequelize,
   fora de qualquer use case auditado (por isso zero rastro em
   `audit_logs`).
2. **Nenhum isolamento de banco entre dev e teste local.** `DB_NAME`
   sempre resolvia para `erp_evok_audio` (o banco de desenvolvimento
   real) independente de `NODE_ENV`; `run-api-suite.cjs` só
   sobrescrevia `NODE_ENV`/`PORT`/`N8N_WEBHOOK_SECRET` no `baseEnv`,
   nunca `DB_NAME`. O CI do GitHub Actions (`.github/workflows/server-ci.yml`)
   já usa um banco isolado (`erp_evok_audio_ci`) em container efêmero —
   o problema era exclusivo de execução local, onde ninguém garantia o
   mesmo isolamento.
3. **Nenhum guard impedia rodar contra produção.** Se alguém (ou um
   agente) rodasse este script com `.env` de produção copiado para
   debug local, o mesmo dano ocorreria em produção, sem aviso.

Auditoria completa rodada via agente `auditor-seguranca` confirmou mais
2 pontos correlatos (severidade menor): `mrp.test.ts`/`traceability.test.ts`
faziam login HTTP direto contra o admin real em vez de usar o
`TEST_AUTH_TOKEN` já injetado pela suíte; `password-recovery-and-session-revocation.test.ts`
disparava `forgot-password` contra o e-mail real sem necessidade.

### Correção aplicada

1. **Acesso restaurado imediatamente** — senha do admin real resetada
   direto no banco (bcrypt) para uma senha temporária informada ao
   dono, com instrução de trocar após o login.
2. **`server/.env.test` criado** (git-ignored, adicionado ao
   `.gitignore`) com `DB_NAME=erp_evok_audio_test` — banco Postgres
   separado, criado no mesmo container Docker local
   (`erp_evok_audio_test`, owner `evok_admin`). `run-api-suite.cjs`
   agora carrega `.env.test` com prioridade sobre `.env`.
3. **Guard duro em `run-api-suite.cjs` `main()`**: recusa rodar
   (`throw`) se `NODE_ENV === 'production'`, ou se `DB_NAME`/`DB_HOST`
   contiver `prod`, ou se `DB_NAME` não terminar em `_test`/`_ci`.
   Fecha tanto o vetor de produção quanto o de rodar sem isolamento
   local por esquecimento.
4. **`ensureFixtures` trocado para usuário sintético**: `User.findOrCreate`
   por `ci-admin@evok.local` (convenção `@evok.local` já usada em ~11
   outros arquivos de teste do projeto) em vez de buscar
   `admin@evokaudio.com.br`. Não há mais nenhum caminho pelo qual a
   suíte toca o usuário admin real.

### Efeito colateral descoberto e corrigido: idempotência de migrations

Isolar `.env.test` e criar o banco de teste do zero expôs um problema
sistêmico pré-existente e não relacionado à causa raiz acima — ver
entrada anterior "Correção — Idempotência de migrations contra banco
novo" nesta mesma seção do handoff (8 migrations corrigidas + 2 models
com `allowNull` implícito divergente da migration original —
`Product.photo_path`/`Asset.photo_path` agora explicitamente
`allowNull: true`, alinhado à migration `20260731-000020`).

### Validação

- `npx tsc --noEmit` limpo; `npm run test:unit` 67 suítes/473 testes
  passando.
- `node server/scripts/run-api-suite.cjs api` (suíte de integração completa)
  rodou contra `erp_evok_audio_test` do início ao fim — confirmado por
  leitura direta do banco que `admin@evokaudio.com.br` (banco de
  desenvolvimento real) **não** teve `updated_at`/`password_version`
  alterados durante a execução. 15 de 75 testes de integração falharam
  por fixtures/dados que o banco de teste novo não tem (produtos
  específicos que só existiam no banco de dev acumulado ao longo do
  projeto) — **não é regressão desta correção**, é esperado que um
  banco de teste isolado precise de fixtures completos que a suíte
  ainda assume via dados pré-existentes; fica como próximo passo, fora
  do escopo desta auditoria de segurança (o objetivo era eliminar o
  vetor de escrita destrutiva sobre a conta real, não fazer 100% dos
  testes de integração passarem contra base vazia).

### Pendências / próximos passos (não bloqueantes)

- `mrp.test.ts`/`traceability.test.ts` ainda fazem login HTTP com
  `admin@evokaudio.com.br` + `ADMIN_SEED_PASSWORD` — agora seguro
  porque roda contra `erp_evok_audio_test` (que tem seu próprio seed
  de admin, isolado do banco real), mas o ideal é migrar para
  `TEST_AUTH_TOKEN` como o resto da suíte, eliminando a dependência
  redundante.
- `password-recovery-and-session-revocation.test.ts` ainda usa o
  e-mail real no corpo da requisição `forgot-password` — mesma lógica,
  seguro pelo isolamento de banco, mas trocar por e-mail sintético é
  mais correto por princípio.
- Completar fixtures do banco de teste para os 15 testes de integração
  hoje falhando por dado ausente (produtos/BOM específicos que os
  testes assumem existir).
- Documentar `server/.env.test` no `README.md`/runbook do projeto, para
  que qualquer pessoa (não só quem participou deste incidente) saiba
  que precisa existir antes de rodar `test:integration` localmente.

**Consolidado por**: Claude Code (auditoria e correção de segurança,
2026-08-05)
**Data**: 2026-08-05

---

## Bloco F — Frontend: NF-e/NFS-e e licença de Ativo (2026-08-05)

**Escopo**: `docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md`, Bloco F.
Depende do Bloco A (schema já concluído — `AccountPayable.invoice_type`,
`Purchase.invoice_type`, `Asset.asset_type = 'license'`,
`Asset.license_expires_at`, `Asset.purchase_item_id`).

### O que foi feito

**Contas a Pagar** (`client/src/pages/financial/FinancialPage.tsx`):
- Novo campo `invoice_type` (select `SelectNative`, opções "NF-e
  (mercadoria)" / "NFS-e (serviço)", opcional) no formulário de criação
  de conta a pagar, com texto de apoio explicando o critério (NF-e =
  mercadoria/matéria-prima; NFS-e = serviço ou licença digital recebida
  de fornecedor — a EVOK só *recebe* NFS-e, não emite, então é
  classificação simples, sem integração de layout municipal).
- Nova coluna "Nota" na tabela de contas a pagar, exibindo um `Badge`
  com o tipo (ou "—" quando não informado).
- Valor vazio do select é normalizado para `undefined` antes do submit
  (evita mandar string vazia para um enum Zod no backend).

**Ativo/Patrimônio** (`client/src/pages/patrimonio/AssetsPage.tsx`):
- Novo valor `license` ("Licença de software") no seletor de tipo já
  existente (`asset_type`), reaproveitando o mesmo `SelectNative`.
- Campo `license_expires_at` (date picker) exibido apenas quando
  `asset_type === 'license'` (via `watch('asset_type')` do
  react-hook-form), com nota de apoio reforçando que só licença
  perpétua/multianual capitalizada deve virar Ativo (SaaS de curto
  prazo não).
- Nova coluna "Licença" na tabela, com `LicenseExpiryBadge` (helper
  local): `destructive` se já venceu, `warning` se vence em ≤30 dias
  (`LICENSE_EXPIRY_WARNING_DAYS`), texto neutro caso contrário. **Decisão
  técnica**: não foi reaproveitado `DidacticAlert`
  (`client/src/components/DidacticAlert.tsx`) — esse componente é
  desenhado para erros de mutation com estrutura `DidacticError`
  (título + motivos + ação corretiva, tipicamente produzido por
  `translateApiError`), não para um aviso informativo de prazo por linha
  de tabela. Um `Badge` (`variant="warning"`/`"destructive"`, já usado em
  outras telas do projeto) comunica o alerta de forma mais direta aqui,
  sem forçar semântica de erro sobre algo que não é um erro.
- `purchase_item_id` exibido como texto somente-leitura ("Origem: compra
  #N") abaixo da tag do ativo, quando presente — **não** editável pelo
  usuário nesta entrega, conforme decisão do Bloco A (o campo é
  preenchido por outro fluxo, ainda não implementado, que gera Ativo a
  partir de recebimento de compra).
- `AssetStatus` (tipo do client) ganhou `'returned_to_supplier'` (já
  existia no backend desde o Bloco B) com label "Devolvido ao
  fornecedor", para não deixar o tipo do client dessincronizado do enum
  real — sem UI adicional além do label na badge de status existente.

### Backend: passthrough que faltava (fora do Bloco A, mínimo e necessário)

O Bloco A criou coluna/schema, mas a camada de aplicação (Zod schema,
entidade de domínio, use case, controller) de Contas a Pagar e de Ativo
ainda não aceitava os novos campos — sem isso, os campos novos do
formulário seriam descartados silenciosamente pelo backend (schemas
`.strict()` no financeiro rejeitariam a requisição inteira; o use case
de Asset usa uma whitelist de campos que não incluía os novos). Ajustes:

- `server/src/modules/financial/presentation/validators/financialValidators.ts`
  — `createPayableSchema` ganhou `invoice_type: z.enum(['nfe', 'nfse']).optional()`.
- `server/src/modules/financial/domain/entities/AccountPayableEntity.ts`
  e `server/src/modules/financial/application/use-cases/CreatePayableUseCase.ts`
  — `invoice_type` propagado da entrada até `financialRepository.createPayable`.
- `server/src/modules/financial/presentation/controllers/financialController.ts`
  — `createPayable` desestrutura e repassa `invoice_type`.
- `server/src/modules/assets/application/use-cases/CreateAssetUseCase.ts`
  — `license_expires_at` adicionado ao input e propagado para
  `assetsRepository.create`.
- `server/src/modules/assets/application/use-cases/UpdateAssetUseCase.ts`
  — `license_expires_at` adicionado a `ALLOWED_FIELDS` (whitelist de
  campos editáveis via `PUT /api/assets/:id`).
- `purchase_item_id` **não** foi adicionado a nenhuma whitelist de
  escrita (create/update) — permanece somente-leitura no schema/model,
  como decidido no Bloco A; não há endpoint nem caminho de UI que o
  grave a partir desta entrega.
- `assetController.ts` não tem validação Zod própria (repassa `req.body`
  direto ao use case), então a whitelist do use case já é a única guarda
  — nenhuma mudança necessária ali.

### API client (`client/src/api/`)

- `financial.ts` — novo tipo `InvoiceType = 'nfe' | 'nfse'`;
  `AccountPayable.invoice_type` e `CreatePayableInput.invoice_type`
  adicionados (opcionais).
- `assets.ts` — `AssetType` ganhou `'license'`; `AssetStatus` ganhou
  `'returned_to_supplier'`; `Asset` ganhou `license_expires_at` e
  `purchase_item_id` (ambos opcionais, leitura); `AssetInput` ganhou
  `license_expires_at` (opcional, escrita).

### Validação

- `npx tsc --noEmit` limpo em `client/` e em `server/`.
- `npx oxlint` limpo nos arquivos tocados (`FinancialPage.tsx`,
  `AssetsPage.tsx`, `api/financial.ts`, `api/assets.ts`). Há um erro de
  parsing pré-existente em `client/src/pages/products/ProductsPage.tsx`
  (JSX fragment malformado) **não relacionado a este bloco** — arquivo
  sendo editado em paralelo por outro agente (Bloco E) no momento desta
  entrega; não foi tocado aqui.
- `npx vitest run` em `client/`: 7 arquivos de teste / 42 testes
  passando.

### O que o Agente QA (ou humano) deve testar na interface

1. **Contas a Pagar**: criar uma conta a pagar escolhendo "NF-e" e outra
   escolhendo "NFS-e"; confirmar que a coluna "Nota" reflete o valor
   escolhido após reload. Criar uma terceira sem escolher nada
   ("Não informado") e confirmar que não quebra a criação (campo é
   opcional) e a coluna mostra "—".
2. **Ativo — tipo licença**: criar um ativo com Tipo = "Licença de
   software"; confirmar que o campo "Vencimento da licença" aparece
   somente quando esse tipo está selecionado (alternar entre tipos no
   select e observar o campo aparecer/desaparecer antes de submeter).
   Preencher uma data no passado e confirmar badge vermelho ("Vencida em
   ..."); preencher uma data nos próximos 30 dias e confirmar badge
   amarelo ("Vence em Nd..."); data além de 30 dias deve mostrar texto
   neutro sem badge.
3. **Ativo — outros tipos**: confirmar que criar um ativo com tipo
   diferente de "license" não exige nem exibe o campo de vencimento, e a
   coluna "Licença" mostra "-" para esses ativos.
4. **`purchase_item_id`**: como ainda não há fluxo de UI que popule esse
   campo automaticamente, validar via API/seed manual (ou aguardar o
   fluxo de recebimento→ativo, fora de escopo aqui) que, quando presente,
   o texto "Origem: compra #N" aparece abaixo da tag na listagem.
5. Rodar contra `http://localhost:5173` (frontend) com backend Docker em
   `http://localhost:5000`, usuário com módulo `financeiro`/`patrimonio`
   habilitado no perfil de acesso.

**Consolidado por**: Claude Code (frontend, Bloco F)
**Data**: 2026-08-05

---

## Bloco E — Frontend: menu reorganizado (2026-08-05)

**Escopo**: `docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md`, Bloco E.
Depende dos Blocos A/C/D (schema, `department_id` automático em
`PurchaseRequisition`, RBAC de `manutencao`/`garantia`), todos já
concluídos.

### Menu (`client/src/layouts/AppLayout.tsx`)

`NAV_SECTIONS` reestruturado nas 9 seções finais: Logística (Produtos +
Estoque + Depósitos + Recebimento + Expedição + Requisições de Logística +
Relatórios de Logística), Vendas, Compras (+ Fornecedores + Fila de
aprovação + Relatórios de Compras), Produção (+ Chão de Fábrica + Centros
de Trabalho + MRP + Requisições de Produção + Relatórios de Produção),
Qualidade & Engenharia (+ Requisições de Qualidade), Manutenção (nova
seção), Ativos & Garantia (nova seção — Patrimônio + Garantia/Assistência
Técnica), Gestão (Financeiro + Relatórios Financeiros + Rastreabilidade),
Administração. "Produtos e estoque" mudou de rótulo para "Produtos"
(passa a viver dentro de Logística — o rótulo antigo já não fazia sentido
fora de "Operações"). `BREADCRUMBS` atualizado para as rotas
novas/movidas.

Novo badge `compras_devolucoes` no item "Compras" (`handoffs.compras.pending_returns`,
já exposto pelo backend desde o Bloco B, que deixou o consumo de frontend
explicitamente para este bloco).

### Rotas novas (`client/src/App.tsx`)

- `/maintenance` → `MaintenanceOrdersTab` (export nomeado, não default —
  `lazy(() => import(...).then(m => ({ default: m.MaintenanceOrdersTab })))`),
  guardada por `ModuleRoute module="manutencao"`.
- `/service-orders` → `ServiceOrdersTab` (mesmo padrão de export nomeado),
  guardada por `ModuleRoute module="garantia"`, rotulada no menu "Garantia
  / Assistência Técnica".
- `/logistics/requisitions`, `/production/requisitions`,
  `/quality/requisitions`, `/maintenance/requisitions` → requisição por
  departamento (ver seção própria abaixo).
- `/reports` trocou de guarda: era `ModuleRoute module="relatorios.producao"`
  (bloqueava quem só tinha acesso a Compras/Custos/Financeiro), agora é o
  novo `AnyModuleRoute` (`client/src/routes/ProtectedRoute.tsx`) com os 4
  módulos de relatório — libera se o usuário tiver QUALQUER um deles,
  já que a própria página se auto-filtra por aba.

### Relatórios: decisão de manter página única + deep-link (não 4 páginas)

`ReportsPage.tsx` continua uma única página com abas, não foi quebrada em
telas separadas por departamento. Razão: as 3 (agora 4) visualizações
compartilham quase todo o layout (tiles de KPI + tabelas + filtro de
período) — separar em arquivos distintos duplicaria esse layout sem
ganho real, e o backend já expõe os 4 módulos de RBAC
(`relatorios.producao/compras/custos/financeiro`) que bastam para
controlar visibilidade dentro da página existente. Implementação:

- Cada aba (`production`/`purchasing`/`costs`/`financial`) só aparece se
  `hasModuleAccess(TAB_MODULE[aba])` (ou `admin`/fallback de rede).
- Deep-link via querystring: `?tab=production|purchasing|costs|financial`,
  lido de `useSearchParams` no mount e escrito de volta a cada troca de
  aba (não quebra o botão voltar do navegador).
- Cada seção do menu linka direto para a aba certa: "Relatórios de
  Logística"/"Relatórios de Compras" → `/reports?tab=purchasing`,
  "Relatórios de Produção" → `?tab=production`, "Relatórios Financeiros"
  → `?tab=financial`. Não existe uma 5ª aba de "custos" no menu — Custos
  fica acessível só por quem tem o módulo mas não tem item de menu
  dedicado (é uma sub-visão de Compras/Financeiro na prática atual).
- Nova aba "Financeiro" (fluxo de caixa agregado — total de vendas, total
  de compras, saldo): o endpoint `GET /api/reports/cash-flow` já existia
  no backend (`relatorios.financeiro`) mas não tinha nenhum consumidor no
  frontend antes desta entrega. Adicionado `getCashFlowReport` em
  `client/src/api/reports.ts`.

### Cadastro de item: nova aba "Uso e consumo / Ativo" em `ProductsPage.tsx`

Novo componente `client/src/pages/products/UsageItemsTab.tsx`, acessado
por um toggle de 2 abas no topo de `ProductsPage.tsx` ("Matéria-prima e
produção" / "Uso e consumo / Ativo"). Decisão técnica: usa o `Item`
mestre (`/api/items`, `POST /api/items`), **não** o modelo `Product`
legado que a aba principal usa — `Product.product_type` (enum
`finished/semi_finished/component/raw_material`) não tem os 2 valores
novos, e o handoff de arquitetura (`docs/governance/HANDOFF_CODEX.md`, migração
Product→Item) já trata `Item` como o núcleo real de MRP/BOM, com `Product`
em dual-read fora de sincronia estrutural. Consequência aceita: os dois
cadastros (Produto e Item de uso/ativo) não compartilham código-fonte de
formulário, mas também não competem pelo mesmo model — cadastro de
matéria-prima/produto acabado continua 100% inalterado.

**Correção de backend necessária dentro deste bloco** (sem ela o cadastro
seria rejeitado com 400 mesmo com o schema do banco já aceitando os 2
valores novos desde o Bloco A):
`server/src/modules/items/presentation/validators/itemValidators.ts` —
`createItemSchema.tipo` e `listItemsQuerySchema.tipo` ainda listavam só 3
dos 5 valores de `ItemTipo` (`MATERIA_PRIMA`/`SUBCONJUNTO`/
`PRODUTO_ACABADO`), faltando `USO_E_CONSUMO`/`ATIVO_IMOBILIZADO` — Zod
`.strict()` rejeitava qualquer um dos dois valores novos no `POST
/api/items`. Corrigido para os 5 valores em ambos os schemas.

Novo helper no client: `createItem` em `client/src/api/items.ts`
(`POST /api/items`), `ItemType` estendido com os 2 valores novos.

### Requisição por departamento (Logística/Produção/Manutenção/Qualidade)

Componente compartilhado `client/src/pages/shared/DepartmentRequisitionsPage.tsx`
(lista + criação, sem a aprovação/conversão em pedido de compra — isso
continua exclusivo de `RequisitionsPage.tsx`/Compras) + 4 páginas finas
que só passam título/descrição/`origin`:
`client/src/pages/logistics/LogisticsRequisitionsPage.tsx`,
`client/src/pages/production/ProductionRequisitionsPage.tsx`,
`client/src/pages/maintenance/MaintenanceRequisitionsPage.tsx`,
`client/src/pages/quality/QualityRequisitionsPage.tsx`.

Cada uma resolve o `department_id` do usuário logado via novo hook
`client/src/hooks/useMyDepartment.ts` e passa como filtro de leitura
(`?department_id=`, já suportado pelo backend desde o Bloco C) para
`listPurchaseRequisitions`. **Pequena adição de backend necessária**: o
hook resolve o departamento chamando `GET /api/employees?user_id=<id do
usuário logado>`, mas `user_id` não era um filtro aceito por
`ListEmployeesUseCase`/`SequelizeEmployeesRepository.findAndCountAll` (só
`department_id`/`status`/`search` existiam) — adicionado como filtro de
leitura simples (mesmo raciocínio de "filtro não é spoofing" já
documentado para `department_id` em
`purchaseRequisitionValidators.ts`/`ListPurchaseRequisitionsUseCase` no
Bloco C). Usuário sem `Employee` vinculado recebe `departmentId: null` e a
tela lista sem filtro (nunca trava por falta de vínculo).

`client/src/api/purchaseRequisitions.ts` ganhou `department_id`/`origin`
em `RequisitionListParams` e `department_id`/`department` em
`PurchaseRequisition` (já retornados pelo backend, só não tipados no
client). `client/src/api/employees.ts` ganhou `user_id` em
`ListEmployeesParams`.

### Sincronização de tipos frontend↔backend (achados durante o bloco)

- `client/src/api/accessProfiles.ts` (`AccessModuleKey`) estava
  desatualizado — faltavam `manutencao`/`garantia`, já existentes no
  catálogo do backend (`accessModules.ts`) desde o Bloco A. Sem essa
  sincronização, `hasModuleAccess('manutencao')` no client nunca
  compilaria/funcionaria corretamente. Corrigido (28 módulos, igual ao
  backend).
- `client/src/api/dashboard.ts` (`DashboardHandoffsSummary`) não tinha
  `compras.pending_returns` (Bloco B já retornava no JSON, mas o tipo
  client não sabia) — adicionado.

### Testes

- `client/src/routes/ProtectedRoute.test.tsx` ganhou 3 testes novos: (1)
  `ModuleRoute` bloqueia `/maintenance` para usuário sem o módulo
  `manutencao` no perfil; (2) `ModuleRoute` libera `/maintenance` para
  quem tem o módulo; (3) novo `AnyModuleRoute` libera `/reports` com
  apenas 1 dos módulos de relatório informados (OR, não AND).
- Novo componente `AnyModuleRoute` em `client/src/routes/ProtectedRoute.tsx`
  (variante de `ModuleRoute` para múltiplos módulos aceitáveis).

### Validação

- `npx tsc --noEmit` limpo em `client/` e `server/`.
- `npm run lint` (oxlint) em `client/`: só os 4 warnings pré-existentes
  de `only-export-components` (arquivos não tocados neste bloco), nenhum
  erro novo.
- `npx vitest run` em `client/`: 7 arquivos / 45 testes passando (42
  pré-existentes + 3 novos de `ProtectedRoute.test.tsx`).
- `npm run test:unit` em `server/`: 473/473 passando (nenhuma regressão
  nos módulos `items`/`employees` tocados).
- Backend confirmado de pé (`GET /health/ready` → `status: ready`) e
  frontend servindo em `http://localhost:5173` durante a validação.

### O que o Agente QA (ou humano) deve testar na interface

1. **Menu**: logar como `admin` e conferir as 9 seções na ordem/rótulos
   descritos acima; confirmar que "Manutenção" e "Ativos & Garantia" só
   aparecem para perfis com os módulos `manutencao`/`garantia`
   atribuídos (criar um perfil de teste sem esses módulos e confirmar que
   as seções somem do menu).
2. **`/maintenance`**: abrir uma ordem de manutenção vinculada a um Ativo
   existente; confirmar que a tela é a mesma `MaintenanceOrdersTab` que já
   existia (sem regressão funcional, só ganhou rota de menu).
3. **`/service-orders`**: mesmo teste para `ServiceOrdersTab`, acessível
   pelo item "Garantia / Assistência Técnica".
4. **Relatórios**: clicar em "Relatórios de Produção" (menu Produção) e
   confirmar que abre `/reports` já na aba "Produção"; repetir para
   "Relatórios de Compras" (Logística ou Compras) e "Relatórios
   Financeiros" (Gestão, aba "Financeiro" — novo, confirmar que mostra
   total de vendas/compras/saldo do período). Testar com um usuário que só
   tem `relatorios.compras` no perfil: deve conseguir abrir `/reports`
   (antes bloqueava 403) e ver só a aba "Compras".
5. **Cadastro de item — Uso e consumo**: em Produtos, clicar na aba "Uso e
   consumo / Ativo"; criar um item com tipo "Uso e consumo (MRO)" (ex.:
   "Luva de proteção") e outro "Ativo imobilizado"; confirmar que nenhum
   dos dois aparece na aba "Matéria-prima e produção" (listagem
   principal) e que ambos aparecem na aba nova, com badge do tipo
   correto.
6. **Requisições por departamento**: logar com um usuário vinculado (via
   `Employee.user_id`) a um departamento de Produção; abrir "Requisições
   de Produção" e confirmar que só requisições desse departamento
   aparecem; criar uma requisição nova por ali e confirmar que ela some
   também na fila de aprovação de Compras (`/purchases/requisitions`,
   inalterada) com o departamento correto preenchido. Repetir com um
   usuário sem `Employee` vinculado e confirmar que a tela não trava
   (lista sem filtro de departamento).
7. Rodar contra `http://localhost:5173` (frontend) com backend Docker em
   `http://localhost:5000`.

**Consolidado por**: Claude Code (frontend, Bloco E)

---

## Toggle de conversão automática do MRP (`conversao_automatica`) — frontend

**Data**: 2026-08-05
**Escopo**: UI para o opt-in `items.conversao_automatica` (roadmap pós-Go-Live item 3,
`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` seção 3). Consome o endpoint novo
`PATCH /api/items/:id` (`authenticate` + `authorizeModule('produtos', 'operate')`).
**Status**: ✅ Concluído (só frontend — backend já existia)

### Decisão de onde colocar o toggle
`server/src/modules/mrp/application/mrpEngine.ts` só considera itens
`MATERIA_PRIMA | SUBCONJUNTO | PRODUTO_ACABADO` na geração de ordens planejadas —
itens `USO_E_CONSUMO`/`ATIVO_IMOBILIZADO` (listados em `UsageItemsTab.tsx`) nunca
entram no MRP, então colocar o toggle lá seria enganoso. Esses três tipos
elegíveis correspondem hoje ao modelo legado `Product` (não ao cadastro direto de
`Item` usado por `UsageItemsTab`), e a única tela que já resolve o `Item` mestre
correspondente a um `Product` é o painel "Fornecedores" (`ProductSuppliersDialog`,
dentro de `ProductsPage.tsx`) — ele já faz `GET /api/items?search=<code>` para achar
o item. O toggle foi adicionado ali, num bloco "Conversão automática no MRP" acima
da lista de vínculos de fornecimento.

### Arquivos modificados
- `client/src/api/items.ts` — campo `conversao_automatica?: boolean` no tipo `Item`;
  novo `UpdateItemInput` e `updateItem(id, input)` (`PATCH /api/items/:id`).
- `client/src/pages/products/ProductsPage.tsx` — em `ProductSuppliersDialog`:
  - `canWrite` via `useAuth().hasRole('admin', 'operator')` (mesmo padrão RBAC de UI
    do resto da tela) controla se o checkbox fica habilitado.
  - `useMutation` (`toggleAutoConvertMutation`) chama `itemsApi.updateItem`,
    invalida `['item-by-code', product?.code]` no sucesso.
  - Erro tratado com `translateApiError` + `<DidacticAlert />` (padrão UC-43, mesmo
    usado em `WarehousesPage.tsx`).
  - Texto de ajuda curto explicando a implicação: liga = requisição de compra
    automática sem revisão humana; desliga (padrão) = conversão manual.

### O que o Agente QA (ou humano) deve testar na interface
1. Logar como `admin`/`operator`, ir em Produtos → linha de um produto
   matéria-prima/subconjunto/produto acabado → botão "Fornecedores".
2. Confirmar que o bloco "Conversão automática no MRP" aparece acima dos
   vínculos de fornecimento, com o checkbox refletindo o estado atual do item
   (`conversao_automatica`).
3. Ligar o checkbox; confirmar que persiste após fechar/reabrir o painel (refaz
   `GET /api/items?search=`) e que uma ordem planejada do MRP para esse item passa
   a ser convertida automaticamente em requisição (`POST /api/mrp/plan`).
4. Logar com um usuário sem papel `admin`/`operator` (ex.: `financial`) e
   confirmar que o checkbox aparece desabilitado (não interativo).
5. Simular erro de rede/servidor (ex.: backend fora do ar) e confirmar que o
   `DidacticAlert` aparece com mensagem amigável, sem stack trace.
**Data**: 2026-08-05

---

## Correção de bugs reais: dual-read `item_id` em `POST/GET /api/inventory/movements`

**Data**: 2026-08-05
**Escopo**: dois bugs reais encontrados durante leitura de código para ativação
do TypeScript strict mode, no módulo `inventory` (`server/src/modules/inventory`).
**Status**: ✅ Concluído (GET e POST)

### Resumo da feature

1. **`GET /api/inventory/movements`** — `ListInventoryMovementsUseCase.execute`
   recebia `item_id` no input (já tipado) mas nunca o repassava para
   `inventoryRepository.listMovements`, que já sabia filtrar por ele
   (dual-read implementado em `SequelizeInventoryRepository.listMovements`).
   O filtro era silenciosamente ignorado. **Corrigido**: `item_id` agora é
   desestruturado e repassado.

2. **`POST /api/inventory/movements`** — `createInventoryMovementSchema`
   (Zod `.strict()`) não declarava `item_id` no shape, só `product_id`
   (obrigatório). Qualquer request com `item_id` no body era rejeitada com
   400 antes de chegar ao use case, apesar do comentário do controller
   afirmar suporte a `item_id` (dual-read). **Investigação prévia à
   implementação** (ver decisão abaixo): encontrado um crosswalk seguro e já
   estabelecido em produção — `ItemRepository.findLegacyProductByItemId`
   (`SequelizeItemRepository.ts`), que resolve `item_id` (UUID) →
   `Product` legado pelo casamento de código (`items.codigo === products.code`),
   já usado por `ConvertPlannedOrdersToProductionOrderUseCase` (módulo MRP)
   para fechar o ciclo MRP → Ordem de Produção. **Corrigido** reaproveitando
   esse mesmo padrão: `createInventoryMovementSchema` agora aceita `item_id`
   como alternativa a `product_id` (XOR via `.refine()` — exatamente um dos
   dois, nunca os dois, nunca nenhum), e `CreateInventoryMovementUseCase`
   resolve `item_id` → `product_id` ANTES de seguir o fluxo normal (lock
   pessimista, saldo por depósito, `InventoryService.adjust`), que permanece
   100% acoplado a `Product` — **nenhum caminho de estoque paralelo foi
   criado**. Se o item não tiver `Product` correspondente, a requisição é
   rejeitada com `BusinessRuleError` (422), mensagem didática explicando a
   limitação (movimentação manual por `item_id` puro ainda não suportada
   para itens novos sem vínculo legado).

   Como efeito colateral positivo, `InventoryService.adjust` ganhou um 8º
   parâmetro opcional `itemId` (default `null`, não quebra nenhum dos 4
   chamadores existentes) para gravar o `item_id` de origem no
   `InventoryMovement` criado (`inventory_movements.item_id`, coluna já
   existente no schema, sempre `null` neste fluxo antes desta correção) —
   preserva rastreabilidade sem afetar nenhum saldo.

### Decisão da Parte 2 (a mais delicada) — por que foi seguro implementar

- `InventoryService.adjust` continua operando **exclusivamente** sobre
  `Product`/`products.quantity` — não foi alterado o hot path do MRP nem
  criado nenhum caminho de estoque baseado em `Item` diretamente.
- A resolução `item_id → product_id` usa uma função **já em produção**
  (`findLegacyProductByItemId`, chamada pelo módulo MRP desde antes desta
  tarefa) — não foi inventado um crosswalk novo. É o mesmo padrão de
  "casamento por código" documentado em
  `ItemRepository.findLegacyProductByItemId` (JSDoc já existente).
  IMPORTANTE: essa é uma crosswalk diferente (e mais confiável) da usada em
  `CreateInventoryCountUseCase.findProductById`, que na verdade faz
  `Product.findByPk(id)` com o próprio `item_id`/`product_id` recebido — ou
  seja, quando alimentada com um UUID de `item_id`, não faz nenhum
  casamento real (`Product.id` é INTEGER, então a busca por PK com uma
  string UUID nunca bate) e teria retornado `NotFoundError` sempre que
  usada com `item_ids`. Esse é um bug pré-existente e diferente, fora do
  escopo desta tarefa (não mexido), documentado aqui apenas para não ser
  confundido com o crosswalk correto usado nesta correção.
- Ausência de crosswalk (`Product` não encontrado) resulta em erro 422
  claro, sem inventar um caminho de estoque alternativo.
- `product_id` sozinho continua funcionando exatamente como antes (testado).

### Arquivos alterados
- `server/src/modules/inventory/application/use-cases/ListInventoryMovementsUseCase.ts`
  — `item_id` desestruturado e repassado ao repositório; JSDoc de bug removido.
- `server/src/modules/inventory/presentation/validators/inventoryValidators.ts`
  — `createInventoryMovementSchema`: `product_id` passou a opcional, `item_id`
  adicionado como alternativa opcional, `.refine()` XOR.
- `server/src/modules/inventory/application/use-cases/CreateInventoryMovementUseCase.ts`
  — resolução `item_id → product_id` via `SequelizeItemRepository.findLegacyProductByItemId`;
  `BusinessRuleError` (422) quando não há produto correspondente; `item_id`
  original repassado a `InventoryService.adjust` para gravação em
  `InventoryMovement.item_id`.
- `server/src/services/inventoryService.ts` — `adjust()` e `createMovement()`
  ganharam parâmetro opcional `itemId`/`item_id` (aditivo, não quebra
  chamadores existentes).
- `server/tests/unit/inventory-movements-dual-read.test.ts` (novo) — 9 testes
  cobrindo: passthrough de `item_id` no `ListInventoryMovementsUseCase`;
  validação XOR do schema Zod; resolução `item_id → product_id` no
  `CreateInventoryMovementUseCase` (sucesso, 422 sem crosswalk, fluxo legado
  inalterado por `product_id`).

### Documentações atualizadas
- `server/src/modules/inventory/README.md` — nova seção "Dual-read `item_id`
  em `POST/GET /api/inventory/movements`"; tabela de endpoints atualizada;
  assinatura documentada de `InventoryService.adjust` atualizada com os dois
  parâmetros opcionais novos.
- `docs/database/DATABASE.md` — tabela `inventory_movements` atualizada: linha nova
  `item_id`, e colunas que já existiam no model mas estavam ausentes da
  doc (`warehouse_id`, `unit_cost`) adicionadas para não ficar incompleta
  justamente na tabela tocada por esta correção.
- JSDoc revisado em: `ListInventoryMovementsUseCase.ts`,
  `CreateInventoryMovementUseCase.ts`, `inventoryValidators.ts`,
  `inventoryService.ts` (`adjust`, `createMovement`).

### Instruções de teste para o próximo agente/humano

1. **Automatizado (já validado nesta tarefa)**:
   - `cd server && npx tsc --noEmit` → sem erros.
   - `npx jest tests/unit/inventory-movements-dual-read.test.ts` → 9/9 passam.
   - `npx jest --testPathPatterns="tests/unit"` → 491/491 passam (suíte
     completa, sem regressão).
2. **Manual/integração (requer Postgres + servidor rodando, gate
   `hasIntegrationPrerequisites()` de `tests/integration/*`)**:
   - `POST /api/inventory/movements` com `{ product_id, type, quantity,
     description }` (sem `item_id`) → continua funcionando exatamente como
     antes (200/201, saldo do produto e do depósito atualizados).
   - `POST /api/inventory/movements` com `{ item_id: '<uuid de um Item cujo
     codigo bate com o code de um Product ativo>', type, quantity,
     description }` → 201, `InventoryMovement` criado com `product_id`
     resolvido e `item_id` preenchido; saldo do produto/depósito
     correspondente é ajustado.
   - `POST /api/inventory/movements` com `item_id` de um Item **sem**
     `Product` correspondente (`codigo` não bate com nenhum `products.code`)
     → 422 com mensagem clara, nenhuma alteração de estoque.
   - `POST /api/inventory/movements` com `product_id` E `item_id` juntos, ou
     nenhum dos dois → 400 (Zod).
   - `GET /api/inventory/movements?item_id=<uuid>` → retorna apenas
     movimentações daquele item (filtro efetivamente aplicado, incluindo as
     novas geradas pelo fluxo acima).

### Riscos residuais
- `CreateInventoryCountUseCase.findProductById` tem um bug de crosswalk
  diferente e pré-existente (busca `Product.findByPk` com o próprio
  `item_id`/`product_id` recebido, sem casamento por código) — não é
  exercitado hoje porque a tela de contagem cíclica ainda não envia
  `item_ids` na prática, mas deve ser corrigido numa tarefa futura dedicada
  (reaproveitando `findLegacyProductByItemId`, mesmo padrão desta correção).
  Não mexido aqui por estar fora do escopo desta tarefa (POST/GET
  `/inventory/movements`).
- Testes de integração reais (`stock-concurrency.test.ts`,
  `product-movement-concurrency.test.ts`) não foram executados nesta sessão
  por dependerem de Postgres/servidor rodando (`hasIntegrationPrerequisites()`
  → skip local); recomenda-se rodá-los no pipeline/CI ou localmente com
  Docker Compose antes do próximo Go-Live check.

---

## Retrofit Clean Architecture — Isolamento de repository (fatia 1/3: items, purchaseRequisitions, users, webhooks)

**Data**: 2026-08-05
**Escopo**: Um dos 22 use cases identificados que ainda importavam
`models/index` diretamente (bypass do padrão `repository` injetado). Esta
sessão cobriu a fatia de 4 use cases em 4 módulos (`items`,
`purchaseRequisitions`, `users`, `webhooks`); outras duas fatias (mais 18
use cases, em outros módulos) foram trabalhadas em paralelo por outros
agentes na mesma sessão — ver `git log`/diff para o conjunto completo.
**Status**: ✅ Concluído (zero mudança de comportamento; typecheck e testes
unitários relacionados passando)

### Motivação
Use cases da camada `application/` devem depender apenas de interfaces
`domain/repositories/*`, nunca de models Sequelize (`models/index`)
diretamente — isso é o que permite testar regra de negócio com mocks
simples, sem tocar banco. 22 use cases no projeto ainda violavam essa
regra. Esta é a fatia de 4 desses use cases.

### O que foi feito, por módulo

1. **`items` — `CreateItemSupplierUseCase`**
   - Estendido `ItemSupplierRepository` (domain) com
     `findSupplierById(supplierId)` — leitura auxiliar cross-module (o
     model `Supplier` pertence ao módulo `suppliers`, não a `items`; nome
     escolhido para deixar essa fronteira explícita).
   - Implementado em `SequelizeItemSupplierRepository.findSupplierById` —
     mesma query (`Supplier.findByPk`).
   - Use case trocou `Supplier.findByPk(...)` (import direto de
     `models/index`) por `this.itemSupplierRepository.findSupplierById(...)`.
     Controle de transação Sequelize (`sequelize.transaction()`) preservado
     sem alteração — `sequelize` continua importado de `models/index` só
     para isso, como já era.
   - Controller (`itemController.ts`) não precisou de alteração — já
     injetava `itemSupplierRepository` no construtor do use case.

2. **`purchaseRequisitions` — `CreatePurchaseRequisitionUseCase`**
   - Estendido `PurchaseRequisitionRepository` (domain) com
     `findEngineeringProjectById(id, transaction)` e
     `findEmployeeByUserId(userId, transaction)` — leituras auxiliares
     cross-module (`EngineeringProject` pertence a `engineering`,
     `Employee` a `employees`).
   - Implementado em `SequelizePurchaseRequisitionRepository` — mesmas
     queries (`EngineeringProject.findByPk`, `Employee.findOne` com
     `attributes: ['id', 'department_id']`).
   - Use case trocou os dois `require('../../../../models/index')` por
     chamadas ao `this.requisitionRepository`. Controller já injetava
     `requisitionRepository` — sem alteração.

3. **`users` — `AssignAccessProfileUseCase`**
   - Estendido `UsersRepository` (domain) com
     `findAccessProfileById(id)` — leitura auxiliar cross-module (model
     `AccessProfile` pertence ao módulo `accessProfiles`).
   - Implementado em `SequelizeUsersRepository.findAccessProfileById`
     (`AccessProfile.findByPk`).
   - Use case trocou `AccessProfile.findByPk(...)` por
     `this.usersRepository.findAccessProfileById(...)`. Controller já
     injetava `usersRepository` — sem alteração.

4. **`webhooks` — `ProcessN8nWebhookUseCase`**
   - Módulo não tinha `domain/repositories/` ainda — criado o primeiro:
     `server/src/modules/webhooks/domain/repositories/WebhookRepository.ts`
     (método `findOrCreateEvent(source, eventId, defaults)`) e
     `server/src/modules/webhooks/infrastructure/sequelize/SequelizeWebhookRepository.ts`
     (implementação com `WebhookEvent.findOrCreate`, mesma query de antes).
   - Use case passou a receber `webhookRepository` no construtor (antes não
     tinha construtor, instanciava `WebhookEvent.findOrCreate` direto).
   - `webhookController.ts` (`n8n`) atualizado para instanciar
     `new SequelizeWebhookRepository()` uma vez no topo do módulo e injetar
     no `new ProcessN8nWebhookUseCase(webhookRepository)`. A rota
     `focus-nfe` (outro use case, fora do escopo) não foi tocada.

### Documentações atualizadas
- JSDoc dos métodos novos em `ItemSupplierRepository.ts`,
  `PurchaseRequisitionRepository.ts`, `UsersRepository.ts` e no novo
  `WebhookRepository.ts` (contrato) — cada método deixa explícito que é
  leitura auxiliar cross-module e qual módulo é o dono real do model.
- Este handoff (`docs/governance/HANDOFF_CODEX.md`).
- Sem mudança de schema/model/migration ⇒ `docs/database/DATABASE.md` não precisou
  de atualização.
- Sem mudança de regra de negócio/validação/gatilho ⇒
  `docs/projeto/04-USE_CASES.md` não precisou de atualização (comportamento
  idêntico ao anterior, apenas a camada de acesso a dados mudou).

### Testes executados
- `npx tsc --noEmit` (a partir de `server/`) — limpo, sem erros, inclusive
  após mudanças concorrentes de outros dois grupos paralelos no mesmo
  repositório.
- `npx jest tests/unit/item-suppliers.test.ts tests/unit/access-profiles.test.ts
  tests/unit/webhooks-use-cases.test.ts tests/unit/purchase-requisition-create.test.ts
  tests/unit/purchase-requisition-department.test.ts tests/unit/purchase-requisition-status.test.ts`
  — 6 suites, 45 testes, todos passando.
- `npx jest tests/unit/engineering-sample-requisition.test.ts -t "CreatePurchaseRequisitionUseCase"`
  — 4/4 passando (a suite completa tem 1 teste adicional, "Cadeia completa:
  amostra aprovada -> convertida em pedido -> recebida no Deposito do
  Laboratorio", que falha — ver riscos residuais abaixo, não é desta fatia).
- Mocks de `jest.mock('../../src/models/index', ...)` que apontavam
  `Supplier`, `EngineeringProject`, `Employee`, `AccessProfile` foram
  trocados por mocks diretos nos objetos `repository` injetados nos testes
  (`tests/unit/item-suppliers.test.ts`, `tests/unit/access-profiles.test.ts`,
  `tests/unit/engineering-sample-requisition.test.ts`,
  `tests/unit/purchase-requisition-department.test.ts`,
  `tests/unit/purchase-requisition-create.test.ts`), preservando a mesma
  cobertura de cada cenário (sucesso, 404, 422/409, anti-spoofing).
  `tests/unit/webhooks-use-cases.test.ts` ganhou 1 teste novo (evento
  válido delega ao repository) para cobrir o `findOrCreateEvent` recém
  extraído.

### Riscos residuais / bugs encontrados (não corrigidos, fora do escopo)
- `tests/unit/engineering-sample-requisition.test.ts` → teste "Cadeia
  completa: amostra aprovada -> convertida em pedido -> recebida no
  Deposito do Laboratorio" está falhando com
  `TypeError: this.purchaseRepository.createPurchaseReceipt is not a
  function`, dentro de `server/src/modules/purchases/application/use-cases/
  ReceivePurchaseItemsUseCase.ts` — módulo `purchases`, fora do escopo desta
  tarefa (não é um dos 4 módulos atribuídos: `items`, `purchaseRequisitions`,
  `users`, `webhooks`). Confirmado via `git stash`/`git status` que esse
  arquivo (e outros de `purchases`, `inventory`, `fiscal`) estavam sendo
  modificados concorrentemente por outro grupo paralelo na mesma sessão —
  não é uma regressão introduzida por esta fatia. Recomenda-se que o grupo
  responsável por `purchases` ajuste o mock de
  `receivePurchaseRepository` em `engineering-sample-requisition.test.ts`
  (adicionar `createPurchaseReceipt`) ao concluir sua refatoração.
- Nenhum bug de comportamento real foi encontrado nos 4 use cases desta
  fatia — todas as queries reproduzidas nos repositories são idênticas às
  chamadas diretas anteriores (mesmo `where`, `attributes`, `transaction`).

## Retrofit Clean Architecture — Isolamento de repository (fatia 2/3: fiscal, purchases, nonConformities, products)

### Resumo da feature
Continuação do retrofit de Clean Architecture iniciado na fatia 1/3 (ver seção
acima): mais 6 use cases que acessavam models Sequelize diretamente
(`require('../../../../models/index')`) passaram a receber um repository
injetado no construtor, sem NENHUMA mudança de comportamento (mesma query,
mesmo `where`/`attributes`/`transaction`, mesmos erros).

1. **`fiscal` — módulo NÃO tinha `domain/repositories/` ainda (criado do
   zero, usando `purchases/domain/repositories/PurchaseRepository.ts` como
   referência de estilo):**
   - Criado `server/src/modules/fiscal/domain/repositories/FiscalRepository.ts`
     com `findCompanyFiscalConfig()`, `upsertCompanyFiscalConfig(data)` e
     `findPurchaseById(purchaseId)` (leitura cross-module pontual — `Purchase`
     é dono do módulo `purchases`, `FiscalRepository` não assume posse dele).
   - Criado `server/src/modules/fiscal/infrastructure/sequelize/SequelizeFiscalRepository.ts`
     — mesmas queries (`CompanyFiscalConfig.findByPk(1)`,
     find-or-create/save em `upsertCompanyFiscalConfig`, `Purchase.findByPk`).
   - `GetCompanyFiscalConfigUseCase.ts`, `UpsertCompanyFiscalConfigUseCase.ts`
     (mantém o filtro `ALLOWED_FIELDS` no use case — é regra de negócio, não
     persistência — e delega só a gravação ao repository) e
     `RegisterIncomingNfeUseCase.ts` (troca `Purchase.findByPk` direto por
     `fiscalRepository.findPurchaseById`) passaram a receber
     `fiscalRepository` no construtor.
   - `fiscalController.ts`: instancia `new SequelizeFiscalRepository()` uma
     vez no topo do módulo e injeta nos 3 use cases.

2. **`purchases` — `ReceivePurchaseItemsUseCase`:**
   - Estendido `PurchaseRepository` (domain) + `SequelizePurchaseRepository`
     com `createPurchaseReceipt(data, transaction)` (dono natural —
     `PurchaseReceipt` pertence a `purchases`), e mais 3 métodos cross-module
     pontuais: `findRequisitionOriginById(requisitionId, transaction)`
     (`PurchaseRequisition.findByPk` com `attributes: ['id','origin']`),
     `findLotForReceipt(where, transaction)` e `createLot(data, transaction)`
     (`LotControl.findOne`/`.create`, model do domínio de
     estoque/inventário).
   - Use case trocou os 4 acessos diretos a `models/index` por chamadas ao
     `this.purchaseRepository`. Controller (`purchaseController.ts`) já
     injetava `purchaseRepository` — sem alteração.

3. **`nonConformities` — `CreateNonConformityUseCase`:**
   - Estendido `NonConformitiesRepository` (domain) +
     `SequelizeNonConformitiesRepository` com 4 métodos cross-module
     pontuais: `findLotForNonConformity(productId, lotNumber, transaction)`
     (`LotControl.findOne` com lock), `countLotsBySupplier(supplierId, tx)`,
     `countNonConformitiesBySupplier(supplierId, tx)` e
     `updateSupplierQualityScore(supplierId, qualityScore, tx)`
     (`Supplier.update`, model do módulo `purchases`).
   - Use case trocou os acessos diretos a `LotControl`/`Supplier`/
     `NonConformity` (este último dono natural, mas usado só via `.count`)
     por chamadas ao `this.nonConformitiesRepository`, incluindo dentro do
     método privado `recalculateSupplierQualityScore`. Controller já
     injetava `nonConformitiesRepository` — sem alteração.

4. **`products` — `GetProductStockByWarehouseUseCase`:**
   - Estendido `ProductRepository`/`IProductRepository` (domain) +
     `SequelizeProductRepository` com `getWarehouseStockSummary(productId)`
     — encapsula as duas queries cross-module (`Warehouse.findAll({where:
     {active:true}})` + `ProductWarehouseStock.findAll({where:
     {product_id}})`, models do domínio de estoque/depósito) e a combinação
     em memória (todos os depósitos ativos, saldo `0` quando não há linha)
     que antes vivia no use case.
   - Use case trocou os dois acessos diretos + lógica de combinação por uma
     única chamada a `this.productRepository.getWarehouseStockSummary(product.id)`.
     Controller (`productController.ts`) já injetava `productRepository` —
     sem alteração.

### Documentações atualizadas
- JSDoc de todos os métodos novos nos 4 repositories (contratos abstratos
  em `domain/repositories/*.ts` e implementações em
  `infrastructure/sequelize/*.ts`), deixando explícito quando um método é
  leitura/escrita cross-module pontual e qual módulo é o dono real do model.
- Este handoff (`docs/governance/HANDOFF_CODEX.md`).
- Sem mudança de schema/model/migration ⇒ `docs/database/DATABASE.md` não precisou
  de atualização.
- Sem mudança de regra de negócio/validação/gatilho ⇒
  `docs/projeto/04-USE_CASES.md` não precisou de atualização (comportamento
  idêntico ao anterior, apenas a camada de acesso a dados mudou).

### Testes executados
- `npx tsc --noEmit` (a partir de `server/`) — limpo após cada um dos 4
  blocos de produção e novamente ao final, inclusive com as mudanças
  concorrentes dos outros 2 grupos paralelos (`inventory`, `items`,
  `purchaseRequisitions`, `users`, `webhooks`) no mesmo repositório.
- `npx jest tests/unit` (suíte unitária completa) — **69 suites, 492 testes,
  todos passando**.
- Suites tocadas diretamente por esta fatia, todas passando:
  `tests/unit/nonConformities-use-cases.test.ts` (5/5, sem alteração
  necessária — já mockava o repository),
  `tests/unit/non-conformity-supplier-return.test.ts` (10/10),
  `tests/unit/quality-lot-lifecycle.test.ts` (21/21 — inclui os blocos
  `ReleaseLotUseCase`/`BlockLotUseCase` do grupo paralelo de `inventory`,
  que terminaram sua refatoração durante esta sessão),
  `tests/unit/warehouse-stock.test.ts` (7/7 nos blocos
  `ReceivePurchaseItemsUseCase`/`GetProductStockByWarehouseUseCase`; os
  outros 26 testes do arquivo, de `CreateWarehouseTransferUseCase`/
  `ApproveWarehouseTransferUseCase`/`RejectWarehouseTransferUseCase`, são do
  módulo `inventory`, fora do escopo),
  `tests/unit/engineering-sample-requisition.test.ts` (5/5 — corrigido o
  mock de `receivePurchaseRepository` que o grupo 1/3 já havia identificado
  como pendência, ver seção anterior),
  `tests/unit/integrity-transaction-guards.test.ts` (19/19),
  `tests/unit/laboratory-tests.test.ts` (não precisou de alteração —
  `jest.mock` inteiro de `CreateNonConformityUseCase`).
- Mocks de `jest.mock('../../src/models/index', ...)` que apontavam
  `LotControl`, `Supplier`, `NonConformity`, `PurchaseReceipt`,
  `PurchaseRequisition`, `Warehouse`, `ProductWarehouseStock` diretamente
  foram trocados por métodos mockados nos objetos `repository` injetados
  (`nonConformitiesRepository.findLotForNonConformity/countLotsBySupplier/
  countNonConformitiesBySupplier/updateSupplierQualityScore`,
  `purchaseRepository.createPurchaseReceipt/findRequisitionOriginById/
  findLotForReceipt/createLot`, `productRepository.getWarehouseStockSummary`),
  preservando a mesma cobertura de cada cenário.

### Riscos residuais / bugs encontrados (não corrigidos, fora do escopo)
- Nenhum bug de comportamento real foi encontrado nos 6 use cases desta
  fatia — todas as queries reproduzidas nos repositories são idênticas às
  chamadas diretas anteriores (mesmo `where`/`attributes`/`transaction`,
  mesma ordem de validação e mesmos erros lançados).
- O módulo `fiscal` não tinha nenhum teste unitário mapeado para
  `GetCompanyFiscalConfigUseCase`/`UpsertCompanyFiscalConfigUseCase`/
  `RegisterIncomingNfeUseCase` antes desta fatia (confirmado por grep em
  `server/tests/`); nenhum teste novo foi criado para não expandir escopo
  além do que foi pedido (retrofit de arquitetura, não cobertura nova) —
  fica como sugestão para um próximo incremento.

---

## Retrofit Clean Architecture — Fechamento do módulo `fiscal` (3 use cases de NF-e de venda que ficaram de fora da fatia 2/3)

### Resumo da feature
A fatia 2/3 (seção acima) migrou 3 dos 6 use cases de `fiscal` que
acessavam models Sequelize direto (`GetCompanyFiscalConfigUseCase`,
`UpsertCompanyFiscalConfigUseCase`, `RegisterIncomingNfeUseCase`), mas por
um erro de categorização no script de varredura os outros 3 use cases do
mesmo módulo (todos relacionados a NF-e de **venda**, não de compra) não
foram corrigidos junto: `CancelSaleNfeUseCase.ts`, `GetSaleNfeStatusUseCase.ts`
e `IssueSaleNfeUseCase.ts`, que acessavam `Sale`, `SaleItem`, `Client` e
`Product` diretamente via `require('../../../../models/index')`. Esta
rodada fecha o módulo `fiscal` por completo, com ZERO mudança de
comportamento (mesma query, `where`, `transaction`/`lock`, mesmos erros).

- Estendido `server/src/modules/fiscal/domain/repositories/FiscalRepository.ts`
  com 4 métodos novos, todos cross-module (os models pertencem a `sales`/
  `products`, não a `fiscal`) e todos aceitando `options?: { transaction,
  lock }` para preservar exatamente o mesmo comportamento de lock
  pessimista que os 3 use cases já tinham dentro de seus blocos
  `sequelize.transaction(...)`:
  - `findSaleById(saleId, options?)` → `Sale.findByPk(saleId, options)`
  - `findSaleItemsBySaleId(saleId, options?)` → `SaleItem.findAll({ where: { sale_id: saleId }, ...options })`
  - `findClientById(clientId, options?)` → `Client.findByPk(clientId, options)`
  - `findProductsByIds(productIds, options?)` → `Product.findAll({ where: { id: productIds }, ...options })`
  - `findCompanyFiscalConfig()` (já existia) foi estendido para aceitar o
    mesmo `options?` opcional — chamada sem argumento continua idêntica
    (`CompanyFiscalConfig.findByPk(1)`), e `IssueSaleNfeUseCase` passou a
    chamá-lo com `{ transaction, lock: transaction.LOCK.UPDATE }` (mesmo
    lock que já usava antes, direto no model).
- `server/src/modules/fiscal/infrastructure/sequelize/SequelizeFiscalRepository.ts`
  implementa os 4 métodos com exatamente as mesmas chamadas Sequelize que
  existiam nos use cases (nenhuma query nova, nenhum filtro alterado).
- `CancelSaleNfeUseCase.ts`, `GetSaleNfeStatusUseCase.ts` e
  `IssueSaleNfeUseCase.ts` passaram a receber `fiscalRepository` no
  construtor (mesmo padrão de `GetCompanyFiscalConfigUseCase`) e trocaram
  todo acesso direto a `Sale`/`SaleItem`/`Client`/`Product`/
  `CompanyFiscalConfig` por chamadas a `this.fiscalRepository.*`. O
  `sequelize.transaction(...)` e a lógica de negócio (validações, ordem de
  operações, cálculo de tributos via `TaxCalculationService`, chamada ao
  provedor de NF-e) permanecem 100% intactos dentro dos próprios use
  cases — apenas o acesso a dados foi extraído.
- `fiscalController.ts`: os 3 pontos de instanciação
  (`new IssueSaleNfeUseCase()`, `new GetSaleNfeStatusUseCase()`,
  `new CancelSaleNfeUseCase()`) passaram a injetar a mesma instância
  `fiscalRepository` (`SequelizeFiscalRepository`) já usada pelos outros 3
  use cases do módulo.
- **Achado durante a refatoração (não fazia parte da lista original, mas
  está dentro do módulo `fiscal`):**
  `HandleNfeStatusWebhookUseCase.ts` instanciava
  `new GetSaleNfeStatusUseCase()` sem argumento — como o construtor passou
  a exigir `fiscalRepository`, isso quebraria em runtime (webhook de
  notificação assíncrona do provedor de NF-e, `modules/webhooks/
  presentation/controllers/webhookController.ts`). Corrigido criando uma
  instância própria de `SequelizeFiscalRepository` dentro do próprio
  `HandleNfeStatusWebhookUseCase.ts` (módulo `fiscal`, escopo permitido) e
  injetando-a — a assinatura pública `new HandleNfeStatusWebhookUseCase()`
  (sem argumento), usada por `webhookController.ts` fora de `fiscal`, não
  mudou, então nenhum arquivo fora de `server/src/modules/fiscal/` foi
  tocado.

### Documentações atualizadas
- JSDoc de todos os métodos novos em `FiscalRepository.ts` (contrato
  abstrato) e `SequelizeFiscalRepository.ts` (implementação), explicitando
  que `Sale`/`SaleItem`/`Client`/`Product` são cross-module (donos reais:
  `sales`, `products`).
- Este handoff (`docs/governance/HANDOFF_CODEX.md`).
- Sem mudança de schema/model/migration ⇒ `docs/database/DATABASE.md` não precisou
  de atualização.
- Sem mudança de regra de negócio/validação/gatilho ⇒
  `docs/projeto/04-USE_CASES.md` não precisou de atualização (mesmo
  comportamento observável, apenas a camada de acesso a dados mudou).
- `docs/governance/TODO.md` não tinha item aberto rastreando especificamente
  este retrofit (é continuação direta da fatia 2/3 documentada acima, sem
  um item próprio no TODO) — nada para marcar.

### Instruções de teste
1. `cd server && npx tsc --noEmit` — 0 erros (rodado após cada arquivo e
   novamente ao final, projeto inteiro).
2. `npx jest tests/unit` — **69 suites, 492 testes, todos passando**,
   incluindo `tests/unit/sales-nfe-rbac.test.ts` (3/3 — ajustado para
   injetar `new SequelizeFiscalRepository()` real nos 2 use cases que
   instancia diretamente, `IssueSaleNfeUseCase`/`CancelSaleNfeUseCase`, em
   vez de passar sem argumento; o `jest.mock('../../src/models/index', ...)`
   já existente no arquivo não precisou mudar, porque
   `SequelizeFiscalRepository` é quem consome esses models por baixo —
   mesma cobertura de antes).
3. `npx jest` (suíte completa) — **70 suites/493 testes passando, 28
   suites/77 testes skipped** (integração, sem prerequisitos de banco
   neste ambiente — inclui `tests/integration/sale-nfe-issuance.test.ts`,
   que cobre emissão/consulta/cancelamento de NF-e ponta a ponta contra um
   banco real; deve ser rodado manualmente com `TEST_PRODUCT_ID` e um
   Postgres de teste disponível antes do próximo Go-Live gate).
4. Próximo agente/humano: validar manualmente (ou via suíte de integração
   com banco disponível) o fluxo completo `POST /api/sales/:id/nfe` →
   `GET /api/sales/:id/nfe` → `POST /api/sales/:id/nfe/cancel`, e também o
   webhook de notificação (`HandleNfeStatusWebhookUseCase`, rota em
   `modules/webhooks`) para confirmar que a reconciliação de status
   continua funcionando após a injeção do repository.

### Riscos residuais / bugs encontrados (não corrigidos, fora do escopo)
- Nenhum bug de comportamento real foi encontrado nos 3 use cases desta
  rodada — todas as queries reproduzidas no repository são idênticas às
  chamadas diretas anteriores (mesmo `where`, mesma transação/lock, mesma
  ordem de validação, mesmos erros lançados).
- `HandleNfeStatusWebhookUseCase.ts` não tinha nenhum teste unitário
  mapeado antes desta rodada (confirmado por grep em `server/tests/`);
  nenhum teste novo foi criado para não expandir escopo além do pedido —
  fica como sugestão para um próximo incremento, especialmente porque essa
  correção pontual (instanciar `SequelizeFiscalRepository` localmente) não
  tem cobertura automatizada hoje.

---

## App Mobile — Login + Inventário Mobile (QR Code) + Histórico (Nova Entrega)

**Data**: 2026-08-06
**Escopo**: Criação do app mobile (Android + iOS) em `mobile/` (React Native + Expo + Expo Router), consumindo os endpoints já existentes de `server/src/modules/auth` e `server/src/modules/mobileInventory`. **Nenhuma rota/endpoint novo foi criado no backend** — esta entrega é 100% client-side.
**Status**: ✅ Concluído (build/tsc/doctor validados; testado apenas via bundling estático — QA deve validar em dispositivo/emulador real contra um backend rodando)

### O que foi feito
- Projeto Expo criado do zero em `mobile/` (paralelo a `client/`/`server/`), SDK 57, TypeScript, Expo Router (file-based routing).
- 3 telas: Login (`app/login.tsx`), Inventário Mobile com scanner de QR/código de barras (`app/(app)/home.tsx`), Histórico paginado de movimentações (`app/(app)/history.tsx`).
- Client HTTP tipado em `mobile/src/api/` (`client.ts`, `auth.ts`, `mobileInventory.ts`, `types.ts`), espelhando os contratos JSON reais lidos diretamente do código-fonte do backend (não documentação — ver arquivos citados abaixo).
- Sessão JWT persistida via `expo-secure-store` (`mobile/src/context/AuthContext.tsx`), nunca `AsyncStorage`.
- URL da API configurável via `EXPO_PUBLIC_API_URL` (`mobile/.env`, ver `mobile/.env.example`).
- Assets de marca copiados de `client/src/assets/brand/` para `mobile/assets/brand/`.

### Endpoints consumidos (já existentes — não alterados)
1. `POST /api/auth/login` — `server/src/modules/auth/presentation/controllers/authController.ts`
   - Request: `{ email, password }` → Response: `{ success: true, data: { token, user: { id, name, email, role } } }`
   - Rate-limit: 10 tentativas/15min por `IP+email` (`server/app.ts`, `authLimiter`), resposta 429: `{ success: false, error: "Muitas tentativas. Tente novamente em 15 minutos." }`
2. `POST /api/mobile-inventory/scan` — requer `Authorization: Bearer <jwt>` + permissão `estoque:operate` (`authorizeModule('estoque', 'operate')`)
   - Request: `{ product_code, quantity, type: 'in'|'out', description? }`
   - Response: `{ success: true, data: { product: {id,name,code}, movement, new_quantity } }`
   - Erros: 404 produto não encontrado, 400/422 validação (campo obrigatório ausente, estoque insuficiente em saída), 403 se o perfil do usuário não tiver `estoque:operate`.
3. `GET /api/mobile-inventory/movements?page=&limit=` — requer `Authorization: Bearer <jwt>` + permissão `estoque` (view implícito)
   - Response: `{ success: true, data: Movement[], pagination: { total, page, limit, totalPages } }`

### Como testar (QA / próximo agente)
1. Subir o backend localmente (`npm run server` na raiz, ou apontar `EXPO_PUBLIC_API_URL` para um túnel/servidor já rodando).
2. Confirmar a porta real do backend (`server/src/config/runtimeEnv.ts`, `PORT`, default `5000`) e o IP da máquina na rede local (`ipconfig`/`ifconfig`).
3. `cd mobile && npm install && cp .env.example .env` e editar `EXPO_PUBLIC_API_URL` com esse IP:porta.
4. `npx expo start` → abrir no Expo Go (celular físico, mesma rede Wi-Fi) ou emulador Android (`10.0.2.2:<porta>` como IP nesse caso).
5. Testar login com um usuário existente com perfil que tenha `estoque:operate` (checar `access_profiles`/`access_profile_permissions` ou usuário `admin`).
6. Testar o scanner apontando para qualquer QR Code/código de barras contendo o `code` de um `Item`/`Product` existente no banco — ou preencher `product_code` manualmente no campo de texto (o campo aceita digitação, não é scanner-only).
7. Testar cenários de erro: código inexistente (404), saída maior que o estoque disponível (422), usuário sem permissão `estoque:operate` (403), 10+ tentativas de login erradas seguidas (429).
8. Testar histórico: paginação por scroll infinito (`onEndReached`) e pull-to-refresh.

### Validado nesta entrega (sem dispositivo real)
- `npx tsc --noEmit` — 0 erros.
- `npx expo-doctor` — 20/20 checks OK.
- `npx expo export --platform android` — bundle Metro compila com sucesso (smoke test).
- **Não validado**: comportamento real em dispositivo/emulador (permissão de câmera, leitura de QR físico, chamadas de rede reais) — fica para QA/próximo agente com acesso a um dispositivo e ao backend rodando.

### Decisões técnicas relevantes (ver também `mobile/README.md`)
- Expo Router (não `@react-navigation` configurado manualmente) — `main` do `package.json` é `expo-router/entry`.
- `expo-camera` `CameraView` (API atual, SDK 57) com `barcodeScannerSettings` para QR + códigos de barras comuns de etiqueta industrial (EAN-13/EAN-8/Code128/Code39/UPC).
- `babel.config.js` precisou ser criado manualmente (o template padrão do Expo SDK 57 não gera um) com `babel-preset-expo` + `react-native-worklets/plugin` (exigido pelo Reanimated 4.x, dependência transitiva de navegação). `babel-preset-expo` teve que ser adicionado como `devDependency` direta em `mobile/package.json` — por padrão só existe aninhado em `node_modules/expo/node_modules/babel-preset-expo`, o que quebra a resolução do Babel ao existir um `babel.config.js` próprio.
- Client HTTP único (`mobile/src/api/client.ts`) trata os dois formatos de erro do backend (`{error: string}` legado/Sequelize/rate-limit vs. `{error: {code,message}}` de `AppError`) e dispara logout automático em qualquer 401 global (exceto no próprio login).

### Arquivos criados
- `mobile/` (projeto completo — ver árvore em `mobile/README.md`)
- Principais: `mobile/app.json`, `mobile/babel.config.js`, `mobile/app/_layout.tsx`, `mobile/app/index.tsx`, `mobile/app/login.tsx`, `mobile/app/(app)/_layout.tsx`, `mobile/app/(app)/home.tsx`, `mobile/app/(app)/history.tsx`, `mobile/src/api/client.ts`, `mobile/src/api/auth.ts`, `mobile/src/api/mobileInventory.ts`, `mobile/src/api/types.ts`, `mobile/src/context/AuthContext.tsx`, `mobile/src/components/QrScannerModal.tsx`, `mobile/src/config/env.ts`, `mobile/.env.example`, `mobile/README.md`

### Próximos passos sugeridos (fora do escopo desta entrega)
- Validação em dispositivo/emulador real (ver seção "Como testar" acima).
- Ícones/splash screen customizados com a marca Evok Áudio (hoje usa os placeholders gerados pelo `create-expo-app`).
- EAS Build (`eas.json`) para gerar builds Android/iOS instaláveis fora do Expo Go, quando houver ambiente de CI/CD definido para o mobile.

---

## Inventário Cíclico — Atribuição de Contagem a Funcionário / Pool (Backend)

**Data**: 2026-08-06
**Escopo**: Evolução do submódulo `InventoryCount`/`InventoryCountItem` (`server/src/modules/inventory`) para suportar atribuição de contagens a um funcionário específico e/ou "pool" (qualquer funcionário autorizado pode pegar). **100% backend** — preparação para a tela "Contagens disponíveis para mim" do app mobile (não implementada nesta entrega).
**Status**: ✅ Concluído (typecheck + testes unitários passando; sem commit — arquivos deixados para revisão)

### O que foi feito
- Novo campo `assigned_to` (nullable, FK → `users.id`, `ON DELETE SET NULL`) em `inventory_counts`.
- Criação (`POST /api/inventory-counts`) aceita `assigned_to` opcional: informado = atribuição específica; ausente/`null` = contagem fica no "pool".
- Início da contagem (`POST /api/inventory-counts/:id/start`) faz o **claim atômico**: se a contagem está no pool, atribui ao usuário logado (lock pessimista `SELECT ... FOR UPDATE` dentro de transação, serializando corrida entre dois funcionários); se já atribuída a **outro** usuário, rejeita com `ConflictError` (HTTP 409, `{"code":"CONFLICT","message":"Esta contagem já foi atribuída a outro funcionário."}`); se já for do próprio usuário, segue idempotente.
- Listagem (`GET /api/inventory-counts`) ganhou os filtros `assigned_to` (aceita o atalho `assigned_to=me`, resolvido pelo controller para o id do usuário autenticado) e `unassigned=true` (contagens do pool; tem prioridade sobre `assigned_to` se ambos vierem informados). Filtros pré-existentes (`status`, `count_type`, paginação) inalterados.
- Aprovação/rejeição (`approve`/`reject`) permanecem exclusivas do painel web, sem nenhuma mudança de comportamento.

### Arquivos modificados
- `server/migrations/20260806-000001-add-assigned-to-inventory-counts.cjs` (novo) — coluna + índice, idempotente.
- `server/src/models/InventoryCount.ts` — campo `assigned_to` + JSDoc do workflow.
- `server/src/models/index.ts` — associação `InventoryCount.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedTo' })` / `User.hasMany(..., as: 'assigned_inventory_counts')`.
- `server/src/modules/inventory/domain/entities/InventoryCountEntity.ts` — aceita `assigned_to` opcional, expõe em `toRepositoryInput()`.
- `server/src/modules/inventory/application/use-cases/CreateInventoryCountUseCase.ts` — repassa `assigned_to`.
- `server/src/modules/inventory/application/use-cases/StartInventoryCountUseCase.ts` — reescrito: agora abre transação própria (`sequelize.transaction()`), usa `findRawByIdForUpdate` (lock pessimista) e implementa a lógica de claim/trava descrita acima. **Assinatura de `execute` mudou de `{ id }` para `{ id, userId }`** (breaking change interno, sem impacto em client/mobile — só o controller chama este use case).
- `server/src/modules/inventory/application/use-cases/ListInventoryCountsUseCase.ts` — novos filtros `assigned_to`/`unassigned`.
- `server/src/modules/inventory/domain/repositories/InventoryCountRepository.ts` — JSDoc de `list()` atualizado.
- `server/src/modules/inventory/infrastructure/sequelize/SequelizeInventoryCountRepository.ts` — `list()` aplica `where.assigned_to`; `list()`/`findById()` passam a incluir `{ model: User, as: 'assignedTo' }`.
- `server/src/modules/inventory/presentation/validators/inventoryValidators.ts` — `createInventoryCountSchema.assigned_to` (opcional, inteiro positivo ou `null`).
- `server/src/modules/inventory/presentation/controllers/inventoryCountController.ts` — `create` repassa `assigned_to`; `list` resolve `assigned_to=me`; `start` passa `userId: req.user.id`.
- `server/tests/unit/inventory-count-assignment.test.ts` (novo) — 10 testes cobrindo criação com/sem `assigned_to`, claim do pool, rejeição de claim de contagem de outro usuário, idempotência do próprio usuário, transição inválida de status, e os filtros de listagem.

### Documentações atualizadas
- `docs/arquitetura/API.md` — nova seção "8.2 Inventário Cíclico (Contagens)" com todos os endpoints de `/api/inventory-counts`, incluindo o contrato de atribuição/pool e o formato do erro 409.
- `docs/database/DATABASE.md` — nova subseção "Coluna nova: `inventory_counts.assigned_to` (migration `20260806-000001`)" logo após a seção existente de `warehouse_id`.
- `docs/governance/HANDOFF_CODEX.md` — esta seção.
- JSDoc atualizado em todos os arquivos de código listados acima (classes, use cases, validators, controller, migration).
- Não havia caso de uso dedicado de inventário cíclico em `docs/projeto/04-USE_CASES.md` nem item correspondente em `docs/governance/TODO.md` — nenhum dos dois foi alterado (nada para marcar `[x]`; a feature não fazia parte do backlog rastreado ali).

### Contrato final da API
**Criação** (`POST /api/inventory-counts`):
```json
{
  "count_type": "cycle",
  "warehouse_id": 2,
  "location": "Corredor A",
  "notes": "Contagem mensal",
  "item_ids": ["uuid-item-1"],
  "assigned_to": 15
}
```
`assigned_to` opcional; ausente/`null` = pool.

**Listagem** (`GET /api/inventory-counts`) — novos query params: `assigned_to=<id>`, `assigned_to=me`, `unassigned=true` (combinado tipicamente com `status=draft`). Filtros pré-existentes mantidos.

**Início** (`POST /api/inventory-counts/:id/start`) — sem payload novo; erro de atribuição conflitante:
```json
{ "success": false, "error": { "code": "CONFLICT", "message": "Esta contagem já foi atribuída a outro funcionário." } }
```
HTTP 409.

### Instruções de teste (próximo agente/humano)
1. Rodar a migration em um banco de desenvolvimento: `cd server && npm run migration:up` (ou `migration:up --name 20260806-000001-add-assigned-to-inventory-counts.cjs`).
2. `cd server && npx jest tests/unit/inventory-count-assignment.test.ts` — 10 testes devem passar.
3. `cd server && npx tsc --noEmit` — 0 erros (validado nesta entrega).
4. Teste manual via API (Postman/curl), com um token de usuário com `contagens:operate`:
   - Criar uma contagem sem `assigned_to` → confirmar que fica no pool (`GET /api/inventory-counts?unassigned=true&status=draft` deve listá-la).
   - Chamar `POST /:id/start` com o usuário A → confirmar `assigned_to` no retorno.
   - Chamar `POST /:id/start` novamente com o usuário B na MESMA contagem (agora em `counting`, não mais `draft`) → deve falhar com `BusinessRuleError` (422, comportamento pré-existente inalterado).
   - Criar uma segunda contagem sem `assigned_to`, iniciar com o usuário A, depois tentar `POST /:id/start` com o usuário B em uma contagem QUE VOLTOU a `draft` manualmente (ou testar diretamente a corrida via dois requests simultâneos) → deve retornar 409 se já atribuída a A.
   - `GET /api/inventory-counts?assigned_to=me` autenticado como A → deve listar as contagens de A.
5. **Não testado nesta entrega** (fora de escopo, mobile/client não tocados): telas de app mobile/web consumindo os novos filtros — quando forem construídas, apontar para o contrato documentado em `docs/arquitetura/API.md` §8.2.

### Riscos residuais
- A lógica de "corrida" (dois usuários tentando iniciar a MESMA contagem do pool simultaneamente) foi validada com lock pessimista dentro de transação e coberta por teste unitário com repositório mockado — **não há teste de integração contra PostgreSQL real** exercitando a concorrência de fato (exigiria dois clients simultâneos contra um banco real). Recomenda-se um teste de integração dedicado antes do Go-Live se esse fluxo for crítico em produção.
- Nenhuma tela de frontend (web ou mobile) foi criada ou alterada — os novos filtros/campo só existem na API até que `PromadorFonteEnd` (web) ou o time do app mobile os consumam.

> **Nota de atualização (2026-08-06, mesmo dia da entrega acima):** a
> observação "nenhuma tela de frontend foi criada ou alterada" ficou
> desatualizada ainda no mesmo dia — **não é uma reescrita do registro
> original**, apenas o registro de que o consumo aconteceu logo em
> seguida. Web: `client/src/pages/products/InventoryCountsPage.tsx`
> ganhou o campo "Atribuir a" na criação da contagem e um filtro por
> atribuição na listagem. Mobile: `mobile/app/(app)/counts/` (tela de
> lista + detalhe de contagem) passou a consumir o pool/atribuição e o
> claim atômico descritos acima. Ver a entrada 2026-08-06 de
> `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` para o relato completo (apps
> `mobile/`/`tv/` novos + esta feature de atribuição, incluindo um bug P0
> real encontrado nesse mesmo consumo do campo "Atribuir a" na web e
> corrigido no mesmo dia).

---

## Segunda rodada de 2026-08-06 — RFQ multi-fornecedor, financeiro (centros de custo + projeção diária), OEE completo, e desarme de bombas latentes UUID×INTEGER

**Data:** 2026-08-06 (segunda rodada do dia, distinta da consolidação de
auditoria multi-agente registrada na seção anterior). Duas ondas:
**Onda 1 commitada** (commit `feat: RFQ multi-fornecedor, centros de custo
+ projecao de caixa diaria, e relatorio OEE completo`); **Onda 2 no
working tree**, ainda não commitada no momento desta entrada. Consolida 4
frentes do roadmap de `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`. Detalhe
narrativo completo (decisões, riscos residuais, números de validação) em
`docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`, entrada "2026-08-06 (segunda rodada — 4
frentes do roadmap)"; contrato de API completo em `docs/arquitetura/API.md` (RFQ §11.1,
financeiro §6, OEE §7); schema completo em `docs/database/DATABASE.md`.

### Onda 1 — RFQ, financeiro, OEE

1. **RFQ/Cotação multi-fornecedor** — módulo novo `server/src/modules/rfq/`
   (Clean Architecture: `domain/repositories/RfqRepository.ts`,
   `infrastructure/sequelize/SequelizeRfqRepository.ts`, 7 use cases,
   `presentation/{routes,controllers,validators}`). Tabelas
   `rfqs`/`rfq_items`/`rfq_suppliers`/`rfq_quotes` (migration
   `20260806-000010-create-rfq-tables.cjs`). Fluxo:
   `POST /api/rfqs` (avulsa por `items[]` OU a partir de `requisition_id`,
   XOR) → `POST /:id/suppliers` (convite, transiciona `draft→sent`) →
   `POST /:id/quotes` (resposta por fornecedor, upsert por par
   item×fornecedor) → `GET /:id/comparison` (mapa comparativo com melhor
   preço/prazo destacados por item) → `POST /:id/award` (adjudicação por
   item, podendo dividir entre fornecedores; gera 1 pedido de compra por
   fornecedor vencedor, congela `awarded_supplier_id`/`awarded_unit_price`,
   faz upsert em `item_suppliers` com o preço/prazo do vencedor, marca a
   RFQ `awarded`). RFQ travada via `SELECT ... FOR UPDATE` durante a
   adjudicação (evita adjudicação concorrente duplicada). Frontend: página
   `/purchases/rfqs` + item de menu em Compras. Testado ao vivo ponta a
   ponta contra o Postgres do Docker local.
2. **Financeiro — centros de custo + projeção diária de fluxo de caixa** —
   tabela `cost_centers` + coluna `cost_center_id` (nullable, `ON DELETE
   SET NULL`) em `accounts_payable`/`accounts_receivable` (migration
   `20260806-000020-create-cost-centers.cjs`, idempotente — checa
   `showAllTables()`/`describeTable()` antes de criar, pois um banco novo
   já nasce com essas tabelas via baseline). Endpoints novos sob
   `/api/finance`: CRUD de centro de custo, `GET /cost-centers/report?from=&to=`
   (agrupado, com grupo `"Sem centro de custo"` sempre presente),
   `GET /cashflow/projection?days=30|60|90&opening_balance=` (série diária
   com saldo acumulado, `day_index` 0..days, vencidos somados no dia 0,
   `summary.lowest_balance` com data+valor do menor saldo do horizonte),
   `PUT /payable/:id/cost-center` / `PUT /receivable/:id/cost-center`
   (atribuir/remover), `POST /payable` aceitando `cost_center_id` opcional.
   UI: 3 abas na tela financeira (Contas / Centros de Custo / Projeção de
   Caixa). **Bug real corrigido no caminho:** parse de `due_date`
   (`DATEONLY`) via `new Date('YYYY-MM-DD')`/`toISOString()` deslocava a
   série em 1 dia em fusos negativos (`America/Sao_Paulo`, UTC-3) —
   corrigido em `GetDailyCashFlowProjectionUseCase.ts` para reconstruir a
   data por componentes de calendário (nunca via parse direto de string
   ISO nem via getters UTC). **Fora de escopo, registrado em
   `docs/governance/TODO.md`:** conciliação bancária/CNAB; mapeamento
   automático departamento→centro de custo na criação automática de
   `AccountPayable` (hoje só manual).
3. **OEE completo** — `GET /api/reports/oee?start_date&end_date&work_center_id`
   (`GetOeeReportUseCase.ts`, `authorizeModule('relatorios.producao')`,
   mesma sub-permissão de `GET /api/reports/production`). Três eixos:
   Disponibilidade (horas produzindo de `production_order_tracking` /
   horas disponíveis do calendário de turnos `work_center_shifts`,
   fallback `capacity_hours_per_day`), Performance (tempo padrão ×
   unidades processadas / tempo real apontado, capado a 100%), Qualidade
   (boas/(boas+refugo)); OEE = D×P×Q, só calculado com os 3 eixos
   não-nulos. Eixos `null` (nunca `0` enganoso) com `no_data_reason`
   textual quando o denominador é zero. Agregado geral soma as bases
   brutas de todos os centros e recalcula os eixos sobre os totais (não é
   média das taxas — evita distorção quando os centros têm volumes muito
   diferentes). Sem migration nova. Frontend: aba OEE em `/reports`
   (thresholds visuais 85%/60%). **Bug de runtime corrigido no caminho**
   (não relacionado à lógica de OEE, mas encontrado durante esta frente):
   um arquivo TS misturando `export interface` com `export =` quebrava o
   `tsx` e derrubava o dev server inteiro. **LIMITAÇÃO DOCUMENTADA e
   assumida conscientemente, não é gap silencioso:** o schema não tem
   campo de downtime/parada de máquina explícito
   (`production_order_tracking` só tem `started_at`/`finished_at`/
   `status`, incluindo `paused` mas sem timestamp de início/fim de pausa)
   — a Disponibilidade é uma aproximação por calendário de turnos, sem
   desconto de paradas reais registradas. Registrado como item futuro em
   `docs/governance/TODO.md`.

### Onda 2 — Desarme de 7 "bombas latentes" UUID×INTEGER + DEPRECATED de 12 tabelas órfãs

Continuação do padrão de bug já corrigido em `item_estruturas` (migration
`20260802-000005`), fechando a seção "Bombas latentes conhecidas" de
`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`. Migrations
`20260806-000040/041/042.cjs`, todas aplicadas no banco local.

- **`items.fornecedor_padrao_id` (bomba REAL em tabela viva, não só no
  schema-fantasma):** era `UUID` com FK para `fornecedores.id` (tabela
  órfã, também UUID), mas o código (`models/index.ts`) sempre associou o
  campo ao model `Supplier` real, cuja PK (`suppliers.id`) é `INTEGER`. O
  campo era estruturalmente impossível de preencher via API
  (`itemValidators.ts` exigia `z.string().uuid()`, nunca aceitando um
  `supplier_id` real) e qualquer `include` de `fornecedorPadrao` quebrava
  em runtime (`operator does not exist: uuid = integer`). Diagnóstico
  antes do fix: `items` tinha 13 linhas em produção, campo 100% `NULL`
  (0/13) — correção segura, sem perda de dado. Corrigido: `UUID → INTEGER`
  + FK real para `suppliers(id)` (`ON DELETE SET NULL`); `Item.ts` e
  `itemValidators.ts` (`z.coerce.number().int().positive().nullable().optional()`)
  atualizados no mesmo commit da migration
  (`20260806-000040-fix-items-fornecedor-padrao-id-type.cjs`).
  **⚠️ BREAKING CHANGE DE API para quem consumir `POST`/`PATCH /api/items`:
  `fornecedor_padrao_id` agora é um inteiro (`supplier_id`), não mais um
  UUID.** Qualquer client (frontend, script, integração) que hoje envie um
  UUID nesse campo passa a receber 400/422 de validação. Nenhuma tela de
  cadastro do Item Mestre consome este campo ainda (ver
  `docs/governance/TODO.md`, item "Tela de `fornecedor_padrao_id` no
  cadastro de item").
- **6 colunas em tabelas órfãs (0 uso em código vivo), mesmo padrão de
  UUID→usuário INTEGER:** as 4 já documentadas em
  `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`
  (`requisicoes_compra.aprovado_por`, `ordens_producao.criado_por`,
  `movimentos_estoque.usuario_id`, `auditoria_eventos.usuario_id`) + 2
  novas encontradas nesta rodada por auditoria completa
  (`requisicoes_compra.solicitante_id`, `entradas_nf.recebido_por`).
  Todas convertidas `UUID → INTEGER` com FK real para `users(id)` (`ON
  DELETE SET NULL`) — mesmo padrão preventivo do item anterior: se esse
  schema-fantasma for reaproveitado por engano no futuro, o tipo já aponta
  para a fonte de verdade real. Migration verifica `0` linhas não nulas em
  cada coluna antes de alterar o tipo (aborta com erro explícito caso
  contrário) — guarda de segurança contra dado incompatível
  (`20260806-000041-fix-orphan-pt-schema-user-columns.cjs`).
- **12 tabelas órfãs marcadas `DEPRECATED`, não removidas:** `usuarios`,
  `fornecedores`, `lotes`, `numeros_serie`, `requisicoes_compra`,
  `requisicao_compra_items`, `entradas_nf`, `entradas_nf_items`,
  `ordens_producao`, `movimentos_estoque`, `webhooks_eventos`,
  `auditoria_eventos` — todas do `01_schema.sql`/baseline
  (`20260731-000001`), 0 linhas, 0 models Sequelize, 0 referências em
  `server/src` fora de comentários genéricos, confirmado por auditoria
  completa. Cada uma recebeu `COMMENT ON TABLE` explicando o motivo e
  apontando o equivalente ativo em inglês
  (`20260806-000042-comment-deprecated-orphan-pt-schema-tables.cjs`).
  **Decisão consciente de não dropar:** preservar histórico/possível
  relevância de auditoria fiscal futura — `DROP TABLE` definitivo fica
  como decisão futura em aberto (`docs/governance/TODO.md`).
- **Teste de guarda novo:** `server/tests/unit/no-orphan-pt-schema-tables.test.ts`
  (14 casos) — falha se qualquer arquivo novo em `server/src` referenciar
  uma das 12 tabelas órfãs (nome de tabela em query raw, `sequelize.define`,
  `tableName` de model, etc.). **Limitação registrada:** cobre apenas
  `server/src`, não varre `server/migrations/*.cjs` (que legitimamente
  referenciam essas tabelas nas migrations que as criaram/alteraram).

### Números de validação desta rodada

```
Server: 585/585 testes unitários
Server: typecheck — 0 erros
Server: migration:status — limpo (59 migrations no total)
Client: 49/49 testes
Client: build — ok
```
Smoke test ao vivo dos 3 módulos da Onda 1 (RFQ ponta a ponta, financeiro,
OEE) contra dados reais no Postgres do Docker local.

### Riscos residuais registrados (não resolvidos nesta rodada, decisão consciente)

- Conciliação bancária/CNAB (financeiro).
- Mapeamento automático departamento→centro de custo na AP automática.
- Campo de downtime/parada de máquina real para OEE preciso (hoje é
  aproximação por calendário de turnos).
- Decisão futura de `DROP TABLE` definitivo das 12 tabelas órfãs.
- Tela de reatribuição de contagem cíclica (endpoint `PUT
  /api/inventory-counts/:id/reassign` já existe, sem UI).
- Tela de cadastro do Item Mestre com o campo `fornecedor_padrao_id`
  (o campo existe e funciona no backend, mas nenhuma UI o consome ainda).
- `rfq_number` gerado por `COUNT(*)` do ano (`RFQ-<ano>-XXXX`) — mesma
  tolerância a corrida já aceita em outros geradores de número sequencial
  do projeto; mitigado por `UNIQUE(rfq_number)` (falha explícita em vez de
  duplicata silenciosa), sem retry automático.

**Documentos atualizados nesta consolidação:** `docs/arquitetura/API.md` (RFQ §11.1,
financeiro §6, OEE §7, nota de breaking change em §3), `docs/database/DATABASE.md`
(tabelas RFQ, `cost_centers`, correção das 7 colunas-bomba, `DEPRECATED`
nas 12 tabelas órfãs), `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` (seção 2,
tabela de módulos, item 9, seção "Bombas latentes conhecidas"),
`docs/governance/TODO.md` (itens novos de risco residual),
`docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` (entrada nova), `CLAUDE.md` (contagem de
migrations, roadmap), este arquivo (esta seção).

---

## Terceira rodada de 2026-08-06 — auth refresh + Winston, mobile/TV, telas web, vendas, produção, financeiro

**Contexto:** terceira rodada de entregas do dia (distinta das duas
anteriores registradas acima). Working tree não commitado no momento
desta entrada; migrations `20260806-000050/051/052/060/070` já aplicadas
no banco real, junto com as das rodadas anteriores (64 migrations no
total). 6 frentes:

### 1. Auth refresh + Winston

`POST /api/auth/refresh` (`RefreshTokenUseCase.ts`, header `Authorization:
Bearer <token válido>` → `{ success:true, data:{ token } }`) — renovação
deslizante sem refresh-token separado, mesmo `TokenService` de geração do
login, mesmas claims (`id`, `passwordVersion`, `iss`, `aud`), token já
expirado sempre 401 (cliente deve refazer login). Rate-limit 30/15min por
usuário. Testado ao vivo. Fecha a pendência "Decisão de produto — JWT de 7
dias × painel de TV sempre ligado" registrada em `docs/governance/TODO.md`
desde a auditoria multi-agente original de 2026-08-06.

Logging estruturado Winston (`server/src/config/logger.ts`) integrado no
request-logger (`server/src/middlewares/requestContext.ts`), no
`errorHandler` e no boot (`server/index.ts`) — JSON estruturado em
produção, formato colorido legível em dev, `LOG_FILE` opcional para
persistir em arquivo (**sem rotação de arquivo** — se usado em produção
real, rotação/logrotate deve ser configurada fora da aplicação, não
implementado nesta entrega).

### 2. Mobile/TV — paginação + renovação de sessão

`mobile/app/(app)/counts/index.tsx`: paginação incremental (20/página) nas
seções "Minhas contagens"/"Pool" — antes usava limite fixo de 100 itens,
sem paginação real (itens acima do limite simplesmente somiam da lista).
Fecha a pendência correspondente registrada na entrada de auditoria
multi-agente original.

Mobile ganha refresh do token ao abrir o app com sessão persistida
(`mobile/src/context/AuthContext.tsx`, chama `POST /api/auth/refresh` no
boot se já houver token salvo). TV ganha refresh **proativo** a cada 12h
(`tv/src/context/AuthContext.tsx`) — bem abaixo do TTL de 7 dias do JWT,
resolvendo de fato (não só documentando) a pendência do painel "sempre
ligado" chão de fábrica.

### 3. Web — 2 telas pendentes fechadas

**Reatribuição de contagem cíclica:** o endpoint
`PUT /api/inventory-counts/:id/reassign` já existia desde a remediação de
2026-08-06 original (`ReassignInventoryCountUseCase.ts`), mas sem UI.
Adicionado botão "Reatribuir" (com opção de devolver ao pool,
`assigned_to: null`) em `client/src/pages/products/InventoryCountsPage.tsx`,
gateado por permissão `approve` (mesma exigência do backend — só
gestor/admin reatribui).

**Fornecedor padrão do item:** campo `SelectNative` "Fornecedor padrão"
adicionado ao dialog de fornecedores do produto
(`client/src/pages/products/ProductsPage.tsx`, componente
`ProductSuppliersDialog`) — usa `PATCH /api/items/:id` com
`fornecedor_padrao_id` (já `INTEGER` desde a correção de "bomba latente"
da rodada anterior, `20260806-000040`). Lista só fornecedores `status:
'active'`. Texto de ajuda explica a implicação (MRP usa este fornecedor
para sugerir quem cotar/comprar ao gerar requisição). **Nota importante:**
isso cabeia o campo em uma tela já existente (o dialog de fornecedores do
produto), **não** é a tela de cadastro completa do Item Mestre canônico
(`items`), que continua sem nenhuma tela dedicada.

### 4. Vendas — 3 gaps fechados

Fecha a linha `sales` de `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`.

**Tabela de preços por cliente (gap 1/3):** tabela `customer_price_lists`
(migration `20260806-000050`, `customer_id`/`product_id`/`unit_price`/
`currency`/`valid_from`/`valid_until`/`active`), CRUD sob
`/api/sales/customers/:id/prices`
(`CreateCustomerPriceUseCase`/`UpdateCustomerPriceUseCase`/
`DeactivateCustomerPriceUseCase`/`ListCustomerPricesUseCase`), dialog
"Tabela de preços" em `client/src/pages/sales/ClientsPage.tsx`. Preço
sugerido (editável manualmente) ao adicionar item ao pedido em
`SalesPage.tsx`.

**Alteração de pedido confirmado (gap 2/3):** `PUT /api/sales/:id/items`
(`EditSaleItemsUseCase.ts`) substitui **todo** o conjunto de itens da
venda (não é PATCH incremental) — permitido em `quote`/`confirmed`,
bloqueado a partir de
`partially_invoiced`/`invoiced`/`shipped`/`canceled` com 422 didático
(`details.status`). Em `confirmed`, ajusta a reserva de estoque já
debitada na mesma transação (delta por produto). Protege linhas já
faturadas (parcial ou totalmente). Botão "Editar itens" em
`SalesPage.tsx`.

**Faturamento parcial (gap 3/3):** `sale_items.invoiced_quantity`
(migration `20260806-000051`, cumulativa entre emissões), novo status
`partially_invoiced` no ENUM `enum_sales_status` (migration
`20260806-000052`, transição automática `confirmed → partially_invoiced →
invoiced`, nunca manual via `PUT /:id/status`; embarque continua exigindo
faturamento total). `POST /api/sales/:id/nfe` (módulo `fiscal`,
`IssueSaleNfeUseCase.ts`) aceita `{ items: [{ sale_item_id, quantity }] }`
opcional — omitido/vazio preserva o comportamento anterior (fatura o
saldo pendente inteiro). Dialog de emissão de NF-e com seleção de
quantidade por item + indicador "faturado X de Y".

**Desvio de território justificado:** o módulo `sales` tocou o módulo
`fiscal` (`IssueSaleNfeUseCase.ts`, `fiscalController.ts`,
`fiscalValidators.ts`) para viabilizar o faturamento parcial — decisão
consciente, faturamento parcial é estruturalmente parte do fluxo de
emissão de NF-e (o dono real do endpoint `POST /:id/nfe` sempre foi o
módulo `fiscal`, montado sob o prefixo `/api/sales` por semântica de
ciclo de vida de venda).

**Risco residual real, documentado no código e aqui:** `Sale.nfe_*` guarda
só a NF-e **mais recente** — múltiplas emissões parciais sobrescrevem
chave/protocolo/XML uma da outra, **sem histórico por emissão**. Não é
bloqueante para uso mock/dev (o mock não distingue múltiplas NF-e reais),
mas é uma limitação real para produção com múltiplas NF-e por pedido —
requer nova tabela `sale_invoices` (1 venda : N NF-e), registrada em
`docs/governance/TODO.md`. Adicionalmente, `GetSaleNfeStatusUseCase` (path
assíncrono de provedores reais — `focus_nfe`/`enotas`, não o mock usado em
dev) **não** atualiza `invoiced_quantity`/`partially_invoiced`, só
finaliza a transição `confirmed → invoiced` — afeta apenas ambientes com
provider real configurado.

### 5. Produção — paradas + OEE preciso

Tabela `production_downtimes` (migration `20260806-000060`):
`work_center_id` (FK obrigatória), `production_order_id` (FK opcional),
`reason` (enum: setup/manutenção corretiva/preventiva/falta
material/falta operador/qualidade/outros), `notes`,
`started_at`/`finished_at` (parada em aberto quando `finished_at IS
NULL`). Endpoints `POST/PUT/GET /api/production/downtimes`
(`authorizeModule('chao_de_fabrica', ...)`, mesmo módulo de permissão do
apontamento de OP). **Bloqueio de 2ª parada aberta simultânea no mesmo
centro protegido em 2 níveis:** `OpenProductionDowntimeUseCase` (checagem
em aplicação) **e** índice único parcial no Postgres
(`uq_production_downtimes_open_per_work_center`, `work_center_id` WHERE
`finished_at IS NULL`) — o índice cobre corrida de escrita concorrente que
a checagem em aplicação sozinha não pega. UI em
`client/src/pages/production/ShopFloorPage.tsx`.

**OEE preciso:** `GetOeeReportUseCase.ts` passou a descontar downtime real
das horas de calendário — `available_hours = max(calendario_bruto -
downtime_hours, 0)` (satura em zero, nunca negativa). Payload ganha
`downtime_hours` (soma) e `downtime_by_reason` (breakdown por categoria).
**Remove a limitação documentada na rodada anterior** (Disponibilidade
era só uma aproximação por calendário de turnos, sem desconto de paradas
reais). Ver `docs/arquitetura/API.md` §7.

### 6. Financeiro — conciliação bancária (OFX)

Tabelas `bank_statements`/`bank_statement_entries` (migration
`20260806-000070`) — um registro por arquivo `.ofx` importado, e cada
`<STMTTRN>` do OFX com dedup **global** por `FITID` (contra qualquer
importação anterior, não só a mesma). Parser OFX **manual**
(`server/src/modules/financial/infrastructure/ofx/`), cobrindo OFX 1.x
(SGML) e OFX 2.x (XML) — **decisão justificada de não adicionar biblioteca
nova**: cobertura suficiente do subconjunto necessário para conciliação
bancária, sem dependência frágil numa área de upload de arquivo de
terceiro. Detecção de encoding (Latin-1/CP1252) é heurística.

Endpoints sob `/api/finance/reconciliation`: `POST /statements` (upload
multipart, campo `file`), `GET /statements`, `GET
/statements/:id/entries`, `GET /statements/:id/suggestions` (sugestões
automáticas — tolerância 1 centavo, ±7 dias de vencimento, **nunca
vincula sozinho**), `POST /entries/:id/match` (XOR `payable_id`/
`receivable_id`), `POST /entries/:id/ignore`, `POST /entries/:id/unmatch`
(**bloqueado com 422 se a conta já foi baixada** — correção manual
exigida, decisão conservadora). 4ª aba "Conciliação" em
`client/src/pages/financial/FinancialPage.tsx`
(`ReconciliationTab.tsx`, novo). **CNAB (boleto/remessa/retorno) fica fora
desta v1** — próxima etapa do módulo, sem data definida.

### Números finais de validação (rodados nesta consolidação)

```
Server: 669/669 testes unitários (85 suítes)
Server: typecheck — 0 erros
Server: migration:status — limpo (64 migrations no total)
Client: 51/51 testes
Client: typecheck — 0 erros
Client: build — ok
```

### Riscos residuais gerais registrados (decisão consciente de não resolver nesta rodada)

- Sem teste de integração end-to-end contra Postgres real para
  conciliação bancária, downtime (índice único parcial) e faturamento
  parcial — só unitários com mocks.
- Detecção de encoding do OFX é heurística (Latin-1/CP1252).
- `GetSaleNfeStatusUseCase` (provedores reais) não atualiza
  `invoiced_quantity`/`partially_invoiced` — só o mock/fluxo síncrono via
  `POST /:id/nfe` faz.
- Histórico multi-NF-e por pedido (`sale_invoices`) não existe —
  `Sale.nfe_*` só guarda a emissão mais recente.
- CNAB continua fora de escopo.

**Documentos atualizados nesta consolidação:** `docs/arquitetura/API.md` (auth
refresh §1, vendas §5, financeiro §6, relatórios §7 — OEE com downtime +
`/api/production/downtimes`), `docs/database/DATABASE.md` (`customer_price_lists`,
`sale_items.invoiced_quantity` + `partially_invoiced`,
`production_downtimes`, `bank_statements`/`bank_statement_entries`),
`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` (linhas `sales`/`financial`, item 9),
`docs/governance/TODO.md` (itens marcados `[x]`, novos `[ ]` de risco
residual), `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` (entrada nova), `CLAUDE.md`
(contagem de migrations, módulos/telas novas), este arquivo (esta seção).

---

## Patrimônio × Manutenção — sincronização automática de `Asset.status`

**Data**: 2026-08-06
**Escopo**: `server/src/modules/maintenance/`
**Status**: ✅ Concluído

### Resumo da feature

Até esta entrega, `Asset.status` só era alterado manualmente — uma ordem
de manutenção (OM) aberta/em andamento **não** tirava o ativo de operação
na tela de Patrimônio; um ativo `in_maintenance` continuava aparecendo
como `active`. O valor `in_maintenance` já existia no enum
`enum_assets_status` (`server/src/models/Asset.ts`), mas nada no código o
atribuía. Gap já rastreado como RF-PAT-05 `[PENDENTE]` em
`docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` §8 e confirmado em
`docs/governance/TODO.md` (achado "2) `Asset.status` sem sincronização
automática").

**Decisão de negócio tomada:** sincronização automática (não manual).

**Gatilhos escolhidos** (documentados em JSDoc nos próprios use cases):
- **Início do serviço:** a criação da OM
  (`CreateMaintenanceOrderUseCase`) sempre nasce com `status: 'open'`
  (aguardando início) — **não** é o gatilho certo para tirar o ativo de
  operação. O gatilho real é a **transição da OM para `in_progress`**, em
  `UpdateMaintenanceOrderUseCase` — é quando o técnico efetivamente começa
  o serviço. Nesse momento: `Asset.status → 'in_maintenance'`.
- **Fim do serviço:** conclusão (`status: 'completed'`, em
  `UpdateMaintenanceOrderUseCase`) ou cancelamento (`status: 'canceled'`,
  em `CancelMaintenanceOrderUseCase`) tentam devolver `Asset.status →
  'active'`, **mas só se**:
  1. o ativo ainda estiver `in_maintenance` no momento (o `UPDATE` usa
     `WHERE status = 'in_maintenance'` — nunca sobrescreve
     `decommissioned`/`lost`/`returned_to_supplier`; se o ativo foi
     baixado durante a manutenção, a conclusão da OM não o "ressuscita");
     e
  2. **não existir nenhuma outra OM aberta** (`open`/`scheduled`/
     `in_progress`/`waiting_parts`) para o mesmo ativo — o módulo
     `maintenance` **permite múltiplas OMs simultâneas por ativo** (sem
     índice único/checagem de exclusividade em
     `CreateMaintenanceOrderUseCase`), então esse caso não é trivial e é
     coberto por teste dedicado.

Toda a sincronização roda **na mesma transação Sequelize** da mudança da
OM, com `SELECT ... FOR UPDATE` na ordem de manutenção antes de decidir
(mesmo padrão de `findByIdForUpdate` + `sequelize.transaction()` +
`commit`/`rollback` já usado em `ChangeProductionOrderStatusUseCase` e
`FinishProductionDowntimeUseCase`).

### Arquivos alterados

- `server/src/modules/maintenance/domain/repositories/MaintenanceRepository.ts`
  — contrato ganhou `findByIdForUpdate(id, transaction)`,
  `update(id, data, transaction?)` (parâmetro `transaction` agora
  opcional), `markAssetInMaintenance(assetId, transaction)` e
  `releaseAssetFromMaintenanceIfNoOtherOpenOrders(assetId,
  excludeOrderId, transaction)` — todos com JSDoc completo.
- `server/src/modules/maintenance/infrastructure/sequelize/SequelizeMaintenanceRepository.ts`
  — implementação Sequelize dos 4 métodos novos/alterados. Usa o `Asset`
  já importado (era usado só em `include`) para os dois `UPDATE`
  condicionais; `MaintenanceOrder.count(...)` com `Op.ne`/`Op.in` para
  contar outras OMs abertas do mesmo ativo.
- `server/src/modules/maintenance/application/use-cases/UpdateMaintenanceOrderUseCase.ts`
  — passou a rodar dentro de `sequelize.transaction()`, buscando a OM com
  `findByIdForUpdate` antes de decidir o efeito colateral sobre
  `Asset.status`. JSDoc do método `execute` documenta a escolha de
  gatilho.
- `server/src/modules/maintenance/application/use-cases/CancelMaintenanceOrderUseCase.ts`
  — mesmo padrão de transação; cancelamento agora também tenta liberar o
  ativo.
- `server/src/modules/assets/` — **não foi necessário nenhum método
  novo**; o repositório de `maintenance` já importava o model `Asset`
  diretamente (para `include` nas consultas), então os `UPDATE`
  condicionais de status ficaram na própria infraestrutura do módulo
  `maintenance`, sem cruzar a fronteira do módulo `assets`.
- `server/tests/unit/maintenance-use-cases.test.ts` — reescrito: 13
  casos (eram 4), cobrindo os use cases com repositório mockado (padrão
  `mockTransaction` igual a `production-downtime.test.ts`) e 3 casos
  adicionais exercitando a query/condição real de
  `releaseAssetFromMaintenanceIfNoOtherOpenOrders` no repositório
  Sequelize (com `jest.doMock` do model, sem Postgres).
- Sem migration — `in_maintenance` já existia no enum
  `enum_assets_status`.

### Documentações atualizadas

- `docs/governance/TODO.md` — os 2 achados abertos sobre este gap
  (`RF-PAT-05`) marcados `[x]` com evidência (arquivos alterados, número
  de testes, resultado de `typecheck`); nota de atualização adicionada
  onde o gap era citado como ressalva em `docs/patrimonio/03-MANUTENCAO.md`
  (arquivo em si **não** editado por este agente — território exclusivo
  de `server/`; fica para o agente de documentação atualizar a ressalva
  na próxima rodada).
- Este arquivo (`docs/governance/HANDOFF_CODEX.md`, esta seção).
- **Não alterados por este agente** (território de outros agentes em
  paralelo, conforme instrução): `docs/arquitetura/API.md`, `docs/arquitetura/`
  (inclui `DOCUMENTO_DE_REQUISITOS.md` §8 e
  `DIAGRAMA_CASOS_DE_USO_BPMN.md` §5, que citam RF-PAT-05), `docs/projeto/`,
  `docs/business/`, `docs/patrimonio/`.

### Instruções de teste para o próximo agente/humano

**Automatizado (já validado nesta entrega):**
```bash
cd server
npm run typecheck              # 0 erros
npx jest tests/unit            # 680/680 (era 671 antes desta entrega)
npx jest tests/unit/maintenance-use-cases.test.ts   # 13/13
```

**Manual (tela de Patrimônio + Manutenção, `client/`), a validar por QA
humano ou pelo próximo agente de frontend:**
1. Criar um ativo `active` e abrir uma OM para ele
   (`POST /api/maintenance`) — status da OM nasce `open`; `Asset.status`
   deve permanecer `active` (criação não é gatilho).
2. Iniciar a OM (`PUT /api/maintenance/:id` com `status: 'in_progress'`)
   — `Asset.status` deve virar `in_maintenance` e refletir na tela de
   Patrimônio (`GET /api/assets/:id` ou listagem).
3. Concluir a OM (`status: 'completed'`) — `Asset.status` deve voltar
   para `active`.
4. Repetir 1–2 com **duas** OMs para o mesmo ativo (ambas `in_progress`).
   Concluir apenas uma — `Asset.status` deve **permanecer**
   `in_maintenance` (a outra OM ainda está aberta). Concluir a segunda —
   aí sim `Asset.status` deve virar `active`.
5. Cenário de baixa durante manutenção: com uma OM `in_progress` (ativo
   `in_maintenance`), inativar o ativo por outro caminho (`DELETE
   /api/assets/:id` → `decommissioned`) e então concluir a OM —
   `Asset.status` deve **permanecer** `decommissioned` (não voltar para
   `active`).
6. Cancelar uma OM `in_progress` sem outra OM aberta
   (`DELETE /api/maintenance/:id`) — `Asset.status` deve voltar para
   `active`, mesmo comportamento do item 3.

### Riscos residuais

- Sem teste de integração real contra Postgres (só unitário com mocks)
  para o `SELECT ... FOR UPDATE` da OM e para os dois `UPDATE`
  condicionais do `Asset` — recomendado no próximo ciclo de integração
  real do módulo `maintenance`, mesmo padrão do risco já registrado para
  conciliação bancária/downtime/faturamento parcial.
- `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` §8 (RF-PAT-05) e
  `docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md` §5 (gap desenhado
  explicitamente no BPMN de Manutenção) ainda descrevem o comportamento
  antigo (sem sincronização) — não foram atualizados por este agente
  (fora do território desta entrega); pendente de atualização pelo
  agente de documentação/arquitetura.
- `docs/patrimonio/03-MANUTENCAO.md` também cita a ressalva antiga —
  mesma pendência de atualização por outro agente.

---

## UC-19 — Importação/COMEX (backend completo, sem tela)

**Data**: 2026-08-06
**Escopo**: Implementar o backend completo do UC-19 ("Gerenciar Importação
(COMEX)", `docs/projeto/04-USE_CASES.md`, decisão do dono do ERP:
implementar o que estava documentado e nunca codificado). Território:
`server/src/modules/comex/` (novo), `server/src/models/` (2 models novos),
`server/migrations/20260806-000090-create-import-processes.cjs`,
`server/app.ts`, `server/tests/`.
**Status**: ✅ Backend concluído. ✅ **Tela web entregue no mesmo dia** — ver
seção "UC-19 — Importação/COMEX: tela web (`client/`)" no final deste
arquivo.

### O que o UC-19 pedia

Ator: Analista de Comex. Pré-condição: fornecedor internacional cadastrado.
Fluxo principal (6 passos): (1) acessar "Suprimentos > Importação"; (2)
registrar processo de importação; (3) informar fornecedor, produto,
quantidade, valor FOB; (4) sistema calcula tributos de importação (II,
IPI, PIS, COFINS, ICMS); (5) registrar acompanhamento (embarque, chegada,
desembaraço); (6) após recebimento, dar entrada no estoque com custo
nacionalizado.

### Decisões tomadas em pontos vagos do UC (documentadas explicitamente)

1. **"Fornecedor internacional cadastrado"** — o UC não pede um cadastro
   de fornecedor diferenciado. Reaproveitado o `Supplier` (`suppliers`)
   existente sem nenhuma alteração de schema (sem campo "país"/"fornecedor
   estrangeiro" dedicado) — qualquer fornecedor cadastrado pode ser usado
   num processo de importação.
2. **Alíquotas de tributos** — informadas manualmente pelo Analista de
   Comex, por item (`ii_rate`, `ipi_rate`, `pis_rate`, `cofins_rate`,
   `icms_rate`, percentuais `DECIMAL(7,4)`). **Sem integração
   Siscomex/tabela NCM** para resolvê-las automaticamente — o UC não pede
   essa integração, então nenhum stub foi criado (instrução explícita do
   orquestrador desta rodada: não inventar complexidade não pedida).
3. **Fórmula de cálculo dos tributos** — simplificada mas seguindo a
   prática fiscal padrão brasileira (não é uma engine de compliance fiscal
   certificada): valor aduaneiro = FOB do item em BRL (quantidade × preço
   unitário × câmbio) + frete/seguro do processo, rateados entre os itens
   proporcionalmente ao FOB de cada um; II = aduaneiro × alíquota; IPI =
   (aduaneiro + II) × alíquota; PIS/COFINS = aduaneiro × alíquota (base
   simplificada — a base real de PIS/COFINS-Importação é mais complexa);
   ICMS = cálculo "por dentro" (gross-up) sobre aduaneiro + II + IPI + PIS
   + COFINS + despesas rateadas; custo unitário nacionalizado = soma de
   tudo ÷ quantidade. Implementado em
   `server/src/modules/comex/application/use-cases/importTaxCalculator.ts`
   (função pura, comentário extenso no cabeçalho do arquivo, 3 testes
   unitários dedicados).
4. **"Registra acompanhamento"** — em vez de uma tabela de eventos
   separada, implementado como transições sequenciais de `status`
   (`draft → shipped → arrived → customs_cleared → received | cancelled`)
   com uma coluna de data por marco (`shipped_at`/`arrived_at`/
   `customs_cleared_at`/`received_at`). Simplificação deliberada: o UC
   lista só 3 marcos fixos (embarque/chegada/desembaraço), não pede
   histórico multi-evento arbitrário; a rastreabilidade de quem/quando
   registrou cada transição já fica coberta pelo `logAction` (audit log
   padrão do projeto), sem precisar de tabela extra.
5. **Entrada em estoque (passo 6)** — reaproveita **integralmente** a
   infraestrutura já testada de `InventoryService.receive` (incrementa
   `Product.quantity` legado + cria `InventoryMovement`) e
   `CostingService.registerWeightedAverageCost` (atualiza `Product.cost_price`
   por média ponderada), no mesmo padrão de `ReceivePurchaseItemsUseCase`/
   `AwardRfqUseCase` — inclusive a mesma exigência de existir um `Product`
   legado com `code = items.codigo` (dual-system Product/Item documentado
   no `CLAUDE.md`). **`reference_type`/`source_type` gravados como
   `'purchase'`** (não existe valor `'import'` nos ENUMs
   `inventory_movements.reference_type`/`product_cost_ledgers.source_type`
   — criar um exigiria migração em 2 tabelas de altíssimo tráfego
   compartilhadas por todo o ERP, fora do território exclusivo deste
   módulo); a rastreabilidade específica da importação fica preservada via
   `reference_id`/`source_id` = `import_processes.id` e via
   `description`/`notes` citando o número do processo (`IMP-<ano>-XXXX`).
6. **Sem Conta a Pagar automática de tributos** — o UC não pede esse
   gatilho, e `AccountPayable` (`accounts_payable`) não tem suporte a
   moeda estrangeira nem a "tributo pago via DARF/guia" como categoria
   nativa. Decisão: não gerar automaticamente; fica registrado como
   melhoria futura em `docs/governance/TODO.md`.

### Arquivos criados/modificados

#### Criados
- `server/migrations/20260806-000090-create-import-processes.cjs` — cria
  `import_processes` e `import_process_items` (ver colunas na seção
  "Modelo de dados" abaixo). `up`/`down` testados em ciclo real (`up` →
  `down` → `up`, `migration:status` confirma).
- `server/src/models/ImportProcess.ts`, `server/src/models/ImportProcessItem.ts`
- `server/src/modules/comex/domain/repositories/ComexRepository.ts`
- `server/src/modules/comex/infrastructure/sequelize/SequelizeComexRepository.ts`
- `server/src/modules/comex/application/use-cases/importTaxCalculator.ts`
  (função pura, sem `export =`)
- `server/src/modules/comex/application/use-cases/recalculateImportProcessTaxes.ts`
  (helper compartilhado, sem `export =`)
- `server/src/modules/comex/application/use-cases/CreateImportProcessUseCase.ts`
- `server/src/modules/comex/application/use-cases/ListImportProcessesUseCase.ts`
- `server/src/modules/comex/application/use-cases/GetImportProcessByIdUseCase.ts`
- `server/src/modules/comex/application/use-cases/RegisterImportTrackingUseCase.ts`
- `server/src/modules/comex/application/use-cases/CancelImportProcessUseCase.ts`
- `server/src/modules/comex/application/use-cases/ReceiveImportProcessUseCase.ts`
- `server/src/modules/comex/presentation/validators/importProcessValidators.ts`
- `server/src/modules/comex/presentation/controllers/importProcessController.ts`
- `server/src/modules/comex/presentation/routes/importProcesses.ts`
- `server/tests/unit/comex.test.ts` (17 testes)

#### Modificados
- `server/src/models/index.ts` — imports `ImportProcess`/`ImportProcessItem`
  + associações (`Supplier↔ImportProcess`, `User↔ImportProcess`,
  `ImportProcess↔ImportProcessItem` CASCADE, `Item↔ImportProcessItem`) +
  export.
- `server/src/shared/domain/accessModules.ts` — chave `'comex'` adicionada
  ao catálogo `ACCESS_MODULES` (mesmo padrão de `manutencao`/`garantia`,
  2026-08-05). **Atenção, agente de `accessProfiles`/RH**: perfis de
  acesso existentes precisam atribuir o módulo `comex` manualmente para
  que o Analista de Comex consiga usar as rotas (nenhum perfil ganhou essa
  permissão automaticamente).
- `server/app.ts` — `app.use('/api/comex/import-processes', ...)`
  montado logo após `/api/rfqs`.
- `server/tests/unit/module-authorization-map.test.ts` — `'comex'`
  adicionado a `MODULES_REQUIRING_AUTHORIZE_MODULE` (guarda anti-regressão
  já existente, cobre 100% das pastas de `src/modules/`).

### Modelo de dados (não documentado em `docs/database/DATABASE.md` nesta rodada —
ver nota de território abaixo; resumo aqui para quem for consolidar)

**`import_processes`** (cabeçalho):
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | INTEGER PK | |
| `process_number` | VARCHAR(60) UNIQUE | `IMP-<ano>-XXXX`, sequencial por ano (mesma limitação de concorrência já documentada para `RfqRepository.countRfqsInYear`) |
| `supplier_id` | INTEGER FK `suppliers.id` RESTRICT | |
| `status` | ENUM | `draft`\|`shipped`\|`arrived`\|`customs_cleared`\|`received`\|`cancelled` |
| `fob_currency` | VARCHAR(3) | default `USD` |
| `exchange_rate` | DECIMAL(18,6) | câmbio moeda estrangeira → BRL |
| `freight_value`, `insurance_value`, `other_expenses_value` | DECIMAL(18,6) | em BRL, rateados pro-rata do FOB entre os itens |
| `shipped_at`, `arrived_at`, `customs_cleared_at`, `received_at` | DATEONLY nullable | um por marco do acompanhamento |
| `notes` | TEXT nullable | |
| `created_by` | INTEGER FK `users.id` RESTRICT | |

**`import_process_items`**:
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | INTEGER PK | |
| `import_process_id` | INTEGER FK `import_processes.id` CASCADE | |
| `item_id` | UUID FK `items.id` RESTRICT | |
| `quantity`, `fob_unit_price` | DECIMAL(18,6) | FOB na moeda estrangeira do processo |
| `ii_rate`, `ipi_rate`, `pis_rate`, `cofins_rate`, `icms_rate` | DECIMAL(7,4) | percentual, informado manualmente |
| `customs_value`, `ii_value`, `ipi_value`, `pis_value`, `cofins_value`, `icms_value`, `nationalized_unit_cost` | DECIMAL(18,6) nullable | calculados por `importTaxCalculator.ts` |

### Rotas e payloads (para o agente de frontend)

Todas sob `/api/comex/import-processes`, exigem header `Authorization:
Bearer <token>` + `authorizeModule('comex', ...)` (`operate` para escrita,
qualquer nível para leitura). Respostas no padrão do projeto:
`{ success: true, data: ... }` / `{ success: true, data: [...], pagination: {...} }`.

**`GET /`** — query params opcionais: `page`, `limit` (max 100), `status`,
`supplier_id`. Retorna lista com `items` (cada um com `item: { codigo,
descricao }`), `supplier`, `createdBy`.

**`GET /:id`** — detalhe completo (mesmo shape do item da lista, com todos
os itens/tributos calculados).

**`POST /`** — cria o processo (status nasce `draft`):
```json
{
  "supplier_id": 12,
  "fob_currency": "USD",
  "exchange_rate": 5.35,
  "freight_value": 1500.00,
  "insurance_value": 200.00,
  "other_expenses_value": 0,
  "notes": "opcional",
  "items": [
    {
      "item_id": "uuid-do-item",
      "quantity": 1000,
      "fob_unit_price": 4.20,
      "ii_rate": 60,
      "ipi_rate": 8,
      "pis_rate": 2.1,
      "cofins_rate": 9.65,
      "icms_rate": 18
    }
  ]
}
```
Retorna 201 com o processo criado, itens já com `customs_value`/`*_value`/
`nationalized_unit_cost` calculados (estimativa inicial — pode mudar se o
câmbio/frete forem atualizados depois via `/tracking`).

**`POST /:id/tracking`** — registra o próximo marco (precisa ser
exatamente o próximo da sequência `shipped → arrived → customs_cleared`;
pular etapa ou repetir dá `422`):
```json
{
  "event": "shipped",
  "event_date": "2026-08-10",
  "exchange_rate": 5.40,
  "freight_value": 1600.00,
  "insurance_value": 200.00,
  "other_expenses_value": 50.00,
  "notes": "opcional"
}
```
Só `event` é obrigatório; os campos monetários são opcionais — se
informados, o cabeçalho é atualizado e **todos os itens são recalculados**
na mesma chamada.

**`POST /:id/receive`** — sem body (o backend recalcula tudo fresco antes
de dar entrada). Exige status `customs_cleared`; dá `422` se o item não
tiver um `Product` legado correspondente (`items.codigo` sem
`products.code` — mesma exigência de `AwardRfqUseCase`, então o frontend
deve tratar esse erro com uma mensagem clara pedindo para cadastrar o
produto correspondente antes). Sucesso → status vira `received`,
`received_at` preenchido, estoque incrementado, custo médio do `Product`
atualizado.

**`POST /:id/cancel`** — `{ "reason": "motivo com pelo menos 3 caracteres" }`.
Bloqueado se o processo já estiver `received` (`422`).

### Documentações atualizadas

- Este arquivo (`docs/governance/HANDOFF_CODEX.md`, esta seção).
- `docs/governance/TODO.md` — nova seção "2026-08-06 (apêndice 7)" com o
  item UC-19/RF-COM-12 marcado `[x]`/`[IMPLEMENTADO]`.
- JSDoc completo em todos os arquivos novos (models, repositório,
  use cases, controller, rotas).
- **Não alterados por este agente** (território de outros agentes em
  paralelo, instrução explícita do orquestrador desta rodada):
  `docs/arquitetura/API.md`, `docs/arquitetura/`, `docs/projeto/` (inclui
  `04-USE_CASES.md`, onde o UC-19 deveria idealmente ganhar uma nota "✅
  implementado"), `docs/business/`, `docs/patrimonio/`,
  `docs/database/DATABASE.md` (schema resumido nesta seção para quem for
  consolidar). Fica pendente para o próximo agente de documentação
  atualizar esses arquivos com o resultado desta entrega.

### Instruções de teste para o próximo agente/humano

**Automatizado (já validado nesta entrega):**
```bash
cd server
npm run typecheck                 # 0 erros
npx jest tests/unit               # 86 suites / 698 testes, 100% verde
npx jest tests/unit/comex.test.ts # 17/17
npm run migration:status          # confirma 20260806-000090 "up"
```

**Manual/integração (a validar por QA humano ou pelo próximo agente,
contra Postgres real — esta rodada só validou com repositórios
mockados):**
1. Login como usuário com perfil de acesso contendo o módulo `comex`
   (**lembrete**: nenhum perfil existente tem isso automaticamente — via
   `PUT/POST /api/access-profiles`, adicionar `{ module: 'comex', level:
   'operate' }` a um perfil e atribuí-lo a um usuário de teste, ou usar o
   `admin` global que ignora o sistema de perfis).
2. `POST /api/comex/import-processes` com um item real (`item_id` de um
   `Item` existente que tenha um `Product` legado com `code` igual ao
   `codigo` do item — checar via `GET /api/items` e conferir se existe
   produto correspondente). Confirmar `process_number` no padrão
   `IMP-2026-0001`, tributos calculados nos itens.
3. `POST /:id/tracking` 3 vezes em sequência (`shipped`, `arrived`,
   `customs_cleared`); tentar pular direto para `customs_cleared` a partir
   de `draft` deve dar `422`.
4. `POST /:id/receive` — conferir no `GET /api/inventory/movements?product_id=...`
   que a movimentação `in` foi criada, e que `Product.quantity`/
   `Product.cost_price` mudaram como esperado; conferir
   `product_cost_ledgers` para o registro de custo nacionalizado aplicado.
5. `POST /:id/cancel` num outro processo `draft`/`shipped`/`arrived` —
   confirmar bloqueio (`422`) se tentado num processo já `received`.
6. Tela web: ainda não existe — próximo agente de frontend
   (`PromadorFonteEnd`) deve construir `Suprimentos > Importação` contra
   as rotas acima.

### Riscos residuais

- Sem teste de integração real contra Postgres para o fluxo completo
  create→tracking→receive (transações, locks `SELECT ... FOR UPDATE`,
  concorrência) — mesmo padrão de risco já registrado para conciliação
  bancária/downtime/faturamento parcial/manutenção.
- Fórmula de tributos é uma simplificação fiscal documentada, não uma
  engine de compliance certificada — se o negócio precisar de precisão
  fiscal real (ex.: para fins de escrituração), avaliar integração futura
  com um serviço de cálculo tributário dedicado.
- `docs/projeto/04-USE_CASES.md` (UC-19) ainda não tem a nota "✅
  implementado" — pendente do agente de documentação/projeto.
- Nenhum perfil de acesso existente tem o módulo `comex` atribuído — o
  Analista de Comex precisa ser configurado manualmente antes do primeiro
  uso em produção (ver "Instruções de teste", item 1).

---

## UC-19 — Importação/COMEX: tela web (`client/`)

**Data**: 2026-08-06
**Escopo**: Construir a tela web (`client/`) contra o backend do UC-19
descrito na seção anterior. Território: `client/` (novo `src/api/comex.ts`,
nova página `src/pages/purchases/ComexPage.tsx`, rota em `src/App.tsx`, item
de menu em `src/layouts/AppLayout.tsx`, chave `comex` adicionada a
`AccessModuleKey` em `src/api/accessProfiles.ts`), mais os 4 arquivos de
registro (`docs/governance/HANDOFF_CODEX.md`, `docs/governance/TODO.md`,
`docs/governance/CRONOGRAMA_FRONTEND_2026-07-31.md`,
`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`). `server/`, `docs/arquitetura/API.md`,
`docs/arquitetura/`, `docs/database/`, `docs/projeto/` não foram tocados
(território de outros agentes em paralelo).
**Status**: ✅ Concluído — `npx tsc --noEmit` (0 erros), `npx vitest run`
(51/51, mesma baseline de antes desta entrega) e `npm run build` (sucesso)
validados a partir de `client/`. Testado manualmente com `curl` contra o
backend real (porta 5000, login `admin@evokaudio.com.br`): criação de
processo, `GET`/`GET :id`, transição de tracking válida (`shipped`) e
inválida (pulando para `customs_cleared`, 422 confirmado) e cancelamento —
registro de teste cancelado ao final para não sujar o banco de
desenvolvimento.

### Componentes/arquivos criados

- `client/src/api/comex.ts` — serviço de API com todos os tipos TypeScript
  estritos dos payloads (`ImportProcess`, `ImportProcessItem`,
  `CreateImportProcessInput`, `RegisterImportTrackingInput`, etc.) e as 6
  funções (`listImportProcesses`, `getImportProcessById`,
  `createImportProcess`, `registerImportTracking`, `receiveImportProcess`,
  `cancelImportProcess`) espelhando exatamente os contratos documentados na
  seção anterior deste arquivo (confirmados contra o código real de
  `server/src/modules/comex/presentation/` antes de escrever qualquer tipo).
  Valores DECIMAL(18,6) tipados como `string | number` (o backend serializa
  DECIMAL como string em JSON) — sem conversão/arredondamento client-side
  além do `Number(...)` de exibição, mesmo padrão já usado em `rfq.ts`.
- `client/src/pages/purchases/ComexPage.tsx` — tela principal:
  - Listagem paginada (`Pagination`) com filtro por status (`SelectNative`),
    badges semânticos por status (`success`=recebido, `warning`=embarcado/
    chegou, `default`=desembaraçado, `secondary`=rascunho,
    `destructive`=cancelado — mesma convenção de `RfqPage`/`PurchasesPage`).
  - Diálogo de criação (`Dialog` central, não `Sheet`) com `react-hook-form`
    + `zod`: fornecedor (`SelectNative`), moeda FOB, câmbio,
    frete/seguro/outras despesas, e um `useFieldArray` de itens (busca de
    item via `ItemSearchSelect`, quantidade, preço FOB unitário e as 5
    alíquotas II/IPI/PIS/COFINS/ICMS em %). Números com `type="number"
    step="any"` + `z.coerce.number()`, mesmo padrão de precisão numérica já
    estabelecido em `RfqPage`/`PurchasesPage` para campos `DECIMAL(18,6)`
    (sem lib de máscara dedicada no projeto para isso — não introduzida
    nesta entrega para não divergir do padrão existente).
  - `ImportProcessDetailDialog` (`Dialog` centralizado, seguindo o padrão
    recém-adotado pelo Pedido de Compra, não `Sheet` lateral): cabeçalho com
    `DetailField` (fornecedor, câmbio, frete/seguro/despesas, datas dos 4
    marcos), tabela de itens com todos os tributos calculados e o custo
    nacionalizado unitário em destaque (`tabular-nums`, alinhados à
    direita), e os botões de ação condicionados a `canWrite`
    (`hasRole('admin','operator')`) e ao `status` atual.
  - `RegisterTrackingDialog`: registra o próximo marco sequencial
    (`shipped → arrived → customs_cleared`, calculado por
    `NEXT_TRACKING_EVENT`); campos monetários opcionais usam **estado local
    simples (não `react-hook-form`/`zod`)** — a combinação de campos
    numéricos opcionais com `zodResolver` gerou um conflito de inferência de
    tipos entre `z.infer` (saída) e o `Resolver<TFieldValues>` esperado por
    `useForm` (erro só aparece em `tsc -b` do `npm run build`, não em
    `tsc --noEmit` solto — os dois foram rodados nesta entrega justamente
    por isso). Mesmo padrão já usado em `ReceiveItemsDialog`
    (`PurchasesPage.tsx`), que também evita RHF/zod para esse tipo de campo.
  - `CancelImportProcessDialog`: motivo obrigatório (mín. 3 caracteres,
    mesma regra do backend), com `Button variant="destructive"`.
  - Ações críticas (receber, cancelar) usam `window.confirm(...)` antes de
    disparar a mutation, mesmo padrão de `PurchasesPage.tsx`/
    `RequisitionsPage.tsx` para cancelamento de pedido/requisição.
- `client/src/App.tsx` — rota `/purchases/comex` (lazy-loaded), envolvida em
  `<ModuleRoute module="comex" />` (guard de módulo próprio, não reaproveita
  `compras` — o backend exige `authorizeModule('comex', ...)` dedicado).
- `client/src/layouts/AppLayout.tsx` — item "Importação (Comex)" (ícone
  `Container`, lucide-react) na seção "Compras" do `NAV_SECTIONS`, logo após
  "Cotação (RFQ)"; entrada correspondente em `PAGE_TITLES` para o
  breadcrumb. Nenhuma mudança na lógica de `activeSection`/departamentos.
- `client/src/api/accessProfiles.ts` — chave `'comex'` adicionada ao union
  type `AccessModuleKey` (client), espelhando
  `server/src/shared/domain/accessModules.ts` (que já tinha `comex` desde a
  entrega do backend). **Sem essa mudança o menu/rota não compilariam** —
  gap que este agente encontrou e fechou (o backend já documentava a
  necessidade de perfis atribuírem o módulo manualmente, mas não apontava
  que o catálogo TypeScript do client também precisava da chave nova).

### Decisões de UX

1. **Alíquotas em porcentagem inteira legível (ex.: `60` para 60%)** — mesma
   convenção do payload documentado pelo backend (`ii_rate: 60`), sem
   converter para fração decimal na tela.
2. **Sem filtro de fornecedor na listagem** (só status) — o backend suporta
   `supplier_id` como filtro, mas o volume esperado de processos de
   importação é baixo (item cotado como de "baixa prioridade de UX" por
   analogia à decisão já tomada em `RfqPage`, que também só filtra por
   status); pode ser adicionado depois sem quebra de contrato.
3. **Botão de próximo marco sempre no singular e nomeado** (ex.: "Registrar
   embarque", não um genérico "Avançar status") — mais didático para o
   Analista de Comex do que expor o nome técnico do evento.
4. **Aviso permanente sobre a simplificação fiscal** — texto fixo abaixo da
   tabela de itens no detalhe ("Tributos calculados de forma simplificada
   [...], sem integração Siscomex/NCM"), para não deixar o usuário achar que
   os valores calculados têm certificação fiscal (mesmo risco documentado
   pelo backend).

### O que o Agente QA (ou humano) deve testar na interface

1. Login como `admin` (ignora perfis) **ou** um usuário cujo perfil de
   acesso tenha `{ module: 'comex', level: 'operate' }` atribuído
   manualmente via `/users/access-profiles` (nenhum perfil tem isso por
   padrão — confirmar que o comportamento de "Acesso Negado" aparece para
   quem não tem o módulo, e que some assim que o módulo é atribuído).
2. `/purchases/comex`: criar um processo com 1+ itens, conferir que os
   tributos (`II`/`IPI`/`PIS`/`COFINS`/`ICMS`) e o custo nacionalizado
   aparecem no detalhe assim que criado (cálculo inicial, sem precisar de
   `/tracking`).
3. Registrar os 3 marcos em sequência (embarque → chegada → desembaraço) e
   confirmar que o botão de próximo marco muda de rótulo a cada etapa, e que
   informar um novo câmbio/frete no diálogo de acompanhamento recalcula os
   valores da tabela de itens no detalhe.
4. Tentar `Receber` antes de `customs_cleared`: o botão não deve aparecer
   (ação condicionada ao status no client; a validação de verdade é sempre
   do backend, 422 se forçado via API direta).
5. Receber um processo cujo item **não tenha** `Product` legado
   correspondente e confirmar que o erro 422 aparece como alerta didático
   (`DidacticAlert`), não como stack trace cru.
6. Cancelar um processo `draft`/`shipped`/`arrived` com motivo — confirmar
   que o botão de cancelar some para processos `received`/`cancelled`.
7. Validar responsividade/hierarquia visual fina (cores, espaçamento,
   alinhamento) — esta entrega priorizou estrutura funcional; um passe do
   agente `webdesiner` sobre `ComexPage.tsx` é recomendado antes do Go-Live,
   seguindo o mesmo processo de handoff usado nas demais telas recentes.

### Riscos residuais

- Sem teste E2E real em navegador (Cypress/Playwright não fazem parte do
  stack do projeto) — validação limitada a `tsc`/`vitest`/`build` +
  chamadas manuais de `curl` contra o backend real.
- `docs/arquitetura/API.md` não foi atualizado com os endpoints de COMEX (fora do
  território deste agente — pendente do próximo agente de documentação/
  backend, mesma pendência já registrada na seção anterior deste arquivo).
- Nenhum ajuste fino de polimento visual (`webdesiner`) foi aplicado —
  `ComexPage.tsx` segue a estrutura de `RfqPage.tsx`/`PurchasesPage.tsx`
  ponto a ponto, mas não passou por uma revisão dedicada de hierarquia
  visual/responsividade.

---

## 2026-08-06 (webdesiner) — Sidebar sempre visível + Atalhos por departamento

### O que motivou

A reformulação de navegação por departamento do mesmo dia introduziu
`showSidebar = activeSection.items.length > 1`, ocultando a coluna lateral
para departamentos com uma única página (Início, Vendas). O dono do produto
apontou que isso deixava a área ali "vazia"/inconsistente com o resto do
app (viu Logística com a caixa "LOGÍSTICA" + itens, Início sem nada) e pediu
que **todo** departamento mostre a mesma caixa de sidebar, com um bloco
"Atalhos" reaproveitando as ações rápidas do card "Atalhos" do
`DashboardPage` (uma por departamento, só onde fizer sentido).

### O que mudou (só `client/src/layouts/AppLayout.tsx`, camada visual)

- `showSidebar` deixou de exigir `items.length > 1` — agora é
  `Boolean(activeSection)`. Toda seção com página(s) visível(is) mostra a
  aside no desktop e a faixa de chips no mobile, inclusive Início e Vendas.
- Novo `SECTION_SHORTCUTS: Record<string, QuickAction[]>` (constante nova,
  ao lado de `NAV_SECTIONS`, sem alterar a estrutura desta última), mapeando
  `label` da seção → lista de atalhos `{ label, to, icon }`:
  - `''` (Início): `Nova venda → /sales`, `Novo pedido de compra →
    /purchases`, `Nova ordem de produção → /production` — os mesmos 3
    atalhos do card "Atalhos" do Dashboard (que **continua existindo** lá,
    não foi removido).
  - `Vendas`: `Nova venda → /sales`.
  - `Compras`: `Novo pedido de compra → /purchases`, `Nova requisição de
    compra → /purchases/requisitions`.
  - `Produção`: `Nova ordem de produção → /production`.
  - Demais seções (Logística, Qualidade & Engenharia, Manutenção, Ativos &
    Garantia, Gestão, Administração) **não** têm entrada — pedido explícito
    do dono para não forçar atalho onde não há uma ação de criação óbvia;
    essas seções continuam só com a lista normal de páginas.
- Cada atalho é um `<Link>` simples para a página de listagem do módulo —
  **nenhum mecanismo novo** (sem query param de auto-abrir diálogo, sem
  estado global novo). O usuário clica no atalho, cai na página, e aciona o
  botão "novo"/"nova requisição" que a própria página já tem (ex.:
  `/purchases/requisitions` abre a fila de requisições e `RequisitionsPage`
  já tem seu próprio `Dialog` local de criação). Mesmo mecanismo que
  `ShortcutLink` já usava em `DashboardPage.tsx`.
- Visual: bloco "Atalhos" com o mesmo cabeçalho uppercase/`text-[11px]` dos
  demais grupos da sidebar; cada link usa `border border-dashed
  border-brand/30 bg-brand/5 text-brand` (contorno tracejado + tokens
  `--brand`, sem cor solta) com ícone `Plus` à esquerda, para se distinguir
  visualmente dos itens de navegação normal (ícone de domínio, sem
  preenchimento). Hover reforça o contorno (`hover:border-brand
  hover:bg-brand/10`); foco por teclado usa `focus-visible:ring-2
  focus-visible:ring-brand` — mesmo padrão do resto do menu.
- Mobile (`md:hidden`): os atalhos são anexados como chips
  `rounded-full border-dashed border-brand/40 bg-brand/5 text-brand` depois
  dos chips de navegação normal, na mesma faixa horizontal com scroll — sem
  linha/label "Atalhos" separada (não há espaço vertical extra na faixa de
  chips), a distinção visual fica só no contorno tracejado + ícone `Plus`.
- Nenhuma mudança em `NAV_SECTIONS` (array em si), `BREADCRUMBS`,
  `activeSection`, hooks, rotas ou `App.tsx`.

### Por que Vendas repete o link de "Vendas" e "Nova venda" (redundância aparente)

Foi pedido explicitamente pelo dono do produto (seção "Vendas: Nova venda"
no plano aprovado). Departamentos com 1 página só (Vendas) agora mostram a
página normal na lista de navegação **e** o atalho de criação logo abaixo —
redundante em termos de destino (`/sales` nos dois casos), mas o atalho
reforça a ação (criar) em vez de só a navegação, replicando o padrão visual
usado nos departamentos com múltiplos atalhos.

### Validação

- `npx tsc --noEmit`: 0 erros.
- `npx vitest run`: 51/51 (baseline mantida, nenhum teste tocado — mudança
  é 100% `className`/JSX de apresentação).
- `npm run build`: sucesso.

### O que o QA/humano deve validar no navegador

1. Abrir `/` (Início) e `/sales` (Vendas) e confirmar que a sidebar agora
   aparece (antes ficava oculta) com a caixa de navegação normal + bloco
   "Atalhos" abaixo.
2. Testar os 3 atalhos de Início (`Nova venda`, `Novo pedido de compra`,
   `Nova ordem de produção`) e o de Vendas (`Nova venda`) — cada um deve
   levar à página correta e permitir abrir o diálogo/formulário de criação
   já existente ali.
3. Testar os 2 atalhos de Compras (`Novo pedido de compra` →
   `/purchases`, `Nova requisição de compra` → `/purchases/requisitions`,
   confirmando que a fila de requisições abre com o botão "Nova requisição"
   acessível) e o de Produção (`Nova ordem de produção` → `/production`).
4. Confirmar que Logística e as demais seções sem atalho continuam mostrando
   só a lista de páginas (sem bloco "Atalhos" vazio nem espaço em branco
   estranho).
5. Navegação por teclado (Tab) pelos novos links de atalho — confirmar anel
   de foco visível (`focus-visible:ring-brand`) tanto no desktop quanto nos
   chips mobile.
6. Contraste do texto/ícone `text-brand` sobre `bg-brand/5` (fundo bem
   claro) — validar leitura confortável em monitor real, inclusive no tema
   escuro se o projeto tiver toggle ativo em produção.
7. Redimensionar a janela até a faixa mobile (`md:hidden`) e confirmar que
   os chips de atalho aparecem depois dos chips de navegação, com scroll
   horizontal funcionando e sem quebra de layout.
8. `prefers-reduced-motion`: a mudança usa apenas `transition-colors`
   (cor), sem animação de movimento — não deveria haver o que desativar,
   mas vale conferir que não há nenhum salto visual brusco ao focar/hover.

### Riscos residuais

- Nenhum teste automatizado novo cobre a presença/ausência do bloco
  "Atalhos" por seção — ficou só validação manual (item acima). Se o
  projeto ganhar suíte de teste de integração leve de `AppLayout` no
  futuro, vale incluir um caso por seção.
- `SECTION_SHORTCUTS` é uma lista estática mantida à mão — se um novo
  departamento ganhar uma ação de criação óbvia no futuro, alguém precisa
  lembrar de adicionar a entrada aqui (não há geração automática a partir
  de `NAV_SECTIONS`).

---

## 2026-08-06 (rodada Vendas/NF-e) — Histórico multi-NF-e por pedido (`sale_invoices`) + reconciliação assíncrona de faturamento parcial

**Origem:** duas pendências registradas em `docs/governance/TODO.md`
("Histórico multi-NF-e por pedido" e "Reconciliação de status assíncrono de
provedores reais de NF-e com faturamento parcial"), decorrentes do
faturamento parcial entregue na terceira rodada de 2026-08-06.

### Resumo da feature

1. **Histórico multi-NF-e (`sale_invoices`).** `Sale.nfe_*` só guardava a
   NF-e mais recente — múltiplas emissões parciais sobrescreviam
   chave/protocolo/XML uma da outra. Nova tabela `sale_invoices` (model
   `SaleInvoice`) guarda **1 registro por emissão** (1 venda : N notas),
   com snapshot de `items` (quantidade/tributos exatamente como calculados
   naquela emissão específica). Padrão **expand-contract**: `Sale.nfe_*`
   **não foi removido** — continua em dual-write com a emissão mais
   recente, para não quebrar telas/relatórios existentes que já leem
   direto de `Sale`. Uma futura rodada de "contract" pode aposentar
   `Sale.nfe_*` depois que todo consumidor migrar para
   `GET /api/sales/:id/invoices`.
2. **Reconciliação assíncrona.** `GetSaleNfeStatusUseCase` (caminho de
   provedores reais — `focus_nfe`/`enotas`, assíncrono) só finalizava
   `confirmed -> invoiced`, sem incrementar `invoiced_quantity` nem aplicar
   `partially_invoiced`. Corrigido reaproveitando a mesma lógica do
   caminho síncrono (`IssueSaleNfeUseCase`), extraída para
   `SaleInvoiceAccumulator` — possível agora porque o snapshot de
   itens/quantidades de cada emissão sobrevive em `sale_invoices.items`
   mesmo depois que o processo que iniciou a emissão já terminou.

### Contratos novos (para docs/frontend)

- **Model novo:** `server/src/models/SaleInvoice.ts` (tabela
  `sale_invoices`). Campos: `id`, `sale_id` (FK `sales.id`, `ON DELETE
  CASCADE`), `items` (JSONB — array de `{ sale_item_id, product_id,
  quantity, unit_price, total_price, cfop, icms_*, ipi_*, pis_*, cofins_*
  }`), `total_amount`, `nfe_number`, `nfe_series`, `nfe_environment`
  (`homologacao`/`producao`), `nfe_provider` (`mock`/`focus_nfe`/`enotas`),
  `nfe_status` (`processing`/`authorized`/`denied`/`cancelled` — POR
  EMISSÃO, diferente de `Sale.nfe_status` que é só a mais recente),
  `nfe_key`, `nfe_protocol`, `nfe_provider_ref` (único, formato
  `sale-{saleId}-{series}-{number}`), `nfe_xml_url`, `nfe_danfe_url`,
  `nfe_error_message`, `nfe_issued_at`, timestamps.
- **Endpoint novo:** `GET /api/sales/:id/invoices` — lista o histórico de
  emissões da venda, mais recente primeiro (`{ success: true, data:
  SaleInvoice[] }`). RBAC igual a `GET /api/sales/:id/nfe`
  (`authorizeModule('vendas')`, sem exigir nível `approve`). 404 se a
  venda não existir.
- **`IssueSaleNfeUseCase`:** cria o registro em `sale_invoices` (status
  `processing`) já na transação de reserva de número (mesma transação que
  bloqueia a venda e calcula os tributos), e atualiza esse mesmo registro
  na transação final (resultado do provedor). `Sale.nfe_*` continua
  atualizado normalmente (dual-write).
- **`GetSaleNfeStatusUseCase`:** ao receber `authorized` do provedor real,
  localiza o `SaleInvoice` correspondente por `nfe_provider_ref`, lê o
  snapshot `items` para reconstruir quais `SaleItem`/quantidades pertencem
  a esta emissão, e aplica `SaleInvoiceAccumulator` (mesma lógica do
  caminho síncrono) para incrementar `invoiced_quantity` e resolver
  `partially_invoiced`/`invoiced`. Idempotente — não reaplica se o
  `SaleInvoice` já está em estado terminal (`authorized`/`denied`/
  `cancelled`). Sem `SaleInvoice` correspondente (ex.: venda antiga,
  pré-migração, sem granularidade retroativa), cai no fallback anterior
  (`confirmed -> invoiced`, sem tocar `invoiced_quantity`).
- **`CancelSaleNfeUseCase`:** propaga o cancelamento ao `SaleInvoice`
  correspondente (`nfe_status = 'cancelled'`), além de `Sale.nfe_status`.
- **Lógica compartilhada nova:**
  `server/src/modules/fiscal/domain/services/SaleInvoiceAccumulator.ts` —
  `applyInvoicedQuantities(items, qtyToInvoiceByItemId)` e
  `resolveSaleStatus(currentStatus, anyRemaining)`, puras (sem I/O),
  reutilizadas pelos dois use cases acima.
- **Repository:** `FiscalRepository`/`SequelizeFiscalRepository` ganharam
  `createSaleInvoice`, `findSaleInvoiceByProviderRef`,
  `findSaleInvoicesBySaleId`.

### Migration e backfill

- `server/migrations/20260806-000100-create-sale-invoices.cjs` — cria
  `sale_invoices` (idempotente, mesmo padrão de
  `20260806-000070-create-bank-statements.cjs`) + índices (`sale_id`,
  `nfe_provider_ref` único, `nfe_status`).
- **Backfill:** 1 registro consolidado por venda que já tinha
  `nfe_provider_ref` preenchido, reconstruindo `items` a partir do estado
  ATUAL de `sale_items.invoiced_quantity` (soma de todas as emissões
  passadas daquela venda). **Limitação documentada no cabeçalho da
  migration:** para vendas que já tiveram múltiplas emissões parciais
  ANTES desta migration, o histórico granular anterior é irrecuperável —
  só um registro "consolidado" nasce retroativamente; toda emissão NOVA a
  partir de agora já é granular. `nfe_provider` do backfill usa o provider
  atual de `company_fiscal_configs` (não há histórico do provider usado em
  cada emissão passada).
- Aplicada com sucesso no banco de dev local (`npm run migration:up`) e
  validada via `npm run test:integration:strict` (que roda
  `migration:up` contra o banco de teste isolado antes da suíte).

### Documentações atualizadas

- `docs/governance/TODO.md` — 2 itens marcados `[x]` com evidência (seção
  "2026-08-06 — Pendencias da auditoria multi-agente..."), mais nota de
  fechamento no item "Conciliação bancária + downtime — teste de
  integração real" (a 3ª feature pendente, faturamento parcial, agora
  também tem teste de integração real).
- `docs/governance/HANDOFF_CODEX.md` — esta seção.
- **Não tocado nesta rodada (fora do território combinado):**
  `docs/arquitetura/API.md`, `docs/database/DATABASE.md`, `docs/projeto/04-USE_CASES.md` — a
  tarefa restringiu docs a `TODO.md`/`HANDOFF_CODEX.md` porque outros
  agentes rodavam em paralelo sobre os mesmos arquivos; uma rodada de docs
  dedicada deve incorporar `sale_invoices` em `docs/database/DATABASE.md` (nova
  tabela) e o endpoint `GET /api/sales/:id/invoices` em `docs/arquitetura/API.md`.

### Testes

- **Unitários (novos):**
  - `server/tests/unit/sale-invoice-accumulator.test.ts` (9 casos) —
    lógica pura de `SaleInvoiceAccumulator`.
  - `server/tests/unit/get-sale-nfe-status-reconciliation.test.ts` (6
    casos) — autorização assíncrona parcial/total, acúmulo entre 2
    emissões, `denied` não toca quantidade, idempotência, sem
    `provider_ref`.
- **Unitários (atualizados, mocks estendidos com `SaleInvoice`):**
  `server/tests/unit/issue-sale-nfe-partial.test.ts`,
  `server/tests/unit/sales-nfe-rbac.test.ts`.
- **Integração real (Postgres, novo):**
  `server/tests/integration/sale-invoice-history.test.ts` (2 casos) — emite
  2 NF-e parciais reais (6 + 4 de 10 unidades) contra o banco de teste,
  confirma 2 registros distintos em `sale_invoices` (chaves/protocolos/refs
  diferentes, snapshot de quantidade por emissão), acúmulo de
  `invoiced_quantity` até 10, transição `confirmed -> partially_invoiced ->
  invoiced`, e 404 ao listar histórico de venda inexistente.

### Instruções de teste (para o próximo agente/humano)

1. `cd server && npm run typecheck` — 0 erros.
2. `npx jest --runInBand tests/unit` — 711/711 (baseline + novos).
3. `npm run test:integration:strict` — roda a suíte completa de
   integração contra Postgres real (aplica migrations no banco de teste
   isolado automaticamente). Confirmar `sale-invoice-history.test.ts`
   2/2 passando (uma falha pré-existente e não relacionada em
   `entity-photo-qrcode.test.ts` — upload/QR de ativo — pode aparecer;
   não é desta entrega).
4. `npm run migration:status` — confirmar
   `20260806-000100-create-sale-invoices.cjs` como `up`.
5. Manual (opcional): `curl http://localhost:5000/health/ready` depois do
   watch recarregar; emitir uma NF-e parcial via
   `POST /api/sales/:id/nfe` com `{ items: [...] }` e conferir
   `GET /api/sales/:id/invoices` retornando o histórico crescente.

### Riscos residuais

- Backfill de vendas pré-migração com múltiplas emissões parciais antigas
  perde a granularidade histórica anterior a esta migration (documentado
  no cabeçalho da migration e no item do TODO) — decisão consciente, não é
  regressão de dado (o dado consolidado, soma de `invoiced_quantity`,
  continua correto).
- A reconciliação assíncrona só recupera `invoiced_quantity` corretamente
  para emissões que já passam pelo novo fluxo (com `SaleInvoice` criado em
  `IssueSaleNfeUseCase`); não há teste de integração real contra os
  provedores `focus_nfe`/`enotas` de verdade (só o mock, que é síncrono) —
  seria necessário um ambiente de homologação desses provedores reais para
  validar isso ponta a ponta, fora do alcance desta rodada.
- `docs/arquitetura/API.md`/`docs/database/DATABASE.md` ainda não descrevem `sale_invoices`/
  `GET /api/sales/:id/invoices` (deliberadamente fora do território desta
  rodada — ver nota acima).

---

## 2026-08-06 (webdesiner) — Rollout do redesign para páginas de departamento

### O que motivou

Continuação do rollout de UI iniciado em `AppLayout.tsx`/`LoginPage.tsx`/
`DashboardPage.tsx` (entradas anteriores desta seção). Extensão da mesma
linguagem visual — banner com selo `bg-brand/10 text-brand`, linhas de
tabela com feedback `border-l-4`/`hover:bg-brand/5`, números
`text-right tabular-nums`, `motion-safe:animate-in fade-in` na entrada de
seções — para as 5 telas de departamento mais usadas. Aprovação para pular
o ponto de parada de proposta foi dada explicitamente pelo dono do produto
para esta rodada.

### O que mudou (só `className`/JSX decorativo — zero lógica/hooks/rotas tocados)

- `client/src/pages/sales/SalesPage.tsx` — banner e tabela com
  `motion-safe:animate-in fade-in`; estado vazio da tabela de vendas ganhou
  ícone (`ShoppingCart`) + atalho "Nova venda" (reaproveita o `setOpen(true)`
  já existente, sem novo estado).
- `client/src/pages/purchases/PurchasesPage.tsx` — mesmo tratamento de
  fade-in nos tiles do cockpit e no banner/tabela; estado vazio da lista de
  pedidos ganhou ícone (`Truck`) + atalho "Novo pedido" (oculto quando o
  filtro "pedidos em aberto" está ativo, para não sugerir criar um pedido
  filtrado por status).
- `client/src/pages/logistics/InventoryPage.tsx` — fade-in no banner e no
  conteúdo da aba ativa (`key={tab}` para retrigger a cada troca);
  `TabButton` ganhou `aria-selected`, `transition-colors` e
  `focus-visible:ring-2` (antes sem indicador de foco por teclado
  dedicado).
- `client/src/pages/logistics/BalancesTab.tsx` — estados vazios das duas
  tabelas (saldo agregado e saldo por depósito) ganharam ícone (`Boxes`) em
  vez de só texto cinza.
- `client/src/pages/production/ProductionOrdersPage.tsx` — linhas da
  tabela de ordens passaram a usar o mesmo padrão de
  `border-l-4 border-l-transparent hover:border-l-brand hover:bg-brand/5`
  já usado em Vendas/Compras (antes só tinha `hover:bg-accent/50`, sem
  indicador de borda); coluna "Quantidade" alinhada à direita com
  `tabular-nums`; estado vazio com ícone (`Factory`) + atalho "Nova ordem";
  tabela de explosão de BOM (consumo previsto no detalhe da ordem) ganhou
  colunas numéricas `text-right tabular-nums` e ícone `AlertTriangle` ao
  lado do saldo insuficiente (antes só texto vermelho).
- `client/src/pages/financial/FinancialPage.tsx` — as 4 abas (Contas,
  Centros de custo, Projeção de caixa, Conciliação), antes `<button>` só
  com texto, agora seguem o mesmo componente de aba usado em
  `InventoryPage.tsx` (`FinancialTabButton`, com ícone
  `Receipt`/`Layers`/`CalendarRange`/`GitCompareArrows`, `aria-selected`,
  foco visível); conteúdo da aba ativa com fade-in (`key={view}`); estados
  vazios de contas a pagar/receber com ícone (`Wallet`); mini-cards de KPI
  da projeção de fluxo de caixa ganharam `hover:shadow-md` para
  consistência com os demais cards de KPI do sistema.

### Validação

- `npx vitest run` (client/) — 51/51 testes passando, nenhuma quebra.
- `npx tsc -p tsconfig.app.json --noEmit` (client/) — 0 erros. Nota: durante
  a execução desta tarefa, `tsc` falhou uma vez com
  `Cannot find module '@/pages/home/HomePage'` porque outro agente estava
  criando `client/src/pages/home/` em paralelo (conflito de arquivo já
  sinalizado pelo dono do produto); o arquivo apareceu minutos depois e o
  erro desapareceu sozinho — não é uma regressão desta entrega.
- `npm run build` (client/) — build de produção OK (aviso pré-existente de
  chunk grande em `index-*.js`, não relacionado a esta entrega).

### Pendências para humano/QA validar no navegador

- Contraste e leitura dos novos ícones de estado vazio nos dois temas
  (claro/escuro), em especial `text-muted-foreground/50` sobre `--card`
  escuro.
- Navegação por teclado nas abas de `InventoryPage`/`FinancialPage` (Tab +
  Enter/Espaço) — o anel de foco (`focus-visible:ring-brand`) deve ficar
  visível sem cortar nas bordas do container com `overflow`.
- `prefers-reduced-motion`: confirmar que a entrada das seções com
  `motion-safe:animate-in fade-in` não anima para quem reduziu movimento no
  SO (comportamento esperado do `tw-animate-css`/Tailwind `motion-safe:`,
  não testado manualmente em SO com essa preferência ativada).
- Responsividade das novas abas com ícone em `FinancialPage.tsx` em telas
  estreitas (`flex-wrap` já aplicado, mas não verificado visualmente abaixo
  de ~380px).

### Fora do escopo desta rodada (não tocado, por instrução explícita)

- `client/src/App.tsx`, `client/src/layouts/AppLayout.tsx`,
  `client/src/pages/DashboardPage.tsx`, `client/src/pages/LoginPage.tsx`,
  `client/src/main.tsx` e tudo em `client/src/pages/home/` — em edição
  paralela por outro agente no momento desta tarefa.
- `ComexPage.tsx`, `RfqPage.tsx` e as demais telas ainda pendentes de
  polimento visual seguem na fila (ver nota de riscos residuais da entrada
  anterior desta seção).

## Home por Perfil (workspace por papel) — frontend (`client/`), 2026-08-06

### Contexto

Antes desta entrega, `/` sempre renderizava `DashboardPage.tsx` (dashboard
executivo com KPIs de produtos/compras/produção/financeiro) para qualquer
usuário logado, independente do perfil de acesso. Um almoxarife (perfil só
com módulos `estoque`/`recebimento`/`expedicao`) via os mesmos cards de um
admin — a maioria vazios/sem sentido para o papel dele. Dono do produto
aprovou explicitamente a criação de uma "Home por Perfil" que monta a tela
dinamicamente a partir dos módulos do perfil logado.

### O que foi feito

**Arquivos novos** (`client/src/pages/home/`):
- `HomePage.tsx` — página `/` nova. Filtra `widgetRegistry` por
  `hasModuleAccess`/`hasRole` (mesma lógica de fallback de segurança do
  `AppLayout`/`DashboardPage`: `admin` ou falha de rede em
  `GET /api/auth/me/permissions` nunca escondem widget), ordena por
  `priority`, e decide o layout: **foco** (cards grandes, 1-2 colunas)
  quando o perfil só tem 1-2 widgets visíveis, **grid denso** (até 3
  colunas) quando tem mais. Saudação com primeiro nome + data por extenso
  (`Intl.DateTimeFormat('pt-BR')`), mesma faixa visual `bg-brand/10` do
  `DashboardPage` antigo.
- `widgetRegistry.tsx` — array `homeWidgets: HomeWidgetDefinition[]` com
  `{ key, title, module, roles?, priority, size?, component }`. Adicionar
  um widget novo é só uma entrada aqui — a Home não tem nada hardcoded.
- `WidgetCard.tsx` — casca visual compartilhada (ícone + título, loading
  via `Skeleton`, erro via `DidacticAlert`/`translateApiError`, link de
  ação no rodapé). Todos os widgets a usam para consistência.
- `useHandoffs.ts` — hook compartilhado (`queryKey: ['home-handoffs']`)
  que os 4 widgets de handoff usam, deduplicado pelo TanStack Query (uma
  única chamada `GET /api/dashboard/handoffs` mesmo com os 4 montados).
- `widgets/RecebimentoPendenteWidget.tsx`, `ExpedicaoProntaWidget.tsx`,
  `RequisicoesAprovacaoWidget.tsx`, `QualidadePendenciasWidget.tsx` —
  todos consomem `useHandoffs()` (endpoint já existente, usado hoje pelo
  badge do menu lateral, UC-40); nenhum endpoint novo.
- `widgets/EstoqueCriticoWidget.tsx` — reaproveita
  `inventoryApi.listLowStock()` (`GET /api/inventory/low-stock`, mesma
  query do painel executivo), mas aponta para `/logistics/estoque` (tela
  do almoxarife) em vez de `/products` (fora do alcance de quem só tem o
  módulo `estoque`).
- `widgets/FinanceiroResumoWidget.tsx` — `financialApi.listPayables({
  status: 'overdue' })`, restrito a `roles: ['admin', 'financial']`.
- `widgets/KpisExecutivosWidget.tsx` — wrapper fino de `ExecutiveKpiPanel`
  (ver abaixo), restrito a `roles: ['admin', 'financial']`.

**Arquivos alterados:**
- `client/src/pages/DashboardPage.tsx` — o conteúdo abaixo da saudação
  (grid de KPIs + tabela de estoque baixo + atalhos) foi extraído para
  `export function ExecutiveKpiPanel()`, sem nenhuma mudança de classe
  Tailwind/estrutura visual. `DashboardPage` (default export) agora é só a
  saudação + `<ExecutiveKpiPanel />`, montada na rota `/dashboard` (link
  direto para quem quiser o dashboard executivo completo fora da Home).
- `client/src/App.tsx` — rota `/` passa a renderizar `HomePage` (import
  direto, não lazy — mesmo padrão de antes); nova rota `/dashboard`
  (lazy, dentro do `Suspense` padrão) para `DashboardPage`. Nenhuma rota
  existente foi removida ou teve seu módulo de proteção alterado.
- `docs/governance/CRONOGRAMA_FRONTEND_2026-07-31.md` (FE0) e
  `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` — item marcado `[x]`/bullet nova
  descrevendo a entrega.

**Não alterados (por restrição explícita da tarefa):** `AppLayout.tsx`,
`LoginPage.tsx`, componentes shadcn (`components/ui/*`), nenhum endpoint
de backend.

### Como o registry decide o que mostrar

```
isWidgetVisible(widget):
  modules = widget.module (array ou item único)
  moduleOk = usingRoleFallback || modules.some(hasModuleAccess)
  roleOk   = !widget.roles || hasRole(...widget.roles)
  return moduleOk && roleOk
```

`usingRoleFallback = permissionsFetchFailed || hasRole('admin')` — mesma
regra do `AppLayout`/`DashboardPage` antigo: nunca esconde nada por bug de
rede, e admin sempre vê tudo. `roles` é uma trava **adicional** (não
substitui o módulo) usada só em `financeiro-resumo` e `kpis-executivos`,
porque o módulo `financeiro`/`dashboard` sozinho não é suficiente para
decidir quem deve ver esses dois (ex.: `dashboard` é módulo agregador
concedido a todos os perfis no backend — sem o `roles`, todo mundo veria o
painel executivo completo).

### O que um almoxarife vs. um admin veem na prática

- **Almoxarife** (perfil com módulos `estoque` + `recebimento` +
  `expedicao`, sem `dashboard`-role-alto): vê 3 widgets — Recebimento
  pendente, Pronto para expedição, Estoque crítico — em **layout de foco**
  (cards grandes, já que são só 2-3). Não vê o painel executivo nem contas
  a pagar (não tem `financial`/`admin` role, mesmo que `dashboard` seja
  universal).
- **Admin**: vê todos os 7 widgets no **grid denso** — os 4 de handoff,
  estoque crítico, contas a pagar atrasadas e o painel executivo completo
  (`kpis-executivos`, ocupando 2 colunas via `size: 'wide'`).

### Instruções de teste (para o próximo agente/QA)

1. `cd client && npx tsc -p tsconfig.app.json --noEmit` — 0 erros (já
   validado nesta entrega).
2. `npx vitest run` — 51/51 passando (baseline, nenhum teste novo
   adicionado nesta rodada — a tarefa não pediu testes automatizados para
   a Home, só validação de tipos/build).
3. `npm run build` — build de produção OK (mesmo warning pré-existente de
   chunk `index-*.js` > 500kB, não introduzido por esta mudança).
4. Manual: logar como usuário com perfil de acesso restrito (ex.: só
   `estoque`+`recebimento`) e confirmar que `/` mostra só os widgets
   correspondentes, em cards grandes; logar como `admin` e confirmar grid
   denso com os 7 widgets, incluindo o painel executivo; confirmar que
   `/dashboard` ainda funciona (link direto) com o mesmo visual de antes.
5. Sugestão de teste futuro (não crítico, backlog QA): componente de
   `HomePage.tsx` com mocks de `useAuth`/`hasModuleAccess` cobrindo os
   casos "almoxarife" (foco) e "admin" (denso), similar ao padrão de
   `LoginPage.test.tsx`.

### Riscos residuais

- Nenhum widget tem teste automatizado próprio ainda — risco baixo porque
  cada um só compõe queries/componentes já testados indiretamente em
  outras telas (`DashboardPage`, `InventoryPage`, etc.), mas vale cobrir
  se a Home crescer.
- `roles` como trava adicional é uma convenção nova no projeto (não existia
  glossário formal em `widgetRegistry`-like antes) — se um novo perfil
  "gerente" for criado sem ser `admin`/`financial`, os widgets
  `financeiro-resumo`/`kpis-executivos` continuarão ocultos para ele
  mesmo tendo o módulo `financeiro`/`dashboard`; ajustar a lista `roles`
  quando esse perfil existir.

---

## Bloco 0 — BR-RH-020: segregação de dados sensíveis de RH (Concluído)

**Data**: 2026-08-06
**Escopo**: P0 de segurança/LGPD — `GET /api/employees` e
`GET /api/employees/:id` vazavam salário, CPF e dados bancários de
**todos** os funcionários para **qualquer** usuário autenticado (achado de
`docs/business/briefs/BRIEF_RH_2026-08-06.md`, BR-RH-020).
**Status**: ✅ Concluído

### Resumo da feature

Segregação de campos sensíveis (LGPD) na resposta de `GET /api/employees` e
`GET /api/employees/:id`, sem quebrar a listagem básica (nome, cargo,
departamento, turno, situação) que outras telas já consomem:
- `role='admin'` ou perfil de acesso com o novo módulo `rh` → resposta
  completa (inclui `salary`, `salary_type`, `cpf`, `rg`, `pis_pasep`,
  `ctps`, `bank_name`, `bank_agency`, `bank_account`, `bank_account_type`,
  `pix_key`, `address`, `phone`).
- Qualquer outro usuário autenticado → mesma rota, mesmo payload, **sem**
  essas 13 chaves (removidas, não mascaradas com `null`/`***` — o
  frontend precisa tratar a ausência da chave).

### Decisão de arquitetura (RBAC): módulo `rh` + filtragem no use case, não `authorizeModule` na rota

Duas opções foram avaliadas:
1. Bloquear `GET /api/employees` inteiro com `authorizeModule('rh')` —
   **descartada**: quebraria consumidores legítimos que só precisam do
   básico (`ShopFloorPage` seletor de operador, `useMyDepartment` para
   requisições por departamento) para usuários sem perfil de RH.
2. **Escolhida**: adicionar `rh` ao catálogo de 29→30 módulos
   (`server/src/shared/domain/accessModules.ts`), mas usá-lo apenas para
   ler `req.user.permissions.rh` **dentro dos use cases**
   (`ListEmployeesUseCase`/`GetEmployeeByIdUseCase`) e decidir se os
   campos sensíveis entram no payload — a rota continua liberada a
   `authenticate` puro, como já era.

Isso segue o padrão RBAC existente (perfil configurável, mesma matriz
`AccessProfilePermission`) mas aplicado a nível de **campo**, não de
**rota** — documentado como caso especial em
`docs/administrativo/04-PERFIS_ACESSO.md` §"Caso especial: módulo `rh`".

### Arquivos modificados

#### Criados
- `server/src/modules/employees/domain/services/employeeSensitiveFields.ts`
  — `SENSITIVE_EMPLOYEE_FIELDS`, `hasFullEmployeeAccess(user)`,
  `sanitizeEmployee(employee, canViewSensitive)`,
  `sanitizeEmployeeList(employees, canViewSensitive)`.

#### Modificados
- `server/src/shared/domain/accessModules.ts` — novo `AccessModuleKey`
  `'rh'` (catálogo 29→30 chaves), com nota de arquitetura no JSDoc do
  módulo explicando por que não usa `authorizeModule` para bloquear rota.
- `server/src/modules/employees/application/use-cases/ListEmployeesUseCase.ts`
  — aceita `requestingUser` no input; sanitiza `rows` via
  `sanitizeEmployeeList`.
- `server/src/modules/employees/application/use-cases/GetEmployeeByIdUseCase.ts`
  — aceita `requestingUser` no input; sanitiza o resultado via
  `sanitizeEmployee`.
- `server/src/modules/employees/presentation/controllers/employeeController.ts`
  — passa `(req as any).user` como `requestingUser` para os dois use cases
  acima (`list`, `getById`).
- `server/src/modules/employees/presentation/routes/employees.ts` — JSDoc
  atualizado (rota continua só `authenticate`, segregação é nos use cases).
- `client/src/api/employees.ts` — campos sensíveis do tipo `Employee`
  marcados opcionais (`cpf?`, `salary?`, `bank_name?` etc.) com JSDoc
  🔒 BR-RH-020, já que podem estar ausentes na resposta.
- `client/src/pages/hr/EmployeesTab.tsx` — `formatCpf` só é chamado
  quando `employee.cpf` existe (`displayCpf`, mostra "•••" quando
  ausente); formulário de edição (só abre para `role='admin'`, que sempre
  recebe dados completos) usa fallbacks defensivos (`?? ''`, `?? 'mensal'`)
  só para satisfazer o tipo agora opcional.

### Documentações atualizadas
- `docs/administrativo/04-PERFIS_ACESSO.md` — catálogo 29→30 módulos,
  linha `rh` na tabela, nova seção "Caso especial: módulo `rh`" e entrada
  em "Estado de implementação (2026-08-06)".
- `docs/business/briefs/BRIEF_RH_2026-08-06.md` — BR-RH-020 marcado
  `✅ REMEDIADO em 2026-08-06` (tabela de regras de negócio §(d) e tabela
  de priorização §(g)).
- JSDoc completo em todos os arquivos novos/alterados listados acima
  (classe, métodos, parâmetros e retornos).
- `docs/database/DATABASE.md`/`docs/projeto/04-USE_CASES.md` — **não
  alterados**: nenhuma coluna, tabela ou caso de uso de negócio mudou;
  `rh` é uma chave de catálogo de RBAC (`AccessModuleKey`), não uma
  entidade de banco, e o comportamento de negócio de `GET /api/employees`
  (quem pode ler funcionários) não mudou — só o conteúdo do payload.

### Instruções de teste

1. **Automatizado**:
   - `cd server && npm run typecheck` → 0 erros (validado).
   - `cd client && npx tsc -p tsconfig.app.json --noEmit` → 0 erros (validado).
   - `cd server && npx jest tests/unit/employees-use-cases.test.ts --runInBand`
     → 11/11 passando (validado), incluindo os 6 testes novos de
     `Segregação de campos sensíveis de RH (BR-RH-020)`:
     - `retorna todos os campos, incluindo sensíveis, para role admin`
     - `retorna todos os campos para usuário com módulo "rh" no perfil de acesso`
     - `NÃO retorna salário/CPF/dados bancários/endereço/telefone para usuário autenticado comum` (asserta `not.toHaveProperty` para cada campo sensível)
     - `NÃO retorna campos sensíveis quando não há requestingUser (defesa em profundidade)`
     - `lista continua funcionando (nome/departamento) e oculta campos sensíveis para usuário comum`
     - `lista retorna campos sensíveis completos para admin`
   - `cd server && npm run test:unit` → 717/717 passando (baseline completo, sem regressão).
2. **Manual (próximo agente/humano)**:
   - Criar (ou usar) um `AccessProfile` com o módulo `rh` em `operate`,
     atribuir a um usuário `operator`; logar com esse usuário e confirmar
     que `GET /api/employees` retorna `salary`/`cpf`/dados bancários.
   - Logar com um usuário `operator` **sem** módulo `rh` no perfil;
     confirmar que a mesma rota retorna 200 (não 403) mas sem essas
     chaves no JSON (inspecionar payload via devtools/network, não só a
     tela — a tela `/hr` só renderiza CPF/nome/cargo hoje).
   - Na tela `/hr` (aba Funcionários), confirmar que a coluna CPF mostra
     "•••" para o usuário sem módulo `rh` e o CPF formatado para
     `admin`/usuário com `rh`.
   - Confirmar que `ShopFloorPage` (seletor de operador do apontamento) e
     `useMyDepartment` (resolução de departamento do usuário logado)
     continuam funcionando normalmente para qualquer usuário autenticado
     (não dependem de campos sensíveis).
   - Escrita (`POST`/`PUT`/`DELETE /api/employees`) não foi alterada:
     continua exigindo `role='admin'`.

### Riscos residuais

- Não existe ainda um `AccessProfile` seedado com o módulo `rh` — até que
  o dono do produto crie/atribua um perfil "RH" (via
  `POST /api/access-profiles` + `PUT /api/users/:id/access-profile`),
  **apenas `role='admin'`** vê os dados completos. Isso é intencional
  (fail-safe: nenhum usuário ganha acesso sensível por omissão), mas RH
  operacional (não-admin) ficará sem ver salário/CPF até essa atribuição
  manual.
- O campo `email` de `Employee` **não** foi tratado como sensível (mantido
  visível a todos) — decisão de escopo: o brief cita CPF, salário e banco
  explicitamente e o e-mail cadastrado tende a ser corporativo; se o RH
  confirmar que `email` costuma ser pessoal, adicionar a
  `SENSITIVE_EMPLOYEE_FIELDS`.
- Não foi criado teste de integração HTTP (`supertest`) end-to-end para
  este bloco — a cobertura é em nível de use case (unit), que já exercita
  a lógica de decisão real (`hasFullEmployeeAccess`) sem mock do
  Sequelize; suficiente para o escopo cirúrgico pedido, mas um teste de
  integração cobrindo `authorizeModule`/`AccessProfile` real (seed de
  perfil "rh" em banco de teste) é um bom complemento futuro.
- `EmployeeDocument`, `JobPosition`, `EmployeeJobHistory` e outras
  entidades futuras do brief (P4–P17) ainda não existem — quando forem
  criadas, revisar se também carregam campos 🔒 que precisam do mesmo
  tratamento.

---

## BLOCO 1 — Módulo SST (Segurança e Saúde do Trabalho) — Requisitos Prontos (2026-08-06)

**Status:** 🟡 Requisitos formais concluídos. **Nenhum código foi criado.**
SST não existe hoje em `server/src/` — sem model, sem rota, sem use-case.

**Para `AdmDBA` e `ArquitetoSoftwareAPI`:** os requisitos completos (RF/RNF,
7 casos de uso P0 detalhados com fluxo de exceção, 23 entidades do domínio,
regras de negócio com base legal) estão em:

- **`docs/business/BLOCO_1_SST_REQUISITOS.md`** — ler primeiro (RF-SST-001
  a 055, RNF-SST-01 a 06, UC-44 a UC-48, matriz de rastreabilidade).
- `docs/business/briefs/BRIEF_SST_2026-08-06.md` — brief de domínio
  original (23 entidades com cardinalidades em linguagem natural, seção
  (b); 36 regras BR-SST-001 a 036 com base legal, seção (c)).

**Decisões já tomadas (não reabrir sem motivo novo):**
1. **ASO é entidade própria do módulo SST**, não um documento genérico de
   RH (`employee_documents`). RH consome apenas um status de aptidão via
   endpoint de leitura dedicado (RF-SST-021) — ver
   `BLOCO_1_SST_REQUISITOS.md` §5.1 para a justificativa completa
   (decisão consistente entre `BRIEF_SST_2026-08-06.md` e
   `BRIEF_RH_2026-08-06.md`, sem divergência real a arbitrar).
2. **TipoEPI vincula opcionalmente 1:1 a um `Item`** de estoque já
   existente; a baixa de estoque na entrega reaproveita o fluxo de
   `/api/inventory/movements` (motivo "entrega EPI") — não criar um
   segundo controle de saldo dentro do módulo SST.
3. Terminologia legal corrigida: usar **PGR/GRO (NR-1)** em todo o módulo,
   nunca "PPRA" (extinto em 2022).

**Pendência de RBAC:** precisa de uma nova chave `sst` em
`server/src/shared/domain/accessModules.ts` (catálogo hoje com 30 chaves,
`rh` foi o último adicionado em 2026-08-06). Recomendação: `sst` deve ser
**mais restritivo** que `rh` — a maioria das entidades (ASO, Acidente, CAT)
exige o módulo para leitura completa, diferente de `GET /api/employees`
que hoje é liberado a qualquer autenticado.

**Após a modelagem de banco/API, acionar `AuditorIntegrador`** para rodar a
rastreabilidade Requisito → Banco → API neste módulo novo, antes de
considerar o ciclo fechado (não há schema/API pré-existente de SST para
conflitar, mas a superfície de RBAC/LGPD sobre dados de saúde exige
verificação cruzada dedicada).

---

## BLOCO 1 — Módulo SST — Modelagem de Banco Concluída (2026-08-06, `AdmDBA`)

**Status:** 🟡 Migrations criadas, **não aplicadas** (`migration:up`
pendente de aprovação do dono do produto, após revisão do
`AuditorIntegrador`). Nenhum model Sequelize/use-case/controller foi
criado — isso é do `programador`, no próximo passo.

**12 migrations novas** (`server/migrations/20260806-000130-*.cjs` a
`20260806-000141-*.cjs`), 34 tabelas (`sst_tipos_epi`, `sst_matriz_epi`,
`sst_entregas_epi` + `sst_devolucoes_epi` + `sst_estornos_entrega_epi`,
`sst_acoes_corretivas`, `sst_planos_exames`, `sst_asos` +
`sst_exames_complementares`, `sst_acidentes` +
`sst_acidente_testemunhas` + `sst_investigacoes_acidente`, `sst_cats`,
`sst_eventos_esocial`, cluster CIPA (6 tabelas), cluster PGR/GES (5
tabelas), cluster Treinamentos (2 tabelas), cluster Rotina Preventiva (7
tabelas)). Detalhe completo, coluna a coluna, com justificativa de FK
RESTRICT/CASCADE, em
**[`docs/business/BLOCO_1_SST_MODELO_DADOS.md`](../business/BLOCO_1_SST_MODELO_DADOS.md)**.

**Mudanças fora das tabelas novas:**
1. `server/src/shared/domain/accessModules.ts` — chave `sst` adicionada
   (30 → 31 chaves).
2. `inventory_movements.reference_type` (ENUM) — valor
   `'sst_epi_delivery'` adicionado (migration `20260806-000131`).
3. `docs/database/06-ESTRUTURAS_PROGRAMAVEIS.md` — atualizado com os
   **primeiros triggers do projeto** (`sst_lock_entrega_epi`,
   `sst_lock_acidente`, `sst_lock_cat`,
   `sst_block_delete_evento_esocial`), exceção arquitetural documentada e
   estreita para imutabilidade de registros com valor probatório legal
   (RNF-SST-01) — nunca lógica de processo, só travas estruturais.

**Para o `programador`, quando a migração for aprovada e aplicada:**
- Models Sequelize novos devem respeitar `underscored: true` e os nomes de
  coluna em português já usados nas migrations (ex.: `ca`, `ativo`,
  `data_prevista_troca`) — ver nota de nomenclatura §0 do documento de
  modelo de dados (decisão delegada pelo brief ao `AdmDBA`).
- `sst_entregas_epi` e `sst_acidentes` seguem um fluxo
  rascunho→confirmação: o repositório NUNCA deve tentar `UPDATE`/`DELETE`
  numa linha já confirmada — o Postgres vai rejeitar com
  `RAISE EXCEPTION` (trigger); o use-case de confirmação é a ÚNICA
  transição de UPDATE válida.
- `sst_acoes_corretivas` e `sst_eventos_esocial` são polimórficas
  (`origem_tipo`+`origem_id`, sem FK real) — resolver a origem em
  aplicação, sem depender de `include` automático do Sequelize.
- 5 itens de pendência específicos de nomenclatura/fluxo estão listados em
  `BLOCO_1_SST_MODELO_DADOS.md` §14 ("Pendências para o
  `ArquitetoSoftwareAPI`") — ler antes de implementar o contrato REST.

**Confirmado:** `npm run migration:status --prefix server` lista todas as
12 migrations novas como `down` (pendentes), sem quebrar o comando —
nenhuma foi aplicada.
  tratamento de `hasFullEmployeeAccess`.

---

## 2026-08-07 — Implementação Backend do BLOCO 1 SST (P0) — `programador`

### Resumo da feature

Implementado o backend do módulo SST (Segurança e Saúde do Trabalho,
departamento 15) para o escopo P0 definido em
`docs/business/BLOCO_1_SST_REQUISITOS.md`: EPI (catálogo, matriz e
entrega, UC-44), ASO/PCMSO (UC-45, com status enxuto para o RH),
Acidente/CAT (UC-46, com prazo legal), e fila de eventos eSocial
(UC-47, efeito colateral passivo + reenvio manual).

Estrutura de módulo criada (Clean Architecture, mesmo padrão de
`nonConformities`/`maintenance`):

```
server/src/modules/sst/
  domain/{repositories,services}          - 4 interfaces de repositorio + legalDeadlineService
  application/{use-cases,services}        - 38 use cases (epi/aso/accident/esocial) + InventoryMovementService (interface)
  infrastructure/{sequelize,mappers,adapters}
  presentation/{controllers,routes}       - 4 controllers + router agregador sst.ts
```

14 models Sequelize novos (`server/src/models/Sst*.ts`), registrados e
associados em `server/src/models/index.ts`: `SstTipoEpi`, `SstMatrizEpi`,
`SstEntregaEpi`, `SstDevolucaoEpi`, `SstAcaoCorretiva`, `SstPlanoExames`,
`SstAso`, `SstExameComplementar`, `SstAcidente`, `SstAcidenteTestemunha`,
`SstInvestigacaoAcidente`, `SstAcidenteComplemento`, `SstCat`,
`SstEventoEsocial`. Todos apontam para o schema das 12 migrations ja
auditadas (`20260806-000130` a `000141`) — nenhuma migration foi criada,
alterada ou aplicada nesta entrega (instrucao explicita: migrations
continuam pendentes de aprovacao do dono do produto).

Mapper DTO PT-BR ↔ ingles (primeiro do projeto, conforme sinalizado pela
auditoria): `server/src/modules/sst/infrastructure/mappers/EpiMapper.ts`,
`AsoMapper.ts`, `AccidentMapper.ts`. Traducoes implementadas: `ca` ↔
`ca_numero`, `ativo` ↔ `active`, `tamanhos_variacoes` (string livre P/M/G)
↔ `tamanhos` (array), `tipo_epi_id` ↔ `epi_type_id`, `setor_local` ↔
`local_setor`, `parte_corpo_atingida` ↔ `parte_corpo`, e uma divergencia
nao detectada nos documentos de design anteriores: `risco_exigente`
(banco, `sst_planos_exames`) ↔ `risco_exigido` (contrato de API).

Endpoints implementados: 38 de 75 do contrato completo
(`docs/business/BLOCO_1_SST_API.md`) — grupos 1 a 4 (EPI, ASO/PCMSO,
Acidente/CAT, fila eSocial). Router agregador
`server/src/modules/sst/presentation/routes/sst.ts`, montado em
`server/app.ts` sob `/api/sst`.

RBAC: `authorizeModule('sst', ...)` (leituras nivel `operate` implicito,
escritas comuns `operate`, confirmacao de EntregaEPI/emissao-reabertura de
CAT/encerramento de acidente grave/reenvio de evento `approve`), exceto
`GET /api/sst/aso/status/:employeeId` — excecao `sst`|`rh` via middleware
inline `requireSstOrRh` (exportado do proprio router para teste direto).

Integracao com estoque (EPI): `ConfirmEpiDeliveryUseCase` usa a interface
`InventoryMovementService` (domain/application, baixo acoplamento)
implementada por `InventoryMovementServiceAdapter` (infrastructure), que
delega a `CreateInventoryMovementUseCase` do modulo `inventory` — nenhum
import direto de Sequelize/Model do `inventory`. Reaproveita
`reference_type: 'sst_epi_delivery'` (ja habilitado em
`InventoryMovement.ts`/`inventoryValidators.ts`/`InventoryMovementEntity.ts`
pela auditoria anterior — nao repetido aqui).

Defesa em profundidade contra os triggers de imutabilidade:
`server/src/middlewares/errorHandler.ts` ganhou um mapeamento dedicado que
traduz a excecao Postgres de `sst_lock_entrega_epi`/`sst_lock_acidente`/
`sst_lock_cat`/`sst_block_delete_evento_esocial` para 409 CONFLICT
amigavel, caso algum bypass da API chegue a acionar o trigger (a API em si
nunca expoe PUT/DELETE livre nesses recursos — imutabilidade e modelada
como transicao de estado, conforme o contrato).

### Gap de schema identificado durante a implementacao (nao e bug)

`sst_acidentes` nao tem uma coluna de status de encerramento dedicada —
apenas `confirmado` (que ja nasce `true` na criacao, ja que a API nao
expoe uma fase de rascunho para Acidente, diferente de EntregaEPI).
`POST /api/sst/accidents/:id/close` foi implementado como portao de
validacao (RF-SST-026/BR-SST-018: bloqueia com 422 se gravidade grave sem
investigacao + acao corretiva) mas nao persiste uma nova transicao de
estado — nao ha coluna para isso no schema atual. Se o produto precisar
de um "encerrado_em"/status auditavel, e necessaria uma migration
adicional (fora do escopo desta passada, migrations ja travadas).
Detalhado em `docs/database/DATABASE.md` secao "BLOCO 1 SST —
Implementacao Backend".

Outro ajuste pragmatico: `legalDeadlineService` (calculo de
`prazo_limite` da CAT, RNF-SST-04) considera apenas sabado/domingo como
nao-uteis — nao ha calendario de feriados nacionais parametrizavel nesta
passada, mesmo padrao de "constante configuravel, nao hard-code" ja usado
em `sst_matriz_treinamento.periodicidade_reciclagem_meses`.

### Documentacoes atualizadas

- `docs/database/DATABASE.md` — nova secao "BLOCO 1 SST — Implementacao
  Backend (2026-08-07)" com o resumo dos models, mapper e o gap de
  schema.
- `docs/database/00-INDICE.md` — nota atualizada na secao "Pendencias de
  aplicacao" apontando para a implementacao de codigo feita nesta
  passada.
- `docs/projeto/04-USE_CASES.md` — secao nova "UC-44 a UC-47 (P0
  implementado)" com fluxo principal, fluxos de excecao e testes de cada
  caso de uso.
- `docs/governance/TODO.md` — entrada "2026-08-07 — Implementacao
  Backend BLOCO 1 SST (P0) — programador" com checklist detalhado do que
  foi feito e do que ficou de fora.
- JSDoc: todo arquivo novo (`models/Sst*.ts`, `modules/sst/**/*.ts`) tem
  cabecalho de modulo explicando responsabilidade, decisoes e
  divergencias em relacao aos documentos de design.

### Instrucoes de teste para o proximo agente/humano

1. `npm run typecheck --prefix server` — deve continuar em 0 erros.
2. `npx jest tests/unit` (a partir de `server/`) — 762/763 (a unica
   falha, `onda3-shipping-cockpit-cashflow.test.ts`, e pre-existente,
   dependente de data corrente, e falha igual no baseline sem esta
   entrega — nao relacionada ao modulo SST).
3. Testes novos dedicados: `npx jest tests/unit/sst-epi.test.ts
   tests/unit/sst-aso.test.ts tests/unit/sst-accident.test.ts
   tests/unit/sst-esocial.test.ts tests/unit/sst-rbac.test.ts` (55
   casos, cobrindo fluxo principal + excecao de cada caso de uso P0 +
   RBAC).
4. Testes de integracao HTTP (Supertest) contra banco real NAO foram
   criados nesta passada — as migrations continuam pendentes de
   `migration:up`, entao nao ha como rodar testes de integracao reais
   contra o schema SST ainda (os testes unitarios cobrem os use cases
   com repositorios mockados, sem precisar do banco).
5. Antes de aprovar `migration:up` das 12 migrations SST, revisar
   novamente o gap de schema do encerramento de acidente (acima) — pode
   valer a pena adicionar a coluna agora, antes de aplicar, para evitar
   uma 2a rodada de migration so para isso.

### Pendencias explicitas para a proxima passada

- Grupos de endpoint nao implementados: CIPA (NR-5), PGR/GES (NR-1),
  Treinamentos, Rotina Preventiva (DDS, Inspecoes, PT, Brigada), e o CRUD
  dedicado de Acoes Corretivas (`/api/sst/corrective-actions` — hoje so
  existe a criacao inline via `CreateAccidentInvestigationUseCase`, nao
  um controller proprio).
- RF-SST-009 (checklist de devolucao de EPI disparado por desligamento do
  RH) — gatilho RH→SST ainda nao especificado como endpoint interno ou
  evento assincrono (pendencia ja sinalizada pela auditoria de design).
- RF-SST-018 (bloqueio automatico de apontamento de funcionario inapto)
  — o dado (`resultado` do ASO) existe, mas nao ha flag/mecanismo
  consultado pelo modulo de Apontamento ainda.
- Aplicacao das 12 migrations (`migration:up`) — decisao do dono do
  produto, fora do escopo de qualquer agente ate aprovacao explicita.

---

## 2026-08-07 — Implementação Backend do BLOCO 1 SST, passada 2 (37 endpoints restantes) — `programador`

### Resumo da feature

Continuação direta da entrada anterior ("Implementação Backend do BLOCO 1
SST (P0)", commit `8482e79`, 38/75 endpoints). Esta passada implementou os
**37 endpoints restantes** do contrato `docs/business/BLOCO_1_SST_API.md`,
completando **75/75 endpoints** do módulo SST: CIPA (NR-5, CF/88, UC-48,
12 endpoints), PGR/GRO + GES (NR-1, 6 endpoints), Treinamentos de
Segurança (6 endpoints), Rotina Preventiva — Inspeções/PT/Brigada/DDS (10
endpoints) e CRUD dedicado de Ações Corretivas (3 endpoints).

Nenhuma migration foi criada, alterada ou aplicada nesta passada — os 20
models Sequelize novos apontam exatamente para o schema já revisado
(`server/migrations/20260806-000138` a `-000141`), que continua pendente
de `migration:up` aguardando aprovação do dono do produto. Os grupos
EPI/ASO/Acidente/eSocial da passada anterior não foram tocados.

**Estrutura de arquivos criada** (Clean Architecture, mesmo padrão de
`epi/`/`aso/`/`accident/`/`esocial/`):

- **Models** (`server/src/models/`): `SstMandatoCipa.ts`,
  `SstMembroCipa.ts`, `SstProcessoEleitoralCipa.ts`, `SstCandidatoCipa.ts`,
  `SstReuniaoCipa.ts`, `SstReuniaoCipaPresente.ts`, `SstGes.ts`,
  `SstGesFuncionario.ts`, `SstRiscoOcupacional.ts`, `SstRiscoEpi.ts`,
  `SstRiscoExame.ts`, `SstMatrizTreinamento.ts`, `SstTreinamento.ts`,
  `SstInspecaoSeguranca.ts`, `SstInspecaoItem.ts`,
  `SstPermissaoTrabalho.ts`, `SstPtExecutante.ts`, `SstBrigadista.ts`,
  `SstRegistroDds.ts`, `SstDdsPresenca.ts` (20 arquivos) — registrados e
  associados em `server/src/models/index.ts`.
- **Domain** (`server/src/modules/sst/domain/repositories/`):
  `CipaRepository.ts`, `PgrRepository.ts`, `TrainingRepository.ts`,
  `SafetyRoutineRepository.ts`, `CorrectiveActionRepository.ts`.
- **Infrastructure** (`server/src/modules/sst/infrastructure/`):
  `sequelize/SequelizeCipaRepository.ts`,
  `sequelize/SequelizePgrRepository.ts`,
  `sequelize/SequelizeTrainingRepository.ts`,
  `sequelize/SequelizeSafetyRoutineRepository.ts`,
  `sequelize/SequelizeCorrectiveActionRepository.ts`,
  `mappers/CipaMapper.ts`, `mappers/PgrMapper.ts`,
  `mappers/TrainingMapper.ts`, `mappers/SafetyRoutineMapper.ts`,
  `mappers/CorrectiveActionMapper.ts`.
- **Application** (`server/src/modules/sst/application/use-cases/`): 37
  use cases distribuídos em `cipa/` (12), `pgr/` (6), `training/` (6),
  `safetyRoutine/` (10), `correctiveAction/` (3).
- **Presentation**: `presentation/controllers/cipaController.ts`,
  `pgrController.ts`, `trainingController.ts`,
  `safetyRoutineController.ts`, `correctiveActionController.ts`;
  `presentation/routes/sst.ts` **estendido** (não recriado) com os 37
  novos registros de rota.

### Decisões de design tomadas por conta própria

Nenhum destes grupos tinha UC super detalhado (confirmado pela tarefa) —
as decisões abaixo preencheram lacunas de contrato de forma conservadora,
sem inventar máquina de estados:

1. **`GetDimensioningUseCase` (CIPA):** a NR-5 (Quadro I) dimensiona
   titulares/suplentes por CNAE/grau de risco, não só por headcount. Sem
   uma tabela de CNAE parametrizada no schema, implementei uma tabela
   genérica por faixa de headcount, documentada como simplificação
   (`[VERIFICAR COM TÉCNICO SST DA EMPRESA]`), no mesmo espírito do
   `legalDeadlineService` da passada anterior.
2. **`AddCandidateUseCase` (CIPA):** além do bloqueio por 2 mandatos
   consecutivos eleitos (BR-SST-021, já no contrato), também rejeito
   inscrição de candidato em processo eleitoral já encerrado/apurado
   (`total_votantes` preenchido). O contrato não detalhava esse caso
   explicitamente, mas é a leitura direta do requisito do usuário de "não
   eleger fora do processo eleitoral aberto" — coberto pelo teste
   dedicado de exceção do grupo CIPA.
3. **`ListBrigadeUseCase`:** o "mínimo configurado" de brigadistas
   (NBR 14276, varia por população/risco do prédio) não tem tabela de
   parametrização no schema desta passada — usei uma constante
   placeholder documentada, sem persistir nada incorreto.
4. **Prazo da ação corretiva automática de inspeção
   (`CreateInspectionUseCase`):** o contrato diz que item não-conforme
   gera `AcaoCorretiva` automática e que `risco_grave_iminente` "aparece
   destacada no dashboard", mas não define o prazo. Adotei 1 dia para
   risco grave/iminente e 15 dias para NC comum — parametrização razoável
   desta passada, fácil de ajustar depois (constantes no topo do
   use case).
5. **`CloseElectoralProcessUseCase`:** o contrato descreve apenas
   "Registra apuração (votos, eleitos, suplentes, atas)" sem JSON de
   request. Modelei como `{ resultados: [{employee_id, votos, eleito}],
   total_votantes?, data_votacao?, atas_urls? }`, atualizando os
   candidatos existentes e consolidando o processo — evita inventar
   máquina de estado nova, é só um `UPDATE` em lote + `UPDATE` do
   processo.
6. **Bug corrigido durante a implementação (não é regressão):** a
   primeira versão de `CloseElectoralProcessUseCase` chamava
   `cipaRepository.updateMember` (que aponta para `SstMembroCipa`) para
   atualizar `votos`/`eleito` dos CANDIDATOS (`SstCandidatoCipa`, tabela
   diferente) — corrigido adicionando `updateCandidate` dedicado ao
   `CipaRepository`/`SequelizeCipaRepository` antes de fechar a tarefa
   (pego no próprio desenvolvimento, nunca chegou a rodar contra dado
   real).

### Documentações atualizadas

- `docs/database/DATABASE.md` — nova seção "BLOCO 1 SST — Implementação
  Backend, passada 2 (2026-08-07)" com os 20 models, 5 mappers e a nota
  de decisão de schema sobre apuração de CIPA.
- `docs/projeto/04-USE_CASES.md` — seção "UC-44 a UC-48 + CRUDs enxutos"
  (renomeada do título anterior "UC-44 a UC-47"), com UC-48 (CIPA)
  detalhado e os 4 grupos de CRUD enxuto resumidos com fluxo
  principal/exceção/testes.
- `docs/governance/TODO.md` — nova entrada "2026-08-07 — Implementação
  Backend BLOCO 1 SST, passada 2" com checklist completo; item "Não
  implementado nesta passada" da entrada anterior marcado como concluído
  com referência cruzada.
- JSDoc: todo arquivo novo (`models/Sst*.ts`, `modules/sst/domain/**`,
  `modules/sst/infrastructure/**`, `modules/sst/application/**`,
  `modules/sst/presentation/**`) tem cabeçalho de módulo explicando
  responsabilidade e, quando aplicável, a divergência de nome de campo
  banco↔API resolvida pelo mapper.
- Este arquivo (`docs/governance/HANDOFF_CODEX.md`).

### Instruções de teste

1. `npm run typecheck --prefix server` — 0 erros (confirmado).
2. `npx jest tests/unit --runInBand` (a partir de `server/`) — 816/817
   passando. A única falha é `onda3-shipping-cockpit-cashflow.test.ts`,
   pré-existente e não relacionada (dependente de data corrente),
   confirmada idêntica ao baseline anterior a esta passada (762/763 →
   816/817, delta de +54 testes novos, 0 regressões nos 762 pré-existentes).
3. Testes novos dedicados a esta passada: `npx jest
   tests/unit/sst-cipa.test.ts tests/unit/sst-pgr.test.ts
   tests/unit/sst-training.test.ts tests/unit/sst-safety-routine.test.ts
   tests/unit/sst-corrective-action.test.ts` (54 casos: fluxo principal +
   ao menos 1 fluxo de exceção por grupo).
4. Testes de integração HTTP (Supertest) contra banco real continuam NÃO
   criados (migrations pendentes de `migration:up`, mesma justificativa
   da passada anterior).
5. Ao aprovar `migration:up`, revisar também o gap de schema de
   "encerramento de acidente" sinalizado na passada 1 (ainda não
   resolvido, fora do escopo desta passada 2).

### Pendências/riscos residuais

- Telas de frontend para os 5 grupos desta passada (CIPA, PGR/GES,
  Treinamentos, Rotina Preventiva, Ações Corretivas) não existem —
  responsabilidade de `PromadorFonteEnd`/`ui-ux-styling-expert`, fora do
  escopo deste agente de backend.
- `GetDimensioningUseCase` e `ListBrigadeUseCase` usam constantes
  placeholder documentadas (`[VERIFICAR COM TÉCNICO SST DA EMPRESA]`) —
  não bloqueiam uso, mas não substituem a parametrização real por
  CNAE/norma técnica quando o técnico SST da empresa confirmar os
  valores.
- RF-SST-009, RF-SST-018, RF-SST-020, RF-SST-050 seguem como pendências
  explícitas já sinalizadas na passada 1 (não fazem parte do escopo de
  endpoint desta passada 2).
- Aplicação das 12 migrations SST (`migration:up`) continua fora do
  escopo de qualquer agente até aprovação explícita do dono do produto.

## 2026-08-07 — Frontend do BLOCO 1 SST (`client/`) — `PromadorFonteEnd`

Telas funcionais do módulo SST (departamento 15), consumindo os 75
endpoints `/api/sst/*` implementados nas duas passadas de backend
anteriores (commits `8482e79`/`3696734`). Foco em funcionalidade/integração
— polimento visual fino (classes Tailwind, hierarquia) fica para o
`webdesiner` numa passada seguinte, seguindo o padrão já estabelecido
(banner `bg-brand/10`, `DidacticAlert`, `TableSkeletonRows`).

### Arquivos criados

- `client/src/api/sst.ts` — tipos TS + funções para EPI (tipos/matriz/entregas/ficha/pendências), ASO (list/detalhe/status/upcoming/create), Acidente/CAT (list/detalhe/create/complements/close/cat/investigation), fila eSocial (list/resend), CIPA (dimensioning/mandates/meetings/stability) e Treinamentos (list/create/blocklist). Não cobre os 75 endpoints do contrato — apenas o que as telas desta passada consomem (PGR/GES, Inspeções/PT/Brigada/DDS e Ações Corretivas ficaram de fora, ver Pendências).
- `client/src/pages/sst/SstPage.tsx` — página com 6 abas (padrão `TabButton` de `InventoryPage.tsx`).
- `client/src/pages/sst/EpiTab.tsx` — 3 sub-visões: Entregas (lista + dialog nova entrega + dialog evidência + confirmar + registrar devolução + banner de pendência crítica), Tipos de EPI (catálogo com destaque de CA vencido), Matriz Função×EPI (lista + criar vínculo).
- `client/src/pages/sst/AsoTab.tsx` — cards de vencimento 30/60/90 dias + lista + dialog de registro com aviso inline quando resultado = inapto/apto com restrições (bloqueio de apontamento, efeito colateral do backend).
- `client/src/pages/sst/AccidentsTab.tsx` — lista + dialog de registro (imutável) + dialog de detalhe com emissão de CAT (prazo legal em destaque), abertura de investigação (obrigatória para acidentes com afastamento ou pior) e encerramento.
- `client/src/pages/sst/EsocialTab.tsx` — fila somente leitura (filtros tipo/status) + botão de reenvio para eventos `rejeitado`.
- `client/src/pages/sst/CipaTab.tsx` — dimensionamento (cards), mandatos (leitura), reuniões (lista + dialog de criação com validação client-side de ata obrigatória em reunião ordinária).
- `client/src/pages/sst/TrainingsTab.tsx` — lista + dialog de registro (campo `identificacao_operador` só aparece para norma NR-11) + banner de lista de bloqueio operacional.
- `client/src/pages/sst/sstShared.tsx` — helpers de formatação de data (`formatDate`/`formatDateTime`/`toDateInputValue`) e badges de status/enum reutilizados pelas abas.
- `client/src/pages/home/widgets/SstPendenciasWidget.tsx` — widget da Home por Perfil (ASOs vencendo em 30 dias + pendências críticas de EPI), registrado em `widgetRegistry.tsx` com `module: 'sst'`, `priority: 45`.

### Arquivos alterados

- `client/src/api/accessProfiles.ts` — união `AccessModuleKey` ganhou `rh`/`sst` (já existiam no backend, `server/src/shared/domain/accessModules.ts`, mas o client estava defasado).
- `client/src/App.tsx` — rota `/sst` (lazy) dentro de `ModuleRoute` com `module="sst"`.
- `client/src/layouts/AppLayout.tsx` — item "Segurança do Trabalho (SST)" na seção "Qualidade & Engenharia", ícone `HardHat`, `module: 'sst'`.
- `client/src/pages/home/widgetRegistry.tsx` — registro do widget `sst-pendencias`.

### Regras de imutabilidade respeitadas na UI

- Entrega de EPI confirmada não mostra botão de editar/excluir — apenas "Registrar devolução" (sub-recurso separado). Botões de ação sensível (Confirmar entrega, Emitir CAT, Encerrar acidente, Reenviar evento eSocial) ficam desabilitados (com `title` explicando o motivo) quando o usuário não tem nível `approve` no módulo `sst` — o backend já rejeitaria com 403, a UI só evita o clique morto.
- Acidente não tem edição alguma após criado — apenas ações filhas (CAT, investigação, encerramento); complementos não têm UI nesta passada (ver Pendências).
- CAT já emitida esconde o botão "Emitir CAT inicial" (mostra a lista de CATs existentes com prazo legal em destaque); reabertura de CAT não tem UI nesta passada.

### O que ficou de fora desta passada (declarado, não omissão)

1. PGR/GES (`/api/sst/risks`, `/api/sst/ges`) — sem tela; CRUD simples, backend pronto.
2. Rotina Preventiva — Inspeções, Permissão de Trabalho, Brigada, DDS (`/api/sst/inspections`, `/work-permits`, `/brigade`, `/dds`) — sem tela.
3. Ações Corretivas (`/api/sst/corrective-actions`) como tela própria — hoje só é criada implicitamente pela investigação de acidente; não há tela de listagem/atualização de status independente.
4. CIPA — escrita de mandato/processo eleitoral (`POST /cipa/mandates`, `/electoral-processes*`, `/mandates/:id/members`, `/members/:id/take-office`) sem dialog — a aba CIPA desta passada é leitura de dimensionamento/mandatos + criação de reunião apenas.
5. `POST /accidents/:id/complements` (lançamento de complemento, ex. dias perdidos atualizados) sem UI — só a criação inicial do acidente.
6. Ficha de EPI consolidada/imprimível (`GET /epi-deliveries/ficha/:employeeId`) — coberta na API client (`getEpiFicha`), mas sem tela de impressão/exportação dedicada ainda.

### Validação

- `npx tsc -p tsconfig.app.json --noEmit` — 0 erros.
- `npx vitest run` — 51/51 testes passando (8 arquivos), nenhuma suíte quebrada.
- `npm run build` — build de produção OK, `SstPage` em chunk lazy próprio.

### Instruções de teste manual (usuário admin vê tudo)

1. Login como admin. Menu lateral, seção "Qualidade & Engenharia", item "Segurança do Trabalho (SST)" (`/sst`).
2. EPI: aba "Tipos de EPI (catálogo)", "Novo tipo de EPI" (nome/CA/validade/vida útil). Voltar a "Entregas", "Nova entrega" com o EPI recém-criado (fica em rascunho). "Anexar evidência" (qualquer URL) e depois "Confirmar" (dispara baixa de estoque real via `/api/inventory/movements` — exige `item_id` vinculado ao TipoEPI com saldo, senão retorna 409 traduzido). Fluxo de exceção: cadastrar TipoEPI com CA vencido e tentar confirmar a entrega — deve bloquear com mensagem clara.
3. ASO: "Novo ASO" com resultado "Inapto" deve mostrar o aviso inline de bloqueio de apontamento antes de salvar.
4. Acidentes: registrar acidente com gravidade "Com afastamento", abrir o detalhe, "Emitir CAT inicial" (prazo legal em destaque), tentar "Encerrar acidente" sem investigação (bloqueia com 422 traduzido), "Abrir investigação" com uma ação corretiva, encerrar de novo (deve funcionar).
5. eSocial: após os passos acima, a fila deve mostrar os eventos S-2220 (do ASO) e S-2210 (da CAT) como pendentes.
6. CIPA: card de dimensionamento; criar reunião exige mandato existente (mandato só é criável hoje via API, não pela UI desta passada).
7. Treinamentos: registrar treinamento norma NR-11 e conferir o campo de identificação do operador.
8. Home: voltar para `/` e conferir o card "Pendências de SST" somando ASOs vencendo em 30 dias e pendências críticas de EPI.

### O que o Agente QA (ou humano) deve testar

- Usuário com perfil `sst` nível `operate` (sem `approve`) deve ver os botões de ação sensível desabilitados com tooltip, e a API deve rejeitar com 403 se contornado via DevTools.
- Usuário sem módulo `sst` nem `rh` deve ser redirecionado para "Acesso Negado" ao acessar `/sst` diretamente pela URL.
- Caminho feliz completo de EPI (confirmação com baixa de estoque real) — o ambiente de teste precisa ter um item de estoque com saldo positivo vinculado ao TipoEPI.
- Tradução de erro 409 (estoque insuficiente) e 422 (CA vencido/evidência ausente) no dialog de confirmação de entrega.

---

## BLOCO 2 — Módulo TI (Tecnologia da Informação) — Requisitos Prontos (2026-08-07)

**Status:** 🟡 Requisitos formais concluídos. **Nenhum código foi criado.**
TI não existe hoje em `server/src/` como módulo dedicado — sem model, rota
ou use-case próprios; só a reutilização já verificada de `Asset`
(`asset_type: 'it'|'license'`, `license_expires_at`) e `MaintenanceOrder`.

**Para `AdmDBA` e `ArquitetoSoftwareAPI`:** os requisitos completos (RF/RNF,
3 casos de uso P0 detalhados com fluxo de exceção, 8 entidades novas do
domínio, regras de negócio) estão em:

- **`docs/business/BLOCO_2_TI_REQUISITOS.md`** — ler primeiro (RF-TI-001
  a 046, RNF-TI-01 a 05, UC-49 a UC-51, matriz de rastreabilidade).
- `docs/business/briefs/BRIEF_TI_2026-08-06.md` — brief de domínio
  original (8 entidades novas, seção (b); 18 regras BR-TI-001 a 018 com
  justificativa, seção (c)).

**Decisões já tomadas (não reabrir sem motivo novo):**
1. **Inventário de TI e licenças são visões/extensões de `Asset`**
   (`asset_type IN ('it','license')`) — proibida tabela paralela de
   equipamentos (BR-TI-008). Extensão 1:1 `ItSoftwareLicenseDetail` só
   adiciona seats/custo/chave; `assets.license_expires_at` continua sendo a
   data de vencimento canônica.
2. **Helpdesk dimensionado para 1,5 atendentes**: fila única, sem N1/N2/N3,
   triagem implícita ao assumir o chamado, SLA simples por prioridade com
   pausa em `waiting`, auto-close parametrizável. CAB/catálogo de
   serviços/CMDB ficam fora de escopo deliberadamente.
3. **`/api/service-orders` é do módulo Garantia** — não confundir com
   chamados de TI (`ItTicket`, sugestão de rota `/api/it-tickets`).
4. **Gestão de acessos é processo, não tecnologia nova**: `ItAccessRequest`
   (grant/change/revoke) documenta pedido/aprovação/execução e culmina nas
   operações RBAC já existentes (`PUT /api/users/:id/access-profile`,
   `logAction`) — não duplica autorização nem `AuditLog` (BR-TI-013).
   Offboarding dispensa aprovação prévia, meta de execução no mesmo dia, e
   fica bloqueado enquanto houver `ItResponsibilityTerm` ativo do
   funcionário sem tratamento (BR-TI-011/012).

**Pendência de RBAC (crítica, decisão de desenho aberta):** precisa de uma
nova chave `ti` em `server/src/shared/domain/accessModules.ts` (catálogo
com 31 chaves na leitura de 2026-08-07, `sst` foi a penúltima adicionada em
2026-08-06). Diferente de `rh`/`sst` (dado sensível bloqueado mesmo para
autenticados), `ti` precisa do **oposto** em uma fatia: qualquer usuário
autenticado deve poder abrir e acompanhar os **próprios** chamados sem ter
o módulo `ti` (BR-TI-001). Proposta registrada em
`BLOCO_2_TI_REQUISITOS.md` §5.1: rotas de auto-serviço fora do gate
`authorizeModule('ti')`, autorizadas por posse do registro
(`ticket.requester_id === req.user.id`) em vez de módulo — o desenho exato
(rota separada vs. middleware `authorizeSelfOrModule` reutilizável) fica
para o arquiteto decidir antes de implementar.

**Outra pendência de desenho:** aprovador de `ItAccessRequest`
grant/change (módulo `ti:approve` fixo vs. gestor do departamento do
funcionário-alvo) não está decidido no brief nem neste bloco — ver
`BLOCO_2_TI_REQUISITOS.md` §5.2, decisão explicitamente repassada ao
`AdmDBA`/`ArquitetoSoftwareAPI` porque afeta FK de schema e tela de
aprovação.

**Após a modelagem de banco/API, acionar `AuditorIntegrador`** para rodar a
rastreabilidade Requisito → Banco → API neste módulo novo — em particular
verificar que a exceção de auto-serviço do helpdesk (BR-TI-001) não foi
"corrigida" por engano para o padrão `authorizeModule` genérico do resto do
sistema durante a implementação.

---

## BLOCO 3 — Módulo Jurídico (JUR) — Requisitos Prontos (2026-08-07)

**Status:** 🟡 Requisitos formais concluídos. **Nenhum código foi criado.**
Jurídico não existe hoje em `server/src/` como módulo dedicado — sem model,
rota ou use-case próprios. Reaproveitamentos verificados: `Supplier`,
`Client`, `Employee`, `AccountPayable`, `AuditLog`.

**Para `AdmDBA` e `ArquitetoSoftwareAPI`:** os requisitos completos (RF/RNF,
5 casos de uso detalhados com fluxo de exceção, 21 entidades novas do
domínio, regras de negócio) estão em:

- **`docs/business/BLOCO_3_JUR_REQUISITOS.md`** — ler primeiro (RF-JUR-001
  a 046, RNF-JUR-01 a 05, UC-52 a UC-56, matriz de rastreabilidade).
- `docs/business/briefs/BRIEF_JUR_2026-08-06.md` — brief de domínio
  original (contratos, contencioso, procurações, LGPD, propriedade
  intelectual; regras BR-JUR-001 a 051 com justificativa legal, seção (c)).

**Decisões já tomadas (não reabrir sem motivo novo):**
1. **Prazos processuais NUNCA são calculados pelo sistema** (RF-JUR-023/
   BR-JUR-012) — a data fatal já vem calculada do advogado. Essa é a
   decisão de maior risco do módulo: o sistema garante que a data fatal
   não passe em branco (alertas redundantes D-7/D-3/D-1/D0 não
   desativáveis, escalonamento automático, dupla confirmação de baixa por
   usuários distintos), mas nunca assume o cálculo do prazo em si.
2. **Todo prazo processual exige `responsible_user_id` NOT NULL** — é
   proibido salvar um prazo sem responsável nomeado, sem exceção
   (RF-JUR-021/BR-JUR-010). É o bloqueio de maior prioridade de todo o
   módulo.
3. **ASO/dados de saúde permanecem no domínio SST** (Bloco 1) — Jurídico
   nunca lê as tabelas de saúde diretamente; quando precisar de evidência
   para defesa em reclamatória, consome relatório/exportação específica, não
   join direto (RF-JUR-046, referência cruzada a BR-SST-036).
4. **Custos de contencioso (honorários, custas, acordos) lançam em
   `accounts_payable` existente** — categoria "Jurídico" + vínculo ao
   processo; nunca uma tabela financeira paralela. Depósito judicial é
   distinto de despesa (tipo próprio), tratamento contábil fino pendente de
   confirmação com o contador (RF-JUR-018, §6.3 do bloco).
5. **Provisão de contingência é histórico append-only** (`legal_case_provisions`)
   — cada reavaliação de risco (CPC 25: provável/possível/remota) gera nova
   linha; a série alimenta um relatório para o Financeiro/Controladoria
   (RF-JUR-016/020), nunca é sobrescrita.
6. **Contrato tem contraparte polimórfica mutuamente exclusiva**
   (`supplier_id`/`client_id`/`employee_id`/avulsa) — decisão de constraint
   (CHECK vs. validação em aplicação) explicitamente repassada ao `AdmDBA`
   (§6.2 do bloco).

**Pendência de RBAC (crítica, decisão de desenho aberta):** precisa de uma
nova chave `juridico` em `server/src/shared/domain/accessModules.ts`
(catálogo com 31 chaves na leitura de 2026-08-07). Diferente de `ti` (que
tem uma fatia aberta a todos), `juridico` deve seguir o desenho **mais
restritivo** de `sst` — leitura completa de contencioso/prazos/LGPD exige o
módulo, nunca basta autenticação. Única exceção: perfil `financeiro` enxerga
apenas o relatório derivado de provisões/custos (RF-JUR-020), nunca o
conteúdo do processo (segregação de campo, não de rota — mesmo padrão já
usado em `rh`).

**Outra pendência de desenho:** alçada de aprovação de contrato por
valor/tipo (RF-JUR-003) não tem tabela de configuração equivalente
verificada no ERP hoje — confirmar com `AdmDBA`/`ArquitetoSoftwareAPI` se
algo similar já existe (ex.: em Compras) antes de propor nova estrutura
(§6.4 do bloco).

**7 itens `[VERIFICAR COM ASSESSOR JURÍDICO DA EMPRESA]`** consolidados em
`BLOCO_3_JUR_REQUISITOS.md` §6.5 — nenhum bloqueia a modelagem (todos viram
campo de configuração), mas incluem o encarregado (DPO) formal da empresa,
prazo do regulamento da ANPD para incidentes, e alçadas de aprovação.

**Após a modelagem de banco/API, acionar `AuditorIntegrador`** para rodar a
rastreabilidade Requisito → Banco → API neste módulo novo — em particular
verificar que a dupla confirmação de prazo fatal (BR-JUR-013, `fulfilled_by
≠ confirmed_by`) e o bloqueio de alertas de prazo fatal não-desativáveis
(RNF-JUR-04) não foram enfraquecidos durante a implementação, já que é o
requisito de maior risco legal/financeiro do módulo.

---

## BLOCO 2 — Módulo TI (Tecnologia da Informação) — Contrato de API Pronto (2026-08-07, `ArquitetoSoftwareAPI`)

**Status:** 🟡 Contrato de API concluído. **Nenhum código foi criado.**
Segue estritamente o padrão de `docs/business/BLOCO_1_SST_API.md` e a
implementação real madura de `server/src/modules/sst/` (Clean Architecture
+ mapper DTO PT-BR↔inglês).

**Para `programador`, quando a implementação começar, siga estes arquivos
nesta ordem:**

1. **`docs/business/BLOCO_2_TI_API.md`** — contrato mestre deste módulo:
   57 endpoints em `/api/ti/*` (Chamados/Helpdesk 20, Termo de
   Responsabilidade 7, Licenças 10, Solicitação de Acesso 8, Backup 3, mais
   sub-rotas), request/response shapes, códigos de erro, estrutura Clean
   Architecture completa de `server/src/modules/ti/`, diagrama de sequência
   do offboarding com bloqueio por termo ativo (fluxo mais crítico do
   módulo) e rastreabilidade RF-TI-001 a 046 → endpoint.
2. **`docs/business/BLOCO_2_TI_REQUISITOS.md`** — RF/RNF/BR de origem (não
   reabrir decisões já tomadas lá).
3. `docs/business/briefs/BRIEF_TI_2026-08-06.md` — brief de domínio.

**Decisão central deste contrato — middleware novo
`authorizeSelfOrModule`:** especificado (não implementado) em
`server/src/middlewares/authorizeSelfOrModule.ts`. Resolve BR-TI-001 de
forma diferente de `rh` (filtra campo, rota aberta) e de `sst` (checagem
inline `sst||rh` em 2 rotas de status agregado): aqui a **rota inteira do
próprio registro** (chamado de TI) precisa ficar aberta a quem não tem
módulo nenhum, restringindo por posse (`ticket.requester_id ===
req.user.id`). Aplicado em `GET /api/ti/tickets/:id`,
`POST /api/ti/tickets/:id/comments`, `.../confirm`, `.../reopen`. Não
substitui `authorizeModule` — compõe com ele (mesma cadeia de
middlewares). `POST /api/ti/tickets` (abertura) e
`GET /api/ti/tickets/mine` usam apenas `authenticate` puro (sem checagem de
posse — ainda não há recurso, ou o filtro já é implícito pelo próprio
`req.user.id`).

**3 categorias de autorização do módulo (não confundir):**
1. **Público-autenticado/self-service** — `authenticate` puro ou
   `authorizeSelfOrModule`.
2. **`ti:operate`** — fila completa, termos, licenças, backup, execução de
   acesso.
3. **`ti:approve`** — marcar termo `lost`, aprovar `grant`/`change` de
   acesso, confirmar renovação de licença (gera Requisição de Compra),
   revelar `license_key` combinado com `role='admin'` como alternativa.

**Decisões de tipo de dado (correção deliberada em relação ao brief):**
`Asset.id`/`Employee.id`/`User.id` são `INTEGER autoIncrement` (verificado
em `server/src/models/Asset.ts`, `Employee.ts`, `User.ts`) — todas as FKs
novas do módulo TI no contrato JSON são `integer`, nunca `UUID`/`string`
genérica.

**Pendências explícitas para `AdmDBA` (schema em paralelo) — ver seção
"Resumo — Handoff" de `BLOCO_2_TI_API.md` para o texto completo:**
1. Histórico de reclassificação de prioridade de chamado — tabela própria
   vs. comentário de sistema (`ItTicketComment` com `system_generated`).
2. `departments.manager_user_id` — confirmar se existe ou se a primeira
   versão do aprovador de `ItAccessRequest` implementa apenas
   `ti:approve`/admin (TODO explícito para gestor de departamento, sem
   implementação silenciosa parcial) — decisão §5.2 do requisito repassada
   também ao `AdmDBA`.
3. Tabela de configuração de parâmetros do módulo (`ti_settings` sugerido)
   para SLA/auto-close/reabertura/janelas de alerta/frequência de restore —
   nenhum destes pode ser hard-coded (RF-TI-046/RNF-TI-05).
4. `ItTicket.requester_id` nullable + flag `system_generated` (ou usuário
   de serviço seedado) para o chamado `urgent` automático de falha de
   backup (RF-TI-040).
5. Índice único parcial em `ItLicenseSeat` (`employee_id`,
   `license_detail_id`, `revoked_at IS NULL`) — mesmo padrão de
   `uq_sst_eventos_esocial_origem_ativo` do módulo SST.

**Após a modelagem de banco, acionar `AuditorIntegrador`** para validar: (a)
que `authorizeSelfOrModule` checa posse sempre no use case (nunca confia em
filtro de query string manipulável); (b) que a integração RH→TI de
offboarding (chamada direta de use case a use case, sem endpoint HTTP
dedicado — decisão §2.4 do contrato, dado que o módulo RH ainda não tem
camada de eventos) é consistente com a decisão §5.4 do
`BLOCO_2_TI_REQUISITOS.md`; (c) que `POST
/api/ti/licenses/:assetId/request-renewal` delega 100% da regra de negócio
de requisição ao módulo real `/api/purchase-requisitions`, sem duplicar
validação.

---

## BLOCO 2 TI — Implementação Backend Completa (2026-08-07) — `programador`

**Resumo da feature:** implementação completa do backend do módulo TI
(Tecnologia da Informação, departamento 13) — helpdesk, termo de
responsabilidade de equipamento, licenças de software, solicitações de
acesso (onboarding/change/offboarding) e backup/continuidade. 57/57
endpoints do contrato (`docs/business/BLOCO_2_TI_API.md`), seguindo
estritamente o desenho aprovado em `docs/business/BLOCO_2_TI_AUDITORIA.md`
(veredito: APROVADO PARA IMPLEMENTAÇÃO, 7 correções já aplicadas antes
desta passada).

### Escopo entregue

- **10 models Sequelize** (`server/src/models/`): `ItTicketCategory`,
  `ItTicket`, `ItTicketComment`, `ItTicketPriorityHistory`,
  `ItResponsibilityTerm`, `ItSoftwareLicenseDetail`, `ItLicenseSeat`,
  `ItAccessRequest`, `ItBackupLog`, `TiSettings` — colunas 100% em inglês
  (mesmo nome da coluna do banco, sem tradução — diferente do padrão PT-BR
  do SST), registrados e associados em `server/src/models/index.ts`
  (incluindo a correção de colisão de nome de associação `seats`/coluna
  `seats` em `ItSoftwareLicenseDetail`, renomeada para `seatAllocations`).
- **Módulo `server/src/modules/ti/`** completo em Clean Architecture:
  - `domain/entities/*Types.ts` (5 arquivos de DTOs, sem lógica).
  - `domain/repositories/` (6 interfaces: `TicketRepository`,
    `ResponsibilityTermRepository`, `LicenseRepository`,
    `AccessRequestRepository`, `BackupLogRepository`,
    `TiSettingsRepository`).
  - `domain/services/ticketPolicyService.ts` (SLA/prazos, funções puras,
    sempre parametrizadas por `ti_settings`) e
    `approverEligibilityService.ts` (elegibilidade de aprovador §4.1).
  - `application/services/` (4 interfaces injetadas: `AssetLookupService`,
    `MaintenanceOrderService`, `AccessProfileExecutionService`,
    `PurchaseRequisitionService`).
  - `application/use-cases/{ticket,term,license,accessRequest,backup}/`
    — 49 use cases (1 classe por arquivo, mesmo padrão do SST).
  - `infrastructure/{adapters,mappers,sequelize}/` — 4 adapters, 5
    mappers, 6 repositórios Sequelize.
  - `presentation/{controllers,routes}/` — 5 controllers, 1 router
    agregador (`ti.ts`), montado em `/api/ti` (`server/app.ts`).
- **Middleware novo `server/src/middlewares/authorizeSelfOrModule.ts`**:
  libera a requisição se `role=admin`, OU módulo com nível suficiente, OU
  `ownershipCheck(req)` (posse do recurso, resolvida SEMPRE no
  controller/use case, nunca em parâmetro de rota cru). Aplicado a 6 rotas
  de auto-serviço do helpdesk e à elegibilidade de aprovador de
  `ItAccessRequest`.

### Decisões próprias tomadas (não estavam 100% especificadas)

1. **Transações explícitas com `sequelize` de `config/database`** (não
   `models/index`), padrão `try { ... await t.commit(); } catch { await
   t.rollback(); throw }` — replicado de
   `ConfirmEpiDeliveryUseCase` (SST) em vez do estilo `sequelize.transaction(async
   t => {...})`, para consistência e testabilidade (mock simples de
   `config/database`).
2. **`waiting_minutes`**: sem coluna dedicada de "início da espera", o
   cálculo em `ResumeTicketUseCase` usa a diferença entre `updatedAt` (o
   momento do `POST /:id/wait` anterior) e o instante do `resume` —
   aproximação aceitável documentada no código; se o chamado sofrer outro
   `update` no meio da espera (não deveria, mas não é bloqueado por
   schema), a métrica fica levemente imprecisa. Sinalizado para revisão
   futura se o negócio pedir precisão de segundo.
3. **`ticket_number`/`term_number`/`request_number`**: gerados por
   `countByYear()+1` formatado (`TI-2026-0001`), não por sequence de banco
   — mesmo risco teórico de corrida já aceito em `RQ-${Date.now()}` do
   módulo `purchaseRequisitions`, mitigado pela constraint `UNIQUE` da
   coluna (uma colisão rara vira erro 500 tratável, não dado corrompido).
4. **`AccessProfileExecutionServiceAdapter.provisionAccess`**: quando o
   funcionário-alvo de um `grant` ainda não tem `Employee.user_id`, o
   adapter CRIA o usuário (senha temporária aleatória via
   `crypto.randomBytes`) usando `corporate_email` do payload (ou
   `employee.email` como fallback) e grava `Employee.user_id` — decisão
   necessária porque a API/requisitos descrevem "cria usuário (se ainda
   não existir)" em `POST /:id/execute` sem detalhar o mecanismo exato;
   documentado no código para revisão de segurança (senha temporária nunca
   é devolvida na resposta HTTP, só existe internamente até o
   reset/primeiro login — fluxo de "enviar senha ao usuário" fica fora de
   escopo deste bloco, mesma pendência aceita do brief original).
5. **`PurchaseRequisitionServiceAdapter.createRenewalRequisition`**: a
   renovação de licença não referencia `item_id` (não é material de
   estoque) — a requisição nasce sem itens (`items: []`), com o contexto
   (ativo, custo estimado, justificativa) apenas em `notes`. Se o negócio
   precisar de rastreabilidade estruturada por campo, é evolução futura
   (nova coluna dedicada em `purchase_requisitions`, fora de escopo deste
   bloco).
6. **`POST /access-requests/:id/approve|reject`**: a rota usa
   `authorizeSelfOrModule('ti', 'approve', approverEligibilityCheck)` em
   vez de `authorizeModule('ti', 'operate')` simples — decisão necessária
   porque o §4.1 da API exige liberar a aprovação para o GESTOR do
   departamento mesmo que ele não tenha módulo `ti` nenhum atribuído
   (apenas `ti:approve` OU gestor); usar `authorizeModule` bloquearia
   incorretamente um gestor sem módulo `ti`.
7. **RF-TI-045 (dashboard consolidado)** permanece SEM endpoint, conforme
   pendência aceita explicitamente pelo contrato de API — não inventado
   nesta passada.

### Documentações atualizadas

- `docs/database/DATABASE.md` — nova seção "BLOCO 2 TI — Implementação
  Backend (2026-08-07)": tabela das 10 tabelas novas × model × observação,
  estrutura do módulo, middleware novo.
- `docs/projeto/04-USE_CASES.md` — nova seção "UC-49 a UC-51 (implementado):
  Módulo TI", no mesmo padrão compacto usado para o SST (UC-44 a UC-48).
- `docs/governance/TODO.md` — item de auditoria anterior marcado `[x]`
  (implementado) + nova entrada datada "BLOCO 2 TI — Implementação
  Backend (57/57 endpoints)".
- Este arquivo (`docs/governance/HANDOFF_CODEX.md`) — esta seção.
- JSDoc: todo arquivo novo (models, use cases, repositórios, mappers,
  adapters, controllers, rotas, middleware) tem cabeçalho `@module`
  explicando responsabilidade; use cases documentam `@throws` por tipo de
  erro.

### Instruções de teste para o próximo agente/humano

1. `cd server && npm run typecheck` → deve retornar 0 erros (validado
   nesta entrega).
2. `cd server && npx jest tests/unit --runInBand` → 871/872 passando (a
   falha em `onda3-shipping-cockpit-cashflow.test.ts` é pré-existente,
   relacionada a data, e está fora do escopo deste bloco — não regredida
   nem corrigida aqui, conforme instrução explícita da tarefa).
3. Testes novos deste bloco (todos mockados, sem exigir banco):
   `ti-authorize-self-or-module.test.ts` (7),
   `ti-ticket-use-cases.test.ts` (15), `ti-term-use-cases.test.ts` (7),
   `ti-license-use-cases.test.ts` (10),
   `ti-access-request-use-cases.test.ts` (9),
   `ti-backup-use-cases.test.ts` (6) — 54 casos, cobrindo fluxo principal +
   exceções de cada UC (posse negada em chamado alheio; offboarding
   bloqueado por termo ativo; ticket automático de falha de backup sem
   requester; licença sobre asset de tipo errado; RBAC self-service vs.
   gestão).
4. **Antes de habilitar em produção/QA**, o dono do produto precisa
   aprovar `npm run migration:up --prefix server` para as 7 migrations
   `20260807-000150` a `-000156` — **nenhuma migration foi aplicada nesta
   entrega**, em nenhum banco (nem dev, nem teste); os testes unitários
   usam exclusivamente repositórios mockados.
5. Se/quando as migrations forem aplicadas, recomenda-se um teste de
   integração manual do fluxo mais crítico (E1 de offboarding): criar um
   `ItResponsibilityTerm` `active`, abrir um `ItAccessRequest` tipo
   `revoke` para o mesmo funcionário, e confirmar que `POST
   /api/ti/access-requests/:id/execute` retorna 422
   `BUSINESS_RULE_VIOLATION` com `details.pending_terms` populado — só
   depois disso, registrar a devolução do termo e confirmar que o retry de
   `execute` sucede.

### Riscos residuais

- Seed idempotente das 8 categorias de chamado (RF-TI-001) não foi criado
  nesta passada (fora do escopo de "backend + testes", mesma decisão já
  tomada para `sst_tipos_epi` no Bloco 1) — a aplicação funciona sem seed
  (categorias são criadas via `POST /ticket-categories`), mas a UX de
  abertura de chamado fica pobre até o seed existir.
- Nenhum job agendado real para auto-close (RF-TI-011) e alerta de backup
  diário fora do ciclo HTTP (RF-TI-041) foi criado — `GET
  /backup-logs/health` cobre o caso de alerta como fallback determinístico
  (mesmo texto já previsto pela API), mas o auto-close de chamados
  `resolved` sem confirmação depende de um cron/job futuro (nenhum
  mecanismo de scheduler existe hoje no projeto para isso — mesma lacuna
  identificada para RF-SST-019 no Bloco 1).
- `AccessProfileExecutionServiceAdapter.provisionAccess` cria senha
  temporária mas não a comunica ao usuário — fluxo de "primeiro acesso"
  (reset de senha) não foi desenhado neste bloco.
- Dashboard/KPI consolidado de TI (RF-TI-045) permanece sem endpoint,
  pendência aceita.

---

## 2026-08-07 — Frontend do BLOCO 2 TI (`client/`) — `PromadorFonteEnd`

Telas funcionais do módulo TI (departamento 13), consumindo os 57 endpoints
`/api/ti/*` implementados na passada de backend anterior (commit `2518d42`).
Segue o mesmo padrão do Bloco 1 SST (`client/src/pages/sst/`): página com
abas, `sstShared`-like helpers, api client tipado, `DidacticAlert` +
`TableSkeletonRows`. Foco em funcionalidade/integração — polimento visual
fino fica para o `webdesiner` numa passada seguinte.

Particularidade deste bloco (ausente no SST): **dois públicos distintos**
consomem o mesmo backend — auto-serviço (`/meus-chamados`, qualquer usuário
autenticado, sem `module`) e gestão (`/ti`, `module: 'ti'`). A separação de
rota reflete a separação de autorização já feita no backend
(`authorizeSelfOrModule` vs. `authorizeModule('ti', ...)`), evitando que a
mesma tela precise alternar comportamento com `if (hasModuleAccess('ti'))`
espalhado — cada página já assume seu público.

### Arquivos criados

- `client/src/api/ti.ts` — tipos TS + funções para as 5 áreas do contrato: Helpdesk (categorias, chamados — abrir/atribuir/prioridade/wait-resume/vincular O.M./resolver/confirmar/reabrir/cancelar/comentários), Termo de Responsabilidade (entrega/devolução/perda/ficha por funcionário/pendências de offboarding), Licenças (CRUD da extensão + reveal-key + assentos + expiring + request-renewal), Solicitações de Acesso (CRUD + approve/reject/execute/checklist/cancel) e Backup (list/create/health). Cobre os 57 endpoints do contrato (não fez recorte como o SST fez com PGR/GES).
- `client/src/pages/ti/tiShared.tsx` — formatação de data (`formatDate`/`formatDateTime`/`toDateInputValue`/`toDateTimeInputValue`) e badges de status/prioridade (chamado, termo, solicitação de acesso) + `refName` (helper para referências `{id,name}` que às vezes vêm cruas como `number`, conforme o contrato documenta para `delivered_by`/`received_by`/`requested_by` etc. quando o mapper não conseguiu popular o relacionamento).
- `client/src/pages/ti/MyTicketsPage.tsx` — **auto-serviço**, rota `/meus-chamados`. Lista os próprios chamados (qualquer status), dialog de abertura (assunto/descrição/categoria/urgência percebida/ativo opcional por ID), dialog de detalhe com comentários, confirmação de resolução (avaliação 1-5 opcional) e reabertura.
- `client/src/pages/ti/TiPage.tsx` — página de **gestão**, rota `/ti`, 5 abas (padrão `TabButton` de `SstPage.tsx`).
- `client/src/pages/ti/TicketsTab.tsx` — fila completa (filtro status/SLA estourado), dialog de atendimento: assumir, colocar em espera/retomar, vincular ordem de manutenção, registrar solução e resolver, reclassificar prioridade com motivo obrigatório (grava histórico no backend), comentar (com opção de nota interna), cancelar.
- `client/src/pages/ti/TermsTab.tsx` — lista com filtro de status, dialog de registrar entrega (ativo de TI + funcionário + condição + acessórios + tipo de aceite), dialog de devolução (condição ok/danificado/incompleto), dialog de marcar perdido (justificativa obrigatória, botão desabilitado sem nível `approve`).
- `client/src/pages/ti/LicensesTab.tsx` — lista com banner de licenças vencendo, cadastro de extensão sobre asset `asset_type='license'` existente, botão de revelar/ocultar chave (mascarada por padrão, clique explícito por linha), dialog de assentos (listar/alocar/revogar), dialog de solicitar renovação (nível `approve`, mostra o ID da Requisição de Compra gerada ao final).
- `client/src/pages/ti/AccessRequestsTab.tsx` — lista com filtro de status, dialog de criação (grant/change/revoke — campos de departamento/perfil/e-mail somem para `revoke`), dialog de gestão com aprovar/rejeitar (apenas `pending` e tipo≠revoke), executar, cancelar, e checklist de desligamento (checkboxes por item). Erro 422 de bloqueio de offboarding (`BUSINESS_RULE_VIOLATION`/`pending_terms`) exibido via `DidacticAlert` com uma dica adicional apontando para a aba Termos.
- `client/src/pages/ti/BackupTab.tsx` — 2 cards de saúde (backup diário/teste de restore) com alerta visual quando fora do prazo, histórico paginado, dialog de registro de execução (avisa quando a API cria automaticamente um chamado urgente por falha).
- `client/src/pages/home/widgets/TiPendenciasWidget.tsx` — widget da Home por Perfil (chamados abertos na fila + licenças vencendo em 30 dias + acessos pendentes), registrado em `widgetRegistry.tsx` com `module: 'ti'`, `priority: 47`.

### Arquivos alterados

- `client/src/api/accessProfiles.ts` — união `AccessModuleKey` ganhou `ti` (já existia no backend, `server/src/shared/domain/accessModules.ts`).
- `client/src/App.tsx` — rota `/meus-chamados` (lazy, **fora** de `ModuleRoute`, mesmo padrão de `/hr`) e rota `/ti` (lazy, dentro de `ModuleRoute` com `module="ti"`).
- `client/src/layouts/AppLayout.tsx` — item "Meus Chamados" na seção `''` (Início), sem `module` (visível a todo usuário autenticado, ícone `LifeBuoy`); item "TI (Helpdesk & Ativos)" na seção "Administração", `module: 'ti'`, ícone `Server`; breadcrumbs para as duas rotas novas.
- `client/src/pages/home/widgetRegistry.tsx` — registro do widget `ti-pendencias`.

### Regras de segurança/imutabilidade respeitadas na UI

- `MyTicketsPage` nunca expõe a fila completa nem ações de gestão (assumir/resolver/reclassificar) — só o que o backend já libera por posse (`authorizeSelfOrModule`). A tela nem tenta chamar `GET /api/ti/tickets` (fila).
- Nota interna (`is_internal`) só aparece como opção de checkbox em `TicketsTab` (gestão) — `MyTicketsPage` sempre envia `is_internal: false` implicitamente (parâmetro omitido em `addTicketComment`, default `false` no client), consistente com o 403 que o backend daria a um comentário interno vindo de quem não tem o módulo.
- Chave de licença mascarada por padrão em `LicensesTab`; revelar é um clique explícito por linha (não um "mostrar todas"), e o valor revelado não persiste após fechar a aba (estado local `revealed`, resetado a cada nova consulta).
- Botão "Marcar perdido" (termo) e "Renovação" (licença) ficam desabilitados com `title` explicativo para quem não tem nível `approve` no módulo `ti` — o backend já rejeitaria com 403 via `authorizeModule('ti', 'approve')`, a UI só evita o clique morto (mesmo padrão do SST).
- Bloqueio de offboarding (execução de `revoke` com termo ativo) não é escondido nem simplificado — o erro 422 estruturado do backend é exibido por completo via `DidacticAlert`, orientando o usuário a resolver o termo na aba correta antes de tentar de novo.

### O que ficou de fora desta passada (declarado, não omissão)

1. `GET /api/ti/dashboard`/KPIs consolidados de TI (RF-TI-045) — endpoint não existe no contrato (mesma pendência aceita pelo backend); nenhuma tela dedicada.
2. Upload real do termo assinado (`signed_document_path` via Multer) quando `acceptance_type='physical_signature'` — o formulário de nova entrega desta passada só oferece aceite eletrônico de fato funcional; o campo de upload não foi implementado (mesma decisão de escopo aceita para o Bloco 1 SST em outros uploads).
3. Ficha "equipamentos por funcionário" (`GET .../by-employee/:employeeId`) e listagem dedicada de "termos pendentes para offboarding" (`GET .../pending-for-offboarding/:employeeId`) — funções já existem em `client/src/api/ti.ts` (`getEmployeeTerms`/`getPendingTermsForOffboarding`), mas sem tela própria; o bloqueio de execução já aparece de forma didática no fluxo de Acessos (que é o caminho real do UC-51 E1).
4. `opened_on_behalf_of` (abertura de chamado em nome de terceiro, RF-TI-003) — sem campo na UI (nem em `MyTicketsPage`, nem como ação separada em `TicketsTab`); a API já ignora o campo silenciosamente para quem não tem o módulo, então a ausência na UI é conservadora, não insegura.
5. Busca de ativo por tag/QR na abertura de chamado — `asset_id` é um campo numérico simples (ID direto) em vez de busca por tag/QR do patrimônio.
6. Categoria "seed" — como o backend não populou as 8 categorias sugeridas (ver "Riscos residuais" da seção de backend acima), o formulário de abertura de chamado depende de pelo menos uma categoria já cadastrada via `POST /api/ti/ticket-categories` (gestão) antes do primeiro teste manual de auto-serviço.

### Validação

- `npx tsc -p tsconfig.app.json --noEmit` — 0 erros.
- `npx vitest run` — 51/51 testes passando (8 arquivos), nenhuma suíte quebrada (nenhum teste novo foi necessário — telas cobertas por convenção visual/funcional já testada em outros módulos, mesmo padrão do Bloco 1 SST).
- `npm run build` — build de produção OK, `TiPage` e `MyTicketsPage` em chunks lazy próprios (`TiPage-*.js` ~52 kB, `MyTicketsPage-*.js` ~11 kB).

### Instruções de teste manual

1. **Pré-requisito (gestão):** logar como admin, ir em `/ti` aba "Fila de Chamados" — se a lista de categorias no dialog de abertura de chamado estiver vazia em qualquer tela, cadastrar ao menos uma categoria via `POST /api/ti/ticket-categories` (não há tela de CRUD de categoria nesta passada; usar `curl`/Postman uma única vez).
2. **Auto-serviço:** logar como qualquer usuário (inclusive sem módulo `ti`), ir em "Meus Chamados" no menu (sempre visível). Abrir um chamado, confirmar que aparece na lista. Como admin/`ti:operate`, ir em `/ti` → Fila de Chamados, localizar o chamado, "Assumir chamado" → "Registrar solução" → "Resolver chamado". Voltar como o solicitante original em "Meus Chamados", abrir o detalhe do chamado agora `resolved`, avaliar com estrelas e "Confirmar resolução" (deve virar `closed`). Testar "Reabrir".
3. **Termos:** em `/ti` → Termos, "Registrar entrega" escolhendo um ativo com `asset_type='it'` existente (cadastrar um em Patrimônio antes, se necessário) e um funcionário ativo. Tentar entregar o mesmo ativo de novo (deve bloquear com 409 traduzido). Registrar devolução do termo criado.
4. **Licenças:** cadastrar um ativo `asset_type='license'` em Patrimônio, depois em `/ti` → Licenças, "Nova licença" referenciando esse ativo. Clicar no ícone de olho para revelar a chave (deve mascarar de novo ao clicar em "olho cortado"). Alocar um assento a um funcionário; tentar alocar além do número de `seats` contratado (deve bloquear com 422 traduzido). Testar "Renovação" (nível approve) e conferir que aparece o ID da Requisição de Compra gerada — validar em Compras → Fila de aprovação que a requisição existe.
5. **Acessos:** criar uma solicitação `grant` para um funcionário, aprovar, executar. Criar uma solicitação `revoke` para um funcionário que tenha um termo `active` (ver passo 3) e tentar "Executar" — deve bloquear com 422 e a mensagem `pending_terms`; ir em Termos, devolver o termo, voltar e executar de novo (deve suceder).
6. **Backup:** em `/ti` → Backup, registrar um backup diário com sucesso (painel de saúde deve atualizar); registrar um com falha (deve avisar que um chamado urgente foi gerado — conferir na Fila de Chamados).
7. **Home:** voltar para `/` e conferir o card "Pendências de TI" somando chamados abertos + licenças vencendo + acessos pendentes.

### O que o Agente QA (ou humano) deve testar

- Usuário sem módulo `ti` deve conseguir acessar `/meus-chamados` normalmente, mas ser redirecionado para "Acesso Negado" ao tentar `/ti` diretamente pela URL.
- Usuário com módulo `ti` nível `operate` (sem `approve`) deve ver "Marcar perdido"/"Renovação" desabilitados com tooltip, e a API deve rejeitar com 403 se contornado via DevTools.
- Confirmar que um comentário `is_internal: true` feito na aba de gestão não aparece para o solicitante em `/meus-chamados` (o filtro é no backend, mas vale confirmar ponta a ponta).
- Confirmar que a elegibilidade alternativa de aprovador de Acessos (gestor do departamento, `authorizeSelfOrModule` com `approverEligibilityCheck`) funciona pela UI — logar como um usuário que é `manager_id` do departamento da solicitação (sem módulo `ti`) e confirmar que "Aprovar"/"Rejeitar" funcionam mesmo sem o módulo.
- Testar o fluxo de erro de rede/API fora do ar em qualquer uma das 5 abas de `/ti` (deve mostrar `DidacticAlert`/mensagem de erro, nunca tela em branco).

---

## Módulo Facilities — Implementação do zero (Backend + Frontend)

**Data**: 2026-08-07
**Escopo**: departamento 17 (Facilities, FAC) não tinha NENHUM código antes
desta entrega — apenas a linha do departamento em `departments` (seed) e um
esboço `[PENDENTE]` em sintaxe MySQL em `docs/administrativo/03-FACILITIES.md`.
**Status**: ✅ Concluído

### Resumo da feature

CRUD completo (create/list/get/update — sem delete, físico ou lógico) para
4 entidades independentes de cadastro/controle:

1. **Frota de veículos** (`facility_vehicles`) — placa única, marca,
   modelo, ano, combustível, RENAVAM, seguro, km atual, status.
2. **Abastecimento** (`facility_fuel_records`) — histórico por veículo,
   litros/preço/total (calculado automaticamente se omitido), motorista
   opcional.
3. **Programação de limpeza** (`facility_cleaning_schedules`) — área
   (texto livre), frequência, responsável, última/próxima limpeza.
4. **Áreas físicas** (`facility_areas`) — tipo, m², capacidade,
   departamento opcional.

Backend: `server/src/modules/facilities/` (Clean Architecture —
`domain/repositories`, `application/use-cases/{vehicle,fuelRecord,
cleaningSchedule,area}`, `infrastructure/sequelize`,
`presentation/{controllers,routes,validators}`), 16 endpoints REST em
`/api/facilities/*`, montado em `server/app.ts`. Frontend:
`client/src/pages/facilities/FacilitiesPage.tsx` (4 abas), API client
`client/src/api/facilities.ts`, rota `/facilities` protegida por
`ModuleRoute module="facilities"`, item de menu em Administração (junto de
TI).

### Decisões de design tomadas por conta própria

- **Nomes de tabela prefixados `facility_*`** (não `fleet_vehicles`/
  `fuel_records`/`cleaning_schedule`, nomes do spec original em
  `docs/administrativo/03-FACILITIES.md`) — evita colisão com um futuro
  cadastro de frota de logística/expedição e deixa o módulo dono explícito
  no nome da tabela (mesmo padrão de `it_*`/`sst_*`).
- **`facility_fuel_records.record_date`** (não `date`, nome do spec
  original) — evita nome ambíguo/potencialmente reservado.
- **`facility_cleaning_schedules.area` como texto livre**, não FK para
  `facility_areas` — a programação de limpeza cobre áreas informais (ex.
  "banheiro do 2º andar") que nem sempre correspondem a uma
  `facility_area` cadastrada formalmente. Pode evoluir para FK opcional se
  o negócio pedir análise cruzada área×limpeza.
- **`total_cost` de abastecimento calculado automaticamente**
  (`liters * price_per_liter`) quando não informado explicitamente no
  payload — conveniência, o cliente pode enviar o total já calculado se
  preferir (ex.: nota fiscal com valor levemente diferente do cálculo
  puro).
- **Sem soft delete** em nenhuma das 4 tabelas (`CLAUDE.md` §7 reserva
  soft delete apenas para `Category`) e **sem endpoint de delete** algum
  (físico ou lógico) — fora do escopo pedido (create/list/get/update).
- **RBAC sem nível `approve`** — módulo essencialmente de
  cadastro/controle, nenhuma ação foi considerada crítica o suficiente
  para exigir aprovação (ex.: desativar um veículo é só `PUT .../status`
  em nível `operate`, mesmo padrão de `centros_de_trabalho`).

### Arquivos criados

**Backend:**
- `server/migrations/20260807-000200-create-facilities-module.cjs`
- `server/src/models/{FacilityVehicle,FacilityFuelRecord,FacilityCleaningSchedule,FacilityArea}.ts`
- `server/src/modules/facilities/domain/repositories/{Vehicle,FuelRecord,CleaningSchedule,Area}Repository.ts`
- `server/src/modules/facilities/infrastructure/sequelize/Sequelize{Vehicle,FuelRecord,CleaningSchedule,Area}Repository.ts`
- `server/src/modules/facilities/application/use-cases/vehicle/{Create,List,GetById,Update}VehicleUseCase.ts`
- `server/src/modules/facilities/application/use-cases/fuelRecord/{Create,List,GetById,Update}FuelRecordUseCase.ts`
- `server/src/modules/facilities/application/use-cases/cleaningSchedule/{Create,List,GetById,Update}CleaningScheduleUseCase.ts`
- `server/src/modules/facilities/application/use-cases/area/{Create,List,GetById,Update}AreaUseCase.ts`
- `server/src/modules/facilities/presentation/validators/{vehicle,fuelRecord,cleaningSchedule,area}Validators.ts`
- `server/src/modules/facilities/presentation/controllers/{vehicle,fuelRecord,cleaningSchedule,area}Controller.ts`
- `server/src/modules/facilities/presentation/routes/facilities.ts`
- `server/tests/unit/facilities-{vehicle,fuel-record,cleaning-schedule,area}-use-cases.test.ts` (14 casos)

**Frontend:**
- `client/src/api/facilities.ts`
- `client/src/pages/facilities/{FacilitiesPage,FleetTab,FuelRecordsTab,CleaningSchedulesTab,AreasTab}.tsx`

### Arquivos modificados

- `server/src/models/index.ts` — imports dos 4 models novos + associações
  (`FacilityVehicle↔FacilityFuelRecord`, `Employee↔FacilityFuelRecord`
  driver, `Department↔FacilityArea`).
- `server/src/shared/domain/accessModules.ts` — módulo `facilities`
  adicionado a `AccessModuleKey`/`ACCESS_MODULES` (29→30 chaves).
- `server/app.ts` — `app.use('/api/facilities', ...)`.
- `server/tests/unit/module-authorization-map.test.ts` — `facilities`
  adicionado a `MODULES_REQUIRING_AUTHORIZE_MODULE` (guarda
  anti-regressão, senão o teste falha por módulo novo não coberto).
- `client/src/api/accessProfiles.ts` — `facilities` adicionado ao tipo
  `AccessModuleKey` espelhado.
- `client/src/App.tsx` — lazy import `FacilitiesPage` + rota `/facilities`
  atrás de `ModuleRoute module="facilities"`.
- `client/src/layouts/AppLayout.tsx` — item de menu "Facilities (Frota &
  Predial)" em Administração + entrada em `BREADCRUMBS`.
- `docs/administrativo/03-FACILITIES.md` — removido aviso `[PENDENTE]`,
  documentado o contrato real de 16 endpoints.
- `docs/database/DATABASE.md` — nova seção "Módulo Facilities".
- `docs/projeto/04-USE_CASES.md` — novo `UC-52`.
- `docs/governance/TODO.md` — nova entrada datada 2026-08-07.

### Documentações atualizadas

`docs/administrativo/03-FACILITIES.md`, `docs/database/DATABASE.md`,
`docs/projeto/04-USE_CASES.md`, `docs/governance/TODO.md`, e este arquivo
(`docs/governance/HANDOFF_CODEX.md`). Todo arquivo TypeScript novo tem
cabeçalho JSDoc explicando responsabilidade, e cada método de repositório
abstrato/use case documenta parâmetros e retorno.

### Validação

- `npm run typecheck --prefix server` — 0 erros.
- `npx tsc --noEmit --project client` (a partir de `client/`) — 0 erros.
- `npm run migration:up --prefix server` — migration `20260807-000200`
  aplicada com sucesso contra o Postgres local (`evok-postgres`, Docker);
  confirmado com `npm run migration:status --prefix server`.
- `npx jest tests/unit --runInBand --prefix server` — 889/890 passando (1
  falha pré-existente e conhecida em
  `onda3-shipping-cockpit-cashflow.test.ts`, não relacionada a este
  módulo); 14 testes novos do módulo Facilities, 0 regressões (incluindo o
  ajuste necessário em `module-authorization-map.test.ts`).

### Riscos residuais / fora do escopo desta entrega

- Sem teste de integração HTTP real (Supertest) contra o banco — apenas
  unitários com repositório mockado, mesmo padrão dos módulos SST/TI mais
  recentes.
- `facility_cleaning_schedules.area` (texto livre) não valida contra
  `facility_areas` cadastradas — cadastros podem divergir textualmente
  (ex.: "Refeitório" vs. "refeitorio").
- Sem seed inicial de veículos/áreas — telas nascem vazias, primeiro uso
  exige cadastro manual.
- Sem relatório/dashboard de custo de frota (ex.: custo por km, consumo
  médio) — apenas listagem crua de abastecimentos; pode ser pedido futuro
  se o negócio precisar.

### Instruções de teste manual

1. Logar como `admin` (ou usuário com perfil que inclua o módulo
   `facilities` em nível `operate`) e acessar `/facilities` pelo menu
   Administração.
2. Aba **Frota**: criar um veículo (placa obrigatória e única — tentar
   repetir a placa deve dar erro 409 traduzido). Editar o veículo criado,
   mudando o status para "Em manutenção".
3. Aba **Abastecimento**: criar um registro de abastecimento para o
   veículo criado, informando litros e preço/litro mas SEM informar o
   custo total — confirmar que o total é calculado automaticamente na
   listagem. Selecionar um motorista (funcionário ativo).
4. Aba **Limpeza**: criar uma programação de limpeza para uma área livre
   (ex.: "Refeitório"), frequência diária, com última/próxima limpeza.
5. Aba **Áreas**: criar uma área física do tipo "Almoxarifado", com m² e
   capacidade, vinculando a um departamento existente.
6. Confirmar que um usuário sem o módulo `facilities` no perfil de acesso
   é redirecionado para "Acesso Negado" ao tentar `/facilities` diretamente
   pela URL.
7. Confirmar que um usuário com o módulo `facilities` mas sem role
   `admin`/`operator` (RBAC de UI, `hasRole('admin','operator')`) consegue
   ver as 4 abas em modo somente leitura (sem botões "Novo"/"Editar").

---

## Módulo Marketing — Implementação do zero (Backend + Frontend)

**Data**: 2026-08-07
**Escopo**: departamento 14 (Marketing, MKT) não tinha NENHUM código antes
desta entrega — apenas a linha do departamento em `departments` (seed) e um
esboço de 3 tabelas em sintaxe MySQL apresentadas como reais em
`docs/comercial/02-MARKETING.md`, nunca migradas.
**Status**: ✅ Concluído

### Resumo da feature

CRUD completo (create/list/get/update — sem delete, físico ou lógico) para
3 entidades:

1. **Campanhas** (`marketing_campaigns`) — tipo, datas, orçamento/custo
   real, contadores `leads_generated`/`conversions` (incrementados
   automaticamente pelo fluxo de Lead), ROI (informado manualmente),
   status.
2. **Leads** (`marketing_leads`) — FK opcional para campanha, origem,
   score, FK opcional `converted_to_customer_id` → `clients`. Funil de
   status como **ação dedicada** (`ChangeLeadStatusUseCase`), não `PUT`
   genérico.
3. **Materiais de divulgação** (`marketing_materials`) — tipo, FK opcional
   `product_id` → `items.id` (UUID), upload de arquivo separado da criação
   dos metadados.

Backend: `server/src/modules/marketing/` (Clean Architecture —
`domain/repositories`, `application/use-cases/{campaign,lead,material}`,
`infrastructure/sequelize`, `presentation/{controllers,routes,validators,
middlewares}`), 13 endpoints REST em `/api/marketing/*`, montado em
`server/app.ts`. Frontend: `client/src/pages/marketing/MarketingPage.tsx`
(3 abas), API client `client/src/api/marketing.ts`, rota `/marketing`
protegida por `ModuleRoute module="marketing"`, item de menu no grupo
"Vendas" (junto de Vendas).

### Decisões de design tomadas por conta própria

- **`marketing_materials.product_id` é `UUID`, não `INTEGER`** — diferença
  deliberada do esboço original em MySQL: `items.id` é UUID no schema real
  (`server/src/models/Item.ts`), mesmo padrão já usado por
  `sst_tipo_epi.item_id`. Descoberto durante a implementação (o spec só
  tinha `INT` solto, sem `REFERENCES`) — corrigido antes de rodar a
  migration contra o Postgres real.
- **Funil de leads como ação dedicada** (`POST
  /api/marketing/leads/:id/status`), não `PUT` genérico irrestrito — mesmo
  espírito de `ChangeSaleStatusUseCase` (módulo `sales`), porém deliberadamente
  mais simples: `new -> contacted -> qualified -> converted/lost`, `lost`
  alcançável de qualquer etapa aberta (desistência a qualquer momento),
  `converted`/`lost` terminais, sem efeito colateral de estoque/financeiro
  (só incrementa `conversions` da campanha de origem, se houver).
- **Upload de material com caso de uso próprio**
  (`UploadMaterialFileUseCase`), não reaproveitando o helper compartilhado
  `UploadEntityPhotoUseCase` — este é fixado em `IMAGE_MIMES`/campo
  `photo_path`; materiais de marketing também podem ser PDF, vídeo ou
  apresentação, então foi criado um caso de uso análogo com lista de
  extensões mais ampla e campo `file_path`.
- **`allowedMimes` vazio na chamada a `uploadFile` do material** — decisão
  documentada no próprio código
  (`UploadMaterialFileUseCase.ts`): o mapa de magic bytes de
  `Validators.FILE_MAGIC_BYTES` não tem assinatura para vídeo/apresentação/
  documento do Office, então a extensão é o filtro primário para esses
  tipos (a validação de magic bytes continua funcionando normalmente para
  imagem/PDF, que têm assinatura conhecida).
- **Contadores de campanha (`leads_generated`/`conversions`) incrementados
  automaticamente** pelos casos de uso de Lead (criação vinculada a
  campanha e conversão), mas ainda aceitos no payload de `PUT
  /api/marketing/campaigns/:id` para correção manual eventual (ex.:
  reconciliação com uma ferramenta externa).
- **Sem soft delete** em nenhuma das 3 tabelas (`CLAUDE.md` §7 reserva
  soft delete apenas para `Category`) e **sem endpoint de delete** algum —
  fora do escopo pedido (create/list/get/update).
- **RBAC sem nível `approve`** — módulo essencialmente de cadastro/
  controle de funil, mesmo padrão de `facilities`.

### Arquivos criados

**Backend:**
- `server/migrations/20260807-000210-create-marketing-module.cjs`
- `server/src/models/{MarketingCampaign,MarketingLead,MarketingMaterial}.ts`
- `server/src/modules/marketing/domain/repositories/{Campaign,Lead,Material}Repository.ts`
- `server/src/modules/marketing/infrastructure/sequelize/Sequelize{Campaign,Lead,Material}Repository.ts`
- `server/src/modules/marketing/application/use-cases/campaign/{List,GetById,Create,Update}CampaignUseCase.ts`
- `server/src/modules/marketing/application/use-cases/lead/{List,GetById,Create,Update,ChangeStatus}LeadUseCase.ts`
- `server/src/modules/marketing/application/use-cases/material/{List,GetById,Create,Update,UploadFile}MaterialUseCase.ts`
- `server/src/modules/marketing/presentation/validators/{campaign,lead,material}Validators.ts`
- `server/src/modules/marketing/presentation/controllers/{campaign,lead,material}Controller.ts`
- `server/src/modules/marketing/presentation/routes/marketing.ts`
- `server/src/modules/marketing/presentation/middlewares/materialFileUpload.ts`
- `server/tests/unit/marketing-{campaign,lead,material}-use-cases.test.ts` (25 casos)

**Frontend:**
- `client/src/api/marketing.ts`
- `client/src/pages/marketing/{MarketingPage,CampaignsTab,LeadsTab,MaterialsTab}.tsx`

### Arquivos modificados

- `server/src/models/index.ts` — imports dos 3 models novos + associações
  (`MarketingCampaign↔MarketingLead`, `Client↔MarketingLead` conversão,
  `Item↔MarketingMaterial`).
- `server/src/shared/domain/accessModules.ts` — módulo `marketing`
  adicionado a `AccessModuleKey`/`ACCESS_MODULES` (30→31 chaves).
- `server/app.ts` — `app.use('/api/marketing', ...)`.
- `server/tests/unit/module-authorization-map.test.ts` — `marketing`
  adicionado a `MODULES_REQUIRING_AUTHORIZE_MODULE` (guarda
  anti-regressão, senão o teste falha por módulo novo não coberto).
- `client/src/api/accessProfiles.ts` — `marketing` adicionado ao tipo
  `AccessModuleKey` espelhado.
- `client/src/App.tsx` — lazy import `MarketingPage` + rota `/marketing`
  atrás de `ModuleRoute module="marketing"`.
- `client/src/layouts/AppLayout.tsx` — item de menu "Marketing" no grupo
  Vendas + entrada em `BREADCRUMBS`.
- `docs/comercial/02-MARKETING.md` — removida a apresentação do esboço SQL
  como se fosse real, documentado o contrato real de 13 endpoints.
- `docs/database/DATABASE.md` — nova seção "Módulo Marketing".
- `docs/projeto/04-USE_CASES.md` — novo `UC-53`.
- `docs/governance/TODO.md` — nova entrada datada 2026-08-07.

### Documentações atualizadas

`docs/comercial/02-MARKETING.md`, `docs/database/DATABASE.md`,
`docs/projeto/04-USE_CASES.md`, `docs/governance/TODO.md`, e este arquivo
(`docs/governance/HANDOFF_CODEX.md`). Todo arquivo TypeScript novo tem
cabeçalho JSDoc explicando responsabilidade, e cada método de repositório
abstrato/use case documenta parâmetros e retorno.

### Validação

- `npm run typecheck --prefix server` — 0 erros.
- `npx tsc --noEmit --project client` (a partir de `client/`) — 0 erros.
- `npm run migration:up --prefix server` — migration `20260807-000210`
  aplicada com sucesso contra o Postgres local (`evok-postgres`, Docker);
  confirmado com `npm run migration:status --prefix server`.
- `npx jest tests/unit --runInBand --prefix server` — 917/918 passando (1
  falha pré-existente e conhecida em
  `onda3-shipping-cockpit-cashflow.test.ts`, não relacionada a este
  módulo); 25 testes novos do módulo Marketing, 0 regressões (incluindo o
  ajuste necessário em `module-authorization-map.test.ts`).

### Riscos residuais / fora do escopo desta entrega

- Sem teste de integração HTTP real (Supertest) contra o banco — apenas
  unitários com repositório mockado, mesmo padrão de Facilities/SST/TI.
- Cálculo de ROI é manual (o backend não deriva de custo/receita
  automaticamente).
- Sem histórico multi-versão de arquivo por material — `version` é campo
  texto informativo, sem trilha de arquivos anteriores; um novo upload
  substitui e apaga o arquivo antigo do disco.
- Sem integração com ferramentas externas de email marketing/Ads (Google
  Ads, RD Station, Mailchimp, etc.) — cadastro manual apenas, sem
  sincronização automática de métricas de campanha.
- Sem seed inicial de campanhas/leads/materiais — telas nascem vazias.

### Instruções de teste manual

1. Logar como `admin` (ou usuário com perfil que inclua o módulo
   `marketing` em nível `operate`) e acessar `/marketing` pelo menu Vendas.
2. Aba **Campanhas**: criar uma campanha (tipo "Redes sociais", datas de
   início/fim válidas). Tentar criar uma com `end_date` anterior a
   `start_date` e confirmar o erro 422 traduzido.
3. Aba **Leads**: criar um lead vinculado à campanha criada — confirmar
   que `leads_generated` da campanha (visível na aba Campanhas) foi
   incrementado. No kanban de Leads, avançar o lead de "Novo" para
   "Contatado" e depois "Qualificado". Ao clicar em "Convertido", informar
   (ou deixar em branco) um id de cliente e confirmar a conversão —
   verificar que `conversions` da campanha também incrementou.
4. Tentar avançar um lead "Convertido" (estado terminal) — não deve haver
   botão de ação disponível (funil bloqueia no backend com 422 se forçado
   via API).
5. Aba **Materiais**: criar um material (tipo "Catálogo"), opcionalmente
   vinculado a um produto (busca por código/descrição). Usar o botão de
   upload para enviar um arquivo PDF/imagem e confirmar o link "Ver
   arquivo" na listagem.
6. Confirmar que um usuário sem o módulo `marketing` no perfil de acesso é
   redirecionado para "Acesso Negado" ao tentar `/marketing` diretamente
   pela URL.
7. Confirmar que um usuário com o módulo `marketing` mas sem role
   `admin`/`operator` (RBAC de UI) consegue ver as 3 abas em modo somente
   leitura (sem botões "Novo"/"Editar"/upload).

---

## Módulo Jurídico — Implementação do zero (Backend + Frontend)

**Data**: 2026-08-07
**Escopo**: departamento 16 (Jurídico, JUR) não tinha NENHUM código antes
desta entrega — apenas a linha do departamento em `departments` (seed) e
dois specs (`docs/juridico/01-CONTRATOS.md`,
`docs/juridico/02-PROPRIEDADE_INTELECTUAL.md`) com 3 tabelas em sintaxe
MySQL apresentadas como reais, nunca migradas.
**Status**: ✅ Concluído

### Resumo da feature

CRUD completo (create/list/get/update — sem delete, físico ou lógico) para
4 entidades:

1. **Contratos** (`legal_contracts`) — NOVA (não existia no spec original,
   que só documentava aditivo/lembrete/PI dependendo de um `contract_id`
   sem tabela própria). Número único, tipo amplo (trabalhista + comercial),
   partes A/B (texto livre), objeto, valor, vigência, renovação automática,
   aviso prévio, upload de instrumento (PDF/DOC/DOCX), status.
2. **Aditivos contratuais** (`legal_contract_addendums`) — FK obrigatória
   para contrato (404 se inexistente), tipo de mudança, nova data
   fim/valor, upload de arquivo próprio.
3. **Lembretes de prazo contratual** (`legal_contract_reminders`) — FK
   obrigatória para contrato, tipo, data, antecedência, `notified`
   (marcado manualmente hoje).
4. **Propriedade Intelectual** (`legal_intellectual_property`) — marca,
   patente, desenho industrial, direito autoral, segredo industrial;
   depósito/concessão/expiração, titular (default EVOK ÁUDIO LTDA), status,
   jurisdição.

Caso de uso central do spec (gestão de prazos): `GET
/api/legal/contracts/expiring?days=30` e `GET
/api/legal/intellectual-property/expiring?days=30`.

Backend: `server/src/modules/legal/` (Clean Architecture —
`domain/repositories`, `application/use-cases/{contract,addendum,reminder,
intellectualProperty}`, `infrastructure/sequelize`,
`presentation/{controllers,routes,validators,middlewares}`), 19 endpoints
REST em `/api/legal/*`, montado em `server/app.ts`. Frontend:
`client/src/pages/legal/LegalPage.tsx` (2 abas — Contratos, Propriedade
Intelectual), API client `client/src/api/legal.ts`, rota `/legal`
protegida por `ModuleRoute module="juridico"`, item de menu no grupo
"Administração" (junto de TI/Facilities).

### Decisões de design tomadas por conta própria

- **`legal_contracts` é uma tabela nova**, não presente no spec original —
  o spec só trazia `contract_addendums`/`contract_reminders` (e
  `intellectual_property`, sem relação com contrato), ambas dependendo de
  um `contract_id` que nunca teve cadastro central. Sem essa tabela, o
  caso de uso central do spec (gestão de prazos contratuais) seria
  impossível de implementar de forma consistente.
- **`party_a`/`party_b` são texto livre**, não FK de
  `suppliers`/`clients`/`employees` — contratos jurídicos cobrem
  trabalhista (candidato/funcionário nem sempre formalizado no sistema no
  momento da assinatura), representante autônomo e terceiros diversos sem
  cadastro formal em nenhuma outra tabela. Mesma decisão de design de
  `facility_cleaning_schedules.area` (Facilities).
- **Aditivos e lembretes expostos como recursos de topo-nível filtráveis
  por `contract_id`** (`/legal/contract-addendums?contract_id=`,
  `/legal/contract-reminders?contract_id=`), não aninhados sob
  `/contracts/:id/...` — mesmo padrão de `marketing_leads`
  (`campaign_id`)/`marketing_materials` (`product_id`).
- **FK `ON DELETE CASCADE`** de aditivo/lembrete para contrato (diferente
  de `RESTRICT` usado em Facilities para abastecimento×veículo) — não há
  endpoint de delete de contrato nesta rodada de qualquer forma, e um
  aditivo/lembrete não faz sentido sem o contrato pai.
- **Upload de instrumento com casos de uso próprios**
  (`UploadContractFileUseCase`/`UploadAddendumFileUseCase`), restritos a
  PDF/DOC/DOCX (20MB) — mesmo padrão de `UploadMaterialFileUseCase`
  (Marketing), mas com lista de extensões mais restrita (documento
  jurídico, não vídeo/apresentação).
- **No frontend, aditivos e lembretes são sub-seção do dialog de detalhe do
  contrato** (`ContractDetailDialog`), não abas próprias em `LegalPage` —
  pedido explícito do enunciado da tarefa. Os 3 componentes de
  formulário/linha internos (`ReminderRow`, `AddendumInlineForm`,
  `ReminderInlineForm`) foram definidos como funções de topo de módulo
  (não aninhadas dentro de `ContractDetailDialog`) deliberadamente: uma
  função de componente redefinida a cada render do pai perde a identidade
  React e remonta a cada render, resetando o estado local do formulário
  (`useState`) sempre que o diálogo pai re-renderiza por qualquer motivo
  (ex.: refetch de query em background).
- **Sem soft delete** em nenhuma das 4 tabelas (`CLAUDE.md` §7 reserva soft
  delete apenas para `Category`) e **sem endpoint de delete** algum — fora
  do escopo pedido (create/list/get/update).
- **RBAC sem nível `approve`** — módulo essencialmente de cadastro/controle
  de contrato e PI, mesmo padrão de `facilities`/`marketing`.

### Arquivos criados

**Backend:**
- `server/migrations/20260807-000220-create-legal-module.cjs`
- `server/src/models/{LegalContract,LegalContractAddendum,LegalContractReminder,LegalIntellectualProperty}.ts`
- `server/src/modules/legal/domain/repositories/{Contract,ContractAddendum,ContractReminder,IntellectualProperty}Repository.ts`
- `server/src/modules/legal/infrastructure/sequelize/Sequelize{Contract,ContractAddendum,ContractReminder,IntellectualProperty}Repository.ts`
- `server/src/modules/legal/application/use-cases/contract/{List,GetById,Create,Update,UploadFile,ListExpiring}ContractUseCase.ts`
- `server/src/modules/legal/application/use-cases/addendum/{List,GetById,Create,Update,UploadFile}AddendumUseCase.ts`
- `server/src/modules/legal/application/use-cases/reminder/{List,GetById,Create,Update}ReminderUseCase.ts`
- `server/src/modules/legal/application/use-cases/intellectualProperty/{List,GetById,Create,Update,ListExpiring}IntellectualPropertyUseCase.ts`
- `server/src/modules/legal/presentation/validators/{contract,contractAddendum,contractReminder,intellectualProperty}Validators.ts`
- `server/src/modules/legal/presentation/controllers/{contract,contractAddendum,contractReminder,intellectualProperty}Controller.ts`
- `server/src/modules/legal/presentation/routes/legal.ts`
- `server/src/modules/legal/presentation/middlewares/contractFileUpload.ts`
- `server/tests/unit/legal-{contract,addendum-reminder,intellectual-property}-use-cases.test.ts` (24 casos)

**Frontend:**
- `client/src/api/legal.ts`
- `client/src/pages/legal/{LegalPage,ContractsTab,IntellectualPropertyTab}.tsx`

### Arquivos modificados

- `server/src/models/index.ts` — imports dos 4 models novos + associações
  (`LegalContract↔LegalContractAddendum`, `LegalContract↔LegalContractReminder`).
- `server/src/shared/domain/accessModules.ts` — módulo `juridico`
  adicionado a `AccessModuleKey`/`ACCESS_MODULES`.
- `server/app.ts` — `app.use('/api/legal', ...)`.
- `server/tests/unit/module-authorization-map.test.ts` — `legal`
  adicionado a `MODULES_REQUIRING_AUTHORIZE_MODULE` (guarda
  anti-regressão, senão o teste falha por módulo novo não coberto).
- `client/src/api/accessProfiles.ts` — `juridico` adicionado ao tipo
  `AccessModuleKey` espelhado.
- `client/src/App.tsx` — lazy import `LegalPage` + rota `/legal` atrás de
  `ModuleRoute module="juridico"`.
- `client/src/layouts/AppLayout.tsx` — item de menu "Jurídico (Contratos &
  PI)" no grupo Administração + entrada em `BREADCRUMBS`.
- `docs/juridico/01-CONTRATOS.md` — removida a apresentação do esboço SQL
  de aditivo/lembrete como se fosse real, documentado o contrato real de
  `legal_contracts`/`legal_contract_addendums`/`legal_contract_reminders`.
- `docs/juridico/02-PROPRIEDADE_INTELECTUAL.md` — removida a apresentação
  do esboço SQL como se fosse real, documentado o contrato real de
  `legal_intellectual_property`.
- `docs/governance/TODO.md` — nova entrada datada 2026-08-07.

### Documentações atualizadas

`docs/juridico/01-CONTRATOS.md`, `docs/juridico/02-PROPRIEDADE_INTELECTUAL.md`,
`docs/governance/TODO.md`, e este arquivo (`docs/governance/HANDOFF_CODEX.md`).
Todo arquivo TypeScript novo tem cabeçalho JSDoc explicando
responsabilidade, e cada método de repositório abstrato/use case documenta
parâmetros e retorno.

### Validação

- `npm run typecheck --prefix server` — 0 erros.
- Smoke test de runtime dos models (`node -e "require('tsx/cjs');
  require('./src/models/index.ts')"`, a partir de `server/`) — OK, "OK
  models carregam em runtime". Confirmado também para `server/app.ts`
  completo e para `src/modules/legal/presentation/routes/legal.ts`
  isoladamente.
- `npx tsc --noEmit --project client` (a partir de `client/`) — 0 erros.
- `npm run migration:up --prefix server` — migration `20260807-000220`
  aplicada com sucesso contra o Postgres local (`evok-postgres`, Docker);
  confirmado com `npm run migration:status --prefix server`.
- `npx jest tests/unit --runInBand --prefix server` — 942/943 passando (1
  falha pré-existente e conhecida em
  `onda3-shipping-cockpit-cashflow.test.ts`, não relacionada a este
  módulo); 24 testes novos do módulo Jurídico, 0 regressões (incluindo o
  ajuste necessário em `module-authorization-map.test.ts`).

### Riscos residuais / fora do escopo desta entrega

- Sem teste de integração HTTP real (Supertest) contra o banco — apenas
  unitários com repositório mockado, mesmo padrão de Facilities/Marketing.
- `notified` de lembrete é marcado manualmente pelo usuário — sem
  notificação automática (email/push/cron) quando um lembrete vence.
- Sem geração de contrato a partir de template/modelo — apenas cadastro e
  upload do instrumento já assinado/digitalizado.
- `party_a`/`party_b` sem vínculo formal com `suppliers`/`clients`/
  `employees` — decisão de design consciente (ver seção acima), mas
  significa que não há como consultar "todos os contratos de um
  fornecedor X" via JOIN, só por busca textual manual.
- Sem seed inicial de contratos/PI — telas nascem vazias (a lista narrativa
  de marcas/patentes/desenhos em `docs/juridico/02-PROPRIEDADE_INTELECTUAL.md`
  §"Ativos de Propriedade Intelectual da EVOK ÁUDIO" continua sendo
  documentação de referência, não dado seedado no banco).

### Instruções de teste manual

1. Logar como `admin` (ou usuário com perfil que inclua o módulo
   `juridico` em nível `operate`) e acessar `/legal` pelo menu
   Administração.
2. Aba **Contratos**: criar um contrato (tipo "Prestação de serviços",
   partes A/B, datas de início/fim). Se houver algum contrato com `end_date`
   nos próximos 30 dias, confirmar que o banner de alerta amarelo aparece
   no topo da aba.
3. Abrir "Detalhes" do contrato criado — confirmar as duas sub-seções
   (Aditivos, Lembretes) vazias. Criar um aditivo (tipo "Prazo") e um
   lembrete (tipo "Renovação", data futura) usando os formulários inline —
   confirmar que aparecem nas respectivas tabelas sem fechar o diálogo.
4. Na tabela de lembretes, clicar em "Marcar notificado" e confirmar que o
   badge muda de "Não" para "Sim".
5. Usar o botão de upload (ícone) na listagem de contratos para enviar um
   PDF — confirmar que não há erro (o link de visualização não é exposto
   nesta aba, mas a chamada deve retornar 200).
6. Aba **Propriedade Intelectual**: criar um ativo (tipo "Marca", titular
   default "EVOK ÁUDIO LTDA"), com `expiration_date` nos próximos 30 dias —
   confirmar que o banner de alerta aparece.
7. Confirmar que um usuário sem o módulo `juridico` no perfil de acesso é
   redirecionado para "Acesso Negado" ao tentar `/legal` diretamente pela
   URL.
8. Confirmar que um usuário com o módulo `juridico` mas sem role
   `admin`/`operator` (RBAC de UI) consegue ver as 2 abas em modo somente
   leitura (sem botões "Novo"/"Editar"/upload/"Detalhes"→ainda visível,
   mas sem ações de escrita dentro do diálogo).

---

## Módulo Contabilidade — Implementação do zero (Backend + Frontend)

**Data**: 2026-08-07
**Escopo**: subárea CONT do departamento Financeiro (sem linha própria em
`departments`) não tinha NENHUM código antes desta entrega — apenas o spec
`docs/financeiro/02-CONTABILIDADE.md` com 4 tabelas em sintaxe MySQL
apresentadas como reais, nunca migradas. Precedente direto: mesmo padrão de
Facilities/Marketing/Jurídico implementados nesta mesma sessão, mas este é
o módulo de maior risco funcional — envolve dupla entrada contábil (débito
= crédito), não apenas cadastro/controle.
**Status**: ✅ Concluído

### Resumo da feature

3 áreas funcionais sobre 3 tabelas novas:

1. **Plano de Contas** (`accounting_chart_of_accounts`) — hierárquico via
   `parent_id` self-FK, código único (`"1"`, `"1.1"`, `"1.1.1"`), tipo
   (`asset|liability|equity|revenue|expense|cost`), `account_level`/
   `parent_id` calculados automaticamente a partir dos segmentos do código
   (nunca informados pelo chamador), `accept_entries` (só contas "folha"
   recebem lançamento direto — validado ao criar/editar tanto a conta
   quanto o item de lançamento), `active` (desativação lógica). Seedado com
   as 30 contas do "Plano de Contas (Resumo)" do spec original.
2. **Lançamentos Contábeis** (`accounting_entries` +
   `accounting_entry_items`) — cabeçalho + N itens de débito/crédito.
   Número sequencial `LC-000001` (por contagem, mesma limitação de
   concorrência já documentada em `RfqRepository.countRfqsInYear` —
   aceitável pelo baixo volume/setor único). Nasce sempre `draft`
   (editável livremente, inclusive substituição integral dos itens via
   `PUT`). Duas transições dedicadas de status:
   - `PATCH /api/accounting/entries/:id/post` (`draft -> posted`): valida
     mínimo 2 itens, ao menos 1 linha de débito E 1 de crédito, e soma de
     débito = soma de crédito (comparação em centavos via
     `shared/utils/money`, evita falso-negativo de ponto flutuante) —
     senão `BusinessRuleError` 422 com a diferença em reais. Depois de
     `posted`, itens ficam imutáveis.
   - `PATCH /api/accounting/entries/:id/reverse` (`posted -> reversed`):
     cria um NOVO lançamento (`entry_type: 'adjustment'`, já `posted`,
     `reversal_of_id` apontando para o original) com débito/crédito de
     cada item invertidos — nunca apaga/edita o original, só marca
     `reversed`.
3. **Balancete** (relatório derivado, sem tabela própria) — `GET
   /api/accounting/trial-balance?year=&month=`: por conta, saldo anterior/
   débito do mês/crédito do mês/saldo atual, calculado on-the-fly a partir
   de `accounting_entry_items` de lançamentos `posted`, agregados via SQL
   raw (mesmo padrão de `GetCostCenterReportUseCase`, módulo `financial`).

Backend: `server/src/modules/accounting/` (Clean Architecture —
`domain/repositories`, `application/{use-cases/{account,entry,report},
services/validateEntryItemsShape}`, `infrastructure/sequelize`,
`presentation/{controllers,routes,validators}`), 11 endpoints REST em
`/api/accounting/*`, montado em `server/app.ts`. Frontend:
`client/src/pages/accounting/AccountingPage.tsx` (3 abas — Lançamentos,
Plano de Contas, Balancete), API client `client/src/api/accounting.ts`,
rota `/accounting` protegida por `ModuleRoute module="contabilidade"`, item
de menu no grupo "Gestão" (junto de Financeiro).

### Decisões de design tomadas por conta própria

- **`trial_balance` não virou tabela** — por instrução explícita da
  tarefa, é 100% dado derivado (`GetTrialBalanceUseCase` +
  `SequelizeAccountingRepository.getTrialBalanceRows`), calculado a cada
  requisição a partir de `accounting_entry_items`. Evita o risco de
  dessincronização entre a "foto" salva e o razão real.
- **`accounting_entry_items.account_id` é FK real**, não o
  `account_code VARCHAR(20)` solto do spec original — substituído por
  integridade referencial (`ON DELETE RESTRICT`, não pode apagar conta com
  lançamento).
- **`reversal_of_id` é coluna NOVA** em `accounting_entries` (não existia
  no spec original): self-FK nullable, `ON DELETE SET NULL`, populada
  apenas no lançamento de ESTORNO, apontando para o original revertido.
  Decisão consciente de ir além do pedido explícito da tarefa (que só
  citava "descrição referenciando o original") porque uma FK real permite
  navegar "este lançamento estornou o de nº X" sem parsing de texto — mais
  seguro para auditoria fiscal.
- **`account_level`/`parent_id` são sempre calculados no backend**, nunca
  aceitos do payload do cliente — evita o cliente enviar um nível
  inconsistente com o código informado.
- **`UpdateAccountUseCase` bloqueia `accept_entries: true` em conta com
  filhas** — uma conta sintética com contas-filha não pode virar "folha"
  sem primeiro reorganizar a hierarquia (evitaria lançamento tanto na
  conta pai quanto nas filhas, ambíguo para o balancete).
- **`validateEntryItemsShape.ts` é um serviço de aplicação compartilhado**
  (não um use case) entre `CreateEntryUseCase` e `UpdateEntryUseCase` — a
  regra "exatamente um de débito/crédito por linha" é idêntica nos dois
  fluxos; extraída para não duplicar a validação nem arriscar divergência
  futura entre criar e editar.
- **RBAC com nível `approve`** — diferente de
  Facilities/Marketing/Jurídico (só `operate`), Contabilidade protege
  `post`/`reverse` com `authorizeModule('contabilidade', 'approve')`: são
  as duas ações que fecham/desfazem a contabilização oficial de um
  lançamento, correspondendo ao "responsável técnico" (Contador CRC) do
  organograma do departamento (`docs/financeiro/02-CONTABILIDADE.md`
  §"Estrutura").
- **Número sequencial calculado por `COUNT(*)`**, não por sequence
  dedicada do Postgres — mesma limitação de concorrência já aceita em
  `RfqRepository.countRfqsInYear` (RFQ), reconhecida como risco residual
  aceitável pelo baixo volume esperado (um único setor contábil operando).
- **Sem delete físico nem lógico de lançamento** — mesma filosofia de
  `CLAUDE.md` §7 (auditoria fiscal exige histórico imutável): um
  lançamento errado em `draft` pode ser editado livremente; um lançamento
  `posted` errado só é corrigido via estorno (nunca apagado).

### Arquivos criados

**Backend:**
- `server/migrations/20260807-000230-create-accounting-module.cjs`
- `server/migrations/20260807-000231-seed-accounting-chart-of-accounts.cjs`
- `server/src/models/{AccountingChartOfAccount,AccountingEntry,AccountingEntryItem}.ts`
- `server/src/modules/accounting/domain/repositories/AccountingRepository.ts`
- `server/src/modules/accounting/infrastructure/sequelize/SequelizeAccountingRepository.ts`
- `server/src/modules/accounting/application/services/validateEntryItemsShape.ts`
- `server/src/modules/accounting/application/use-cases/account/{Create,List,GetById,Update}AccountUseCase.ts`
- `server/src/modules/accounting/application/use-cases/entry/{Create,List,GetById,Update,Post,Reverse}EntryUseCase.ts`
- `server/src/modules/accounting/application/use-cases/report/GetTrialBalanceUseCase.ts`
- `server/src/modules/accounting/presentation/validators/{chartOfAccounts,accountingEntry}Validators.ts`
- `server/src/modules/accounting/presentation/controllers/{chartOfAccounts,accountingEntry,trialBalance}Controller.ts`
- `server/src/modules/accounting/presentation/routes/accounting.ts`
- `server/tests/unit/accounting-use-cases.test.ts` (19 casos)

**Frontend:**
- `client/src/api/accounting.ts`
- `client/src/pages/accounting/{AccountingPage,ChartOfAccountsTab,EntriesTab,TrialBalanceTab}.tsx`

### Arquivos modificados

- `server/src/models/index.ts` — imports dos 3 models novos + associações
  (`AccountingChartOfAccount` auto-relacionamento hierárquico,
  `AccountingEntry↔AccountingEntryItem`, `AccountingEntryItem↔CostCenter`,
  `AccountingEntry↔User` autor/aprovador, `AccountingEntry`
  auto-relacionamento de estorno).
- `server/src/shared/domain/accessModules.ts` — módulo `contabilidade`
  adicionado a `AccessModuleKey`/`ACCESS_MODULES`.
- `server/app.ts` — `app.use('/api/accounting', ...)`.
- `server/tests/unit/module-authorization-map.test.ts` — `accounting`
  adicionado a `MODULES_REQUIRING_AUTHORIZE_MODULE` (guarda
  anti-regressão, senão o teste falha por módulo novo não coberto).
- `client/src/api/accessProfiles.ts` — `contabilidade` adicionado ao tipo
  `AccessModuleKey` espelhado.
- `client/src/App.tsx` — lazy import `AccountingPage` + rota `/accounting`
  atrás de `ModuleRoute module="contabilidade"`.
- `client/src/layouts/AppLayout.tsx` — item de menu "Contabilidade" no
  grupo Gestão (junto de Financeiro) + entrada em `BREADCRUMBS`.
- `docs/financeiro/02-CONTABILIDADE.md` — removida a apresentação do SQL
  MySQL como se fosse real, documentado o contrato real de
  `accounting_chart_of_accounts`/`accounting_entries`/
  `accounting_entry_items` na nova seção "Contrato Real Implementado".
- `docs/governance/TODO.md` — nova entrada datada 2026-08-07.

### Documentações atualizadas

`docs/financeiro/02-CONTABILIDADE.md`, `docs/governance/TODO.md`, e este
arquivo (`docs/governance/HANDOFF_CODEX.md`). Todo arquivo TypeScript novo
tem cabeçalho JSDoc explicando responsabilidade, e cada método de
repositório abstrato/use case documenta parâmetros e retorno.

### Validação

- `npm run typecheck --prefix server` — 0 erros.
- Smoke test de runtime dos models (`node -e "require('tsx/cjs');
  require('./src/models/index.ts')"`, a partir de `server/`) — OK, "OK
  models carregam em runtime". Confirmado também com
  `src/modules/accounting/presentation/routes/accounting.ts` carregado
  isoladamente.
- `npx tsc --noEmit --project client` (a partir de `client/`) — 0 erros
  (`EXIT:0`).
- `npm run migration:up --prefix server` — migrations `20260807-000230` e
  `20260807-000231` aplicadas com sucesso contra o Postgres local
  (`evok-postgres`, Docker); confirmado com `npm run migration:status
  --prefix server` (ambas `up`) e com
  `docker exec evok-postgres psql -U evok_admin -d erp_evok_audio -c
  "SELECT count(*) FROM accounting_chart_of_accounts;"` → **30** (seed
  aplicado corretamente, hierarquia `parent_id` conferida por amostra).
- `npx jest tests/unit --runInBand --prefix server` — 962/963 passando (1
  falha pré-existente e conhecida em
  `onda3-shipping-cockpit-cashflow.test.ts`, não relacionada a este
  módulo); 19 testes novos do módulo Contabilidade, 0 regressões
  (incluindo o ajuste necessário em `module-authorization-map.test.ts`).
  Os 19 testes cobrem especificamente os 5 cenários pedidos: lançamento
  com débito≠crédito rejeitado ao postar, lançamento balanceado aceito,
  itens de lançamento `posted` não editáveis, estorno gera novo lançamento
  com valores invertidos, conta sintética (`accept_entries=false`) não
  aceita lançamento direto — mais casos adicionais de plano de contas
  (código duplicado, pai inexistente, pai já "folha", conta com filhas não
  pode virar "folha").

### Riscos residuais / fora do escopo desta entrega

- Sem teste de integração HTTP real (Supertest) contra o banco — apenas
  unitários com repositório mockado, mesmo padrão de
  Facilities/Marketing/Jurídico.
- Sem integração fiscal (SPED/ECD/ECF/DCTF/eSocial) — só escrituração
  interna (lançamentos, plano de contas, balancete).
- Sem geração automática de lançamento a partir de outros módulos (vendas,
  compras, folha, depreciação de patrimônio) — todo lançamento é manual
  nesta rodada, apesar do `entry_type` já prever essas categorias.
- Número sequencial `LC-XXXXXX` por `COUNT(*)` — mesma limitação de
  concorrência de `RfqRepository.countRfqsInYear`, aceitável pelo baixo
  volume esperado (ver decisão de design acima).
- Plano de Contas no frontend é lista indentada por nível
  (`ChartOfAccountsTab.tsx`), não árvore com expand/collapse — suficiente
  para os 30 registros do seed, pode precisar de UI de árvore de verdade
  se o plano crescer muito.
- Sem teste de integração real (Postgres) do fluxo completo
  create→post→reverse — só verificado manualmente via
  `npm run migration:up` + inspeção de dados (seed), não via requisição
  HTTP ponta a ponta.

### Instruções de teste manual

1. Logar como `admin` (ou usuário com perfil que inclua o módulo
   `contabilidade` em nível `operate`, e `approve` para postar/estornar) e
   acessar `/accounting` pelo menu Gestão.
2. Aba **Plano de Contas**: confirmar as 30 contas seedadas, indentadas por
   nível (ex.: "1" no topo, "1.1" indentada, "1.1.1" mais indentada ainda).
   Criar uma conta nova filha de uma sintética existente (ex.: código
   `"1.1.5"`) e confirmar que aparece na posição correta.
3. Aba **Lançamentos**: criar um lançamento novo com 2 itens (ex.: débito
   R$ 1.000 na conta "1.1.1 Caixa e Equivalentes", crédito R$ 1.000 na
   conta "3.1 Receita Bruta de Vendas") — confirmar que o indicador de
   soma no rodapé do formulário mostra "Balanceado ✓" antes de salvar.
4. Salvar como rascunho, abrir "Ver" e confirmar os 2 itens exibidos com
   status "Rascunho".
5. Clicar em "Postar" — confirmar que o status muda para "Contabilizado".
6. Tentar criar outro lançamento com débito ≠ crédito (ex.: débito R$ 500,
   crédito R$ 300) e postar — confirmar que a API retorna 422 com mensagem
   didática explicando a diferença (R$ 200,00).
7. No lançamento postado do passo 5, clicar em "Estornar" — confirmar que
   surge um NOVO lançamento na lista (`entry_type` "Ajuste/Estorno") com
   débito/crédito invertidos, e que o lançamento original agora mostra
   status "Estornado".
8. Aba **Balancete**: selecionar o mês/ano do lançamento postado —
   confirmar que a conta "1.1.1 Caixa e Equivalentes" aparece com o
   débito/crédito do mês refletindo o lançamento (e zerado de volta após o
   estorno, se ambos caírem no mesmo mês).
9. Confirmar que um usuário sem o módulo `contabilidade` no perfil de
   acesso é redirecionado para "Acesso Negado" ao tentar `/accounting`
   diretamente pela URL.
10. Confirmar que um usuário com `contabilidade:operate` (mas sem
    `approve`) consegue criar/editar rascunho, mas recebe 403 ao tentar
    `post`/`reverse`.

---

## 2026-08-07 — Módulo Tesouraria implementado do zero (backend + frontend) — `programador`

**Escopo:** subárea TES do departamento Financeiro (sem linha própria em
`departments`) não tinha NENHUM código antes desta entrega — apenas o spec
`docs/financeiro/03-TESOURARIA.md` com 2 tabelas em sintaxe MySQL
apresentadas como reais (`reconciliation_items`, `financial_operations`),
nunca migradas. Implementado do zero:

1. **Contas Bancárias** (`treasury_bank_accounts`, tabela NOVA — não existia
   no spec original, que só tinha uma tabela markdown estática de exemplo)
   — cadastro operacional (banco, agência, número, tipo
   `corrente|poupanca|aplicacao`, saldo atual mantido manualmente,
   gerente/telefone, `active`), unicidade de agência+número.
2. **Operações Financeiras** (`treasury_financial_operations`, do spec
   original) — empréstimos, aplicações, financiamentos, leasing.
   `contract_number` único. Ciclo de vida via `status`: `active` (editável
   livremente via `PUT`) → `settled` (via `PATCH .../settle`, preenche
   `settled_at` — coluna NOVA não prevista no spec original) ou `canceled`
   (via `PATCH .../cancel`) — ambos estados finais, nunca reabertos, nunca
   apagados fisicamente (histórico de contrato financeiro exige auditoria).
3. **Posição de Caixa** (relatório derivado, sem tabela própria) — `GET
   /api/treasury/cash-position`: soma o `current_balance` de todas as
   `treasury_bank_accounts` ativas (total geral + por tipo de conta) e
   cruza com o resumo de títulos em aberto de `accounts_payable`/
   `accounts_receivable` (mesmo critério de payment_date/status de
   `GetCashFlowProjectionUseCase`, módulo `financial`, sem reimplementar a
   query — só reagregado em totais "hoje"), retornando `projected_balance`.

**NÃO recriado por decisão explícita (evitar duplicação de domínio):**
`reconciliation_items` do spec original — o projeto já tem conciliação
bancária real e funcional em `server/src/modules/financial/`
(`bank_statements`/`bank_statement_entries`,
`presentation/routes/reconciliation.ts`/`cnab.ts`, extrato OFX + CNAB
240 remessa/retorno). Este módulo Tesouraria não toca nesses arquivos.

Backend: `server/src/modules/treasury/` (Clean Architecture —
`domain/repositories`, `application/use-cases/{bank-account,operation,
report}`, `infrastructure/sequelize`, `presentation/{controllers,routes,
validators}`), 9 endpoints REST em `/api/treasury/*`, montado em
`server/app.ts`. Frontend: `client/src/pages/treasury/TreasuryPage.tsx` (3
abas — Operações Financeiras, Posição de Caixa, Contas Bancárias), API
client `client/src/api/treasury.ts`, rota `/treasury` protegida por
`ModuleRoute module="tesouraria"`, item de menu no grupo "Gestão" (junto de
Contabilidade).

### Decisões de design tomadas por conta própria

- **`CompanyBankingConfig` NÃO foi reaproveitada/estendida** —
  investigação do model (`server/src/models/CompanyBankingConfig.ts`)
  confirmou que é uma tabela SINGLETON (1 linha, `id=1`) com os dados
  bancários do CEDENTE (banco/agência/conta/convênio/carteira/contadores
  sequenciais de nosso-número e remessa), usada exclusivamente na geração
  de arquivo CNAB — não é, e nunca foi desenhada para ser, um cadastro de N
  contas bancárias operacionais. `treasury_bank_accounts` foi criada como
  tabela SEPARADA, sem nenhuma FK entre as duas — são domínios de
  configuração distintos ("conta bancária operacional, saldo variável" vs.
  "config de cedente para CNAB, 1 linha fixa"), mesma razão de design já
  registrada no cabeçalho JSDoc do model `CompanyBankingConfig` original.
- **`settled_at` é coluna NOVA** em `treasury_financial_operations` (não
  existia no spec original, que só tinha o enum `status`) — registra
  explicitamente a data de liquidação, preservando quando o encerramento
  natural ocorreu (diferente de `updated_at`, que mudaria por qualquer
  edição, não só pela liquidação).
- **`settle` e `cancel` são 2 ações distintas**, não uma única transição
  genérica `active -> encerrada` — `settle` representa o encerramento
  NATURAL do contrato (ciclo cumprido), `cancel` representa encerramento
  ANTES do previsto (erro de cadastro, distrato). Separar os dois preserva
  o motivo do encerramento no histórico sem depender de parsing de
  `notes`.
- **Posição de Caixa reaproveita o critério de títulos em aberto do módulo
  `financial`** (`payment_date IS NULL AND status != 'canceled'`) via
  queries diretas aos models `AccountPayable`/`AccountReceivable` — não
  duplica `GetCashFlowProjectionUseCase` nem importa do módulo `financial`
  (mantém `treasury` sem dependência de outro módulo de aplicação),
  apenas replica o MESMO critério de filtro, documentado no JSDoc do
  método `getOpenPayablesAndReceivablesSummary`.
- **RBAC com nível `approve`** — mesmo padrão de `contabilidade`:
  `authorizeModule('tesouraria', 'approve')` protege `settle`/`cancel`
  (transições que encerram um contrato financeiro), `operate` cobre o CRUD
  comum, leitura usa o nível padrão.
- **Sem vínculo automático entre operação financeira e conta bancária** —
  o spec não define esse relacionamento (uma operação pode envolver
  múltiplas contas ao longo do tempo, ex.: parcelas de empréstimo
  depositadas em contas diferentes); adicionar `bank_account_id` seria
  scope creep não solicitado, registrado como possível evolução futura.

### Arquivos criados

**Backend:**
- `server/migrations/20260807-000240-create-treasury-module.cjs`
- `server/src/models/{TreasuryBankAccount,TreasuryFinancialOperation}.ts`
- `server/src/modules/treasury/domain/repositories/TreasuryRepository.ts`
- `server/src/modules/treasury/infrastructure/sequelize/SequelizeTreasuryRepository.ts`
- `server/src/modules/treasury/application/use-cases/bank-account/{Create,List,GetById,Update}BankAccountUseCase.ts`
- `server/src/modules/treasury/application/use-cases/operation/{Create,List,GetById,Update,Settle,Cancel}OperationUseCase.ts`
- `server/src/modules/treasury/application/use-cases/report/GetCashPositionUseCase.ts`
- `server/src/modules/treasury/presentation/validators/treasuryValidators.ts`
- `server/src/modules/treasury/presentation/controllers/{bankAccount,financialOperation,cashPosition}Controller.ts`
- `server/src/modules/treasury/presentation/routes/treasury.ts`
- `server/tests/unit/treasury-use-cases.test.ts` (18 casos)

**Frontend:**
- `client/src/api/treasury.ts`
- `client/src/pages/treasury/{TreasuryPage,BankAccountsTab,FinancialOperationsTab,CashPositionTab}.tsx`

### Arquivos modificados

- `server/src/models/index.ts` — imports dos 2 models novos + inclusão no
  barrel de exportação (sem associações Sequelize entre eles nem com
  outros models — cash position consulta `AccountPayable`/
  `AccountReceivable` diretamente via query, não via `include`).
- `server/src/shared/domain/accessModules.ts` — módulo `tesouraria`
  adicionado a `AccessModuleKey`/`ACCESS_MODULES`.
- `server/app.ts` — `app.use('/api/treasury', ...)`.
- `server/tests/unit/module-authorization-map.test.ts` — `treasury`
  adicionado a `MODULES_REQUIRING_AUTHORIZE_MODULE` (guarda
  anti-regressão, senão o teste falha por módulo novo não coberto).
- `client/src/api/accessProfiles.ts` — `tesouraria` adicionado ao tipo
  `AccessModuleKey` espelhado.
- `client/src/App.tsx` — lazy import `TreasuryPage` + rota `/treasury`
  atrás de `ModuleRoute module="tesouraria"`.
- `client/src/layouts/AppLayout.tsx` — item de menu "Tesouraria" no grupo
  Gestão (junto de Contabilidade) + entrada em `BREADCRUMBS`.
- `docs/financeiro/03-TESOURARIA.md` — removida a apresentação do SQL
  MySQL como se fosse real, documentado o contrato real de
  `treasury_bank_accounts`/`treasury_financial_operations` na nova seção
  "Contrato Real Implementado", incluindo a decisão sobre
  `CompanyBankingConfig`.
- `docs/governance/TODO.md` — nova entrada datada 2026-08-07.

### Documentações atualizadas

`docs/financeiro/03-TESOURARIA.md`, `docs/governance/TODO.md`, e este
arquivo (`docs/governance/HANDOFF_CODEX.md`). Todo arquivo TypeScript novo
tem cabeçalho JSDoc explicando responsabilidade, e cada método de
repositório abstrato/use case documenta parâmetros e retorno.

### Validação

- `npm run typecheck --prefix server` — 0 erros.
- Smoke test de runtime dos models (`node -e "require('tsx/cjs');
  require('./src/models/index.ts')"`, a partir de `server/`) — OK, "OK
  models carregam em runtime". Confirmado também com
  `src/modules/treasury/presentation/routes/treasury.ts` carregado
  isoladamente (retorna um router Express válido).
- `npx tsc --noEmit --project .` (a partir de `client/`) — 0 erros.
- `npm run migration:up --prefix server` — migration `20260807-000240`
  aplicada com sucesso contra o Postgres local (Docker); confirmado com
  `npm run migration:status --prefix server` (`up`) e com consulta real via
  Sequelize (`TreasuryBankAccount.count()` /
  `TreasuryFinancialOperation.count()` → `0`/`0`, sem erro de tabela
  ausente — confirma que as 2 tabelas existem no schema real).
- `npx jest tests/unit --runInBand --prefix server` — 981/982 passando (1
  falha pré-existente e conhecida em
  `onda3-shipping-cockpit-cashflow.test.ts`, não relacionada a este
  módulo); 18 testes novos do módulo Tesouraria, 0 regressões (incluindo o
  ajuste necessário em `module-authorization-map.test.ts`). Os 18 testes
  cobrem: conflito de agência+número em conta bancária, atualização de
  conta bancária sem colisão, conflito de `contract_number` em operação,
  `end_date` anterior a `start_date` rejeitada na criação, edição de
  operação `settled` rejeitada, `settle`/`cancel` só a partir de `active`
  (e rejeitados a partir de outros estados), `settle` preenche
  `settled_at`, agregação de saldo por tipo de conta e cálculo de
  `projected_balance` na Posição de Caixa (incluindo caso de borda sem
  contas ativas).

### Riscos residuais / fora do escopo desta entrega

- Sem teste de integração HTTP real (Supertest) contra o banco — apenas
  unitários com repositório mockado, mesmo padrão de
  Facilities/Marketing/Jurídico/Contabilidade.
- Sem operações de câmbio dedicadas (mencionadas no spec original de
  cargos/funções da Tesouraria, mas sem modelo de dados definido) — o
  módulo Importação/COMEX (UC-19) já cobre nacionalização de importação
  com câmbio informado manualmente por processo, sem campo de câmbio
  dedicado a este módulo.
- Sem vínculo automático entre uma Operação Financeira liquidada e a baixa
  de um título em `accounts_payable`/`accounts_receivable` — o spec não
  define esse relacionamento; liquidação de operação e baixa de conta
  continuam fluxos independentes.
- Saldo de `treasury_bank_accounts.current_balance` é mantido MANUALMENTE
  pela Tesouraria (edição via `PUT /api/treasury/bank-accounts/:id`) — não
  há reconciliação automática desse saldo com o extrato OFX importado em
  `bank_statements` (módulo `financial`); reconciliar as duas fontes de
  saldo é uma evolução futura possível, fora do escopo desta entrega.
- Sem teste de integração real (Postgres) do fluxo completo
  create→settle/cancel — só verificado manualmente via
  `npm run migration:up` + contagem de linhas via Sequelize, não via
  requisição HTTP ponta a ponta.

### Instruções de teste manual

1. Logar como `admin` (ou usuário com perfil que inclua o módulo
   `tesouraria` em nível `operate`, e `approve` para liquidar/cancelar) e
   acessar `/treasury` pelo menu Gestão.
2. Aba **Contas Bancárias**: cadastrar uma conta nova (ex.: Banco do
   Brasil, agência "1234-5", conta "10.000-1", tipo Corrente, saldo inicial
   R$ 45.000) e confirmar que aparece na lista. Tentar cadastrar outra com
   a mesma agência+conta e confirmar erro de conflito (409, mensagem
   didática).
3. Aba **Operações Financeiras**: criar uma operação nova (ex.: tipo
   Empréstimo, instituição "BNDES", contrato "BNDES-2026-001", valor
   R$ 200.000, taxa 8,5%, início hoje, garantia "Aval") e confirmar que
   aparece na lista com status "Ativa".
4. Tentar criar outra operação com o mesmo número de contrato e confirmar
   erro de conflito (409).
5. Clicar em "Liquidar" na operação criada — confirmar que o status muda
   para "Liquidada" e que as ações de editar/liquidar/cancelar somem da
   linha (estado final).
6. Criar uma segunda operação e clicar em "Cancelar" (com confirmação) —
   confirmar status "Cancelada".
7. Aba **Posição de Caixa**: confirmar que o card "Saldo total em contas"
   reflete o saldo cadastrado na conta bancária do passo 2, que o "Saldo
   por tipo de conta" mostra o valor na categoria correta (Corrente), e
   que "Saldo projetado" soma esse saldo com os títulos em aberto de
   contas a pagar/receber do sistema (se houver).
8. Confirmar que um usuário sem o módulo `tesouraria` no perfil de acesso é
   redirecionado para "Acesso Negado" ao tentar `/treasury` diretamente
   pela URL.
9. Confirmar que um usuário com `tesouraria:operate` (mas sem `approve`)
   consegue criar/editar operações `active`, mas recebe 403 ao tentar
   `settle`/`cancel`.

---

## 2026-08-07 — Módulo Controladoria implementado do zero (backend + frontend) — `programador`

**Escopo:** subárea CTR do departamento Financeiro (sem linha própria em
`departments`), 6º e ÚLTIMO módulo desta sequência de entregas (Facilities,
Marketing, Jurídico, Contabilidade, Tesouraria, Controladoria). Diferente
dos 5 anteriores, Controladoria NÃO tinha doc dedicado com tabelas SQL
prontas — seu escopo em `docs/financeiro/00-README.md` era só a linha
"Custos Industriais: custeio por absorção/ABC" e "Orçamento: orçamento
anual, acompanhamento" na tabela de Funções Financeiras. Levantamento antes
de codar:

- **Custeio industrial** (mão-de-obra/overhead de OP) já estava implementado
  em `server/src/modules/production`/`server/src/modules/reports` — não
  tocado.
- **Centros de Custo** (`cost_centers`) e o relatório agrupado de contas a
  pagar/receber (`GET /api/finance/cost-centers/report`,
  `GetCostCenterReportUseCase`) já existiam em
  `server/src/modules/financial/` — não duplicados.
- **Orçamento** era a única peça genuinamente inexistente em código —
  implementado do zero nesta entrega: linhas de orçamento por centro de
  custo (anual "achatada" ou mensal) + relatório orçado × realizado.

Backend: `server/src/modules/budget/` (Clean Architecture —
`domain/repositories`, `application/use-cases/{budget-line,report}`,
`infrastructure/sequelize`, `presentation/{controllers,routes,validators}`),
6 endpoints REST em `/api/budget/*`, montado em `server/app.ts`. Frontend:
`client/src/pages/budget/BudgetPage.tsx` (2 abas — Linhas de Orçamento,
Orçado × Realizado), API client `client/src/api/budget.ts`, rota `/budget`
protegida por `ModuleRoute module="controladoria"`, item de menu no grupo
"Gestão" (junto de Tesouraria).

### Decisões de design tomadas por conta própria

- **Mês opcional (`month IS NULL` = linha anual "achatada")** — o
  enunciado da tarefa deixou a decisão explícita a cargo desta entrega.
  Optei por: `month` nulo representa o ano inteiro em uma única linha, sem
  detalhamento mês a mês; `1`-`12` representa uma linha mensal. As duas
  convivem para o mesmo centro de custo/ano/categoria sem colidir (testado
  em `CreateBudgetLineUseCase`).
- **Unicidade com `month` nulo via índice de expressão** —
  `UNIQUE(cost_center_id, year, month, category)` padrão do PostgreSQL NÃO
  bastaria: `NULL` nunca é igual a `NULL` em uma constraint UNIQUE, então
  duas linhas anuais duplicadas para o mesmo centro/ano/categoria
  passariam despercebidas. Resolvido com
  `CREATE UNIQUE INDEX ... ON budget_lines (cost_center_id, year,
  COALESCE(month, 0), category)` (SQL cru na migration — `queryInterface.
  addIndex` do Sequelize não expressa `COALESCE` em `fields`). Confirmado
  no Postgres real via `\d budget_lines` (ver seção Validação).
- **Categoria como enum simples (4 valores)**, não um plano de contas
  completo — o doc de origem não especificava esse nível de detalhe, e o
  plano de contas real já existe em `accounting_chart_of_accounts` (módulo
  Contabilidade, implementado antes nesta mesma sessão); cruzar orçamento
  com conta contábil real fica registrado como evolução futura, não
  implementado agora (evita scope creep não solicitado).
- **DELETE físico permitido** — diferente da maioria das tabelas do
  projeto, `budget_lines` é artefato de PLANEJAMENTO (editável/descartável
  livremente), não histórico transacional imutável como uma OP ou NF-e.
  `CLAUDE.md` §7 reserva soft delete só para `Category`; aqui o DELETE real
  é a escolha correta e explícita, com `NotFoundError` se a linha já não
  existir.
- **"Realizado" reaproveita, não reimplementa, a agregação do módulo
  `financial`** — `GetBudgetVsActualReportUseCase` recebe
  `CostCenterRepository` (do módulo `financial`) como segunda dependência
  injetada, além do `BudgetRepository` próprio, e chama
  `getCostCenterTotalsByPayable(from, to)` diretamente — a MESMA função que
  alimenta `GET /api/finance/cost-centers/report`. Só o lado de contas a
  PAGAR entra no comparativo (Controladoria acompanha custos/despesas, não
  receitas) — contas a receber ficam fora deste relatório por decisão de
  design, não por omissão.
- **Proração linear (÷12) de linha anual ao consultar um mês específico**
  — quando o relatório é consultado para o ANO INTEIRO, linhas anuais
  entram pelo valor cheio; quando consultado para um MÊS específico, linhas
  mensais daquele mês entram cheias e linhas anuais são divididas por 12.
  É uma simplificação deliberada (sem modelagem de sazonalidade), decidida
  para dar um número comparável ao "realizado" mensal sem inventar uma
  curva de distribuição não solicitada.
- **Sem nível `approve` no RBAC** — diferente de Contabilidade/Tesouraria
  (que têm transições de status sensíveis, ex.: liquidar/cancelar,
  postar/estornar), planejamento orçamentário não tem uma transição de
  status crítica a proteger; mesmo padrão de
  Facilities/Marketing/Jurídico: `operate` cobre todo o CRUD (inclusive
  exclusão), leitura usa o nível padrão.

### Arquivos criados

**Backend:**
- `server/migrations/20260807-000250-create-budget-module.cjs`
- `server/src/models/BudgetLine.ts`
- `server/src/modules/budget/domain/repositories/BudgetRepository.ts`
- `server/src/modules/budget/infrastructure/sequelize/SequelizeBudgetRepository.ts`
- `server/src/modules/budget/application/use-cases/budget-line/{Create,List,GetById,Update,Delete}BudgetLineUseCase.ts`
- `server/src/modules/budget/application/use-cases/report/GetBudgetVsActualReportUseCase.ts`
- `server/src/modules/budget/presentation/validators/budgetValidators.ts`
- `server/src/modules/budget/presentation/controllers/{budgetLine,budgetReport}Controller.ts`
- `server/src/modules/budget/presentation/routes/budget.ts`
- `server/tests/unit/budget-use-cases.test.ts` (17 casos)

**Frontend:**
- `client/src/api/budget.ts`
- `client/src/pages/budget/{BudgetPage,BudgetLinesTab,BudgetReportTab}.tsx`

### Arquivos modificados

- `server/src/models/index.ts` — import do model `BudgetLine` + inclusão no
  barrel de exportação + associação `CostCenter.hasMany(BudgetLine)` /
  `BudgetLine.belongsTo(CostCenter, { as: 'costCenter' })` (usada no
  `include` de `listBudgetLines`/`findBudgetLineById`, exibindo
  código/nome do centro de custo na tela sem N+1).
- `server/src/shared/domain/accessModules.ts` — módulo `controladoria`
  adicionado a `AccessModuleKey`/`ACCESS_MODULES`.
- `server/app.ts` — `app.use('/api/budget', ...)`.
- `server/tests/unit/module-authorization-map.test.ts` — `budget`
  adicionado a `MODULES_REQUIRING_AUTHORIZE_MODULE` (guarda
  anti-regressão, senão o teste falha por módulo novo não coberto).
- `client/src/api/accessProfiles.ts` — `controladoria` adicionado ao tipo
  `AccessModuleKey` espelhado.
- `client/src/App.tsx` — lazy import `BudgetPage` + rota `/budget` atrás de
  `ModuleRoute module="controladoria"`.
- `client/src/layouts/AppLayout.tsx` — import do ícone `PiggyBank` + item
  de menu "Controladoria" no grupo Gestão (junto de Tesouraria).
- `docs/financeiro/00-README.md` — nova seção "Controladoria (CTR) —
  Contrato Real Implementado", documentando o contrato real de
  `budget_lines`, as decisões de mês opcional/unicidade/proração, e o
  relatório orçado × realizado.
- `docs/governance/TODO.md` — nova entrada datada 2026-08-07, fechando a
  sequência dos 6 módulos.

### Documentações atualizadas

`docs/financeiro/00-README.md`, `docs/governance/TODO.md`, e este arquivo
(`docs/governance/HANDOFF_CODEX.md`). Todo arquivo TypeScript novo tem
cabeçalho JSDoc explicando responsabilidade, e cada método de repositório
abstrato/use case documenta parâmetros e retorno.

### Validação (todos os comandos rodados de fato, output real abaixo)

- `npm run typecheck --prefix server` — 0 erros.
- Smoke test de runtime dos models (`node -e "require('tsx/cjs');
  require('./src/models/index.ts')"`, a partir de `server/`) — output:
  `OK models carregam em runtime`. `BudgetLine.ts` usa `type
  BudgetLineCategory = ...` (sem `export`) + `export = BudgetLine`, nunca
  `export type` misturado com `export =` no mesmo arquivo (bug conhecido
  desta sessão, verificado deliberadamente).
- `npx tsc --noEmit --project .` (a partir de `client/`) — 0 erros.
- `npm run migration:up --prefix server` — migration
  `20260807-000250-create-budget-module` aplicada com sucesso (log:
  `== 20260807-000250-create-budget-module: migrated (0.078s)`) contra o
  Postgres local (container `evok-postgres`); confirmado com
  `npm run migration:status --prefix server` (`up`) e com
  `docker exec evok-postgres psql -U evok_admin -d erp_evok_audio -c "\d
  budget_lines"`, que confirmou: FK `cost_center_id → cost_centers.id ON
  DELETE CASCADE ON UPDATE CASCADE`, 3 CHECK constraints
  (`chk_budget_lines_month`, `chk_budget_lines_year`,
  `chk_budget_lines_planned_amount`), e o índice de expressão
  `uq_budget_lines_cost_center_year_month_category` (`btree
  (cost_center_id, year, COALESCE(month, 0), category)`) — exatamente como
  projetado.
- `npx jest tests/unit --runInBand --prefix server` — 999/1000 passando (1
  falha pré-existente e conhecida em
  `onda3-shipping-cockpit-cashflow.test.ts`, não relacionada a este
  módulo); 17 testes novos do módulo Controladoria
  (`budget-use-cases.test.ts`), 0 regressões (incluindo o ajuste necessário
  em `module-authorization-map.test.ts`, que também foi rodado
  isoladamente e passou: 33/33). Os 17 testes cobrem: criação de linha
  mensal e de linha anual (`month` omitido → `null`), conflito de chave
  `(cost_center_id, year, month, category)`, caso de borda explícito de
  linha anual e linha mensal do MESMO centro/ano/categoria NÃO colidindo,
  listagem paginada com cálculo de `totalPages`, `NotFoundError` em
  get/update/delete de linha inexistente, atualização sem mudança de chave
  (não reconsulta unicidade) vs. com mudança de chave (reconsulta e
  rejeita se colidir, mas permite manter a própria chave), exclusão física,
  cálculo de variação absoluta/percentual no relatório para múltiplos
  centros de custo, variação percentual `null` quando orçado é zero
  (divisão por zero evitada), uso do intervalo `from`/`to` correto
  (ano inteiro vs. mês específico com `lastDayOfMonth`), filtro por
  `cost_center_id`.

### Riscos residuais / fora do escopo desta entrega

- Sem teste de integração HTTP real (Supertest) contra o banco — apenas
  unitários com repositório mockado, mesmo padrão de
  Facilities/Marketing/Jurídico/Contabilidade/Tesouraria. A migration em
  si FOI validada de fato contra o Postgres local (ver seção Validação),
  mas o fluxo HTTP completo (`POST` → `GET /report`) não foi exercitado
  ponta a ponta.
- Categoria de orçamento é um enum simples (`custo_fixo|custo_variavel|
  investimento|outro`), sem vínculo com `accounting_chart_of_accounts` —
  cruzar linha de orçamento com conta contábil real é evolução futura
  possível, não solicitada nesta entrega.
- Proração ÷12 de linha anual ao consultar um mês específico é linear —
  não há suporte a curva de sazonalidade (ex.: décimo terceiro
  concentrado em dezembro).
- "Realizado" considera apenas o valor JÁ PAGO (`amount_paid`) de contas a
  pagar no período (`due_date` dentro do intervalo) — não inclui o valor
  em ABERTO (comprometido mas não pago), que ficaria mais próximo de um
  "comprometido" contábil; a API retorna só `realized_amount` no
  relatório, não `open_amount` (embora o repositório subjacente já
  retorne ambos) — decisão de manter o contrato do endpoint simples para
  esta primeira entrega.

### Instruções de teste manual

1. Logar como `admin` (ou usuário com perfil que inclua o módulo
   `controladoria` em nível `operate`) e acessar `/budget` pelo menu
   Gestão.
2. Aba **Linhas de Orçamento**: criar uma linha MENSAL (ex.: centro de
   custo existente, ano corrente, mês Agosto, categoria "Custo fixo",
   valor R$ 50.000) e confirmar que aparece na tabela com o mês certo.
3. Criar uma linha ANUAL para o MESMO centro de custo/ano/categoria
   (deixando "Mês" em branco/"Anual") e confirmar que NÃO dá conflito
   (linha mensal e anual coexistem).
4. Tentar criar outra linha MENSAL idêntica à do passo 2 (mesmo centro,
   ano, mês, categoria) e confirmar erro de conflito (409, mensagem
   didática).
5. Editar a linha criada no passo 2 (mudar valor) e confirmar que salva
   sem pedir nova checagem de unicidade (chave não mudou).
6. Excluir a linha anual criada no passo 3 (com confirmação) e confirmar
   que some da lista.
7. Aba **Orçado × Realizado**: selecionar o ano corrente com "Ano inteiro"
   e confirmar que o centro de custo usado aparece com "Orçado" refletindo
   a soma das linhas cadastradas; trocar para um mês específico e
   confirmar que o valor orçado muda (proração de linha anual, se houver).
8. Confirmar que "Realizado (pago)" reflete o total pago
   (`amount_paid`) de contas a pagar daquele centro de custo no período
   (comparar com `/financial` → relatório de centros de custo, mesmo
   período).
9. Confirmar que um usuário sem o módulo `controladoria` no perfil de
   acesso é redirecionado para "Acesso Negado" ao tentar `/budget`
   diretamente pela URL.

---

---

## 2026-08-07 — BLOCO 3 Jurídico: implementação backend passada 1/2 (Contratos, Contencioso, Prazos Fatais) — `programador`

### Resumo da feature

Implementação da passada 1 (de 2) do Bloco 3 — Módulo Jurídico completo,
substituindo o módulo Jurídico enxuto ("Módulo Jurídico — Implementação do
zero (Backend + Frontend)", entrada anterior desta mesma seção, commit
`2ad27fd`) conforme decisão explícita do dono do produto e o plano de
substituição formal de `docs/business/BLOCO_3_JUR_AUDITORIA.md` §6.

**1. Migration de transição** (`server/migrations/20260807-000280-migrate-legal-lean-to-jur.cjs`):
copia dados de `legal_contracts`/`legal_contract_addendums`/
`legal_contract_reminders`/`legal_intellectual_property` para as tabelas
`jur_*` correspondentes (tradução de enum PT-BR→inglês via `CASE WHEN`,
placeholder `MIGRADO-SEM-DOC` para contraparte avulsa sem documento — exigido
pelo `CHECK` de exclusividade mútua —, `responsible_user_id` só preenchido
quando `status='active'`, perdas de campo documentadas: `owner`/
`jurisdiction` de PI descartados, `previous_end_date`/`previous_value` de
aditivos migrados ficam `NULL`) e só então DROPA as 4 tabelas antigas,
tudo dentro da mesma transação (`sequelize.transaction`). Segura/idempotente
quando as tabelas antigas nunca existiram (`showAllTables()` antes de agir
— banco criado do zero após esta mudança pula o bloco inteiro). A migration
`20260807-000220-create-legal-module.cjs` **não foi deletada** — continua
existindo (pode estar em `SequelizeMeta` de outros ambientes), apenas tem
seu resultado removido em runtime por esta migration subsequente. `node -c`
validado (sem erro de sintaxe). **Esta migration NÃO foi aplicada** —
`migration:up` é responsabilidade da validação/deploy, fora deste passo.

**2. Remoção do módulo enxuto:**
- `server/src/modules/legal/**` (removido por completo — use-cases,
  repositórios, controllers, rotas, validators, middleware de upload).
- Models `server/src/models/LegalContract.ts`/`LegalContractAddendum.ts`/
  `LegalContractReminder.ts`/`LegalIntellectualProperty.ts` (removidos).
- `server/src/models/index.ts`: imports/associações/exports de `Legal*`
  removidos, substituídos pelos 16 models `Jur*` novos.
- `server/app.ts`: `app.use('/api/legal', ...)` substituído por
  `app.use('/api/jur', require('./src/modules/juridico/presentation/routes/juridico'))`.
- Testes antigos removidos: `legal-addendum-reminder-use-cases.test.ts`,
  `legal-contract-use-cases.test.ts`, `legal-intellectual-property-use-cases.test.ts`.
- `server/tests/unit/module-authorization-map.test.ts`: entrada `legal`
  trocada por `juridico` na lista `MODULES_REQUIRING_AUTHORIZE_MODULE`
  (o teste de guarda anti-regressão apontava para a pasta antiga).
- **NÃO tocado (fora do escopo backend):** `client/src/api/legal.ts`,
  `client/src/pages/legal/**`. As chamadas dessas telas para `/api/legal/*`
  vão falhar em runtime (404) até a passada de frontend recriar as telas
  contra `/api/jur/*` — ver pendências abaixo.

**3. Módulo novo `server/src/modules/juridico/`** (Clean Architecture,
padrão dos módulos `sst`/`ti`):

- **16 models Sequelize** (`server/src/models/Jur*.ts`), um por tabela
  `jur_*` das migrations `20260807-000260` a `20260807-000271` — todos os
  16 foram criados nesta passada, mesmo os que só terão endpoint na
  passada 2 (Procurações, PI, LGPD), para o mapeamento de banco ficar
  completo desde já.
- `server/src/models/AccountPayable.ts`: adicionadas as colunas
  `legal_case_id`/`legal_expense_type` (a migration `20260807-000268` já
  as criava, mas o model nunca tinha sido atualizado).
- **35 dos 71 endpoints do contrato** (`docs/business/BLOCO_3_JUR_API.md`):

  | Grupo | Endpoints | UC | Status |
  |---|---|---|---|
  | 1 — Contratos | 13/13 | UC-52 (JUR) | Completo |
  | 2 — Contencioso | 15/15 | UC-53 (JUR) | Completo |
  | 3 — Prazos Fatais | 7/7 | UC-54 (JUR) | Completo |
  | 4 — Procurações | 0/6 | UC-55 (JUR) | Passada 2 |
  | 5 — Propriedade Intelectual | 0/6 | - | Passada 2 |
  | 6 — LGPD | 0/~17 | UC-56 (JUR) | Passada 2 |
  | 7 — Transversal (alertas/relatório financeiro/fichas cruzadas) | 0/8 | - | Passada 2 |

- **Decisões de implementação desta passada:**
  1. **Sem mapper DTO PT-BR↔inglês** — divergência consciente do enunciado
     do pipeline (que citava "precedente SST"): `docs/business/BLOCO_3_JUR_MODELO_DADOS.md`
     §0 já documenta que os nomes de coluna do Bloco 3 são os nomes de
     campo esperados de API (inglês, snake_case, sem tradução) — diferente
     de SST, que usa nomes de coluna em português. Criar um mapper
     identidade seria trabalho morto; os controllers passam `req.body`/
     resultado do repositório quase sem transformação.
  2. **Alçada de aprovação de contrato (RF-JUR-003) não implementada** —
     a tabela `jur_approval_thresholds` não foi modelada em nenhum dos 3
     artefatos do Bloco 3 (pendência explícita, documentada em todos).
     `ActivateContractUseCase` aceita o parâmetro `approverHasApprove` (não
     utilizado ainda) para não quebrar a assinatura quando a alçada for
     implementada — hoje qualquer `juridico:operate` pode ativar qualquer
     contrato, independentemente do valor.
  3. **Integração com Contas a Pagar via adapter** — `AccountPayableService`
     (interface) + `AccountPayableServiceAdapter` (chama
     `SequelizeFinancialRepository.createPayable`, módulo Financeiro) —
     nunca `AccountPayable.create()` direto do módulo `juridico`, conforme
     exigido pelo contrato de API.
  4. **Dupla confirmação de prazo fatal (UC-54)** implementada em 3 camadas
     coerentes: CHECK de banco já existente (`ck_jur_legal_case_deadlines_fulfilled_confirmed_distinct`,
     migration `000265`), rotas HTTP separadas (`fulfill`/`confirm`, nunca
     um `PUT` genérico) e `ConfirmDeadlineUseCase` rejeitando
     `confirmedBy === fulfilled_by` com o mesmo contrato de erro exato do
     `docs/business/BLOCO_3_JUR_API.md` §4.4 (`code: BUSINESS_RULE_VIOLATION`,
     `details: { rule: 'BR-JUR-013', fulfilled_by, attempted_confirm_by }`).
  5. **RBAC:** `authorizeModule('juridico', 'operate')` bloqueia o router
     inteiro (`router.use`); `authorizeModule('juridico', 'approve')`
     adicional só em `POST /legal-cases/:id/close`; o nível `approve` de
     `POST /legal-cases/:id/provisions` quando `risk_class=probable` é
     checado dentro do use case (não na rota), porque depende do corpo
     da requisição, não é uma propriedade fixa da rota.

### Documentações atualizadas

- `docs/database/DATABASE.md` — nova seção "BLOCO 3 Jurídico — Implementação
  Backend, passada 1/2, e substituição do módulo enxuto (2026-08-07)".
- `docs/projeto/04-USE_CASES.md` — nova seção "UC-52-JUR a UC-54-JUR
  (implementado, passada 1/2)", com nota explícita sobre a colisão de
  numeração UC-52/53 com Facilities/Marketing (dívida de documentação
  sinalizada, não resolvida nesta passada — resolução exigiria renumerar
  os 3 documentos do Bloco 3, fora do escopo de um agente de backend).
- `docs/governance/TODO.md` — item "Plano de Substituição do Módulo Enxuto"
  marcado `[x]` com evidência; nova entrada datada
  "BLOCO 3 Juridico: implementacao backend passada 1/2".
- `docs/governance/HANDOFF_CODEX.md` — esta seção.
- JSDoc: todo model, repositório, use case, controller e rota novos têm
  cabeçalho JSDoc explicando RF/UC/regra de negócio associada.
- **Não atualizado (pendência explícita para o `documentador`/passo 5):**
  `docs/juridico/01-CONTRATOS.md`/`02-PROPRIEDADE_INTELECTUAL.md` ainda
  descrevem o módulo enxuto — precisam de reescrita quando o Bloco 3
  completo (passada 2) estiver pronto, para não ficarem descrevendo um
  módulo que não existe mais.

### Instruções de teste

1. `cd server && npm run typecheck` — limpo (0 erros).
2. `cd server && npx jest --config jest.config.cjs --testPathPatterns=unit`
   — 1024/1025 passando; a única falha
   (`onda3-shipping-cockpit-cashflow.test.ts`) é pré-existente, dependente
   de data corrente, não relacionada a este bloco.
3. `node -c server/migrations/20260807-000280-migrate-legal-lean-to-jur.cjs`
   — sem erro de sintaxe.
4. **NÃO validado nesta passada (exige Postgres real):**
   - `migration:up` da `20260807-000280` contra um banco com dados reais em
     `legal_contracts`/`legal_contract_addendums`/`legal_contract_reminders`/
     `legal_intellectual_property` (o cenário de cópia de dados nunca rodou
     de fato — só foi revisado por leitura).
   - Fluxo E2E de criação→ativação→aditivo→encerramento de contrato contra
     o `CHECK` real `ck_jur_contracts_counterparty_exclusive`/
     `ck_jur_contracts_active_requires_responsible`.
   - Fluxo E2E de dupla confirmação de prazo fatal contra as triggers reais
     (`trg_jur_lock_legal_case_deadline`) e os 4 `CHECK`s da migration
     `000265`.
   - `GET /api/jur/reports/provisions` contra volume real de processos
     (a query usa `DISTINCT ON` em SQL bruto — sintaxe específica do
     PostgreSQL, nunca executada contra o banco real).

### Riscos residuais / pendências

- **Migration de dados nunca aplicada** — maior risco desta passada. Se
  algum ambiente de desenvolvimento tiver dados reais em `legal_contracts`,
  a migração precisa ser testada manualmente antes do primeiro `migration:up`
  em produção.
- **36 endpoints da passada 2** (Procurações, PI, LGPD, Transversal) —
  models já existem, use-cases/controllers/rotas não.
- **Alçada de aprovação (RF-JUR-003)** e **atos societários (RF-JUR-030)**
  seguem sem tabela modelada — bloqueiam, respectivamente, o enforcement
  real de alçada em `ActivateContractUseCase` e a implementação de
  `GET/POST /api/jur/corporate-acts`.
- **Frontend não tocado** — `client/src/api/legal.ts`/`client/src/pages/legal/**`
  vão falhar em runtime contra `/api/legal/*` (rota removida); a
  reconstrução das telas (`ContractsTab`/`IntellectualPropertyTab`
  parcialmente reaproveitáveis, Contencioso/Prazos Fatais/Procurações/LGPD
  do zero) é responsabilidade do passo 5 do pipeline.
- **Numeração de UC colidida** (UC-52/53 já usados por Facilities/Marketing
  em `04-USE_CASES.md`) — resolvida com sufixo `-JUR` nesta passada, mas a
  raiz (os 3 documentos do Bloco 3 usam UC-52..56 puros) não foi corrigida.

## 2026-08-07 — BLOCO 3 Jurídico: implementação backend passada 2/2 (final) — Procurações, PI, LGPD, Transversal — `programador`

### Resumo da feature

Conclui o backend do Bloco 3 (Módulo Jurídico), fechando os 36 endpoints
restantes do contrato (`docs/business/BLOCO_3_JUR_API.md`) sobre os models
`Jur*` já criados na passada 1 (commit anterior desta mesma entrada):
Procurações (Grupo 4, 4 dos 6 endpoints — `corporate-acts` pendente, ver
abaixo), Propriedade Intelectual (Grupo 5, 6/6), LGPD — RoPA/Solicitação de
Titular/Incidente (Grupo 6, 17/17) e Transversal — Alertas/Relatório
Financeiro Sanitizado/Fichas Cruzadas (Grupo 7, 7/7).

**Contagem final por grupo (71 endpoints do contrato):**

| Grupo | Endpoints | UC/RF | Status |
|---|---|---|---|
| 1 — Contratos | 13/13 | UC-52 (JUR) | Completo (passada 1) |
| 2 — Contencioso | 15/15 | UC-53 (JUR) | Completo (passada 1) |
| 3 — Prazos Fatais | 7/7 | UC-54 (JUR) | Completo (passada 1) |
| 4 — Procurações | 4/6 | UC-55 (JUR) | Procurações completas; `corporate-acts` pendente (RF-JUR-030, sem tabela) |
| 5 — Propriedade Intelectual | 6/6 | RF-JUR-031 a 034 | Completo |
| 6 — LGPD | 17/17 | UC-56 (JUR) | Completo (RoPA 5 + Solicitação 7 + Incidente 5) |
| 7 — Transversal | 7/7 | RF-JUR-005/006/020/022/027/032/038/042/045 | Completo |
| **Total implementado** | **69/71** | | 2 endpoints de `corporate-acts` documentados como pendência (sem tabela) |

**Arquivos novos (Clean Architecture, mesmo padrão da passada 1 — sem
diretório `mappers/` separado; tradução de nome de campo API↔coluna é feita
inline nos use cases, mesma decisão registrada na passada 1):**

- `domain/entities/`: `ProxyTypes.ts`, `IpAssetTypes.ts`, `LgpdTypes.ts`.
- `domain/repositories/`: `ProxyRepository.ts`, `IpAssetRepository.ts`,
  `LgpdActivityRepository.ts`, `LgpdRequestRepository.ts`,
  `LgpdIncidentRepository.ts`; `LegalAlertRepository.ts` estendido
  (`findAndCount`/`findById`/`update`); `ContractRepository.ts` estendido
  (`listBySupplier`/`listByClient`/`listByEmployee`); `LegalCaseRepository.ts`
  estendido (`listAllReferences`).
- `infrastructure/sequelize/`: `SequelizeProxyRepository.ts`,
  `SequelizeIpAssetRepository.ts`, `SequelizeLgpdActivityRepository.ts`,
  `SequelizeLgpdRequestRepository.ts`, `SequelizeLgpdIncidentRepository.ts`;
  `SequelizeLegalAlertRepository.ts`/`SequelizeContractRepository.ts`/
  `SequelizeLegalCaseRepository.ts` estendidos com os métodos acima.
- `application/use-cases/proxy/`: `CreateProxyUseCase`, `ListProxiesUseCase`,
  `GetProxyByIdUseCase`, `RevokeProxyUseCase`.
- `application/use-cases/ipAsset/`: `CreateIpAssetUseCase`,
  `UpdateIpAssetUseCase`, `ListIpAssetsUseCase`, `GetIpAssetByIdUseCase`,
  `LinkIpContractUseCase`, `ListIpContractLinksUseCase`.
- `application/use-cases/lgpd/`: `CreateProcessingActivityUseCase`,
  `UpdateProcessingActivityUseCase`, `ListProcessingActivitiesUseCase`,
  `GetProcessingActivityByIdUseCase`, `ReviewProcessingActivityUseCase`,
  `CreateDataSubjectRequestUseCase`, `VerifyIdentityUseCase`,
  `ResolveDataSubjectRequestUseCase`, `RejectDataSubjectRequestUseCase`,
  `ListDataSubjectRequestsUseCase`, `GetDataSubjectRequestByIdUseCase`,
  `PendingCriticalDataSubjectRequestsUseCase`, `CreateIncidentUseCase`,
  `DecideIncidentUseCase`, `CloseIncidentUseCase`, `ListIncidentsUseCase`,
  `GetIncidentByIdUseCase`.
- `application/use-cases/alert/`: `ListAlertsUseCase`, `GetAlertByIdUseCase`,
  `AcknowledgeAlertUseCase`.
- `application/use-cases/report/`: `FinancialReportUseCase`.
- `application/use-cases/contract/CrossReferenceContractsUseCase.ts` (novo,
  fichas cruzadas).
- `presentation/controllers/`: `proxyController.ts`, `ipAssetController.ts`,
  `lgpdController.ts`, `alertController.ts`, `reportController.ts`;
  `contractController.ts` estendido (`bySupplier`/`byClient`/`byEmployee`).
- `presentation/routes/juridico.ts` — todas as rotas novas montadas, com
  `GET /reports/financeiro` deliberadamente ANTES do
  `router.use(authorizeModule('juridico', 'operate'))` (única rota do
  módulo aberta também a `financeiro`).
- Fora do módulo `juridico` (extensão necessária no módulo Financeiro, sem
  Sequelize direto de `AccountPayable` a partir de `juridico`):
  `server/src/modules/financial/domain/repositories/FinancialRepository.ts`
  (+ `listPayablesByLegalCase`), `SequelizeFinancialRepository.ts` (query
  real), `server/src/modules/juridico/application/services/AccountPayableService.ts`
  (+ `listByLegalCase`) e `AccountPayableServiceAdapter.ts` (implementação).
- Teste novo: `server/tests/unit/juridico-proxy-ip-use-cases.test.ts` (25
  testes), `server/tests/unit/juridico-lgpd-alert-use-cases.test.ts` (20
  testes) — 45 testes novos.

### Decisões de reconciliação schema↔contrato desta passada (nenhuma migration nova)

1. **`corporate-acts` (RF-JUR-030) não implementado** — não existe tabela
   `jur_corporate_acts` entre as migrations `20260807-000260` a `-000271`
   aplicadas (16 tabelas `jur_*`, todas mapeadas na passada 1). Os 2
   endpoints (`GET`/`POST /api/jur/corporate-acts`) do Grupo 4 ficam sem
   rota — documentado como pendência explícita (instrução recebida: "não
   implementar, apenas registrar"), consistente com a pendência já citada
   na passada 1.
2. **`jur_intellectual_property.title` (NOT NULL) não existe no contrato de
   API** (`BLOCO_3_JUR_API.md` §6.1 não lista `title` no payload de
   `POST /ip-assets`) — `CreateIpAssetUseCase` deriva `title` de `title`
   explícito (se enviado) ou de `description` truncada a 200 caracteres.
   Documentado em `IpAssetTypes.ts`.
3. **Alertas de renovação/anuidade de PI (RF-JUR-032)** implementados de
   forma simplificada: `trademark` com `expiration_date` → alerta 12 meses
   antes; qualquer tipo com `next_annuity_date` informado → alerta na
   própria data. A janela exata por tipo (`industrial_design` quinquenal,
   `patent` anual a partir de `grant_date`) segue
   `[VERIFICAR COM ASSESSOR JURÍDICO DA EMPRESA]` — mesma pendência já
   sinalizada no contrato de API, não resolvida nesta passada.
4. **LGPD — Encarregado/DPO (RF-JUR-041) sem cadastro formal** — como já
   sinalizado na pendência #2 do próprio `BLOCO_3_JUR_API.md` (handoff do
   contrato), `dpo_user_id` (NOT NULL em `jur_lgpd_data_subject_requests`/
   `jur_lgpd_incidents`) é resolvido, quando não informado explicitamente no
   payload, como o usuário que registra a solicitação/incidente
   (`req.user.id`). Documentado em `CreateDataSubjectRequestUseCase.ts`/
   `CreateIncidentUseCase.ts`.
5. **Decisão de incidente LGPD — dois booleanos/duas justificativas
   (contrato de API) vs. um único `communication_decision`/
   `communication_justification` (schema real)** — `DecideIncidentUseCase`
   combina `notify_anpd`+`notify_data_subjects` no enum
   (`communicate_anpd`/`communicate_subjects`/`communicate_both`/
   `not_communicate`) e concatena as duas justificativas com prefixo por
   destinatário (`"ANPD: ... | Titulares: ..."`), preservando as duas
   evidências textuais em um único campo. Ambas continuam obrigatórias
   mesmo com o booleano `false` (BR-JUR-042), validado antes da combinação.
6. **`cost_center_id` em `GET /reports/financeiro`** — o exemplo de
   contrato (§8.2) mostra `cost_center_id` também no array `provisions`,
   mas `jur_legal_case_provisions` não tem essa coluna (só
   `accounts_payable` tem). `FinancialReportUseCase` retorna
   `cost_center_id: null` para toda linha de `provisions` (limitação de
   schema, documentada no próprio use case) e o valor real
   (`accounts_payable.cost_center_id`) para `costs`.
7. **RBAC de `trade_secret` (§6.3, RF-JUR-033)** implementado por
   `role==='admin'` verificado dentro dos use cases
   (`GetIpAssetByIdUseCase` lança `ForbiddenError`;
   `ListIpAssetsUseCase`/`SequelizeIpAssetRepository.findAndCount` recebem
   `excludeTradeSecret` e filtram/ zeram o resultado mesmo se o usuário
   filtrar explicitamente por `type=trade_secret`), não na camada de rota —
   é o único desvio do padrão `authorizeModule('juridico', nível)` do
   módulo, conforme já antecipado pelo contrato.
8. **`GET /reports/financeiro` com dois níveis de acesso** — montada
   ANTES de `router.use(authorizeModule('juridico', 'operate'))` no router
   agregador, com checagem inline no `reportController`
   (`role==='admin' || permissions.financeiro || permissions.juridico`),
   mesmo padrão de checagem redundante já usado em rotas cross-módulo de
   SST/TI.

### Documentações atualizadas

- `docs/governance/HANDOFF_CODEX.md` — esta seção (passada 2/2, backend
  completo do Bloco 3, exceto `corporate-acts`).
- `docs/governance/TODO.md` — item do Bloco 3 atualizado para "backend
  69/71 (100% do que tem tabela modelada) — resta frontend + `corporate-acts`
  (sem tabela, fora de escopo)".
- JSDoc: todo repositório, use case, controller e rota novos desta passada
  têm cabeçalho JSDoc explicando RF/UC/regra de negócio associada, incluindo
  as 8 reconciliações de schema↔contrato acima (comentadas nos próprios
  arquivos, não só aqui).
- **Não atualizado nesta passada** (fora do escopo de um agente de
  backend, mesma pendência já sinalizada na passada 1):
  `docs/juridico/01-CONTRATOS.md`/`02-PROPRIEDADE_INTELECTUAL.md`,
  `docs/projeto/04-USE_CASES.md` (novas seções UC-55-JUR/UC-56-JUR),
  `docs/database/DATABASE.md` (nenhuma migration nova nesta passada, então
  não há mudança de schema a documentar ali — mantém a nota da passada 1).

### Instruções de teste

1. `cd server && npm run typecheck` — limpo (0 erros).
2. `cd server && npx jest tests/unit --runInBand` — 1069/1070 passando; a
   única falha (`onda3-shipping-cockpit-cashflow.test.ts`) é pré-existente,
   dependente de data corrente, não relacionada a este bloco (mesma falha
   já documentada na passada 1).
3. Testes novos: `juridico-proxy-ip-use-cases.test.ts` (25 testes: criação/
   revogação/expiração automática de procuração, criação/RBAC `trade_secret`
   de PI, vínculo N:N contrato) e `juridico-lgpd-alert-use-cases.test.ts`
   (20 testes: RoPA, verificação de identidade/resolução/rejeição de
   solicitação de titular, decisão/encerramento de incidente LGPD,
   `acknowledge` de alerta nunca desativa).
4. **NÃO validado nesta passada (exige Postgres real, mesma ressalva da
   passada 1):**
   - Fluxo E2E completo de qualquer um dos 4 grupos novos contra o banco
     real (só testes unitários com repositório mockado rodaram).
   - `CHECK`s reais de `jur_lgpd_data_subject_requests`
     (`ck_jur_lgpd_dsr_in_progress_requires_verification`,
     `ck_jur_lgpd_dsr_rejected_requires_justification`) e
     `jur_lgpd_incidents` (`ck_jur_lgpd_incidents_closed_requires_decision`)
     — os use cases replicam a mesma regra em aplicação (dupla camada
     intencional), mas o `CHECK` do banco em si nunca foi exercitado.
   - `GET /api/jur/reports/financeiro` contra volume real de
     `accounts_payable`/`jur_legal_case_provisions` (a query faz `Promise.all`
     de 3 fontes — `listAllCurrentProvisions` em SQL bruto,
     `listAllReferences`, `listPayablesByLegalCase` — nunca combinadas
     contra dados reais).
   - `uq_jur_ip_contract_links_ip_contract` (par único) — `LinkIpContractUseCase`
     captura `SequelizeUniqueConstraintError` e converte para `ConflictError`,
     mas nunca disparado contra o banco real.

### Riscos residuais / pendências

- **`corporate-acts` (RF-JUR-030) sem tabela** — 2 endpoints do Grupo 4 não
  implementados; se o próximo passo do produto decidir modelar
  `jur_corporate_acts`, é uma extensão pequena (mesmo padrão CRUD simples
  de `JurExternalLawyer`).
- **Alçada de aprovação de contrato (RF-JUR-003)** segue sem tabela — igual
  à passada 1, não avançado nesta passada (fora do escopo — pertence ao
  Grupo 1, já entregue).
- **Frontend do Bloco 3 completo ainda não existe** — o backend fecha
  69/71 endpoints; a reconstrução/criação das telas
  (Contratos/Contencioso/Prazos Fatais parcialmente já previstas na
  passada 1, e as 4 telas novas — Procurações, PI, LGPD com 3 sub-abas,
  Alertas) é responsabilidade do próximo passo do pipeline (frontend).
- **Reconciliações #2/#5/#6 acima** (título de PI derivado, decisão LGPD
  combinada em campo único, `cost_center_id` nulo em provisões do relatório
  financeiro) são desvios deliberados do contrato de API literal para caber
  no schema já aplicado — se o schema for revisado no futuro (nova
  migration), os use cases devem ser revisitados junto.
- **DPO/Encarregado (RF-JUR-041) sem cadastro formal** — herdado do próprio
  contrato de API (pendência #2 do handoff de `BLOCO_3_JUR_API.md`), não
  resolvido nesta passada.

---

## PASSO 5 — Frontend do módulo Jurídico (BLOCO 3, 2026-08-07)

**Agente:** `PromadorFonteEnd`.
**Escopo:** reconstrução completa do frontend do módulo Jurídico contra o
contrato real de `/api/jur/*` (69/71 endpoints implementados, ver
`docs/business/BLOCO_3_JUR_API.md`). O módulo enxuto anterior (`/api/legal`,
`client/src/api/legal.ts`, `client/src/pages/legal/*`) estava quebrado em
runtime (rota removida do backend) e foi removido por completo, não
reaproveitado — a divergência de contrato (nomes de campo, enums, rotas) era
grande demais para valer o retrofit.

### Arquivos criados

- `client/src/api/juridico.ts` — cliente HTTP completo cobrindo os 69
  endpoints reais (7 grupos: Contratos, Contencioso, Prazos Fatais,
  Procurações, PI, LGPD, Transversal/Alertas/Relatório). Tipagem verificada
  campo a campo contra `server/src/models/Jur*.ts` e os use-cases reais —
  não contra o exemplo idealizado do documento de contrato, que diverge em
  vários pontos (ex.: resposta usa `contract_number`/`contract_type`,
  `case_number`/`case_type`/`case_role`, não os nomes `number`/`type`/`role`
  do exemplo JSON do contrato — só o payload de entrada de criação segue os
  nomes do documento, porque é isso que os use-cases aceitam).
- `client/src/pages/juridico/juridicoShared.tsx` — formatadores (data,
  data/hora, moeda) e badges/labels de todos os enums do módulo.
- `client/src/pages/juridico/JuridicoPage.tsx` — página `/juridico` com 7
  abas; some com 6 delas se o usuário só tem módulo `financeiro` (sem
  `juridico`), sobrando só "Alertas & Relatório Financeiro".
- `client/src/pages/juridico/ContractsTab.tsx` — UC-52 completo: lista/
  filtros, criação (validação client-side de contraparte polimórfica
  espelhando `counterparty_type`), detalhe com documentos/signatários/
  checklist/ativação/aditivos/encerramento.
- `client/src/pages/juridico/LegalCasesTab.tsx` — UC-53: processos,
  advogados externos (mini-CRUD em diálogo, sem aba dedicada por escopo),
  andamentos, avaliação de risco/provisão, custos (gera Conta a Pagar),
  encerramento.
- `client/src/pages/juridico/DeadlinesTab.tsx` — UC-54, o fluxo mais
  crítico: semáforo de urgência por dias restantes (`daysUntil` em
  `juridicoShared.tsx`), filtro "só críticos" (`GET .../critical`), criação
  exigindo `responsible_user_id`/`escalation_user_id`, `acknowledge`,
  `fulfill` (1ª confirmação com evidência + justificativa retroativa se
  `missed`) e `confirm` (2ª confirmação — a UI avisa em tela se
  `req.user.id === fulfilled_by` antes mesmo de tentar, embora o bloqueio
  real seja sempre da API, BR-JUR-013).
- `client/src/pages/juridico/ProxiesTab.tsx` — UC-55: listagem (default
  exclui revogadas/vencidas, replicando o comportamento do backend),
  cadastro, revogação com `communication_record` obrigatório.
- `client/src/pages/juridico/IpAssetsTab.tsx` — RF-JUR-031 a 034: CRUD por
  tipo, formulário de `trade_secret` sem campo de anexo, vínculo N:N com
  contrato.
- `client/src/pages/juridico/LgpdTab.tsx` — UC-56 com 3 sub-abas internas
  (RoPA, Solicitações de Titular com contador de SLA + filtro "só críticas",
  Incidentes com decisão de comunicação de justificativa dupla obrigatória e
  encerramento bloqueado sem decisão).
- `client/src/pages/juridico/AlertsReportsTab.tsx` — lista de alertas
  pendentes com `acknowledge` (nunca desativação — não existe esse caminho
  em nenhuma rota do módulo, RNF-JUR-04) + relatório financeiro sanitizado
  (`GET /api/jur/reports/financeiro`), a única seção visível a
  `financeiro`-only.
- `client/src/pages/home/widgets/JuridicoPendenciasWidget.tsx` — prazos
  fatais críticos + alertas pendentes, registrado em `widgetRegistry.tsx`
  com `module: 'juridico'`.

### Arquivos removidos

- `client/src/api/legal.ts`
- `client/src/pages/legal/ContractsTab.tsx`
- `client/src/pages/legal/IntellectualPropertyTab.tsx`
- `client/src/pages/legal/LegalPage.tsx`

### Arquivos modificados

- `client/src/App.tsx` — troca `LegalPage` por `JuridicoPage`, rota
  `/juridico` liberada por `AnyModuleRoute(['juridico', 'financeiro'])` (não
  mais `ModuleRoute` simples, porque `financeiro` precisa entrar sem ter o
  módulo `juridico`); `/legal` agora é um redirecionamento para `/juridico`.
- `client/src/layouts/AppLayout.tsx` — item de menu atualizado
  (label/rota), breadcrumb `/juridico`.
- `client/src/pages/home/widgetRegistry.tsx` — nova entrada
  `juridico-pendencias` (`priority: 48`, entre SST e TI).

### Instruções de teste

1. `cd client && npx tsc --noEmit -p tsconfig.app.json` — 13 erros, todos
   pré-existentes e alheios a este bloco (facilities/marketing/treasury/
   accounting, confirmado por `git stash`/typecheck comparativo: baseline
   tinha 17 erros, incluindo 4 do módulo `legal` antigo agora removido — o
   Jurídico novo não introduz nenhum erro).
2. `cd client && npx vite build` — build de produção OK (`JuridicoPage`
   compila em chunk próprio, 85.45 kB / 14.61 kB gzip). `npm run build`
   completo (`tsc -b && vite build`) falha no gate `tsc -b` por causa dos
   mesmos 13 erros pré-existentes de outros módulos — não é regressão desta
   passada, mas registra-se aqui porque impede rodar o build "oficial" via
   `npm run build` até esses módulos serem corrigidos.
3. `cd client && npx vitest run` — 51/51 testes passando (nenhum teste
   dedicado ao Jurídico ainda — cobertura é só de fumaça via typecheck/
   build; QA/humano deve validar os fluxos manualmente contra a API real).

### O que o QA/Agente QA deve testar na interface

1. Contratos: criar um contrato `supplier` com `supplier_id` válido, anexar
   documento não assinado, tentar ativar (deve bloquear por falta de 2
   signatários/documento assinado/responsável), completar o fluxo até
   `active`, criar aditivo de prazo e confirmar que a vigência exibida no
   detalhe atualiza, encerrar por rescisão (motivo obrigatório).
2. Prazos Fatais — o fluxo mais crítico: criar um prazo sem
   `responsible_user_id` (o form já bloqueia o submit; validar a mensagem de
   erro se forçado via API), cumprir com evidência como usuário A, tentar
   confirmar como o mesmo usuário A (deve mostrar o aviso em tela e a API
   deve rejeitar com 422 `SAME_USER_DOUBLE_CONFIRMATION`), confirmar como
   usuário B (deve funcionar).
3. LGPD — Solicitação de Titular: criar solicitação, verificar que só
   aparece o botão de verificação de identidade antes do de resolução,
   verificar identidade, resolver.
4. LGPD — Incidente: criar incidente, confirmar que o botão de encerrar só
   aparece após a decisão ser registrada, registrar decisão com ambas as
   justificativas obrigatórias mesmo com os dois checkboxes desmarcados
   ("não comunicar"), encerrar.
5. RBAC: logar com usuário `financeiro`-only (sem `juridico`) e confirmar
   que só a aba "Alertas & Relatório Financeiro" aparece, sem o bloco de
   alertas (que exige `juridico`) — só o relatório financeiro sanitizado.
   Logar com usuário sem nenhum dos dois módulos e confirmar
   `AccessDeniedPage` em `/juridico`.
6. Propriedade Intelectual — `trade_secret`: com usuário não admin,
   confirmar que ativos `trade_secret` não aparecem na listagem mesmo tendo
   `juridico:approve`; com `role=admin`, confirmar que aparecem.

### Pendências explícitas (fora de escopo desta passada)

- `corporate-acts` (RF-JUR-030) — sem tela, porque o backend também não
  implementou (sem tabela modelada).
- Tabela de alçada de aprovação de contrato por valor/tipo (RF-JUR-003) —
  pendência de backend; hoje qualquer `juridico:operate` pode ativar
  qualquer contrato independentemente do valor.
- Upload real de arquivo (minuta, aditivo, evidência de cumprimento de
  prazo) — todos os formulários aceitam apenas URL/caminho de texto, sem
  integração de upload (Multer) nesta passada.
- Polimento visual (Tailwind fino, responsividade, hierarquia) — não feito
  nesta passada por desenho (funcional primeiro); próximo passo é o agente
  `webdesiner`.

---

## 2026-08-07 — BLOCO 4 FAC (correção): implementação backend completa dos 60 endpoints — `programador`

**Escopo:** implementação da correção do módulo Facilities aprovada em
`docs/business/BLOCO_4_FAC_REQUISITOS.md` (60 RF, UC-58 a UC-62),
`BLOCO_4_FAC_MODELO_DADOS.md` (11 migrations `20260807-000290..300`,
**NÃO aplicadas** — instrução explícita desta rodada), `BLOCO_4_FAC_API.md`
(60 endpoints) e `BLOCO_4_FAC_AUDITORIA.md` (veredito APROVADO COM
RESSALVAS). Substitui integralmente o módulo Facilities original (commit
`2ad27fd`, 14/17 regras do brief não atendidas).

### 1. Migration endurecida (ressalva da auditoria)

`server/migrations/20260807-000290-migrate-facility-vehicles-to-asset-extension.cjs`:
o backfill `facility_vehicles → assets + facility_vehicle_details` agora
roda inteiro dentro de `queryInterface.sequelize.transaction()` (rollback
atômico em qualquer falha) e verifica idempotência por `plate` (SELECT em
`facility_vehicle_details` antes de cada `INSERT`), defesa em profundidade
para reexecuções parciais. `node -c` válido. **Migration continua não
aplicada** — RNF-FAC-03 exige teste contra cópia de banco com dado real
antes de aplicar em qualquer ambiente com `facility_vehicles` populada.

### 2. `MaintenanceOrder.ts` corrigido (achado da auditoria)

`asset_id` passou de `allowNull: false` para `allowNull: true`
(alinhamento com o `DROP NOT NULL` já feito pela migration `000296` —
antes disso o model bloquearia silenciosamente qualquer chamado predial
sem ativo). 3 colunas novas: `next_maintenance_km` (INTEGER),
`facility_specialty` (ENUM 7 valores), `facility_area_id` (INTEGER).

### 3. Models novos/atualizados (`server/src/models/`)

**Novos:** `FacilityVehicleDetail` (substitui `FacilityVehicle`, removido —
extensão 1:1 de `Asset`, `asset_type='vehicle'`), `FacilityVehicleDocument`,
`FacilityDriver`, `FacilityVehicleTrip`, `FacilityFine`,
`FacilityCleaningExecution`, `FacilityVisitor`, `FacilityVisit`,
`FacilityCorrespondence`, `FacilityResourceReservation`.
**Atualizados:** `FacilityFuelRecord` (`vehicle_id`→`asset_id`,
+`full_tank`/`invoice_ref`/`trip_id`), `FacilityCleaningSchedule`
(+`facility_area_id`/`responsible_employee_id`/`active`).
**`models/index.ts`:** imports + ~25 associações novas (Asset↔Vehicle*,
Driver↔Trip, Trip↔FuelRecord, Fine↔AccountPayable, FacilityArea↔
MaintenanceOrder/CleaningSchedule/Reservation, Visitor↔Visit,
Correspondence↔Employee/Department, Reservation↔Area/Asset/Employee).

### 4. Middleware novo

`server/src/middlewares/authorizeAnyModule.ts` — composição OR de módulos
(`authorizeModule` só aceitava um `moduleKey` por chamada, achado 9 da
auditoria). Usado em `GET /api/facilities/maintenance-tickets*` com
`authorizeAnyModule([{moduleKey:'manutencao'}, {moduleKey:'facilities'}])`.

### 5. RBAC — nível `approve` (RF-FAC-057)

`server/src/shared/domain/accessModules.ts` — comentário estrutural
atualizado (removida a afirmação de que nenhuma rota usava `approve`).
`approve` protege: liberação de saída com documento vencido (`.../release`),
suspensão de condutor (`.../suspend`), indicação de condutor em multa
(`.../indicate`), pagamento de multa (`.../pay`), criação/atualização de
plano de limpeza (`POST/PUT /cleaning-schedules`, BREAKING — era `operate`).
Divergência de odômetro (`departure_km` retroativo) é checada dentro de
`.../depart` via `hasApproveLevel` derivado de `req.user.permissions.facilities`.

### 6. Módulo `facilities/` reescrito — 60/60 endpoints

**Services/adapters novos** (`application/services/` + `infrastructure/adapters/`,
nunca Sequelize direto de outro módulo): `AssetService`/`AssetServiceAdapter`
(cria/lê/atualiza `Asset`), `MaintenanceOrderService`/`...Adapter` (delega a
`SequelizeMaintenanceRepository` do módulo `maintenance` real),
`AccountPayableService`/`...Adapter` (delega a `SequelizeFinancialRepository`,
categoria "Frota"), `InventoryService`/`...Adapter` (delega a
`CreateInventoryMovementUseCase` do módulo `inventory`, tipo `'out'`).

**Repositórios novos/reescritos** (`domain/repositories/` +
`infrastructure/sequelize/`): `VehicleRepository` (reescrito, Asset+extensão),
`VehicleDocumentRepository`, `DriverRepository`, `TripRepository`,
`FuelRecordRepository` (reescrito), `FineRepository`, `VisitorRepository`,
`VisitRepository`, `CorrespondenceRepository`, `CleaningExecutionRepository`,
`ReservationRepository`; `CleaningScheduleRepository`/`AreaRepository`
mantidos sem mudança de contrato interno.

**Use cases** (`application/use-cases/`, um arquivo por entidade agrupando
as ações relacionadas — desvio consciente do padrão estrito de 1
classe/arquivo dos módulos anteriores, para conter o volume de 60
endpoints dentro do orçamento desta entrega):
- `vehicle/`: Create (transacional Asset+Detail via `sequelize.transaction`),
  List, Get, Update (rejeita `current_km` fora dos 2 caminhos legítimos).
- `vehicleDocument/VehicleDocumentUseCases.ts`: List, Create, Renew, Release.
- `driver/DriverUseCases.ts`: List, Get, Create, Update, Authorize, Suspend.
- `trip/TripUseCases.ts`: List, Get, Create, **Depart** (valida E1-E4/A1 do
  UC-58 numa sequência única: CRLV vencido, seguro vencido sem liberação,
  condutor não autorizado/CNH vencida, uso já aberto no veículo/condutor,
  divergência de odômetro com approve), **Return** (transacional,
  `return_km < departure_km` rejeitado, atualiza `current_km`), Cancel.
- `fuelRecord/`: Create (reescrito — valida km/tanque, atualiza `current_km`,
  calcula `consumption_alert` ±30%), Update (reescrito — bloqueia alteração
  de `km_at_refuel`/`liters`/`asset_id`), List (reescrito — `asset_id`).
- `fine/FineUseCases.ts`: List/Get (com sincronização automática
  `pending→expired_nic` ao acessar), Create (calcula `indication_deadline`,
  sugere condutor inline), SuggestDriver, Indicate (bloqueia se já
  `expired_nic`), Appeal, Pay (gera título via `AccountPayableService`),
  ChargeDriver.
- `maintenanceTicket/MaintenanceTicketUseCases.ts`: List, Get, Create
  (auto-serviço), Triage, Execute (bloqueia se `personal_safety_risk` sem
  notificação SST — implementado como marcador em `notes`, simplificação
  registrada como pendência, ver §8), Close (exige execução registrada),
  GeneratePreventive.
- `visitor/VisitorUseCases.ts`: List (mascara `document`/`phone` — LGPD),
  Create (reaproveita por `document`).
- `visit/VisitUseCases.ts`: List, Get, Create (check-in), Checkout,
  OnsiteOverdue (dashboard, horário-limite parametrizável via env).
- `correspondence/CorrespondenceUseCases.ts`: List, Create, Deliver.
- `cleaningExecution/CleaningExecutionUseCases.ts`: List, Create (consome
  insumo via `InventoryService`), Adherence (KPI execuções÷previstas).
- `reservation/ReservationUseCases.ts`: List, Get, Create (valida
  sobreposição amigável antes do `EXCLUDE` do banco), Cancel.
- `area/`, `cleaningSchedule/` (CRUD, validators atualizados com
  `facility_area_id`/`responsible_employee_id`/`active` e query de
  `adherence`): mantidos.

**Controllers/validators/routes:** 13 controllers (`vehicleController`
reescrito com sub-rotas de documento, `fuelRecordController` reescrito,
`driverController`/`tripController`/`fineController`/
`maintenanceTicketController`/`visitorController`/`visitController`/
`correspondenceController`/`cleaningExecutionController`/
`reservationController` novos, `cleaningScheduleController` estendido com
`adherence`, `areaController` mantido). Validators Zod `strict()` por
grupo (mesmo padrão pré-existente). `presentation/routes/facilities.ts`
reescrito — 60 rotas com RBAC por endpoint conforme contrato §0.2.

### 7. Endpoints implementados: 60/60

Grupo 1 Frota+Documento (8), Grupo 2 Condutor (6), Grupo 3 Trips+Fuel (10),
Grupo 4 Multa (8), Grupo 5 Manutenção Predial (7), Grupo 6 Insumos (0 —
reuso de `/api/inventory`/`/api/purchase-requisitions`), Grupo 7
Visitantes/Correspondência (10), Grupo 8 Limpeza (7), Grupo 9 Reserva (4)
= 60, mais Áreas (4, mantido, fora da contagem de 60 do contrato).

### 8. Simplificações/riscos residuais registrados

- **Notificação SST em chamado predial de risco pessoal:** implementada
  como marcador de texto em `MaintenanceOrder.notes`
  (`'[SST notificado]'`), não uma integração real com o módulo SST — não
  havia adapter de SST especificado no contrato; se o negócio confirmar
  que precisa ser uma integração de fato, é trabalho futuro.
- **Identidade `reserved_by`/`executed_by`:** o contrato de API pede
  explicitamente `req.user.id` (JWT) para esses campos, mas as colunas são
  FK para `employees.id` — mesma ambiguidade usuário×funcionário já
  presente em outras partes do sistema, herdada do contrato, não resolvida
  aqui.
- **`PurchaseRequisitionService` (D-3):** interface de serviço não
  implementada nesta passada — o contrato explicita que não há endpoint
  próprio de Facilities para reposição de insumo (usa
  `/api/purchase-requisitions` diretamente, fora do escopo deste módulo).

### 9. Documentações atualizadas

- `docs/database/DATABASE.md` — nova seção "BLOCO 4 FAC (correção) —
  Módulo Facilities reescrito".
- `docs/projeto/04-USE_CASES.md` — UC-52 (Facilities) marcado como
  substituído, nova seção UC-58 a UC-62.
- `docs/governance/TODO.md` — 4 pendências da auditoria marcadas `[x]`
  com evidência, nova entrada de implementação.
- Este arquivo (`HANDOFF_CODEX.md`).
- **Não tocado nesta passada** (fora de escopo): `docs/administrativo/03-FACILITIES.md`
  (ainda descreve o desenho antigo) — próxima rodada de documentação
  funcional deve atualizá-lo para refletir UC-58 a UC-62.

### 10. Validações executadas

- `npm run typecheck` (a partir de `server/`): **limpo, 0 erros**.
- `node -c` em todas as 11 migrations do bloco (`20260807-000290` a
  `20260807-000300`): **válido**.
- `npx jest tests/unit/facilities-*`: **8 suítes, 50 testes, 100%
  passando** (2 reescritas — vehicle 9, fuel-record 8 — e 4 novas — trip
  13, driver 6, fine 6, visitor 3 —, mais cleaning-schedule 3 e area 2
  mantidas sem mudança).
- `npx jest tests/unit` (suíte completa): **1105/1106 passando** — única
  falha é a pré-existente e conhecida `onda3-shipping-cockpit-cashflow.test.ts`
  (não relacionada a este bloco, já documentada como falha pré-existente).
- Migrations **NÃO aplicadas** (instrução explícita) — nenhum teste de
  integração real (Postgres) foi executado neste passo.

### 11. Instruções de teste para o próximo agente/humano

1. **Aplicar as migrations** `20260807-000290` a `20260807-000300` em um
   ambiente de teste com Postgres real (idealmente uma cópia do banco com
   `facility_vehicles` populada, para validar o backfill — RNF-FAC-03).
2. Testar o fluxo completo de frota: criar veículo (`POST /vehicles`,
   confirmar criação de `Asset`+`FacilityVehicleDetail` na mesma
   transação), cadastrar documento com vencimento, cadastrar condutor,
   autorizar condutor, criar diário de uso, `.../depart` (testar os 6
   cenários de bloqueio E1-E4/A1), `.../return`, abastecer (`POST
   /fuel-records`, conferir `current_km` atualizado e `consumption_alert`).
3. Testar multa: criar multa com `notice_received_at`, conferir
   `indication_deadline` calculado, indicar condutor, tentar indicar após
   o prazo (deve virar `expired_nic` automaticamente e rejeitar), pagar
   multa (conferir título criado em `/api/finance/accounts-payable`).
4. Testar chamado predial: abrir com usuário sem nenhum módulo RBAC
   (auto-serviço deve funcionar), triagem, execução com
   `personal_safety_risk=true` sem notificação prévia (deve rejeitar 422),
   fechar.
5. Testar reserva de recursos: criar duas reservas sobrepostas do mesmo
   recurso (deve rejeitar 409 antes de chegar no banco) — depois, com a
   migration aplicada, testar a constraint `EXCLUDE USING gist` real
   (tentar inserir direto via SQL ignorando a validação de aplicação).
6. Confirmar telas `client/src/pages/facilities/` quebradas pelos breaking
   changes (esperado — fora de escopo desta entrega) e agendar correção de
   frontend com `PromadorFonteEnd`.

---

## PASSO 5 — Frontend do módulo Facilities (BLOCO 4 correção, 2026-08-07) — `PromadorFonteEnd`

### Resumo da feature

Correção de frontend contra o backend reescrito do passo anterior (60
endpoints `/api/facilities/*`, D-2: veículo como extensão de `Asset`).
`client/src/api/facilities.ts` foi reescrito do zero cobrindo os 60
endpoints; as telas antigas (`FleetTab.tsx`, `FuelRecordsTab.tsx`,
`CleaningSchedulesTab.tsx`) foram reescritas/substituídas; `AreasTab.tsx`
foi mantida sem alteração (endpoint sem mudança de contrato).

**Divergência de implementação real identificada e documentada no
client** (não é bug do frontend — é o comportamento real do backend, que
diverge do exemplo de resposta do contrato `BLOCO_4_FAC_API.md` §2.3):
`GET /vehicles`/`GET /vehicles/:assetId` retornam a linha crua de
`facility_vehicle_details` (com `id` = PK própria da tabela de extensão,
diferente de `asset_id`) em vez do formato `{id: asset_id, asset,
vehicle_detail}` que o contrato prometia — confirmado lendo
`SequelizeVehicleRepository.ts`/`GetVehicleByIdUseCase.ts`. O client usa
sempre `vehicle.asset_id` (nunca `vehicle.id`) para navegar/rotear/montar
querystring, documentado em comentário no topo de `api/facilities.ts` e no
tipo `Vehicle`.

### Arquivos criados

- `client/src/api/facilities.ts` (reescrito integralmente — 60 endpoints,
  tipos verificados contra os models reais em `server/src/models/Facility*.ts`
  e os validators Zod em `server/src/modules/facilities/presentation/validators/`).
- `client/src/pages/facilities/facilitiesShared.tsx` — helpers de
  formatação de data/moeda e badges de status (padrão `juridicoShared.tsx`/
  `tiShared.tsx`).
- `client/src/pages/facilities/VehiclesPanel.tsx` — veículos (lista +
  criação + detalhe com documentos com vencimento, renovação, liberação de
  saída com seguro vencido nível `approve`).
- `client/src/pages/facilities/DriversPanel.tsx` — condutores (CNH,
  autorização, suspensão nível `approve`).
- `client/src/pages/facilities/TripsPanel.tsx` — diário de uso (agendar,
  sair com aviso de divergência de odômetro, retornar, cancelar).
- `client/src/pages/facilities/FuelRecordsPanel.tsx` — abastecimento
  (`asset_id`, tanque cheio, alerta de anomalia de consumo).
- `client/src/pages/facilities/FinesPanel.tsx` — multas (semáforo de
  prazo de indicação, sugestão automática de condutor, indicação nível
  `approve`, recurso, pagamento nível `approve` com geração de título em
  AP, repasse ao condutor).
- `client/src/pages/facilities/FleetTab.tsx` (reescrita) — compõe os 5
  painéis acima em sub-abas.
- `client/src/pages/facilities/MaintenanceTicketsTab.tsx` — fila de
  gestão de chamado predial (triagem/execução/encerramento/geração de
  preventiva) sobre `maintenance_orders`.
- `client/src/pages/facilities/VisitorsTab.tsx` — check-in/check-out de
  visitante, alerta de permanência além do horário-limite.
- `client/src/pages/facilities/CleaningTab.tsx` (substitui
  `CleaningSchedulesTab.tsx`) — plano (nível `approve`) × execução (nível
  `operate`) + KPI de aderência.
- `client/src/pages/facilities/ReservationsTab.tsx` — reserva de
  sala/equipamento, tratamento de conflito 409.
- `client/src/pages/facilities/CorrespondenceTab.tsx` — registro de
  recebimento/entrega.
- `client/src/pages/facilities/FacilityTicketPage.tsx` — auto-serviço de
  abertura de chamado predial (`/chamado-predial`, RF-FAC-040).
- `client/src/pages/home/widgets/FacilitiesPendenciasWidget.tsx` — widget
  de vencimentos (documento de veículo, CNH, prazo de multa) para a Home
  por Perfil.

### Arquivos removidos

- `client/src/pages/facilities/FuelRecordsTab.tsx` (substituído por
  `FuelRecordsPanel.tsx`, agora sub-aba dentro de `FleetTab.tsx`).
- `client/src/pages/facilities/CleaningSchedulesTab.tsx` (substituído por
  `CleaningTab.tsx`, que cobre plano × execução).

### Arquivos modificados

- `client/src/pages/facilities/FacilitiesPage.tsx` — reescrita completa:
  7 abas (Frota, Manutenção Predial, Visitantes, Limpeza, Reservas, Áreas,
  Correspondência), substitui as 4 abas antigas.
- `client/src/pages/facilities/AreasTab.tsx` — sem alteração de lógica
  (endpoint `/api/facilities/areas` não mudou de contrato neste bloco).
- `client/src/App.tsx` — nova rota `/chamado-predial` (`FacilityTicketPage`,
  fora de `ModuleRoute`, mesmo precedente de `/meus-chamados`).
- `client/src/layouts/AppLayout.tsx` — item de menu "Chamado Predial" na
  seção inicial (sem `module`, ao lado de "Meus Chamados") + entrada em
  `BREADCRUMBS`.
- `client/src/pages/home/widgetRegistry.tsx` — registro do widget
  `facilities-pendencias` (módulo `facilities`, prioridade 49).

### Decisão do auto-serviço de chamado predial

Seguido o precedente de `/meus-chamados` (Bloco 2, TI): nova rota
`/chamado-predial` fora de `ModuleRoute`, acessível a qualquer usuário
autenticado, com item de menu próprio na seção inicial. **Diferença
deliberada em relação a `/meus-chamados`**: a tela não lista "meus
chamados prediais" (só abertura + confirmação com o número do chamado),
porque `GET /api/facilities/maintenance-tickets` exige
`authorizeAnyModule(['manutencao', 'facilities'])` — o contrato de API não
abre uma exceção de leitura por solicitante (diferente do TI, que tem
`GET /api/ti/tickets/my` dedicado ao auto-serviço). Registrado como
comentário no topo de `FacilityTicketPage.tsx` e como pendência explícita
no cronograma frontend (`docs/governance/CRONOGRAMA_FRONTEND_2026-07-31.md`,
seção "11d. Addendum — Módulo Facilities").

### Validações executadas

- `npx tsc --noEmit` (a partir de `client/`): **limpo, 0 erros**.
- `npx vite build`: **sucesso** (aviso de chunk >500kB no bundle principal
  `index-*.js`, pré-existente, não relacionado a este bloco).
- `npx vitest run`: **8 arquivos de teste, 51 testes, 100% passando**
  (nenhum teste dedicado a Facilities existia antes nem foi criado nesta
  passada — cobertura de teste automatizado do módulo é uma pendência,
  ver abaixo).
- **Nenhum teste de integração real (Postgres) foi executado** — as
  migrations do bloco anterior não foram aplicadas neste passo (ver
  instrução 1 da seção anterior, ainda pendente).

### O que o QA/Agente QA deve testar na interface

1. **Frota → Veículos:** criar veículo, abrir detalhe, cadastrar
   documento CRLV/seguro/IPVA com vencimento, renovar documento, tentar
   liberar saída com seguro vencido sem nível `approve` (botão deve estar
   ausente) e com nível `approve` (deve pedir motivo obrigatório).
2. **Frota → Condutores:** cadastrar condutor, autorizar, tentar suspender
   sem nível `approve` (botão ausente) e com `approve` (deve pedir
   motivo).
3. **Frota → Diário de Uso:** agendar uso, registrar saída (testar
   mensagem de erro didática quando CRLV/seguro vencido ou condutor não
   autorizado — `translateApiError` deve traduzir o `BUSINESS_RULE_VIOLATION`/
   `FORBIDDEN` do backend), registrar retorno, cancelar.
4. **Frota → Abastecimento:** registrar abastecimento com tanque cheio,
   conferir que km/litros não são editáveis após criado (`UpdateFuelRecordInput`
   não expõe esses campos na tela).
5. **Frota → Multas:** criar multa, conferir cálculo automático do prazo
   de indicação e o semáforo de cor (`DeadlineBadge`), confirmar indicação
   (nível `approve`), registrar pagamento (nível `approve`, conferir
   integração com Contas a Pagar).
6. **Manutenção Predial:** abrir chamado por `/chamado-predial` com um
   usuário sem módulo `facilities`/`manutencao` (deve funcionar), depois
   triar/executar/encerrar com um usuário com o módulo.
7. **Visitantes:** check-in, conferir que a listagem chega com documento
   mascarado (`***.***.789-00`), check-out, alerta de permanência além do
   horário-limite (`onsite-overdue`).
8. **Limpeza:** criar plano só com nível `approve` (botão ausente para
   `operate`), registrar execução com `operate`, consultar aderência.
9. **Reservas:** criar duas reservas sobrepostas do mesmo recurso — deve
   mostrar erro didático de conflito (409).
10. **Home:** conferir que o widget "Vencimentos de Facilities" aparece
    só para quem tem o módulo `facilities` e que o total bate com a soma
    dos 3 sub-contadores.

### Pendências explícitas (fora de escopo desta passada)

- Listagem "meus chamados prediais" em `/chamado-predial` (ver decisão
  acima — bloqueada por desenho do contrato de API, não por falta de
  tempo).
- Upload real de arquivo (documento de veículo, CNH, foto de visitante) —
  formulários aceitam apenas URL/caminho (`file_path`/`photo_path`),
  mesma limitação já registrada nos Blocos 2/3.
- Cobertura de teste automatizado (Vitest) dedicada ao módulo Facilities
  — nenhuma foi criada nesta passada (mesmo padrão dos módulos SST/TI/JUR
  recém-entregues, que também não têm testes de componente dedicados).
- Teste de integração real (Postgres) do fluxo completo — depende da
  aplicação das migrations `20260807-000290` a `20260807-000300`,
  instrução 1 da seção "PASSO backend" acima, ainda pendente.

## 2026-08-07 — Correção dos 2 achados P1 da auditoria CONT/TES/CTR — `programador`

### Resumo da feature

Correção pontual dos 2 achados P1 de
`docs/governance/auditorias/AUDITORIA_CONT_TES_CTR_2026-08-07.md` (0
achados P0). Nenhuma migration nova foi necessária.

**P1-2 (Contabilidade) — conta desativada aceitava lançamento:**
`CreateEntryUseCase`/`UpdateEntryUseCase` validavam apenas
`account.accept_entries` (sintética vs. folha), nunca `account.active`.
Adicionada checagem `if (!account.active) throw new BusinessRuleError(...)`
logo após a checagem existente de `accept_entries`, mesmo padrão de
mensagem (`"A conta \"{code} - {name}\" está desativada e não aceita novo
lançamento."`). Agora `PUT /api/accounting/accounts/:id` com
`active: false` de fato impede novo lançamento na conta, como já era
documentado na migration `20260807-000230` mas não era imposto pelo código.

**P1-1 (Controladoria) — "realizado" usava `due_date` (vencimento) em vez
de data de pagamento efetiva:** a investigação encontrou que a premissa da
auditoria estava desatualizada — `accounts_payable`/`accounts_receivable`
**já possuem** a coluna `payment_date` (`DATEONLY`, nullable), populada em
todo evento real de baixa (`PayPayableUseCase`, `ReceivePaymentUseCase`,
`MatchEntryUseCase` da conciliação bancária OFX, `ProcessReturnFileUseCase`
do retorno CNAB de boleto). Não foi necessário adicionar migration. A
correção foi trocar o filtro SQL de `realized_amount` em
`SequelizeCostCenterRepository.getCostCenterTotalsByPayable`/
`getCostCenterTotalsByReceivable`, de `due_date BETWEEN :from AND :to` para
`COALESCE(payment_date, due_date) BETWEEN :from AND :to` (fallback só para
registro legado sem `payment_date` preenchido), com o `WHERE` da query
ampliado para `due_date BETWEEN :from AND :to OR COALESCE(payment_date,
due_date) BETWEEN :from AND :to` — sem essa ampliação, uma conta com
vencimento fora do período mas paga dentro dele desapareceria da consulta
inteiramente (o `GROUP BY` nem geraria a linha). `open_amount` (saldo em
aberto) permanece filtrado por `due_date`, comportamento correto e
inalterado — é o "realizado" que estava semanticamente errado. Como o
repositório é compartilhado, a correção resolve ao mesmo tempo o relatório
orçado×realizado da Controladoria (`GetBudgetVsActualReportUseCase`) e o
relatório de Centro de Custo do módulo Financeiro
(`GetCostCenterReportUseCase`), sem duplicar lógica.

**Limitação estrutural conhecida e não resolvida por este P1 (documentada,
não corrigida):** `amount_paid` é um acumulador único por conta, sem
histórico por baixa parcial — uma conta com múltiplas baixas parciais em
meses diferentes tem seu `realized_amount` inteiro atribuído ao mês do
**último** `payment_date`, não distribuído entre os meses de cada baixa.
Isso é uma melhoria real sobre o comportamento anterior (100% correto para
o caso comum de pagamento único por título) mas não é uma reconstrução
exata de baixas parciais fracionadas — exigiria uma tabela de histórico de
pagamentos (`account_payable_payments`), fora do escopo deste P1 pontual;
registrado como risco residual em `docs/governance/TODO.md`.

### Documentações atualizadas

- `docs/governance/TODO.md` — nova entrada "2026-08-07 (rodada seguinte) —
  Correção dos 2 achados P1 da auditoria CONT/TES/CTR", ambos os P1
  marcados `[x]` com evidência de teste/arquivo.
- JSDoc revisado/atualizado em:
  - `server/src/modules/accounting/application/use-cases/entry/CreateEntryUseCase.ts`
  - `server/src/modules/accounting/application/use-cases/entry/UpdateEntryUseCase.ts`
  - `server/src/modules/financial/infrastructure/sequelize/SequelizeCostCenterRepository.ts`
  - `server/src/modules/financial/domain/repositories/CostCenterRepository.ts`
  - `server/src/modules/budget/application/use-cases/report/GetBudgetVsActualReportUseCase.ts`
  - `server/src/modules/financial/application/use-cases/GetCostCenterReportUseCase.ts`
- `docs/database/DATABASE.md` **não alterado** — nenhuma migration nova
  (coluna `payment_date` já existia e já estava documentada no schema).
- `docs/projeto/04-USE_CASES.md` **não alterado** — não houve mudança de
  regra de negócio nova, apenas correção de um filtro que já deveria
  aplicar a regra existente ("realizado" = efetivamente pago).

### Arquivos de código alterados

- `server/src/modules/accounting/application/use-cases/entry/CreateEntryUseCase.ts`
- `server/src/modules/accounting/application/use-cases/entry/UpdateEntryUseCase.ts`
- `server/src/modules/financial/infrastructure/sequelize/SequelizeCostCenterRepository.ts`
- `server/src/modules/financial/domain/repositories/CostCenterRepository.ts`
- `server/src/modules/budget/application/use-cases/report/GetBudgetVsActualReportUseCase.ts`
- `server/src/modules/financial/application/use-cases/GetCostCenterReportUseCase.ts`
- Testes novos/ajustados: `server/tests/unit/accounting-use-cases.test.ts`
  (mocks de conta ganharam `active: true` nos casos de sucesso; 2 casos
  novos de rejeição por `active: false`), `server/tests/unit/
  cost-center-realized-payment-date.test.ts` (novo arquivo, valida a SQL
  gerada pelo repositório via mock de `sequelize.query`).

### Instruções de teste para o próximo agente/humano

1. `npm run typecheck --prefix server` → deve continuar limpo (confirmado
   nesta entrega).
2. `npx jest tests/unit --runInBand --prefix server` (ou de dentro de
   `server/`) → esperado 1110/1111 passando, única falha pré-existente e
   não relacionada: `tests/unit/onda3-shipping-cockpit-cashflow.test.ts`.
3. Teste funcional manual (Plano de Contas): desativar uma conta folha via
   `PUT /api/accounting/accounts/:id` com `{"active": false}`, depois
   tentar `POST /api/accounting/entries` referenciando essa conta —
   esperado `422 BusinessRuleError` com a mensagem "está desativada e não
   aceita novo lançamento".
4. Teste funcional manual (Controladoria): criar uma conta a pagar com
   `due_date` em um mês e pagá-la (`POST /api/finance/payables/:id/pay`)
   em outro mês; consultar `GET /api/budget/report?year=&month=` para
   ambos os meses e conferir que o `realized_amount` aparece no mês do
   pagamento, não no mês de vencimento.
5. **Pendente (não coberto nesta correção, registrado em
   `docs/governance/TODO.md`):** teste de integração real (Postgres) do
   cenário acima, hoje coberto apenas por teste unitário com mock de
   repositório.

### Riscos residuais

- Limitação estrutural de `amount_paid` como acumulador único sem
  histórico por baixa parcial (ver seção "Resumo da feature" acima) — não
  bloqueante, documentado.
- Nenhum teste de integração real (Postgres) foi executado nesta correção
  (ambiente sem banco disponível nesta sessão); validação em banco real
  fica pendente para o próximo ciclo de QA/DBA.

---

## 2026-08-07 — BLOCO 6 RH: Requisitos formais prontos para modelagem — `AnalistaNegocios`

**PASSO 1 do pipeline do Bloco 6 (RH, lacunas, departamento 02) concluído.**
Este é o **sexto e último bloco** da iniciativa de módulos novos
(Bloco 0 LGPD → SST → TI → JUR → FAC → MKT → **RH, este bloco**).

**Arquivo produzido:** `docs/business/BLOCO_6_RH_REQUISITOS.md` (81 RF-RH,
25 P0 / 40 P1 / 12 P2, 5 UC novos UC-67 a UC-71, RNF-RH-01 a 05).

**Insumo consumido:** `docs/business/briefs/BRIEF_RH_2026-08-06.md` (24
regras BR-RH-001 a 024, 9 processos P1-P9, 15 entidades novas).

### O que muda em relação ao módulo `employees` existente
- `employees`/`departments` (CRUD básico) já existem e **não são
  reabertos** — apenas renumerados de `RF-RH-01..05` (legado, 2 dígitos)
  para `RF-RH-001..005` (padrão de 3 dígitos), sem mudança de escopo.
- `BR-RH-020` (segregação de campo sensível — salário/CPF/dados bancários
  em `GET /api/employees`) **já está remediada em produção-candidata**
  (2026-08-06) — este bloco apenas referencia (RF-RH-006), não reabre.

### Foco P0 explícito (risco legal imediato)
- **Férias** (RF-RH-031 a 043, UC-67): período aquisitivo aberto
  automaticamente, cálculo de redução por faltas, período concessivo com
  alertas escalonados 6/3/1 mês, dobra nunca silenciosa (alerta crítico a
  RH e CFO), fracionamento (até 3 frações, uma ≥14 dias), abono pecuniário
  (limite 1/3, prazo 15 dias), programação por equipe com limite de %
  simultâneo por departamento.
- **Contrato de experiência** (RF-RH-013 a 016, UC-68): limite de 90 dias
  total, uma única prorrogação, alertas D-10/D-3, vencimento sem decisão
  vira `indeterminado_automatico` automaticamente com alerta crítico.

### O que ficou de fora por ser BUY/INTEGRAR (não desenvolvido)
- **Folha de pagamento** (cálculo INSS/IRRF/FGTS/13º/rescisão): fora de
  build — RNF-RH-03 e §6.1 do bloco. O ERP constrói apenas
  `PayrollImportBatch`/`PayrollImportItem` (RF-RH-070 a 073) para
  **importar** o resultado já calculado pelo provedor de folha, com acesso
  reforçado a `bruto`/`liquido` (mais restrito que a segregação padrão de
  `rh` — ver §6.3 do bloco).
- **Ponto eletrônico (REP)**: fora de build — RNF-RH-03 e §6.2 do bloco
  (Portaria MTP 671/2021 exige registro/certificação, inviável para uso
  interno). O ERP constrói apenas `TimeSheetSummary` (RF-RH-060 a 063)
  para **importar** o espelho consolidado mensal do fornecedor de ponto.

### Decisões-chave para o próximo agente (`AdmDBA` / `ArquitetoSoftwareAPI`)
1. Duas exceções de acesso **mais restritivas** que o padrão de campo do
   módulo `rh` (BR-RH-020): `Absence.cid` (dado de saúde, RNF-RH-01, §6.4)
   e `PayrollImportItem.bruto`/`liquido` (dado financeiro individual,
   RF-RH-072, §6.3) — ambas seguem o precedente de `sst`/`juridico`
   (bloqueio de rota, não só omissão de campo). Nível exato de
   implementação (`rh:payroll`? exigir `rh`+`admin`/`financeiro`?) é
   decisão do `ArquitetoSoftwareAPI`, não deste bloco.
2. `Employee.pcd` (bool) é campo novo a adicionar ao modelo existente
   (RF-RH-067) — nullable, não quebra registros atuais. `work_regime`
   já cobre o indicador de aprendiz, sem campo novo.
3. `Employee.position` (hoje texto livre) ganha referência opcional a
   `JobPosition` (RF-RH-025) — migração incremental, texto livre continua
   válido como fallback.
4. Histórico contratual (`EmployeeContract`, `EmployeeJobHistory`,
   `VacationAccrualPeriod`, `TerminationProcess`) é imutável por desenho —
   toda alteração relevante cria novo registro com vigência, nunca
   `UPDATE` destrutivo (RNF-RH-04, CLT art. 468).

### Pendências
- 7 grupos de RF sem UC formal detalhado nesta passada (Cargos, Benefícios,
  Treinamentos, Espelho de ponto, Transferência/histórico contratual,
  Quotas PCD/aprendiz, Avaliação/Recrutamento) — recomendado UC-72/73/74
  na próxima passada do `AnalistaNegocios`, mesmo critério já usado no
  Bloco 4 (Facilities) para os grupos de menor complexidade (§9 do bloco).
- 6 itens `[VERIFICAR COM RH DA EMPRESA]` (versão do MOS, % máximo de
  equipe em férias por departamento, formato do arquivo de movimento para
  o provedor de folha ainda não contratado, adesão ao Empresa Cidadã,
  confirmação da faixa de quota PCD/aprendiz, estado atual do controle de
  ponto) — bloqueiam apenas a parametrização fina, não a modelagem.
- Contratação do provedor de folha + REP é pré-requisito organizacional
  (não de sistema) para as integrações de §6.1/6.2 — segue como pendência
  de negócio, fora do escopo deste bloco.

### Próximos passos sugeridos no pipeline
1. `AdmDBA` — modelar as 15 entidades novas (schema/migrations),
   confirmar caminho de segregação de acesso reforçado (§6.3/6.4).
2. `ArquitetoSoftwareAPI` — contrato de API dos 81 RF-RH, decidir nível de
   RBAC reforçado para `Absence.cid`/`PayrollImportItem`.
3. `AuditorIntegrador` — ao final do ciclo, checar se este bloco fecha o
   pipeline completo de 6 blocos (Bloco 0 a 6) sem BR/RF órfão.

## 2026-08-07 (rodada seguinte) — BLOCO 5 MKT (correção): backend implementado — Passo 4 — `programador`

**Escopo:** implementação do backend a partir dos artefatos aprovados
(`docs/business/BLOCO_5_MKT_REQUISITOS.md` — 40 RF-MKT, UC-63 a UC-66;
`BLOCO_5_MKT_MODELO_DADOS.md` + migrations `server/migrations/20260807-000310`
a `000315`, **não aplicadas** — instrução explícita, não tocadas nesta
rodada; `BLOCO_5_MKT_API.md` — 27 endpoints do contrato pós-auditoria;
`BLOCO_5_MKT_AUDITORIA.md`). Substitui o código anterior do módulo
Marketing (`server/src/modules/marketing/`, entregue em 2026-08-07 na
rodada "Módulo Marketing — Implementação do zero").

### 1. Models atualizados/criados (`server/src/models/`)

**Atualizados:** `MarketingLead` (novo enum `status` com
`in_sales_attendance`; `qualified_at`, `sales_owner_user_id`, `handoff_at`,
`first_response_at`, `converted_at`, `needs_review`, `event_id`,
`consent_given`/`consent_date`/`consent_channel`), `MarketingCampaign`
(`budget`→`budget_requested`; `budget_approved`/`budget_approval_status`/
`budget_approved_by`/`budget_approved_at`; `notes`;
`metrics_recalculated_at` — `leads_generated`/`conversions`/`roi`
permanecem como cache, não removidas), `MarketingMaterial`
(`stock_item_id`, `approved_by`, `approved_at`).
**Novos:** `MarketingEvent`, `MarketingEventChecklistItem`,
`MarketingLeadSaneamentoLog`. `server/src/models/index.ts` atualizado
(imports + ~10 associações novas + barrel de exports).

### 2. Módulo `clients/` — mudança pontual para viabilizar transação atômica

`ClientsRepository.create`/`SequelizeClientsRepository.create`/
`CreateClientUseCase.execute` ganharam parâmetro `transaction` opcional
(compatível para trás, nenhuma chamada existente quebrada) — usado por
`ConvertLeadUseCase` (RF-MKT-002) para criar `Client` e atualizar o
`MarketingLead` na mesma transação Sequelize.

### 3. Conversão atômica Lead → Cliente (UC-63)

`POST /api/marketing/leads/:id/convert` (`ConvertLeadUseCase`) — opção A
(`client_id` de cliente existente, via `ClientService.findById`) ou opção B
(`new_client`, via `ClientService.create()` reaproveitando
`CreateClientUseCase` do módulo `clients` **na mesma transação**);
`ClientServiceAdapter` (`infrastructure/adapters/`) é o único ponto de
acesso ao módulo `clients`, nunca Sequelize direto. Falha na criação do
cliente (ex. CPF/CNPJ duplicado) reverte a transação inteira — lead
permanece no status anterior. `PUT /leads/:id` e `POST /leads/:id/status`
continuam rejeitando `status='converted'` (`ChangeLeadStatusUseCase` lança
`BusinessRuleError` redirecionando para `/convert`).

### 4. Métricas de campanha somente derivadas (BR-MKT-004)

`createCampaignSchema`/`updateCampaignSchema` (Zod `.strict()`) não aceitam
mais `leads_generated`/`conversions`/`roi`/`budget` — 400 explícito, nunca
ignorado silenciosamente. `POST /campaigns/:id/recalculate-metrics`
(`RecalculateCampaignMetricsUseCase`) é idempotente: `leads_generated`/
`conversions` por `COUNT` real sobre `marketing_leads`, `roi` por receita
atribuída somada POR LEAD convertido (janela de 90 dias a partir de
`converted_at` de cada lead — `REVENUE_ATTRIBUTION_WINDOW_DAYS`,
`server/src/modules/marketing/domain/constants.ts`).

### 5. Handoff Marketing → Vendas (UC-64)

`POST /leads/:id/handoff` (`HandoffLeadUseCase`) com
`authorizeAnyModule([{moduleKey:'marketing'}, {moduleKey:'vendas'}])`
(middleware já existente do Bloco 4 FAC, reaproveitado — não recriado).
`ChangeLeadStatusUseCase` aceita `sales_owner_user_id` só quando
`status='qualified'` e exige responsável já atribuído para avançar a
`in_sales_attendance` (RF-MKT-012).

### 6. Evento/Feira (UC-65) — NOVO

CRUD completo (`CreateEventUseCase`/`UpdateEventUseCase`/
`ListEventsUseCase`/`GetEventByIdUseCase`), checklist
(`AddChecklistItemUseCase`/`UpdateChecklistItemUseCase`), encerramento
exigindo `actual_cost` (`CloseEventUseCase`, RF-MKT-025) e relatório de
ROI/custo por lead por evento (`GetEventsReportUseCase`,
`GET /reports/events`). **Decisão registrada no código:**
`PUT /events/:id` bloqueia TODA edição quando `completed`/`canceled` (sem
a exceção de `notes` sugerida pelo contrato de API) — `marketing_events`
(migration `000313`) não tem coluna `notes`; documentado em
`UpdateEventUseCase.ts` como divergência consciente entre contrato e
schema real, não corrigível sem migration aditiva futura.

### 7. KPIs de funil (UC-66) — NOVO

`GET /reports/funnel` (`GetFunnelReportUseCase` — CPL, taxa de
qualificação, conversão, receita atribuída/ROI, SLA de handoff (%),
mediana de ciclo do lead, orçado×realizado) e `GET /reports/events`;
ambos retornam sempre `200`, com `has_data:false` e todos os campos
numéricos `null` (nunca `0`/`NaN`) quando o filtro não encontra dado
(UC-66 E1).

### 8. RBAC `approve` pontual + material/estoque

`POST /campaigns/:id/budget-decision` (`BudgetDecisionUseCase`) e
`PATCH /materials/:id/approve` (`ApproveMaterialUseCase`) usam
`authorizeModule('marketing', 'approve')` — resto do módulo em
`operate`/leitura padrão. `budget_approved_by`/`approved_by` sempre de
`req.user.id`, nunca do body. `stock_item_id` em `MarketingMaterial` é FK
opcional só de referência — nenhum endpoint de estoque criado pelo módulo
MKT (BR-MKT-011 mantida). Upload de nova versão de material aprovado
reverte `approved`/`approved_by`/`approved_at` (RF-MKT-040).

### 9. Estrutura de módulo (Clean Architecture)

Novos: `application/services/` (`ClientService`, `SalesRevenueService`,
`UserLookupService` — interfaces) + `infrastructure/adapters/`
(`ClientServiceAdapter`, `SalesRevenueServiceAdapter`,
`UserLookupServiceAdapter` — implementações, mesmo precedente de
`MaintenanceOrderServiceAdapter` do módulo `ti`), `domain/constants.ts`
(`REVENUE_ATTRIBUTION_WINDOW_DAYS=90`, `HANDOFF_SLA_DAYS=2`,
`BUDGET_ALERT_WARNING_THRESHOLD=0.9`), `domain/repositories/EventRepository.ts`
+ `infrastructure/sequelize/SequelizeEventRepository.ts`,
`presentation/controllers/eventController.ts` +
`presentation/controllers/reportController.ts`,
`presentation/validators/eventValidators.ts` +
`presentation/validators/reportValidators.ts`. Router
`presentation/routes/marketing.ts` reescrito com as 27 rotas do contrato.

### 10. Documentações atualizadas

`docs/governance/TODO.md` (nova entrada datada com o detalhamento
completo desta implementação) e este arquivo. `docs/database/DATABASE.md`
não precisou de nova entrada — nenhuma migration foi tocada/aplicada
nesta rodada (schema-alvo já documentado pelo `AdmDBA` em
`BLOCO_5_MKT_MODELO_DADOS.md`).

### 11. Validação

- `npm run typecheck` (a partir de `server/`): limpo, 0 erros.
- `npm run test:unit`: **1177/1178** — única falha é a pré-existente
  `onda3-shipping-cockpit-cashflow.test.ts` (falha de data conhecida,
  documentada em outras entradas deste handoff, não relacionada a este
  bloco).
- 98 testes novos/reescritos do módulo Marketing: `marketing-lead-use-cases.test.ts`
  (52, reescrito), `marketing-campaign-use-cases.test.ts` (reescrito),
  `marketing-material-use-cases.test.ts` (reescrito),
  `marketing-convert-lead-use-case.test.ts` (10, novo),
  `marketing-handoff-lead-use-case.test.ts` (novo),
  `marketing-funnel-report-use-case.test.ts` (novo),
  `marketing-event-use-cases.test.ts` (22, novo),
  `marketing-lead-saneamento.test.ts` (novo — cobre o efeito de aplicação
  de `needs_review`/`data_issue_flag`, já que o saneamento em si roda em
  SQL dentro da migration `000312`, fora do escopo de teste unitário).

### 12. Pendências / riscos residuais

- **Telas `client/src/pages/marketing/` (`MarketingPage.tsx` e afins,
  entregues em 2026-08-06 contra o contrato ANTIGO) VÃO QUEBRAR** com os
  breaking changes deste passo (`budget`→`budget_requested`,
  `status='converted'` via `POST /leads/:id/status` removido, `approved`
  removido de `POST /materials`, funil com `in_sales_attendance` novo,
  etc.) — fora do escopo deste agente (backend); responsabilidade do
  Passo 5 (`PromadorFonteEnd`).
- Migrations `20260807-000310` a `000315` continuam **não aplicadas** —
  pré-requisito de infraestrutura antes de qualquer deploy deste backend.
- Volume real de leads `converted` órfãos que serão saneados pela migration
  `000312` ainda não foi contado em banco real —
  `[VERIFICAR COM MARKETING]` permanece pendente (decisão de negócio, não
  técnica).
- `REVENUE_ATTRIBUTION_WINDOW_DAYS`/`HANDOFF_SLA_DAYS`/
  `BUDGET_ALERT_WARNING_THRESHOLD` implementados como constantes de código
  (`domain/constants.ts`), não editáveis via API nesta rodada —
  `[DEFINIR COM COORDENADOR]` do documento de requisitos permanece como
  parametrização fina pendente, não bloqueante.
- Nenhum teste de integração real (Postgres) foi executado para o fluxo
  completo (conversão atômica, handoff, saneamento, recálculo de
  métricas) — só unitário com repositórios/serviços mockados, consistente
  com as migrations ainda não aplicadas.
- Divergência consciente documentada em código: `PUT /events/:id` não
  aceita exceção de `notes` pós-conclusão porque a coluna não existe no
  schema (`marketing_events`) — contrato de API previa essa exceção sem
  que o `AdmDBA` tivesse adicionado a coluna correspondente.

## 2026-08-07 (rodada seguinte) — BLOCO 5 MKT (correção): telas do frontend — Passo 5 — `PromadorFonteEnd`

Reescreve `client/src/api/marketing.ts` e as telas de `client/src/pages/marketing/`
contra os 27 endpoints do backend novo (item anterior deste handoff), fechando
o Passo 5 do pipeline de correção do Bloco 5. Migrations `000310`..`000315`
ainda **não aplicadas** no banco — nada foi testado contra API real, só
`tsc --noEmit`/`vite build`/`vitest run`.

### 1. `client/src/api/marketing.ts` — reescrito por completo

Cobre os 27 endpoints em 5 grupos (Campanhas, Leads, Evento/Feira,
Relatórios/KPIs, Materiais), tipos verificados contra os models reais
(`server/src/models/Marketing*.ts`), não só o contrato idealizado:
`Campaign.budget_requested`/`budget_approved`/`budget_approval_status`/
`budget_alert_level` (string DECIMAL, nunca `number`); `Lead.status` inclui
`in_sales_attendance`, `sales_owner_user_id`/`qualified_at`/`handoff_at`/
`converted_at`/`needs_review` expostos; `changeLeadStatus` não aceita mais
`converted` (tipo `ChangeableLeadStatus = Exclude<LeadStatus, 'converted'>`);
`convertLead`/`handoffLead`/`bulkCreateLeads` novos; grupo `events`
(`listEvents`/`getEvent`/`createEvent`/`updateEvent`/checklist/`closeEvent`/
`getEventLeads`) e grupo `reports` (`getFunnelReport`/`getEventsReport`)
inteiramente novos; `Material.stock_item_id` novo, `approveMaterial`
(`PATCH .../approve`) dedicado, `approved` removido de `create`/`update`.

### 2. Telas — `client/src/pages/marketing/`

- **`marketingShared.tsx`** (novo) — formatação (data/moeda/percentual) e
  badges/labels de status para os 5 grupos, mesmo padrão de
  `juridicoShared.tsx`/`facilitiesShared.tsx`.
- **`LeadsTab.tsx`** (reescrito) — funil kanban com 6 colunas
  (`new`→`contacted`→`qualified`→`in_sales_attendance`→`converted`/`lost`),
  ação de handoff dedicada (`HandoffLeadDialog`, busca de usuário) exigida
  antes de avançar a `in_sales_attendance`, `ConvertLeadDialog` reescrito
  (cliente existente com busca por nome/CPF-CNPJ via `listClients({ search })`
  OU cliente novo no mesmo formulário, nunca mais campo numérico livre de
  id), captação em lote (`BulkCreateLeadsDialog`, textarea `nome; email;
  telefone` por linha, reporta criados/rejeitados item a item), filtro
  `sla_breached`, e destaque visual (borda + ícone) para `lead.needs_review`
  (leads rebaixados pelo saneamento pendente — só sinalização, sem ação).
- **`CampaignsTab.tsx`** (reescrito) — `budget_requested`/`budget_approved`
  lado a lado, badges de status de aprovação e de alerta de orçamento
  (`warning_90`/`over_100`), formulário de edição sem `leads_generated`/
  `conversions`/`roi` (somem do form, só leitura na listagem), campanha
  `completed`/`canceled` trava todos os campos exceto `notes`
  (`isLocked`), botão de recalcular métricas (`recalculateCampaignMetrics`)
  e diálogo de decisão de orçamento (`BudgetDecisionDialog`, só visível com
  `permissions.marketing === 'approve'`).
- **`EventsTab.tsx`** (novo) — CRUD de evento/feira, checklist inline
  (toggle pendente/concluído), lista de leads vinculados
  (`getEventLeads`), encerramento exigindo custo real
  (`closeEvent`, bloqueado se nem o payload nem o evento já tiverem
  `actual_cost`).
- **`MaterialsTab.tsx`** (reescrito) — adiciona campo de item de estoque
  (`stock_item_id`, busca por código/descrição via `itemsApi.listItems`),
  remove checkbox `approved` do formulário (nasce sempre `false`), botão
  "Aprovar" dedicado só visível com `permissions.marketing === 'approve'`,
  aviso no diálogo de upload de que nova versão sobre material aprovado
  reverte a aprovação.
- **`ReportsTab.tsx`** (novo) — filtros (campanha/origem/período), 8 KPIs
  do funil em cards (`GetFunnelReportUseCase`, trata `has_data: false` sem
  quebrar a tela) e tabela de ROI/custo por lead por evento
  (`GetEventsReportUseCase`).
- **`MarketingPage.tsx`** (reescrito) — 5 abas (Leads, Campanhas,
  Eventos/Feiras, Materiais, Relatórios), aba inicial trocada para "Leads"
  (fluxo mais operacional do dia a dia). Rota `/marketing` e menu do
  `AppLayout` não precisaram de alteração (já existiam, módulo `marketing`
  já cadastrado em `accessProfiles.ts`).

### 3. Permissões (nível `approve`)

Aprovação de orçamento de campanha e aprovação de material só aparecem
para `hasRole('admin') || permissions?.marketing === 'approve'`, mesmo
padrão de `permissions?.facilities === 'approve'`/`permissions?.sst ===
'approve'` já usado nos demais módulos — nenhuma mudança em
`AuthContext.tsx`/`accessProfiles.ts` foi necessária (`marketing` e o
nível `approve` já existiam no catálogo desde o backend anterior).

### 4. Validação

- `npx tsc --noEmit` (a partir de `client/`): limpo, 0 erros.
- `npx vite build`: OK (bundle `MarketingPage` ~60 kB gzip 12 kB).
- `npx vitest run`: 51/51 (8 arquivos) — nenhum teste existente cobre as
  telas de Marketing especificamente; nenhuma regressão em outros módulos.

### 5. Pendências / o que o QA (ou humano) deve testar quando as migrations forem aplicadas

- Fluxo completo de conversão de lead (cliente existente E cliente novo,
  incluindo o caminho de erro de CPF/CNPJ duplicado, UC-63 E1) contra API
  real — hoje só validado por tipo/build.
- Handoff exigindo `sales_owner_user_id` antes de `in_sales_attendance`
  (RF-MKT-012) e o filtro `sla_breached=true`.
- Captação em lote com mistura de itens válidos/inválidos (processamento
  parcial, RF-MKT-019, UC-65 E2).
- Aprovação de orçamento de campanha e de material só visíveis/possíveis
  para perfil com nível `approve` em `marketing` — testar também com
  perfil `operate` puro (deve estar oculto, backend deve rejeitar 403 se
  forçado via chamada direta).
- Encerramento de evento sem `actual_cost` (nem payload nem já gravado)
  deve bloquear no backend mesmo que o frontend já desabilite o botão.
- Relatório de funil com filtro sem dados (`has_data: false`) — tela não
  deve quebrar nem mostrar `NaN`/`R$ NaN`.
- Leads com `needs_review=true` (produto do saneamento da migration
  `000312`) devem aparecer destacados na aba Leads assim que a migration
  rodar em banco com dado real.

---

## BLOCO 3 Jurídico — correção das 2 pendências reais: Atos Societários (RF-JUR-030) e alçada de aprovação de contrato por valor (RF-JUR-003) — 2026-08-08

**Data**: 2026-08-08
**Escopo**: Backend (`server/`) apenas — implementa as 2 pendências deixadas explícitas ao final da passada 2 do Bloco 3 Jurídico (`docs/governance/TODO.md`, seções "Pendencia real 1/2", e o cabeçalho de `ActivateContractUseCase.ts`), com regras de negócio decididas pelo dono do produto.
**Status**: Concluído (backend); migrations não aplicadas ao banco (deixadas para revisão manual, conforme instrução da tarefa); sem tela nova em `client/` (fora de escopo).

### Resumo da feature

1. **RF-JUR-030 — Atos Societários (`corporate-acts`)**: CRUD mínimo (create/list/getById/update) sobre nova tabela `jur_corporate_acts`, sem FK para contrato/caso (entidade própria da Secretaria/Governança). Edição bloqueada após `status='registered'`; a transição `draft -> registered` ocorre quando `registration_protocol` e `registered_at` são informados juntos no `PUT`.
2. **RF-JUR-003 — Alçada de aprovação de contrato por valor**: 3 faixas sobre `jur_contracts.value` — `<= R$ 50.000` ativa direto (comportamento existente); `R$ 50.000 < valor <= R$ 300.000` exige 1 aprovação `diretor`; `> R$ 300.000` exige `diretor` e `financeiro`. Novo endpoint `POST /api/jur/contracts/:id/approve` grava em `jur_contract_approvals` (unique por `contract_id`+`approver_role`); `ActivateContractUseCase` passa a validar os approvals antes de transicionar para `active`.

### Arquivos criados

RF-JUR-030 (Atos Societários):
- `server/migrations/20260808-000001-create-jur-corporate-acts.cjs`
- `server/src/models/JurCorporateAct.ts`
- `server/src/modules/juridico/domain/entities/CorporateActTypes.ts`
- `server/src/modules/juridico/domain/repositories/CorporateActRepository.ts`
- `server/src/modules/juridico/infrastructure/sequelize/SequelizeCorporateActRepository.ts`
- `server/src/modules/juridico/application/use-cases/corporateAct/CreateCorporateActUseCase.ts`
- `server/src/modules/juridico/application/use-cases/corporateAct/ListCorporateActsUseCase.ts`
- `server/src/modules/juridico/application/use-cases/corporateAct/GetCorporateActByIdUseCase.ts`
- `server/src/modules/juridico/application/use-cases/corporateAct/UpdateCorporateActUseCase.ts`
- `server/src/modules/juridico/presentation/controllers/corporateActController.ts`
- `server/tests/unit/juridico-corporate-act-use-cases.test.ts` (10 casos)

RF-JUR-003 (alçada de aprovação de contrato):
- `server/migrations/20260808-000002-create-jur-contract-approvals.cjs`
- `server/src/models/JurContractApproval.ts`
- `server/src/modules/juridico/domain/constants.ts` (thresholds `JUR_APPROVAL_THRESHOLD_DIRECTOR`/`JUR_APPROVAL_THRESHOLD_FINANCE` + `requiredApproverRoles()`)
- `server/src/modules/juridico/domain/repositories/ContractApprovalRepository.ts`
- `server/src/modules/juridico/infrastructure/sequelize/SequelizeContractApprovalRepository.ts`
- `server/src/modules/juridico/application/use-cases/contract/ApproveContractUseCase.ts`

### Arquivos modificados

- `server/src/models/index.ts` — imports/registro de `JurCorporateAct`/`JurContractApproval`, associação `JurContract.hasMany(JurContractApproval, { as: 'approvals' })`.
- `server/src/shared/domain/accessModules.ts` — novo módulo de acesso `diretor` (chave + label + comentário de cabeçalho documentando a decisão); `financeiro` já existia no catálogo (Contas a Pagar/Receber) e passou a ser reaproveitado como segundo papel de aprovador.
- `server/src/modules/juridico/application/use-cases/contract/ActivateContractUseCase.ts` — construtor ganhou 3º parâmetro opcional `approvalRepository`; antes de ativar, se `requiredApproverRoles(contract.value)` não for vazio, consulta `jur_contract_approvals` e bloqueia com `BusinessRuleError` (regra `RF-JUR-003`) listando os papéis faltantes; comentário de cabeçalho atualizado removendo a nota de pendência.
- `server/src/modules/juridico/presentation/controllers/contractController.ts` — injeta `SequelizeContractApprovalRepository` em `ActivateContractUseCase`; novo `exports.approve` (`POST .../approve`); novo helper `resolveAvailableApproverRoles(req)` (lê `req.user.permissions.diretor`/`.financeiro`, `role==='admin'` conta como tendo os dois).
- `server/src/modules/juridico/presentation/routes/juridico.ts` — nova rota `GET/POST /corporate-acts` + `GET/PUT /corporate-acts/:id` (dentro do gate geral `authorizeModule('juridico','operate')`); nova rota `POST /contracts/:id/approve` montada ANTES do gate geral, com `authorizeAnyModule([{moduleKey:'diretor'},{moduleKey:'financeiro'}])` (aprovador de alçada não necessariamente tem o módulo `juridico`); cabeçalho do arquivo atualizado.
- `server/tests/unit/juridico-contract-use-cases.test.ts` — `makeContract()` teve o `value` padrão reduzido de `150000.00` para `10000.00` (para não quebrar os testes de `ActivateContractUseCase` já existentes, que não testam alçada — valor agora fica dentro da faixa "sem aprovação extra"); mais 11 casos novos (`ActivateContractUseCase` — RF-JUR-003: as 3 faixas, com e sem approvals; `ApproveContractUseCase`: fluxo principal, desambiguação de papel, anti-spoofing de papel, papel não exigido pelo valor, duplicidade, contrato inexistente).

### Documentações atualizadas

- `docs/governance/TODO.md` — as 2 "Pendencia real" marcadas `[x]` com evidência; nova entrada datada "2026-08-08 — BLOCO 3 Jurídico: correção das 2 pendências reais".
- `docs/database/DATABASE.md` — nova seção "BLOCO 3 Jurídico — correção das 2 pendências reais: Atos Societários e alçada de aprovação (2026-08-08)" com as 2 tabelas novas documentadas coluna a coluna (resumo) e a regra de negócio das 3 faixas.
- `docs/projeto/04-USE_CASES.md` — nota de RF-JUR-003 na seção UC-52-JUR atualizada de "não implementada" para referência à nova seção; nova seção "UC-52-JUR / UC-55-JUR (correção, 2026-08-08)" com o detalhamento funcional das 2 features.
- Este arquivo (`docs/governance/HANDOFF_CODEX.md`).

### Decisões tomadas onde algo não estava 100% especificado

1. **Nome do campo de valor do contrato**: confirmado como `value` (não `contract_value`/`total_value`) — `jur_contracts.value` (`DECIMAL(18,6)`), conforme `server/src/models/JurContract.ts` e `ContractTypes.ts`.
2. **Módulo de acesso `financeiro`**: já existia no catálogo (`accessModules.ts`) — reaproveitado como está, sem criar um módulo novo. Apenas `diretor` foi criado do zero.
3. **`requiredLevel` em `authorizeAnyModule`**: usado com o default (`operate`) para os dois candidatos — não há distinção de nível `approve` dentro do papel de aprovador nesta rodada (o próprio ato de possuir o módulo `diretor`/`financeiro` já caracteriza o papel; não há uma segunda trava de nível dentro de cada um).
4. **Desambiguação de papel (`desiredRole`/`role` no body)**: implementado como campo auxiliar `role` no body de `POST .../approve`, obrigatório apenas quando `availableRoles.length > 1` (usuário tem os dois perfis simultaneamente) — decisão de UX simples seguindo a orientação do enunciado ("isso é auxiliar, a autorização real vem do RBAC").
5. **Contrato exigir o papel para poder aprovar**: `ApproveContractUseCase` rejeita (`BusinessRuleError`) uma aprovação de um papel que `requiredApproverRoles(contract.value)` não exige para o valor atual do contrato (ex.: tentar aprovar como `financeiro` um contrato de R$ 100.000, que só exige `diretor`) — interpretação estrita de "exige 1 aprovação de X" como também significando "não faz sentido aceitar aprovação de um papel que a faixa não pede", para evitar registro de approvals órfãos/sem efeito.
6. **`ActivateContractInput.approverHasApprove`**: mantido no tipo/contrato do controller por compatibilidade (não usado pela nova lógica de alçada — a checagem de alçada agora é 100% baseada em `jur_contract_approvals`, não em "quem está clicando em ativar tem approve no módulo juridico").
7. **Numeração das migrations**: seguiu literalmente a sugestão do enunciado (`20260808-000001`/`20260808-000002`), mesmo havendo migrations já numeradas até `20260807-000315` (Marketing) — não há conflito de timestamp/ordem de execução (data posterior).
8. **`document_file_path` de `jur_corporate_acts`**: sem upload real nesta rodada (mesmo padrão do resto do módulo) — campo é só referência de string.

### Instruções de teste para o próximo agente/humano

1. **Migrations**: revisar e aplicar manualmente `20260808-000001-create-jur-corporate-acts.cjs` e `20260808-000002-create-jur-contract-approvals.cjs` (não aplicadas automaticamente, conforme instrução da tarefa) — `npm run migration:up` a partir de `server/`.
2. **RBAC**: criar/editar um Perfil de Acesso com módulo `diretor` (e outro com `financeiro`) via `/api/access-profiles` para testar `POST /api/jur/contracts/:id/approve` de ponta a ponta contra banco real.
3. **Fluxo completo approve -> activate**: criar um contrato com `value` em cada uma das 3 faixas (ex.: 40000, 150000, 500000), tentar ativar sem aprovação (deve bloquear nas faixas 2/3), aprovar com os papéis certos, ativar novamente (deve liberar). Testar duplicidade (2º approve do mesmo papel deve rejeitar) e desambiguação (usuário com os dois perfis, sem informar `role`, deve pedir para desambiguar).
4. **Atos Societários**: criar em `draft`, editar campos livremente, definir `registration_protocol`+`registered_at` juntos (deve virar `registered`), tentar editar depois (deve bloquear com 422).
5. **Regressão**: `npm run typecheck` (limpo) e `npm run test:unit` (1198/1198 passando, incluindo os 21 casos novos) já validados nesta rodada — reexecutar após aplicar as migrations para garantir que não há erro de schema real (só foi validado com repositórios mockados).
6. **Fora de escopo, não testado**: nenhuma tela nova em `client/` (Atos Societários, aprovação de contrato) — endpoints prontos, aguardando o passo de frontend.

## 2026-08-09 — Correção de robustez: valida enums do módulo TI antes do Sequelize — `programador`

### Resumo da feature

Correção pontual de robustez (não de negócio): o módulo `ti` não tinha
nenhum validador de payload para os campos que batem em coluna `ENUM` do
Postgres — os use-cases só checavam presença, não o valor, então um valor
fora do enum (bug de frontend, cliente de API mal formado, digitação
manual) atravessava direto até o `.create()`/`.update()` do Sequelize e o
banco devolvia `invalid input value for enum ...`, que o `errorHandler`
genérico não mapeia para 400 — o cliente recebia um 500. Isso é a mesma
classe de bug corrigida horas antes no módulo Jurídico. `facilities`,
`marketing`, `budget`, `treasury` e agora `juridico` já tinham validadores
Zod fiéis ao enum real; `ti` era a lacuna restante identificada por
auditoria.

Nenhuma regra de negócio mudou: quem já mandava payload válido continua
tendo exatamente o mesmo comportamento; só passou a haver um portão de
validação (`400 VALIDATION_ERROR`) antes de qualquer valor de enum inválido
chegar ao banco.

### Arquivos criados

- `server/src/modules/ti/presentation/validators/licenseValidators.ts` —
  `createLicenseSchema`/`updateLicenseSchema` (`license_type`,
  `billing_cycle` de `it_software_license_details`).
- `server/src/modules/ti/presentation/validators/termValidators.ts` —
  `createTermSchema`/`returnTermSchema` (`acceptance_type`,
  `condition_on_return` de `it_responsibility_terms`).
- `server/src/modules/ti/presentation/validators/backupValidators.ts` —
  `registerBackupLogSchema` (`backup_type` de `it_backup_logs`).
- `server/src/modules/ti/presentation/validators/accessRequestValidators.ts`
  — `createAccessRequestSchema` (`type` de `it_access_requests`).
- `server/src/modules/ti/presentation/validators/ticketValidators.ts` —
  `createTicketCategorySchema`/`updateTicketCategorySchema`/
  `changeTicketPrioritySchema` (`default_priority` de
  `it_ticket_categories`, `priority` de `it_tickets`).
- `server/tests/unit/ti-validators.test.ts` — 21 casos novos (1 valor
  válido + 1 inválido por enum coberto, mais 1 caso de `.strict()`
  rejeitando campo desconhecido).

### Arquivos alterados

- `server/src/modules/ti/presentation/controllers/licenseController.ts` —
  `create`/`update` passam por `safeParse`/`handleZodError` antes do
  use-case.
- `server/src/modules/ti/presentation/controllers/termController.ts` —
  `create`/`returnTerm` idem.
- `server/src/modules/ti/presentation/controllers/backupController.ts` —
  `create` idem.
- `server/src/modules/ti/presentation/controllers/accessRequestController.ts`
  — `create` idem.
- `server/src/modules/ti/presentation/controllers/ticketController.ts` —
  `createCategory`/`updateCategory`/`changePriority` idem.

Cada literal Zod foi conferido diretamente contra as migrations que criam
os enums (`server/migrations/20260807-000150` a `000155`), não contra a
lista solta do prompt original — o mesmo tipo de erro (literal errado no
próprio validador) foi o que causou o incidente no módulo Jurídico, então
foi checado com atenção redobrada.

### Endpoints/campos que passaram a ser validados

| Endpoint | Campo(s) | Enum |
|---|---|---|
| `POST /api/ti/licenses` | `license_type`, `billing_cycle` | `perpetual\|subscription\|free`, `one_time\|monthly\|yearly` |
| `PUT /api/ti/licenses/:assetId` | `billing_cycle` | `one_time\|monthly\|yearly` |
| `POST /api/ti/responsibility-terms` | `acceptance_type` | `physical_signature\|digital_ack` |
| `POST /api/ti/responsibility-terms/:id/return` | `condition_on_return` | `ok\|damaged\|incomplete` |
| `POST /api/ti/backup-logs` | `backup_type` | `daily\|weekly\|monthly\|restore_test` |
| `POST /api/ti/access-requests` | `type` | `grant\|change\|revoke` |
| `POST /api/ti/ticket-categories` | `default_priority` | `low\|medium\|high\|urgent` |
| `PUT /api/ti/ticket-categories/:id` | `default_priority` | `low\|medium\|high\|urgent` |
| `PUT /api/ti/tickets/:id/priority` | `priority` | `low\|medium\|high\|urgent` |

### Enums que NÃO foram validados (decisão consciente, não omissão)

- **`license_type` em `PUT /api/ti/licenses/:assetId`**: excluído de
  propósito. A API já documentava o update como "atualiza fornecedor/
  seats/custo/ciclo" (`docs/business/BLOCO_2_TI_API.md` §3) e
  `UpdateLicenseDetailInput` nunca declarou o campo — só era alcançável
  porque o controller fazia spread cru de `req.body`. O `.strict()` agora
  fecha esse caminho não documentado (que já não deveria funcionar).
- **`it_tickets.status`, `it_access_requests.status`,
  `it_responsibility_terms.status`**: nunca vêm do `req.body` — são
  sempre setados internamente pelo use-case em transições fixas
  (ex.: `assign` sempre grava `status: 'in_progress'`). Não há superfície
  de ataque.
- **`urgency_perceived` em `POST /api/ti/tickets`**: não escreve
  diretamente em coluna — `CreateTicketUseCase.higherPriority()` compara
  por índice em `PRIORITY_ORDER`; um valor fora do enum tem índice `-1` e
  a função simplesmente devolve a prioridade da categoria, sem nunca
  persistir o valor não confiável.
- **`impact`/`urgency` de `it_tickets`**: são `SMALLINT` com `CHECK
  (... BETWEEN 1 AND 3)`, não `ENUM` — fora do escopo desta tarefa (pedida
  explicitamente para enums). Risco residual documentado em
  `docs/governance/TODO.md`, entrada 2026-08-09: um valor fora da faixa em
  `AssignTicketUseCase`/`assign` (que continua sem validador) ainda
  produziria um erro de `CHECK constraint` do Postgres não mapeado para
  400 — mesma classe de bug, mas de `CHECK`, não de `ENUM`.

### Documentações atualizadas

- `docs/governance/TODO.md` — nova entrada "2026-08-09 — Fecha superfície
  de risco de enum sem validação no módulo TI".
- Nenhuma migration/model foi criada ou alterada (só camada de validação
  de aplicação) — `docs/database/DATABASE.md` não precisou de atualização.
- Nenhuma regra de negócio mudou — `docs/projeto/04-USE_CASES.md` não
  precisou de atualização.
- JSDoc de cabeçalho em cada um dos 5 arquivos novos de validador,
  explicando o que cobre e por quê.

### Instruções de teste para o próximo agente/humano

1. **Regressão**: `npm run typecheck` (limpo) e `npx jest tests/unit`
   (1259/1260 — a única falha, `module-authorization-map`, é de um agente
   paralelo trabalhando no módulo `rh`, não relacionada a esta tarefa;
   confirmado por `git status` que os arquivos dela não foram tocados
   aqui) já validados nesta rodada.
2. **Smoke manual (Postgres real)**: com o banco no ar, tentar
   `POST /api/ti/licenses` com `license_type: "trial"` (fora do enum) e
   confirmar `400 VALIDATION_ERROR` (não `500`); repetir para os demais 8
   pares endpoint/campo da tabela acima. Depois repetir cada um com um
   valor válido do enum e confirmar que o fluxo funciona exatamente como
   antes (sem regressão).
3. **Teste de não regressão do `.strict()`**: confirmar que o frontend
   atual de TI (se já existir) não envia nenhum campo extra não listado
   nos schemas — do contrário passaria a receber 400 onde antes era
   ignorado silenciosamente. Não foi possível verificar isso aqui porque
   `client/` está fora do escopo desta tarefa.
4. **Fora de escopo, não testado**: `impact`/`urgency` fora da faixa
   1..3 em `POST /api/ti/tickets/:id/assign` (ver risco residual acima).

---

## 2026-08-09 — Cadeia do produto, Onda 1: G16, G8, G10, G12 (+ análise de G6)

**Origem:** `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`
(auditoria do fluxo real do produto final — 21 estações, 17 gaps). G2 já
fechado no commit `5ec0651`. Esta entrega fecha os demais gaps da **Onda 1**
("dano silencioso, correção contida"): sem migration, sem decisão de negócio.

### Resumo da feature (o que foi codificado)

| Gap | Estava assim | Ficou assim |
|---|---|---|
| **G16** | O caminho do MRP (`ConvertPlannedOrdersToProductionOrderUseCase`) criava OP **sem validar material nem BOM**, enquanto o manual exigia produto ativo, BOM ativa e disponibilidade. Numeração `OP-YYYY-NNNN` vinha de `COUNT(*) + 1` lido no caso de uso. | O caminho do MRP aplica `BomService.checkAvailability` com a mesma regra do manual (404 de "sem BOM ativa" vira `BusinessRuleError` didático). Numeração migrou para `ProductionOrderRepository.nextOrderNumberForYear` — advisory lock por ano + `MAX` do sufixo. `countByOrderNumberPrefix` removido. |
| **G8** | RNC só era aberta na reprovação se o payload trouxesse `create_rnc_on_fail: true` (opt-in; o default de quem chama a API era **não** abrir). | `if (!passed)` abre RNC **sempre** (`origin: 'final'`). A flag continua aceita pelo schema `.strict()` (a tela envia) porém **ignorada**, marcada `@deprecated`. |
| **G10** | RNC que não conseguia bloquear lote (não informado, não encontrado, status terminal) era criada **idêntica** a uma que bloqueou — sem nenhum sinal. | Desfecho classificado (`blocked`/`not_found`/`not_blockable`/`not_informed`/`not_applicable`); quando nada é bloqueado, grava aviso em `non_conformities.notes` com prefixo `[ATENCAO: NENHUM LOTE BLOQUEADO]`, que volta no payload da resposta. |
| **G12** | `CreateRfqUseCase` puxava itens da requisição sem olhar status; `AwardRfqUseCase` criava pedidos gravando `requisition_id` **sem nunca ler nem alterar a requisição**. Os mesmos itens viravam **dois** pedidos de compra (adjudicação + conversão direta). | Saldo por item em três pontos: cotação só puxa item `pending` de requisição em estado cotável; adjudicação trava a requisição (`FOR UPDATE`), exige `approved` + saldo, marca itens `ordered` e fecha a requisição só quando não sobra saldo; conversão direta passa a filtrar por saldo. |
| **G6** | — | **Não implementado, por decisão registrada** (ver abaixo). |

**G6 — por que não foi implementado.** A pré-condição real já é garantida:
`in_progress` só é alcançável a partir de `released`/`paused`, e entrar em
`released` valida disponibilidade e **reserva** o material
(`ChangeProductionOrderStatusUseCase.reserveMaterials`). As três validações
sugeridas pelo achado não têm apoio: **centro de trabalho** não existe como
coluna em `production_orders` (vive nas etapas de roteiro/apontamento) —
exigi-lo é mudança de schema, fora do escopo; **`responsible_id`** é opcional
por desenho em todo o módulo; **apontamento iniciado** contradiz a decisão
explícita de `reconcileTrackingOnCompletion` ("OP sem apontamento: fluxo
simples permanece válido") e é a pergunta em aberto do **G4** (decisão do
dono, Onda 3). O plano já classificava G6 na Onda 2 (precisa de migration) —
confirmado. A análise ficou registrada no próprio código, em
`ProductionOrderEntity.transitionTo`.

### Arquivos alterados

**Código (server/, 9 arquivos):**
- `src/modules/production/domain/repositories/ProductionOrderRepository.ts` — `countByOrderNumberPrefix` → `nextOrderNumberForYear`
- `src/modules/production/infrastructure/sequelize/SequelizeProductionOrderRepository.ts` — implementação com `pg_advisory_xact_lock(41001, ano)` + `MAX(SUBSTRING(...))`
- `src/modules/production/application/use-cases/CreateProductionOrderUseCase.ts` — usa a numeração serializada
- `src/modules/mrp/application/use-cases/ConvertPlannedOrdersToProductionOrderUseCase.ts` — validação de BOM/material + numeração serializada
- `src/modules/production/domain/entities/ProductionOrderEntity.ts` — **só comentário** (análise do G6), nenhuma mudança de comportamento
- `src/modules/laboratory/application/use-cases/CreateAcousticTestUseCase.ts` — RNC sempre na reprovação
- `src/modules/laboratory/presentation/validators/laboratoryValidators.ts` — **só comentário** (`create_rnc_on_fail` aceito e ignorado)
- `src/modules/nonConformities/application/use-cases/CreateNonConformityUseCase.ts` — aviso explícito quando nenhum lote é bloqueado
- `src/modules/rfq/application/use-cases/CreateRfqUseCase.ts`, `src/modules/rfq/application/use-cases/AwardRfqUseCase.ts`, `src/modules/rfq/presentation/controllers/rfqController.ts`, `src/modules/purchaseRequisitions/application/use-cases/ConvertRequisitionToPurchaseOrdersUseCase.ts` — controle de saldo/estado do G12

**Testes (server/tests/unit/, 6 arquivos):** `mrp-convert-to-production-order`,
`production-order-lifecycle`, `laboratory-tests`, `quality-lot-lifecycle`,
`rfq`, `requisition-convert-to-purchase` (+`engineering-sample-requisition`,
só fixture).

### Documentações atualizadas

- `docs/arquitetura/API.md` — `POST /api/laboratory/tests` (G8, flag ignorada);
  `POST /api/quality/non-conformities` (G10, os 4 casos que geram aviso);
  `POST /api/rfqs` e `POST /api/rfqs/:id/award` (G12: estados cotáveis, saldo,
  novos erros 422/404, `requisition_id`/`requisition_status` na resposta);
  `POST /api/purchase-requisitions/:id/convert` (G12, saldo por item).
- `docs/projeto/04-USE_CASES.md` — UC-12 (regras do G16: dois caminhos com o
  mesmo rigor, `semi_finished` intencional, numeração serializada); UC-17
  (passo 6b do G10 + justificativa ISO 9001 8.7 de avisar em vez de recusar);
  UC-25 (passo 3b do G12); UC do teste de laboratório (G8).
- `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` — tabela "Registro
  de execução" preenchida, incluindo o **não-feito** (G6) e a avaliação do G15.
- `docs/governance/TODO.md` — entrada nova com decisões de desenho, riscos
  residuais e pendências abertas (client/, integração real).
- **`docs/database/DATABASE.md` NÃO precisou de atualização** — nenhuma
  migration, nenhum model alterado. O aviso do G10 usa `non_conformities.notes`,
  coluna já existente e até então não escrita por esse caso de uso.
- JSDoc atualizado/expandido em todos os casos de uso tocados, cada um citando
  o gap (`G8`, `G10`, `G12`, `G16`) e o comportamento anterior.

### Instruções de teste para o próximo agente/humano

1. **Regressão (já executada nesta rodada):** `npm run typecheck` limpo;
   `npx jest tests/unit` → **1295/1296**. A única falha,
   `module-authorization-map` (módulo `rh`), é do agente paralelo e já
   existia no baseline (1266/1267). Nenhuma falha nova.
2. **G16 contra Postgres real (o mais importante — SQL cru, invisível para os
   mocks):** com o banco no ar, criar duas OPs e conferir a sequência de
   `order_number`; depois **remover** a última OP (`DELETE /api/production/orders/:id`)
   e criar outra — o número **não pode** repetir um já usado (era exatamente o
   que o `COUNT` fazia). Em seguida, converter 2+ ordens planejadas em
   `POST /api/mrp/planned-orders/convert-to-production` e conferir que cada OP
   saiu com número próprio. Idealmente, disparar duas criações concorrentes e
   confirmar que nenhuma estoura violação de `UNIQUE` em `order_number`.
3. **G16 (regra):** tentar converter ordem planejada de item cujo produto não
   tem BOM ativa → 422 citando "estrutura (BOM) ativa"; e de item com BOM mas
   sem estoque de componente → 422 citando "material minimo disponivel", com
   `missing_items` no `details`. Confirmar que `semi_finished` continua
   convertível.
4. **G8:** `POST /api/laboratory/tests` com `result` fora da faixa e **sem**
   `create_rnc_on_fail` → conferir que a RNC foi criada e que
   `non_conformity_id` voltou no teste. Repetir com `create_rnc_on_fail: false`
   → mesmo resultado (flag ignorada). Aprovado (`passed = true`) não pode criar
   RNC.
5. **G10:** `POST /api/quality/non-conformities` com `lot_number` inexistente
   → RNC criada com `notes` contendo `[ATENCAO: NENHUM LOTE BLOQUEADO]`.
   Repetir com lote válido em `available` → lote vai para `blocked` e `notes`
   volta `null`. Repetir com `origin: "audit"` sem `product_id` → sem aviso.
6. **G12 (o cenário que o gap descreve):** requisição aprovada com 2 itens →
   criar RFQ dela → cotar → adjudicar **1** item. Conferir: pedido de compra
   criado, aquele item da requisição em `ordered`, requisição ainda
   `approved`. Em seguida `POST /api/purchase-requisitions/:id/convert` →
   deve gerar pedido **apenas do item restante**. Por fim, tentar adjudicar de
   novo o item já pedido → 422 com
   `details.requisition_item_ids_without_balance`.
7. **G12 (gate de aprovação — mudança de comportamento, validar com Compras):**
   adjudicar RFQ cuja requisição está `pending` agora responde 422. Se o fluxo
   real da empresa adjudicava antes de aprovar, isso aparece como regressão —
   é intencional, mas precisa de ciência de quem opera.
8. **Não testado (risco residual assumido):** integração real (Postgres) do
   consumo de saldo com dois clients concorrentes; e o caminho de falha da
   criação de RNC pós-commit do teste acústico (G8, transação separada).

## 2026-08-09 — BLOCO 6 RH: backend do escopo P0 (Férias, Experiência, Admissão, Demissão), passada 2/2 — `programador`

### Resumo da feature

Conclusão do backend do Bloco 6 (RH). A passada 1 morreu por queda de rede
e deixou `server/src/modules/rh/` com domínio, aplicação e infraestrutura
parciais e **nenhuma camada de apresentação** — o módulo existia mas era
inalcançável por HTTP, e a suíte tinha 1 falha (`module-authorization-map`
acusava a pasta `rh` sem cobertura de RBAC).

Esta passada entregou a camada de apresentação inteira, os 4 use cases de
férias que faltavam, a decisão normativa de RBAC do dono do produto, e
corrigiu 4 bugs que **nem o typecheck nem a suíte de 1400 testes pegavam** —
um deles impedia o servidor inteiro de subir e já estava commitado em
`main` desde `97628ae` (módulo Jurídico).

**Escopo:** apenas os RF P0 + os dois workflows de ciclo de vida que os
sustentam — Férias (UC-67, RF-RH-031 a 043), Contrato de Experiência
(UC-68, RF-RH-013 a 016), Admissão (UC-69, RF-RH-007 a 012), Demissão
(UC-70, RF-RH-017 a 023) e Documentos do Funcionário (RF-RH-027 a 030, que
é o gate de ASO de que UC-69/UC-70 dependem). **Afastamentos (UC-71) NÃO
entraram**: conferido na tabela de §1.8 dos requisitos, RF-RH-044 a 049 são
**P1**, não P0 (a única regra P0 que toca afastamento é RF-RH-041, o
zeramento do período aquisitivo, cujo use case existe e está testado — mas
segue sem gatilho até `Absence` existir).

**Endpoints: 34 implementados de ~77 do contrato** (Grupos 2 a 6 completos;
Grupos 1 e 7 a 15 são P1/P2, ficam para a passada 2).

### Arquivos criados

**Apresentação (toda nova):**
- `server/src/modules/rh/presentation/routes/rh.ts` — router agregador,
  34 rotas, montado em `/api/rh` por `server/app.ts`.
- `server/src/modules/rh/presentation/controllers/` — `admissionController`,
  `employeeContractController`, `terminationController`,
  `employeeDocumentController`, `vacationController`.
- `server/src/modules/rh/presentation/validators/` — `rhEnums.ts` (fonte
  única dos literais, com a tabela literal → migration de origem),
  `admissionValidators`, `employeeContractValidators`,
  `terminationValidators`, `employeeDocumentValidators`,
  `vacationValidators` (todos Zod `.strict()`).
- `server/src/modules/rh/presentation/middlewares/rhFileUpload.ts` —
  Multer em memória, 10MB, para documento do funcionário e TRCT.

**Aplicação/infraestrutura:**
- `application/services/EmployeeDirectoryService.ts` +
  `EmployeeDirectoryTypes.ts` + `infrastructure/adapters/
  EmployeeDirectoryServiceAdapter.ts` — porta única do módulo RH para
  `employees`.
- `application/use-cases/vacation/ListVacationSchedulesUseCase.ts`,
  `ConfirmVacationTakenUseCase.ts`, `GetVacationCalendarUseCase.ts`,
  `ReviseVacationScheduleUseCase.ts`.

**Domínio:**
- `domain/services/rhSensitiveFields.ts` — interseção de módulos para
  `Absence.cid` e `PayrollImportItem.bruto/liquido`.

**Testes (5 arquivos novos, +81 casos):**
`rh-vacation-use-cases`, `rh-contract-use-cases`,
`rh-admission-termination-use-cases`, `rh-sensitive-fields`,
`rh-validators`, mais `export-assignment-guard.test.ts` (guarda geral,
não é do RH).

### Arquivos alterados

- `server/app.ts` — monta `/api/rh`.
- `server/tests/unit/module-authorization-map.test.ts` — `rh` na lista de
  módulos que exigem `authorizeModule`.
- `domain/services/vacationRules.ts` — correção de citação legal (§2º →
  §3º), `calculateConcessiveEnd` com semântica de data do PostgreSQL, nova
  constante `VACATION_NOTICE_MIN_DAYS` (Art. 135).
- `domain/services/terminationRules.ts` — novo
  `calculateCompletedYearsOfService` (correção do aviso prévio).
- `domain/services/experienceContractAutoExpire.ts` — passa a converter
  também contratos `prorrogado`.
- `CreateVacationScheduleUseCase`, `ConcludeAdmissionProcessUseCase`,
  `ConcludeTerminationProcessUseCase` — usam `EmployeeDirectoryService` no
  lugar de `require('models/index')`.
- `DecideEmployeeContractUseCase` — `efetivar` virou transacional;
  `ExtendEmployeeContractUseCase` injetado em vez de `require` interno.
- `CreateTerminationProcessUseCase` — usa o novo cálculo de anos completos.
- Repositórios de férias (interface + Sequelize) — `transaction` opcional
  em `update`/`create`; `listOverlappingByDepartment` aceita `null`
  (calendário geral).
- 8 use cases de `rh` + `employees/DeactivateEmployeeUseCase.ts` +
  `juridico/ApproveContractUseCase.ts` — `export interface` → interface
  local (ver "bugs de runtime").

### 4 bugs que passavam por typecheck E por 1400 testes

1. **`export =` convivendo com `export interface` derruba o servidor.**
   O `tsx`/esbuild transpila o arquivo em modo ESM e o `export =` vira
   referência a `<Nome>_module`, que nunca é declarada →
   `ReferenceError` no `require`. `tsc --noEmit` aceita (interface é
   apagada na emissão) e o Jest também (transform CJS). Como `app.ts` faz
   `require` de todos os routers no boot, **um arquivo assim derruba a
   aplicação inteira**. Afetava 10 arquivos, incluindo
   `juridico/ApproveContractUseCase.ts`, **já commitado em `main` desde
   `97628ae`** — ou seja, `require('./app')` estava quebrado antes desta
   entrega. Corrigido em todos e coberto por
   `tests/unit/export-assignment-guard.test.ts`, que varre `src/` inteiro.
   Verificação final: `require('./app')` sobe, 63 layers, `/api/rh`
   montado.
2. **Aviso prévio proporcional 3 dias menor do que a lei garante.**
   `Math.floor(dias / 365,25)` dá 9 para exatamente 10 anos de casa (3652
   dias), sugerindo 57 em vez de 60 dias (Lei 12.506/2011, parágrafo
   único). Substituído por comparação de aniversário de calendário.
3. **`calculateConcessiveEnd` violaria CHECK do Postgres.** `2028-02-29`
   + 1 ano dava `2029-03-01` em JS e `2029-02-28` no Postgres; a migration
   `20260808-000018` exige igualdade exata. Todo admitido em 29/02
   quebraria em runtime.
4. **Contrato de experiência prorrogado nunca vencia sozinho.** A
   verificação ativa só olhava `status='ativo'` — justamente o cenário do
   Art. 451 (prorrogação vencida em silêncio vira prazo indeterminado)
   ficava de fora.

### Verificação legal — feita na FONTE, não na paráfrase

O texto integral da CLT foi baixado de
`planalto.gov.br/ccivil_03/decreto-lei/del5452.htm` (com retomada em
várias tentativas, a rede caiu 8 vezes) e a Lei 12.506/2011 de
`planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12506.htm`. Conferidos
literalmente: **Art. 130 I-IV**, **133 II e IV**, **134 caput/§1º/§3º**,
**135 caput**, **137 caput**, **143 caput e §1º**, **445 parágrafo
único**, **451**, **477 §6º e §8º** e a Lei 12.506/2011 art. 1º.

**Divergência de citação encontrada — a lei ganhou:** a vedação de início
de férias nos 2 dias que antecedem feriado/DSR é o **Art. 134 §3º**
(incluído pela Lei 13.467/2017), **não o §2º** — o §2º foi **revogado** por
essa mesma lei (era a vedação de fracionamento por idade). Os requisitos, o
contrato de API, o código da passada 1 e o próprio enunciado desta tarefa
diziam "§2º". Corrigido no código e sinalizado aqui.

**Divergência lei × requisito NÃO resolvida em código (precisa do dono do
produto):** o **Art. 135 caput** fixa 30 dias como antecedência **mínima
obrigatória** do aviso de férias; RF-RH-037 e §8.3 do contrato de API
mandam **aceitar** antecedência menor "com justificativa", sem bloquear.
Mantive o comportamento do requisito — o ERP registra um aviso já dado, ele
não emite o aviso, e bloquear impediria o RH de registrar um fato
consumado — mas o `warning` da resposta passou a dizer explicitamente que
se trata de descumprimento de mínimo legal, citando o artigo. Se o dono
preferir bloquear, é uma linha em `CreateVacationScheduleUseCase`.

**Gap legal declarado:** feriados não são verificados (Art. 134 §3º cobre
"feriado **ou** DSR"; só o DSR é checado, assumindo domingo). O ERP não tem
calendário de feriados em nenhum módulo e nenhum RF do bloco pede um.

### Decisões normativas do dono do produto implementadas

1. **RBAC (fecha o achado 10 da auditoria — Opção C).** `rh:approve` ficou
   **exclusivamente** para 2 ações de alto impacto: concluir demissão
   (RF-RH-022) e `decision='rescindir'` de contrato de experiência
   (RF-RH-016; middleware condicional no router, que delega ao próprio
   `authorizeModule` para não reimplementar níveis/admin/auditoria de
   negação). Os 2 campos sensíveis usam **interseção de módulo** com
   **omissão de campo**, nunca 403 de rota: `hr_absences.cid` exige `rh` E
   `sst`; `hr_payroll_import_items.bruto/liquido` exige `rh` E
   `financeiro`; `admin` vê tudo. Implementado e testado em
   `domain/services/rhSensitiveFields.ts` — **sem consumidor ainda**, já
   que `Absence` e `PayrollImport` são P1; existe agora para que a passada
   2 não re-decida isso.
2. **Treinamento normativo — SST é fonte única:** fora do escopo P0
   (RF-RH-055 a 059 são P1). Nada foi implementado; a recomendação do
   `AuditorIntegrador` (delegar o "quem não pode operar" normativo para
   `GET /api/sst/trainings/blocklist`) segue pendente de decisão.
3. **Demissão formal obrigatória:** `DELETE /api/employees/:id` bloqueado
   com 422 quando existe `HrTerminationProcess` aberto. O guard veio da
   passada 1 e foi conferido — está completo (4 casos de teste, incluindo
   compatibilidade quando nenhum checker é injetado).

### Literais de enum conferidos (requisito de aceite)

Todos os literais de status/enum usados em validators, use cases e
repositórios foram conferidos contra o `Sequelize.ENUM(...)` da migration
que cria a coluna. Além da conferência manual, isso virou teste
automatizado: `tests/unit/rh-validators.test.ts` **lê os arquivos de
migration** e compara literal a literal com cada `z.enum([...])` de
`rhEnums.ts` (14 pares). Nenhum literal errado foi encontrado no código da
passada 1 — mas dois erros de literal **na documentação** foram:

- `"work_regime": "experiencia"` no exemplo de §4.3 do contrato de API é
  inválido (`employees.work_regime` = `clt|pj|estagiario|aprendiz`).
  Experiência é tipo de CONTRATO. Coberto por teste dedicado.
- `hr_termination_processes.status` usa `concluido`/`cancelado`
  (masculino) enquanto `hr_admission_processes.status` usa
  `concluida`/`cancelada` — assimetria real do schema, fácil de errar.
  Também virou teste.

### Documentações atualizadas

- `docs/projeto/04-USE_CASES.md` — nova seção "UC-67 a UC-70
  (implementado — BLOCO 6 RH, escopo P0)", com a base legal artigo a
  artigo, o desenho de RBAC e a reconciliação com `DELETE /api/employees/:id`.
- `docs/database/DATABASE.md` — nova seção "BLOCO 6 RH — Models Sequelize
  dos fluxos P0", listando os 8 models criados, as 2 colunas novas em
  `employees` e, principalmente, as **4 restrições de banco que a aplicação
  precisa respeitar** (CHECKs de data, coluna gerada `payment_deadline`,
  CHECK de checklist, triggers de imutabilidade).
- `docs/governance/TODO.md` — entrada 2026-08-09 com entregue / bugs /
  divergências / lacunas do contrato / pendente P1-P2 / riscos residuais.
- **JSDoc** de cabeçalho em todos os arquivos novos, e nos alterados um
  bloco explicando *por que* mudou (cada regra legal cita o artigo).

### Instruções de teste para o próximo agente/humano

1. **Regressão (já executada nesta rodada):** `npm run typecheck` limpo;
   `npx jest tests/unit` → **1402/1402** (baseline era 1266/1267 com 1
   falha). Reexecutar.
2. **Boot real (já executado):** `require('./app')` sobe e `/api/rh` fica
   montado. Vale repetir depois de qualquer merge — foi essa checagem que
   revelou os 3 arquivos com `export =` quebrado.
3. **Primeiro teste com Postgres real — aplicar as migrations
   `20260808-000010..025` (ainda NÃO aplicadas) e exercitar, nesta ordem:**
   a. `POST /api/rh/admission-processes` → `PATCH .../aso-confirmation`
      (`apto`) → `POST .../conclude`. Confirmar que **em uma transação**
      nasceram `employees`, `hr_employee_contracts`,
      `hr_employee_job_history` e `hr_vacation_accrual_periods`. **Testar
      com `hire_date = 2028-02-29`** — é o caso que valida a correção dos
      CHECKs de data.
   b. `PATCH /api/rh/employee-contracts/:id/extend` duas vezes: a segunda
      deve dar 422 pela aplicação (Art. 451) **e** o trigger
      `hr_lock_employee_contract` deve barrar caso algo escape.
   c. `POST /api/rh/vacation-schedules` com 4 frações, com fração de 4
      dias, com abono de 11/30 dias e com início numa sexta-feira — cada um
      deve dar 422 com o `code` específico.
   d. `POST /api/rh/vacation-schedules/:id/revise` — conferir que a versão
      antiga vira `cancelado` com `revision_reason` e ganha
      `superseded_by_id`, e que o `DELETE` continua barrado pelo trigger.
   e. `POST /api/rh/termination-processes/:id/conclude` com um ativo ainda
      em `Asset.responsible_id` (deve dar 422) e depois sem ativo (deve
      gravar `employees.status='fired'` **e** `users.active=false` na mesma
      transação). Conferir que `payment_deadline` foi calculado **pelo
      banco**, não pela aplicação.
   f. `DELETE /api/employees/:id` com um `TerminationProcess` aberto → 422.
4. **RBAC:** com um perfil que tenha `rh:operate` (sem `approve`),
   confirmar 403 `APPROVAL_LEVEL_REQUIRED` em
   `POST /termination-processes/:id/conclude` e em
   `PATCH /employee-contracts/:id/decision` com `{"decision":"rescindir"}`,
   e 200 no mesmo endpoint com `{"decision":"efetivar"}`.
5. **Não testado, fora do escopo:** nenhuma tela em `client/`; os grupos
   P1/P2 do contrato de API; e a integração real com o módulo SST
   (`SstAsoServiceAdapter` só é usado como valor informativo em
   `request-aso`, o gate real é o snapshot em `hr_employee_documents`).

---

## 2026-08-09 — Cadeia do produto, Onda 2: G3 — reserva de material vinculada à ordem — `programador`

### Resumo da feature

Fecha o **G3**, o gap de maior risco operacional da cadeia do produto: a
reserva de material de uma Ordem de Produção deixou de ser um **contador
global no produto** e passou a ser um **registro vinculado à ordem**.

Antes: `inventoryService.reserveStock` fazia
`product.increment('reserved_quantity')`. Nenhum vínculo com a OP. A
liberação (`releaseReservedQuantity`) usava `MIN(reservado_total, desejado)`
sobre esse contador — ou seja, **qualquer OP conseguia liberar e, na
sequência, consumir o material reservado por outra** (canibalização). E não
havia como responder "quanto deste item está reservado para a OP X?".

Agora a fonte da verdade é `production_order_reservations` (OP × produto ×
quantidade reservada × quantidade liberada). `products.reserved_quantity`
continua existindo como **cache derivado**, recalculado na mesma transação.

**Desenho e por quê:**

| Decisão | Motivo |
|---|---|
| Tabela própria como fonte da verdade, cache mantido | Não quebrar nenhum leitor existente de `reserved_quantity` (havia 5 caminhos vivos, listados abaixo) |
| FK real e dura para `production_orders` em vez de par polimórfico (tipo + id) | **Venda não reserva** neste ERP — consome direto. Par polimórfico impediria integridade referencial, que é padrão do projeto (159+ FKs) |
| `quantity` imutável + `quantity_released` acumulando (em vez de decrementar) | Preserva histórico auditável; mesmo padrão de `sale_items.invoiced_quantity` |
| Cache **recalculado** (soma) e não incrementado | Torna o cache auto-corrigível: divergência herdada some na primeira operação daquele produto |
| Soma feita em memória, não com `SUM()` no banco | O conjunto é minúsculo (uma linha por OP aberta) e evita expressão SQL literal — a classe de erro que só aparece em runtime contra o Postgres |
| Liberação **integral da própria reserva** em vez de reexplodir a BOM | A BOM pode ter mudado entre liberar e concluir; reexplodir prendia a diferença para sempre |
| `productionOrderId` obrigatório em `reserve`/`releaseReservation` | Reserva anônima é o próprio bug — sem dono não há como impedir a canibalização |

### Consumidores de `reserved_quantity` encontrados e como cada um foi preservado

| Consumidor | Uso | Situação |
|---|---|---|
| `services/inventoryService.validateAndLock` | `available = quantity - reserved` (bloqueia consumo/reserva acima do livre) | **Preservado** — lê o cache, que continua correto |
| `modules/items/.../SequelizeItemRepository` (dual-read) | Alimenta `Item.estoque_reservado` com o valor vivo de `products.reserved_quantity` | **Preservado** |
| `modules/mrp/.../GenerateMrpPlanUseCase` | `reserved: Number(item.estoque_reservado)` no cálculo da necessidade líquida | **Preservado** (via dual-read acima) |
| `client/src/pages/products/ItemMasterDetailPage.tsx` + `client/src/api/items.ts` | Campo "Estoque reservado" na tela do item | **Preservado** — nenhuma alteração em `client/` |
| `ChangeProductionOrderStatusUseCase.releaseReservedQuantity` | `MIN(reserved_quantity_global, desejado)` — **este era o bug** | **Substituído** por liberação escopada na reserva da própria OP |
| `scripts/backfill/02b_product_to_item.ts` | Migração histórica Product→Item | Intocado (script legado, já executado) |
| `models/Product.ts`, `types/models.d.ts`, `database/postgresql/01_schema.sql` | Definição da coluna | Intocados; a semântica nova está no `COMMENT ON COLUMN` aplicado pela migration |

### Arquivos alterados

**Banco**
- `server/migrations/20260809-000026-create-production-order-reservations.cjs` **(novo, NÃO aplicado)**
- `server/src/models/ProductionOrderReservation.ts` (novo)
- `server/src/models/index.ts` (import, 3 associações, export)

**Domínio / aplicação**
- `server/src/services/inventoryService.ts` — `reserve`/`releaseReservation` escopados por OP + `releaseAllReservationsForOrder`, `listOrderReservations`, `recalculateReservedCache`; removidos 2 stubs mortos (`previousReserve`, `previousReleaseReservation`) cujo JSDoc afirmava que a coluna `reserved_quantity` "ainda não existe"
- `server/src/modules/production/application/use-cases/ChangeProductionOrderStatusUseCase.ts` — 3 métodos de liberação (2 reexplodindo BOM + 1 com `MIN` global) reduzidos a `releaseOwnReservations`
- `server/src/modules/production/application/use-cases/RemoveProductionOrderUseCase.ts` — bloqueia remoção de OP com reserva ativa
- `server/src/modules/production/domain/repositories/ProductionOrderRepository.ts` e `.../infrastructure/sequelize/SequelizeProductionOrderRepository.ts` — `countActiveMaterialReservations`

**Backfill**
- `server/src/scripts/backfill/05_production_order_reservations.ts` (novo)

**Testes**
- `server/tests/unit/production-order-material-reservation.test.ts` (novo, 17 casos)
- `server/tests/unit/inventory-service-contract.test.ts` (novo)
- `server/tests/unit/production-order-lifecycle.test.ts`, `production-labor-overhead-cost.test.ts`, `warehouse-stock.test.ts` — mocks de `inventoryService` completados (estavam incompletos) + 1 caso novo de conclusão

### Documentações atualizadas

- `docs/database/DATABASE.md` — seção "G3 — Reserva de material vinculada à Ordem de Produção (2026-08-09)": tabela, colunas, FKs, índice único parcial, CHECKs, rebaixamento de `reserved_quantity` a cache, escopo declarado e limites do backfill
- `docs/database/04-DICIONARIO_DADOS.md` — aviso de "pendente de regeneração" (o arquivo é gerado por introspecção; a tabela ainda não existe no banco, e descrevê-la ali seria mentir sobre o schema aplicado)
- `docs/projeto/04-USE_CASES.md` — UC-12: tabela de efeito na reserva por transição de status + as 4 invariantes garantidas
- `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` — registro de execução da Onda 2
- `docs/governance/TODO.md` — entrada com escopo declarado fora e 5 riscos residuais
- JSDoc: cabeçalho de módulo de `inventoryService`, todas as funções novas, `ProductionOrderReservation`, `releaseOwnReservations`, `countActiveMaterialReservations`, e o cabeçalho da migration (que carrega o racional completo do desenho)

### Como testar (o próximo agente ou humano)

**Antes de qualquer coisa — a ordem importa:**

1. Aplicar a migration: `cd server && npm run migration:up`
   (confira `npm run migration:status`: deve aparecer
   `20260809-000026-create-production-order-reservations.cjs`).
2. Rodar o backfill **em dry-run** e **ler o relatório**:
   `npx tsx server/src/scripts/backfill/05_production_order_reservations.ts`
   Preste atenção em duas listas: OPs vivas sem BOM ativa (não serão
   reconstruídas) e divergências entre o contador antigo e a soma das
   reservas (diferença negativa = contador estava inflado; aquele material
   estava indisponível sem dono).
3. Só então: `... 05_production_order_reservations.ts --apply`.

⚠️ **Não pule o passo 3.** Enquanto o backfill não rodar, produto com
`reserved_quantity` inflado herdado tem menos disponibilidade do que deveria
e pode recusar a liberação de OP nova — há teste unitário provando esse
comportamento (`cache inflado sem reserva por tras bloqueia reserva nova`).

**Roteiro funcional (o que de fato prova o G3):**

1. Dois produtos acabados A e B que compartilhem o mesmo componente C, com
   BOM ativa nos dois. Deixe o estoque de C **apertado** de propósito
   (ex.: 100 un, e cada OP precisando de 60).
2. Crie e libere a **OP-A** (`PUT /api/production/orders/:id/status`,
   `{"status":"released"}`). Confira: `SELECT * FROM
   production_order_reservations WHERE production_order_id = <OP-A>` traz a
   linha de C, e `products.reserved_quantity` de C ficou igual à soma.
3. Tente liberar a **OP-B**: deve dar **422** listando C como faltante —
   o material da OP-A não pode ser oferecido para a OP-B.
4. Cancele a OP-A (`{"status":"canceled"}`). A reserva vira `released`,
   `reserved_quantity` de C volta a 0, e agora a OP-B **libera**.
5. Conclua a OP-B com `lot_consumptions` válidos. Confira que a reserva dela
   foi liberada **antes** do consumo e que sobrou reserva zero.
6. Tente `DELETE /api/production/orders/:id` de uma OP em `released`:
   deve dar **erro de negócio** mandando cancelar antes. Cancele e apague de
   novo: agora passa.
7. **Regressão dos leitores** (é onde um erro passaria despercebido):
   com a OP-A liberada, confira que `GET /api/items/:id` mostra
   `estoque_reservado` de C batendo com a soma das reservas, que a tela de
   detalhe do item no `client/` mostra o mesmo número, e que o MRP
   (`POST /api/mrp/...`) considera esse reservado na necessidade líquida.

**Regressão automatizada já rodada:**
`npm run typecheck` limpo · `npx jest tests/unit` **1430/1430** (baseline
1402/1402) · `npx tsx -e "require('./app')"` sobe sem erro.

### O que **não** foi feito (deliberado)

- Vendas continuam **sem** reserva (consomem direto) — declarado como fora de
  escopo, não esquecido.
- Nenhuma rota HTTP expõe a reserva por OP ainda (`listOrderReservations`
  existe no serviço, sem controller) — não havia consumidor pedindo.
- Nenhuma alteração em `client/`.
- Migration **não aplicada**, por instrução explícita.

---

# HANDOFF — Cadeia do produto, Onda 2: gaps G14 e G15 (2026-08-09)

**Plano:** `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`
**Antecessores:** G2 (`5ec0651`), G16/G8/G10/G12 (`0d5812e`), G3 (`fed3129`).
**Estado:** working tree, **sem commit**, **migration não aplicada**.

## 1. Resumo da feature

Dois gaps que deixavam a corrente insumo → produto aberta em pontos
diferentes:

**G14 — a importação entrava fora do padrão de rastreabilidade.**
`ReceiveImportProcessUseCase` dava entrada do material importado mexendo em
`products.quantity` e no custo médio, mas **sem criar lote, sem quarentena e
sem dual-write de depósito**. Insumo importado entrava no estoque sem
rastreabilidade por lote e sem gate de qualidade — podia ser consumido pela
produção sem nunca ter sido liberado, enquanto o mesmo insumo comprado no
Brasil ficava retido. A correção **extraiu** o caminho já testado do
recebimento de compra para `services/materialReceiptService.ts`
(`receiveMaterialIntoQuarantine`: estoque → depósito → lote nascendo em
`quarantine` → custo real, tudo na mesma transação) e fez os **dois** caminhos
chamarem a mesma função, em vez de a importação manter uma cópia degradada.
De quebra, o rastro de origem parou de mentir: `reference_type`/`source_type`
saíram de `'purchase'` (que fazia a consulta reversa por
`(reference_type, reference_id)` cair num pedido de compra alheio de id
coincidente) para `'import'`.

**G15 — estados mortos no ENUM da requisição.** `partial` e `received`
existiam em `purchase_requisitions.status` e **nenhuma rotina jamais os
atingia**: a requisição morria em `ordered` e ninguém conseguia responder
"esta requisição foi atendida?". Passaram a ser gravados pelo recebimento do
pedido de compra, que é o único ponto que sabe o que de fato chegou.

## 2. Decisões de desenho (com o porquê)

| Decisão | Por quê |
|---|---|
| **Extrair o caminho de recebimento em vez de copiá-lo** | Duas cópias do mesmo processo divergem — foi exatamente assim que a importação nasceu sem quarentena. O comportamento do lado de compras não mudou (há teste-guarda de regressão). |
| **Gateway de lote injetado** (`findLotForReceipt`/`createLot`) em vez de usar `LotControl` direto no serviço | Os dois consumidores já são módulos Clean Architecture com repositório próprio; ambos satisfazem o contrato estruturalmente. Mantém o serviço testável com repositório mockado e não abre uma segunda porta direta ao ORM. |
| **Lote de importação sem coluna `import_process_id` nova** | O vínculo forte já existe via `inventory_movements(reference_type='import', reference_id)`. Uma FK nova numa tabela de rastreabilidade em uso exigiria migração de dado sem ganho de consulta real hoje. O número do processo fica embutido no `lot_number`. |
| **Depósito fixo `INSUMOS` na importação** | O endpoint de recebimento de importação não tem body, e importação neste ERP é de matéria-prima/componente. Ampliar o contrato por hipótese seria superfície sem consumidor. Se um dia entrar acabado importado, o caminho é acrescentar `warehouse_code` ao validator, igual ao recebimento de compra. |
| **Criar migration de ENUM (`'import'`) em vez de continuar com `'purchase'`** | Não era imprecisão de nomenclatura: o índice `(reference_type, reference_id)` existe para a consulta reversa, e com `'purchase'` ela devolvia o pedido de compra ERRADO. `ALTER TYPE ... ADD VALUE` é aditivo e retrocompatível. |
| **G15: acionar `partial`/`received`, não removê-los** | O rastro requisição → pedido → recebimento é requisito de auditoria fiscal declarado (`CLAUDE.md` §7). Sem esses estados, a única forma de saber se a requisição foi atendida é abrir cada pedido gerado, um a um. |
| **Requisição `approved` com saldo NÃO é tocada pelo recebimento** | A decisão mais importante da entrega. `approved` é o estado que autoriza cotar/converter o restante — `CreateRfqUseCase`/`AwardRfqUseCase` bloqueiam `partial`/`received` desde o G12. Empurrá-la para `partial` num recebimento parcial deixaria o saldo remanescente **impossível de comprar**: trocaríamos um estado morto por um travamento real de processo. Não abre buraco: quando o último saldo vira pedido ela passa a `ordered`, e o recebimento desse pedido fecha em `received`. |
| **Recálculo total, nunca incremental** | O resultado não pode depender da ordem em que os recebimentos aconteceram. A regra olha o quadro inteiro (status de todos os pedidos + saldo dos itens) toda vez. |
| **`PATCH /:id/status` continua sem alcançar `ordered`/`partial`/`received`** | São fatos derivados. Permitir marcá-los à mão seria um jeito de declarar "requisição atendida" sem nada ter chegado ao estoque. |

## 3. Arquivos alterados

**Código novo**
- `server/src/services/materialReceiptService.ts` — caminho único de entrada de material comprado.
- `server/src/modules/purchases/application/services/syncRequisitionReceiptStatus.ts` — regra pura do G15.
- `server/migrations/20260809-000027-add-import-origin-to-inventory-and-cost-enums.cjs` — **NÃO aplicada**.

**Código alterado**
- `server/src/modules/comex/application/use-cases/ReceiveImportProcessUseCase.ts` — passa pelo caminho único; lote + quarentena + depósito; `reference_type='import'`.
- `server/src/modules/comex/domain/repositories/ComexRepository.ts` e `.../infrastructure/sequelize/SequelizeComexRepository.ts` — gateway de lote.
- `server/src/modules/purchases/application/use-cases/ReceivePurchaseItemsUseCase.ts` — usa o serviço extraído; sincroniza a requisição de origem.
- `server/src/modules/purchases/domain/repositories/PurchaseRepository.ts` e `.../infrastructure/sequelize/SequelizePurchaseRepository.ts` — 4 métodos novos (lock da requisição, status dos pedidos, status dos itens, update do status).
- `server/src/modules/purchases/presentation/controllers/purchaseController.ts` — expõe `requisition_status` e registra no log de auditoria.
- `server/src/modules/purchaseRequisitions/application/use-cases/ChangePurchaseRequisitionStatusUseCase.ts` — JSDoc: tabela de quem grava cada status.
- `server/src/models/InventoryMovement.ts`, `server/src/models/ProductCostLedger.ts`, `server/src/services/costingService.ts`, `server/src/modules/inventory/domain/entities/InventoryMovementEntity.ts`, `server/src/modules/inventory/presentation/validators/inventoryValidators.ts` — valor `'import'` sincronizado.

**Testes**
- `server/tests/unit/material-receipt-quarantine.test.ts` (novo, 4 casos).
- `server/tests/unit/requisition-receipt-status.test.ts` (novo, 15 casos).
- `server/tests/unit/comex.test.ts` (+4 casos G14, mock de `warehouseStockService` corrigido).
- `server/tests/unit/engineering-sample-requisition.test.ts` (a "cadeia completa" agora prova a requisição chegando em `received`).

## 4. Documentações atualizadas

- `docs/arquitetura/API.md` — §13 (`POST /api/purchases/:id/receive`: caminho único + `requisition_status`), §15 (máquina de status da requisição, tabela de quem grava o quê), §32 (recebimento de importação: 4 passos, lote/quarentena, `reference_type='import'`, pendência do G13).
- `docs/projeto/04-USE_CASES.md` — UC-19 (passos 6 e 7, correção do G14, pendência do G13) e UC-23 (estados derivados + regra do G15).
- `docs/database/DATABASE.md` — seções novas "G14 — Origem `import`..." e "G15 — fim dos estados mortos".
- `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` — registro de execução de G14/G15; escopo do G13 ampliado para incluir os tributos de importação.
- `docs/governance/TODO.md` — entrada completa com pendências e riscos residuais.
- JSDoc: cabeçalhos completos em `materialReceiptService.ts`, `syncRequisitionReceiptStatus.ts`, `ReceiveImportProcessUseCase.ts`, `ChangePurchaseRequisitionStatusUseCase.ts`, `ReceivePurchaseItemsUseCase.syncRequisitionStatus` e nos métodos novos dos dois repositórios.

## 5. Instruções de teste

**Pré-requisito operacional:** aplicar as migrations `20260809-000026` (G3) e
`20260809-000027` (G14) **antes** de rodar qualquer coisa contra o banco. Sem a
`000027`, o recebimento de importação retorna **500** (ENUM inválido no
Postgres) — o código já grava `'import'`.

**Roteiro funcional do G14 (importação):**
1. Cadastre um fornecedor e um `Item` com `Product` legado correspondente
   (`products.code = items.codigo`).
2. `POST /api/comex/import-processes` com 1 item, câmbio e alíquotas.
3. `POST /:id/tracking` três vezes: `shipped` → `arrived` → `customs_cleared`.
4. `POST /:id/receive` (sem body).
5. **Confira:**
   - `SELECT * FROM lot_controls WHERE lot_number LIKE 'IMP-%'` → existe um
     lote com `status='quarantine'`, `supplier_id` do processo, `purchase_id`
     nulo, `warehouse_id` do depósito `INSUMOS`;
   - `SELECT reference_type, reference_id FROM inventory_movements ORDER BY id
     DESC LIMIT 1` → `('import', <id do processo>)`;
   - `product_warehouse_stocks` do produto no depósito `INSUMOS` subiu na
     mesma quantidade que `products.quantity` (invariante §12 item 3);
   - `product_cost_ledgers.source_type = 'import'`.
6. **O teste que prova o gate de qualidade:** crie uma OP que consuma esse
   produto e libere-a. O FEFO **não pode** consumir o lote em quarentena.
   Depois `POST /api/inventory/lots/:id/release` e repita — agora consome.

**Roteiro funcional do G15 (requisição):**
1. Crie uma requisição com **2 itens**, aprove-a
   (`PATCH /api/purchase-requisitions/:id/status`, `approved`).
2. `POST /api/purchase-requisitions/:id/convert` → gera o(s) pedido(s); a
   requisição vai para `ordered`.
3. Aprove e envie o pedido (`sent`), depois receba **parcialmente**
   (`POST /api/purchases/:id/receive` com quantidade menor que a pedida).
   → resposta traz `requisition_status: "partial"`; confira no banco.
4. Receba o **saldo**. → `requisition_status: "received"`. A requisição agora
   responde "fui atendida".
5. **Caso que não pode regredir:** com 2 pedidos da mesma requisição, receba o
   segundo **antes** de completar o primeiro — a requisição deve continuar
   `partial`, nunca voltar de `received` para `partial` por ordem de chegada.
6. **Caso que não pode travar (o mais importante):** requisição aprovada com
   2 itens, converta/adjudique **só um**; receba o pedido desse item. A
   requisição deve continuar **`approved`** (não `partial`), e você deve
   conseguir cotar/converter o item restante normalmente. Se ela virar
   `partial`, o saldo fica impossível de comprar — é o cenário que essa regra
   existe para evitar.
7. Tente `PATCH /:id/status` com `received` → deve ser recusado (o schema Zod
   só aceita `approved`/`canceled`/`pending`).

**Regressão automatizada já rodada:**
`npm run typecheck` limpo · `npx jest tests/unit` **1453/1453** (baseline
1430/1430) · `npx tsx -e "require('./app')"` sobe sem erro.

## 6. O que **não** foi feito (deliberado) e riscos residuais

- **Conta a pagar dos tributos de importação — NÃO implementada.** É o **G13**
  (Onda 3, decisão do dono): o momento de reconhecimento do passivo vale para
  compra nacional e importação ao mesmo tempo, e criar uma regra só para COMEX
  geraria um segundo padrão contábil dentro do mesmo ERP. Os tributos ainda
  têm fatos geradores e vencimentos distintos entre si, e `AccountPayable` não
  suporta moeda estrangeira. O escopo do G13 no plano foi ampliado para
  registrar isso.
- **Migration `20260809-000027` não aplicada** (instrução explícita). Aplicar
  na mesma janela da `000026`.
- **Dado histórico não migrado:** movimentações/ledgers de importação
  anteriores continuam com `'purchase'` (sem backfill automático possível), e
  requisições já `ordered` com todos os pedidos recebidos antes desta mudança
  continuam `ordered` (o gatilho é o recebimento, e ele já passou).
- **Sem teste de integração contra Postgres real** do valor novo de ENUM, do
  lote de importação e do lock da requisição — limitação estrutural apontada
  no princípio 2 do plano.
- **Ordem de lock inversa** entre recebimento (pedido → requisição) e
  conversão (requisição → pedidos): teoricamente sujeito a deadlock sob
  concorrência alta; o Postgres detecta e aborta uma das transações, e as duas
  operações são curtas.
- **Nada em `client/`** — a tela de COMEX ainda não existe, e nenhuma tela
  exibe o status novo da requisição depois do recebimento. Escopo dos agentes
  de frontend.

---

# Handoff — Validação ponta a ponta da cadeia do produto (2026-08-10)

## 1. Resumo da feature

Não é feature de produto: é o **teste de integração real** que faltava para provar
o critério de aceite do dono ("um insumo é cadastrado e segue seu curso até virar
produto finalizado, sem gap"). Um único arquivo percorre as 10 estações da corrente
contra API + PostgreSQL rodando, sem mock, e exercita os 8 gates de regressão dos
gaps corrigidos em 2026-08-09.

**Arquivo:** `server/tests/integration/e2e-cadeia-insumo-produto.test.ts` (26 casos,
convenção `tests/integration`: `RUN_INTEGRATION=true` + `TEST_API_URL` +
`TEST_AUTH_TOKEN`, gate `hasIntegrationPrerequisites()`).

**Nenhuma linha de código de produção foi alterada.** Onde a corrente quebrou, o
teste registra a quebra e segue com um contorno explicitamente marcado no próprio
código (`Contorno BUG-0x`), para não perder as estações seguintes.

**Resultado:** 22/26 no ambiente real (banco `erp_evok_audio`); 6/26 no banco
isolado `erp_evok_audio_test` (que está mais divergente que o de dev — ver §5 do
relatório). 8 das 10 estações fecham; 8/8 gates provados fechados; **5 bugs novos
P0/P1**, todos de divergência schema × model.

## 2. Documentações atualizadas

- **`docs/governance/VALIDACAO_CADEIA_PRODUTO_2026-08-10.md`** (novo) — relatório
  completo: estação por estação (✅/❌/⚠️), erro exato + causa raiz de cada quebra,
  tabela dos 8 gates com a resposta real da API, achado de governança sobre o drift
  de schema, achados menores e **script de limpeza dos dados `E2E-*`**.
- **`docs/governance/TODO.md`** — seção "2026-08-10", com BUG-01 a BUG-05 e o item
  de drift de schema como pendências abertas.
- **JSDoc** — o arquivo de teste está documentado no padrão do projeto: cabeçalho de
  módulo explicando a corrente e os gates, e JSDoc em todos os helpers
  (`expectStatus`, `createBomDirectly`, geradores de CPF/CNPJ) e nos três contornos,
  cada um dizendo o que **não** prova.

Não houve alteração em `docs/database/DATABASE.md` nem em
`docs/projeto/04-USE_CASES.md`: nenhum model, migration ou regra de negócio foi
modificado nesta entrega.

## 3. Instruções de teste (o que o próximo agente/humano deve validar)

1. **Reproduzir a validação** (com o ambiente no ar, `docker compose ps` saudável):
   emitir um JWT para o admin existente com o `JWT_SECRET` da raiz e rodar,
   a partir de `server/`:
   ```
   RUN_INTEGRATION=true TEST_API_URL=http://127.0.0.1:5000 \
   TEST_AUTH_TOKEN=<jwt> DB_NAME=erp_evok_audio \
   npx jest --runInBand tests/integration/e2e-cadeia-insumo-produto.test.ts --forceExit
   ```
   Esperado hoje: **4 falhas** — `etapa 2` (BOM), `etapa 9a` (cliente), `etapa 9b`
   (venda) e `etapa 9c` (confirmação/AR). Qualquer falha **além** dessas quatro é
   regressão nova.
2. **Confirmar os 4 bugs P0 no banco** (leitura, não escreve):
   ```sql
   SELECT table_name||'.'||column_name FROM information_schema.columns
    WHERE table_schema='public' AND is_nullable='NO' AND column_default IS NULL
      AND (table_name,column_name) IN
        (('bill_of_material_items','parent_item_id'),('clients','cnae'),
         ('sales','nfe_number'),('accounts_receivable','payment_date'));
   ```
   As 4 linhas devem aparecer — é a causa raiz.
3. **Confirmar BUG-05:** `docker compose logs api | grep "Falha ao gravar audit log"`
   deve mostrar `invalid input value for enum enum_audit_logs_action` para
   `update_status`, `convert`, `register_tracking` e `receive`.
4. **Depois da correção** (migration `DROP NOT NULL` + `ALTER TYPE ... ADD VALUE`):
   remover os três contornos do teste (`etapa 2 (contorno...)`,
   `etapa 9a (contorno...)`, `etapa 9b/9c (contorno...)`) e exigir **26/26 verdes,
   sem contorno nenhum**. Esse é o critério de aceite final da cadeia.
5. **Banco de teste:** `erp_evok_audio_test` recebeu as 100 migrations que faltavam
   (50 → 150). Ele continua com 29 `NOT NULL` a mais que o dev — recriar do zero
   apenas por migrations antes de confiar em `npm run test:integration:strict`.

## 4. Riscos residuais desta entrega

- **Dados `E2E-*` no banco do dono:** 4 execuções deixaram ~90 linhas identificáveis
  (contagem e script de remoção na §8 do relatório). Nada foi apagado nem alterado
  do que já existia; nenhum usuário foi criado ou teve senha alterada em
  `erp_evok_audio`.
- **O usuário sintético `ci-admin@evok.local`** existe apenas em
  `erp_evok_audio_test` (convenção já usada por `server/scripts/run-api-suite.cjs`);
  nenhuma senha foi gravada por esta entrega.
- **A estação 9 não está validada** — só NF-e e expedição foram exercitadas de
  verdade. O débito de estoque da venda e a geração de conta a receber seguem sem
  cobertura porque as duas operações estão quebradas (BUG-03/BUG-04).
- **G12 foi provado pela máquina de estados**, não pelo filtro de saldo por item; o
  cenário de adjudicação parcial de RFQ continua sem teste de integração.

---

# Handoff — G11: alçada de aprovação de compra por ORIGEM (2026-08-10)

**Escopo:** backend (`server/`). **Nada foi commitado** — tudo no working tree.
**Nada foi aplicado ao banco** — a migration é do dono do ambiente.

## 1. Resumo da feature

Decisão D-C do dono do produto
(`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4): a alçada de
aprovação de compra é por **ORIGEM**, não por faixa de valor.

| Origem | Regra |
|---|---|
| Nacional | até R$ 500.000 segue direto; **acima** exige a diretoria |
| Importação | **sempre** exige a diretoria, em qualquer valor |

**Como a origem é determinada (e por que é confiável).** Não existia forma
alguma no schema de saber se uma compra é importação: `suppliers` não tem
país (só UF) e exige CNPJ de todo mundo; `import_processes` (COMEX) é um
fluxo paralelo sem FK para `purchase_orders`. Foram criados dois campos e a
origem efetiva é o **OU** dos dois:

- `suppliers.is_foreign` — **cadastro**, fora do fluxo do pedido;
- `purchase_orders.origin` — declaração no pedido (cobre importação por conta
  e ordem via trading nacional).

Desenho **escalation-only**: o campo que o comprador controla no pedido só
consegue tornar a alçada mais restritiva. Declarar `national` num pedido de
fornecedor estrangeiro **não** escapa da diretoria. Complementos: `origin`
nunca volta de `import` para `national`; `is_foreign` não pode ser desmarcado
pela API; e depois que o pedido está `approved`, `supplier_id`,
`freight_value` e `origin` ficam congelados (senão daria para aprovar
R$ 450.000 sem a diretoria e acrescentar R$ 100.000 de frete depois).

**Valor comparado com o teto:** `total_amount` (mercadoria) + `freight_value`
(frete), **sem impostos** — o pedido de compra nacional não calcula tributo
neste ERP. Somar o frete fecha o desvio de dividir R$ 520.000 em
R$ 499.000 + R$ 21.000.

**Padrão reaproveitado:** o do Jurídico (RF-JUR-003) — constantes de negócio
em `domain/constants.ts`, tabela de aprovações com UNIQUE por papel,
`approver_user_id` sempre do JWT, `approver_role` sempre do RBAC, e endpoint
de leitura da situação sem efeito colateral.

**Compra recorrente não travou:** nacional dentro do teto não ganhou passo
novo nem consulta de aprovações (teste explícito assegura que
`listPurchaseApprovals` não é chamado nesse caminho).

## 2. Arquivos alterados

**Novos**
- `server/src/modules/purchases/domain/constants.ts` (regra de negócio)
- `server/src/modules/purchases/application/use-cases/ApprovePurchaseUseCase.ts`
- `server/src/modules/purchases/application/use-cases/ListPurchaseApprovalsUseCase.ts`
- `server/src/models/PurchaseOrderApproval.ts`
- `server/migrations/20260810-000029-purchase-approval-authority-g11.cjs`
- `server/tests/unit/purchase-approval-authority.test.ts`

**Alterados**
- `server/src/modules/purchases/application/use-cases/ChangePurchaseStatusUseCase.ts` (gate da alçada antes de gravar `approved`)
- `server/src/modules/purchases/application/use-cases/CreatePurchaseUseCase.ts` / `UpdatePurchaseUseCase.ts`
- `server/src/modules/purchases/domain/entities/PurchaseEntity.ts`
- `server/src/modules/purchases/domain/repositories/PurchaseRepository.ts` + `infrastructure/sequelize/SequelizePurchaseRepository.ts`
- `server/src/modules/purchases/presentation/{controllers/purchaseController.ts,routes/purchases.ts,validators/purchaseValidators.ts}`
- `server/src/modules/suppliers/{domain/entities/SupplierEntity.ts,application/use-cases/CreateSupplierUseCase.ts,application/use-cases/UpdateSupplierUseCase.ts,presentation/validators/supplierValidators.ts}`
- `server/src/models/{Purchase.ts,Supplier.ts,index.ts}`
- `server/src/shared/domain/accessModules.ts` (JSDoc do papel `diretor`)
- `server/tests/unit/integrity-transaction-guards.test.ts` (mock completado)

## 3. Documentações atualizadas

- `docs/database/DATABASE.md` — seção G11 (tabela, colunas, tipos, FKs, UNIQUE, efeito no dado existente)
- `docs/projeto/04-USE_CASES.md` — UC-15, seção "Alçada de aprovação do pedido — G11"
- `docs/arquitetura/API.md` — `POST /:id/approve`, `GET /:id/approvals`, `origin` em compras e `is_foreign` em fornecedores
- `docs/governance/TODO.md` — entregue (com evidência) + 7 pendências/riscos residuais
- `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` — G11 em §3/§4/§6; risco residual de segregação de função **confirmado ainda válido**
- `server/src/modules/purchases/README.md` — regras, endpoints, permissões (a seção de permissões estava desatualizada desde o retrofit de RBAC e foi corrigida)
- JSDoc em todos os arquivos novos/alterados

## 4. Instruções de teste

**Antes de tudo:** aplicar a migration —
`cd server && npm run migration:up` (deve aplicar `20260810-000029`).
Sem ela, `PUT /api/purchases/:id/status` para `approved` quebra em runtime.

Verificações automáticas já executadas (reprodutíveis):
```bash
cd server
npm run typecheck                      # limpo
npx jest tests/unit --maxWorkers=2     # 1480/1480 (baseline 1453 + 27 novos)
npx tsx -e "require('./app')"          # sobe
```

Teste manual sugerido (com a migration aplicada):
1. **Nacional pequeno (regressão do fluxo normal):** criar pedido de
   R$ 10.000 e aprovar. Deve aprovar direto e gerar a conta a pagar.
2. **Nacional acima do teto:** criar pedido de R$ 600.000 e tentar aprovar →
   **422** com `details.rule = "G11"`; o pedido continua `pending` e **não**
   nasce conta a pagar. `POST /:id/approve` com usuário `diretor` → 201.
   Aprovar de novo o pedido → agora passa.
3. **Importação em valor baixo:** criar pedido com `origin: "import"` de
   R$ 1.200 e tentar aprovar → **422**.
4. **Anti-burla:** marcar um fornecedor com `is_foreign: true`, criar um
   pedido dele com `origin: "national"` de R$ 500 e tentar aprovar → **422**,
   com `GET /:id/approvals` mostrando `origin_source: "supplier"`.
5. **Segunda aprovação do mesmo papel:** repetir `POST /:id/approve` → 422 e
   apenas 1 linha em `purchase_order_approvals`.
6. **Anti-spoofing:** enviar `{"approver_user_id": 1, "role": "diretor"}` no
   body do `approve` → o payload é ignorado (schema `.strict()` do módulo não
   é usado nesta rota; o use case só lê JWT/RBAC); conferir no banco que
   `approver_user_id` é o do token.
7. **Congelamento:** aprovar um pedido e tentar `PUT /:id` com
   `freight_value` → 422.

## 5. Riscos residuais

1. **Importação registrada no COMEX fica fora da alçada** — `import_processes`
   não vira `purchase_orders` e não tem etapa de aprovação nenhuma. Se os
   pedidos de ~R$ 1 milhão citados pelo dono forem registrados lá, a regra
   não os alcança. **Precisa de decisão do dono** sobre em que ponto do ciclo
   COMEX a diretoria aprova (recomendação técnica: a saída de `draft`).
2. **`is_foreign` precisa ser marcado nos fornecedores estrangeiros já
   cadastrados** — nada no dado atual permite inferir isso; todos nascem
   `false`.
3. **Sem segregação de função** (decisão explícita do dono) e **`admin`
   satisfaz sozinho o papel `diretor`** (curto-circuito padrão do projeto).
4. **Sem teste de integração real (Postgres)** do fluxo completo nem da
   UNIQUE sob concorrência — a suíte unitária usa repositório mockado.
5. **Sem tela** em `client/` para os 2 endpoints novos (fora do escopo).
6. **RFQ e conversão de requisição** criam o pedido sem `origin` (fica
   `national` pelo DEFAULT); seguro para fornecedor estrangeiro, mas
   importação por conta e ordem criada por esses caminhos precisa de correção
   manual enquanto o pedido está `pending`.

---

# Handoff — G11-COMEX: gate de aprovação da diretoria na importação (2026-08-10)

**Escopo:** backend (`server/`). **Nada foi commitado** — tudo no working tree.
**Nada foi aplicado ao banco** — a migration é do dono do ambiente.

## 1. Resumo da feature

Decisão **D-G** do dono do produto (2026-08-10), que fecha o risco residual nº 1
do handoff anterior (G11): `import_processes` (módulo COMEX) é um fluxo
**paralelo** — não vira `purchase_orders`, não tem FK para ele — e todas as suas
escritas eram `comex:operate`, **sem etapa de aprovação nenhuma**. Uma
importação de R$ 1 milhão registrada ali percorria o ciclo inteiro, dava entrada
em estoque e gerava custo nacionalizado sem passar pela diretoria.

| Dimensão | Decisão |
|---|---|
| Quem aprova | papel `diretor` (mesmo do G11 / RF-JUR-003) |
| Faixa de valor | **não há** — importação é sempre da diretoria |
| Onde trava | transição `draft → shipped` (último ponto sem custo afundado) |

Além do gate, os 4 campos monetários do cabeçalho ficam **congelados no evento
`shipped`** — `POST /:id/tracking` é o único caminho de escrita capaz de
alterá-los, então sem isso daria para aprovar R$ 50 mil e embarcar R$ 1 milhão
na mesma requisição (o gate viraria decoração). É o equivalente do congelamento
de `supplier_id`/`freight_value`/`origin` após `approved` no G11.

## 2. Arquivos alterados

**Novos**
- `server/migrations/20260810-000031-comex-directorate-approval-gate.cjs` — tabela
  `import_process_approvals` (FK CASCADE p/ processo, FK RESTRICT p/ `users`,
  ENUM(`diretor`), UNIQUE processo×papel, índice na FK). **Não aplicada.**
- `server/src/models/ImportProcessApproval.ts`
- `server/src/modules/comex/domain/constants.ts` — regra, status/evento do gate e
  campos congelados
- `server/src/modules/comex/application/use-cases/ApproveImportProcessUseCase.ts`
- `server/src/modules/comex/application/use-cases/ListImportProcessApprovalsUseCase.ts`
- `server/src/modules/comex/README.md`
- `server/tests/unit/comex-directorate-approval.test.ts` (27 testes)

**Alterados**
- `server/src/modules/comex/application/use-cases/RegisterImportTrackingUseCase.ts` — gate + congelamento
- `server/src/modules/comex/domain/repositories/ComexRepository.ts` e a implementação Sequelize — 3 métodos de aprovação
- `server/src/modules/comex/presentation/controllers/importProcessController.ts` — `approveAuthority`, `listApprovals`, `resolveAvailableApproverRoles`
- `server/src/modules/comex/presentation/routes/importProcesses.ts` — 2 rotas novas
- `server/src/models/index.ts` — associações
- `server/tests/unit/comex.test.ts` — mocks do repositório + aprovação no teste de embarque

## 3. Documentações atualizadas

- `docs/arquitetura/API.md` §32 — 2 endpoints novos, o gate no `/tracking`, o
  congelamento e o exemplo de payload corrigido (`shipped` → `arrived`).
- `docs/database/DATABASE.md` — seção "G11-COMEX", dicionário da tabela nova e
  aviso na seção de `import_processes`.
- `docs/governance/TODO.md` — item do G11 sobre COMEX marcado `[x]` e seção nova
  com o entregue e 7 pendências/riscos residuais.
- `server/src/modules/comex/README.md` — criado (o módulo não tinha README).
- JSDoc em todos os arquivos novos e nos trechos alterados.

## 4. Instruções de teste

**Pré-requisito:** aplicar `20260810-000031` (e a `20260810-000029` do G11, que
também está pendente). Sem isso, o embarque e as 2 rotas novas quebram em runtime.

1. **Caminho bloqueado:** criar processo → `POST /:id/tracking` com
   `{"event":"shipped"}` → **422**, `error.details.rule = "G11-COMEX"`,
   `missing_roles=["diretor"]`. Conferir no banco que `import_processes.status`
   continua `draft` e que nenhum `import_process_items.*_value` mudou.
2. **Leitura sem efeito colateral:** `GET /:id/approvals` com usuário `comex` →
   `approval_complete=false`, `can_register_approval=true`; conferir que a tabela
   `import_process_approvals` continua vazia.
3. **RBAC:** `POST /:id/approve` com usuário `comex` (mesmo com `approve`) → 403;
   com usuário de perfil `diretor` (ou `admin`) → 201.
4. **Anti-spoofing:** mandar `{"approver_user_id": 999}` no body do `approve` →
   ignorado; conferir no banco que `approver_user_id` é o do token.
5. **Caminho liberado:** repetir o passo 1 → 201, `status = shipped`.
6. **Duplicidade:** `POST /:id/approve` duas vezes → 422 na segunda ("ja aprovou").
7. **Retroatividade:** aprovar um processo já `shipped` → 422
   (`details.current_status`).
8. **Congelamento:** com a aprovação registrada, `POST /:id/tracking`
   `{"event":"shipped","freight_value":999999}` → 422,
   `details.frozen_fields=["freight_value"]`, nada gravado. Depois de embarcar,
   `{"event":"arrived","other_expenses_value":3500}` → 201 e recálculo normal.

**Validação já executada:** `npm run typecheck` limpo;
`npx jest tests/unit --maxWorkers=2` **1507/1507** (baseline 1480 + 27);
`npx tsx -e "require('./app')"` sobe.

## 5. Riscos residuais

1. **Migration não aplicada** — o código já lê a tabela nova.
2. **Sem grandfathering** — processos já em `draft` passam a exigir aprovação
   para embarcar; processos já em `shipped` ou adiante não podem receber
   aprovação retroativa. Comunicar ao COMEX.
3. **[Precisa de decisão do dono] Corrigir câmbio/frete antes de embarcar exige
   cancelar e recriar** o processo (consequência do congelamento; o módulo nunca
   teve endpoint de edição). Alternativas não implementadas: permitir edição
   invalidando a aprovação, ou um `PUT /:id` restrito a `draft` que zere as
   aprovações.
4. **[Precisa de decisão do dono] O gate não cobre variação de custo pós-embarque**
   — `arrived`/`customs_cleared` continuam podendo elevar despesas aduaneiras
   sem novo aval (intencional: são custos posteriores ao compromisso).
5. **Sem segregação de função** e **`admin` satisfaz sozinho o papel `diretor`**
   (mesma decisão do G11).
6. **Sem teste de integração real (Postgres)** do fluxo completo nem da UNIQUE
   sob concorrência — a suíte unitária usa repositório mockado.
7. **Sem tela** em `client/` — o módulo COMEX inteiro ainda é backend-only.

---

# HANDOFF — G9: baixa de estoque da venda migra da confirmação para a NF-e (2026-08-10)

Agente: `programador` (backend). **Nada foi commitado** — working tree.
Onda 3 do `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`,
decisão **D-A** do dono.

## 1. Resumo da feature

**Confirmar o pedido RESERVA. Autorizar a NF-e BAIXA.**

Até 2026-08-09 a venda debitava `products.quantity` na confirmação do pedido
(`quote -> confirmed`, e também na criação com `status: 'confirmed'`), e o
faturamento não tocava em estoque. Isso registrava saída de mercadoria que
ainda estava fisicamente na empresa.

Base normativa (`docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`):
**Ajuste SINIEF 07/05, cláusula 1ª §1º e cláusula 9ª §1º** — a NF-e é
autorizada antes do fato gerador e a mercadoria só pode transitar depois da
autorização de uso.

Regra entregue:

| Evento | `products.quantity` | Reserva | Depósito ACABADOS |
|---|---|---|---|
| Criar `quote` | — | — | — |
| Criar `confirmed` / confirmar orçamento | **inalterado** | **cria** | — |
| Alterar itens de venda `confirmed` | **inalterado** | ajusta pelo delta | — |
| **NF-e autorizada** (síncrona ou assíncrona) | **−qtd. faturada** | consome no mesmo montante | **−qtd. faturada** |
| Cancelar venda | **+`invoiced_quantity`** | libera tudo | **+`invoiced_quantity`** |
| `invoiced -> shipped` | — | — | — |

A baixa é **proporcional à quantidade desta emissão**: faturar 10 unidades em
4 + 6 gera duas baixas (4 e 6). O que limita a venda passou a ser o estoque
**disponível** (`quantity - reserved_quantity`), não o saldo bruto.

### Dois achados corrigidos de carona

1. **Bomba de ENUM viva no banco.** O G3 gravava
   `inventory_movements.reference_type = 'reservation'` /
   `'reservation_release'` a cada reserva/liberação. Esses dois valores **não
   existem** no ENUM real (`pg_enum` em 2026-08-10: `sale, purchase,
   production, adjustment, transfer, sst_epi_delivery, import`) — **toda
   reserva morria em 500**, e com o G9 isso passaria a derrubar toda venda
   confirmada. Corrigido **parando de gravar o movimento** (reserva não altera
   `products.quantity`; o rastro é a própria linha de reserva), não adicionando
   valores ao ENUM.
2. **Estoque fantasma ao cancelar orçamento.** O ramo de cancelamento fazia
   `receive(item.quantity)` para todos os itens, mesmo vindo de `quote`, que
   nunca debitou nada. Some com a regra nova.

## 2. Arquivos alterados

**Código (backend):**

| Arquivo | O que mudou |
|---|---|
| `server/src/services/inventoryService.ts` | Dono da reserva generalizado (OP **ou** venda, exatamente um); `requireReservationOwner` com `details.rule`; `releaseAllReservationsForSale`/`listSaleReservations` novos (e no `module.exports`); **removida** a gravação de `InventoryMovement` em reserva/liberação |
| `server/src/services/saleStockService.ts` | **NOVO** — `commitInvoicedStock`: libera reserva → `consume` → debita ACABADOS |
| `server/src/models/ProductionOrderReservation.ts` | `sale_id`; `production_order_id` nullable; JSDoc do nome histórico |
| `server/src/models/index.ts` | Associações `Sale ↔ ProductionOrderReservation` |
| `server/src/modules/sales/.../CreateSaleUseCase.ts` | `consume` → `reserve({ saleId })`; sem dual-write de depósito |
| `server/src/modules/sales/.../ChangeSaleStatusUseCase.ts` | Confirmação reserva; cancelamento libera reserva + devolve só `invoiced_quantity` |
| `server/src/modules/sales/.../EditSaleItemsUseCase.ts` | Delta de **reserva** em vez de delta de estoque |
| `server/src/modules/fiscal/.../IssueSaleNfeUseCase.ts` | Baixa na autorização, mesma transação do `invoiced_quantity`; aceita `userId` |
| `server/src/modules/fiscal/.../GetSaleNfeStatusUseCase.ts` | Idem, no caminho assíncrono/webhook |
| `server/src/modules/fiscal/.../fiscalController.ts` | Repassa `userId` do JWT |
| `server/migrations/20260810-000030-generalize-stock-reservations-for-sales-g9.cjs` | **NOVO** — schema + backfill (⚠️ **não aplicada**) |

**Testes:** novo `server/tests/unit/sale-stock-baixa-na-nfe-g9.test.ts` (19
casos); atualizados `create-sale-quote`, `edit-sale-items`,
`change-sale-status-partially-invoiced`, `issue-sale-nfe-partial`,
`get-sale-nfe-status-reconciliation`, `inventory-service-contract`,
`integrity-transaction-guards`, `sales-nfe-rbac`, `warehouse-stock`,
`warehouse-invariants`.

## 3. Documentações atualizadas

- `docs/database/DATABASE.md` — seção **G9** completa (schema, backfill,
  bomba do ENUM, ordem de deploy)
- `docs/database/04-DICIONARIO_DADOS.md` — `production_order_reservations`
  com `sale_id`, nullable, CHECK e índices novos
- `docs/arquitetura/API.md` — §5 Vendas: quadro **"Quando o estoque sai"**,
  `PUT /:id/status`, `PUT /:id/items`, `POST /:id/nfe`; corrigidos dois
  trechos que estavam obsoletos desde 2026-08-06 (`sale_invoices` e
  reconciliação assíncrona)
- `docs/projeto/04-USE_CASES.md` — UC-04 (regras de negócio novas) e UC-27
- `docs/governance/TODO.md` — seção G9 com checklist e 7 pendências
- `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §6 — linha do G9
- `server/src/modules/sales/README.md` — bloco G9 no topo, regras, endpoints,
  Mermaid, testes, pendências
- **JSDoc** reescrito em todos os arquivos de código tocados (cada um cita a
  base normativa e o que mudou de comportamento)

## 4. Instruções de teste (o que o próximo agente/humano deve validar)

**Pré-requisito obrigatório:** aplicar a migration `20260810-000030` (e as
pendentes `20260810-000029` do G11 e `20260810-000031` do G11-COMEX).
Sem ela, confirmar pedido falha (coluna `sale_id` inexistente).

Depois de aplicar, conferir o backfill:

```sql
-- deve existir 1 reserva de venda (venda 10 x produto 25 x 1)
SELECT id, production_order_id, sale_id, product_id, quantity, status
  FROM production_order_reservations WHERE sale_id IS NOT NULL;

-- produto 25 deve ter voltado de 9 para 10, com 1 reservado
SELECT id, quantity, reserved_quantity FROM products WHERE id = 25;

-- ACABADOS do produto 25 deve ter voltado de 9 para 10
SELECT pws.quantity FROM product_warehouse_stock pws
  JOIN warehouses w ON w.id = pws.warehouse_id
 WHERE w.code = 'ACABADOS' AND pws.product_id = 25;
```

**Roteiro funcional (API):**

1. `POST /api/sales` com `status: 'quote'` → nada muda em `quantity` nem em
   `reserved_quantity`.
2. `PUT /api/sales/:id/status` `{"status":"confirmed"}` → `quantity`
   **inalterada**, `reserved_quantity` **+ qtd. do pedido**, linha nova em
   `production_order_reservations` com `sale_id` preenchido e
   `production_order_id` NULL. **Nenhuma** linha nova em
   `inventory_movements`.
3. Tentar confirmar um segundo pedido do mesmo produto acima do disponível →
   **422** (o reservado não conta como disponível).
4. `POST /api/sales/:id/nfe` com `{"items":[{"sale_item_id":X,"quantity":4}]}`
   → `quantity` **−4**, `reserved_quantity` **−4**, ACABADOS **−4**,
   `InventoryMovement` `type='out'`, `reference_type='sale'`,
   `reference_id` = id da venda, `user_id` = usuário do JWT; venda vai a
   `partially_invoiced`.
5. Segunda emissão com o restante → baixa **só o restante**; reserva vira
   `released` com `quantity_released = quantity`; venda vai a `invoiced`.
6. `PUT /api/sales/:id/status` `{"status":"shipped"}` → não movimenta estoque.
7. Em outro pedido: confirmar, faturar parcialmente e **cancelar** → volta ao
   estoque **apenas** o que foi faturado; o resto só sai da reserva.
8. Cancelar um `quote` → **nenhuma** movimentação de estoque (antes do G9
   isso inflava o saldo).
9. Concorrência: dois clientes confirmando o mesmo produto simultaneamente —
   o segundo deve receber 422, não estoque negativo (o `SELECT ... FOR UPDATE`
   de `validateAndLock` serializa).

**Comandos:**

```bash
cd server
npm run typecheck                      # limpo
npx jest tests/unit --maxWorkers=2     # 1533/1533, 149 suítes
npx tsx -e "require('./app')"          # sobe
```

## 5. Riscos residuais

1. **Migration `20260810-000030` não aplicada** — o código já grava `sale_id`.
   Bloqueia o deploy.
2. **Sem teste de integração real (Postgres)** do CHECK de exatamente-um-dono,
   dos dois índices únicos parciais novos, do backfill e do fluxo
   confirmar → faturar parcial → faturar o restante → cancelar. A suíte
   unitária usa dublê em memória e **não exercita constraint nenhuma**.
3. **Cancelar NF-e não devolve estoque** (`CancelSaleNfeUseCase` não reverte
   `invoiced_quantity` nem o consumo). Pré-existente, mantido de propósito
   para "baixado == faturado" continuar valendo. Reversão automática é **regra
   nova e precisa de decisão do dono** (inclusive sobre recriar a reserva).
4. **Falha de baixa depois da autorização deixa a venda em `processing`** — a
   nota está autorizada no provedor, o registro local não avança. Recuperação
   documentada e possível (`GET /api/sales/:id/nfe` reconsulta e reaplica,
   usando o snapshot já gravado em `sale_invoices`), mas **não automática**.
5. **Frontend não explica a reserva** — entre confirmar e faturar o produto
   aparece com saldo bruto inalterado. As telas precisam mostrar
   **disponível = `quantity - reserved_quantity`**. Fora do escopo deste
   agente (tarefa de `PromadorFonteEnd`).
6. **`products.reserved_quantity` mudou de significado** — agora soma reservas
   de venda **e** de OP. Semanticamente correto, mas muda o número lido por
   MRP, dual-read de `Item.estoque_reservado` e telas. Avisar o PCP na virada.
7. **Tabela com nome histórico** — `production_order_reservations` guarda
   reserva de venda também. Renomear para `stock_reservations` foi
   **deliberadamente adiado** (renomear tabela num banco com drift é risco sem
   ganho funcional).
8. **Backfill do G3 (`05_production_order_reservations.ts`) continua sem rodar
   com `--apply`** — não é deste gap, mas interage: cache `reserved_quantity`
   possivelmente inflado sem lastro agora também limita o que a venda reserva.

---

# HANDOFF — Frontend: gate de aprovação da diretoria na tela de Importação/COMEX (G11-COMEX, 2026-08-10)

Agente: `PromadorFonteEnd` (frontend). **Nada foi commitado** — working tree.
Complementa o handoff de backend "G11-COMEX" desta mesma data, cujo item 7 de
riscos residuais dizia "**Sem tela** em `client/`" para a parte de aprovação.

## 1. Resumo

A tela `/purchases/comex` (`ComexPage.tsx`) já existia desde 2026-08-06 e
cobria o ciclo `draft → shipped → arrived → customs_cleared → received |
cancelled`. O que **não** existia era o gate da diretoria criado hoje no
backend: sem isso, o operador clicava em "Registrar embarque" e tomava um 422
cru, sem nenhum caminho de saída na interface.

Entregue:

1. **Bloco "Aprovação da diretoria"** no diálogo de detalhe do processo, com a
   situação da alçada vinda **exclusivamente** de
   `GET /api/comex/import-processes/:id/approvals` (leitura pura). A tela
   **nunca** infere aprovação a partir do status do processo, nem tentando
   `POST /approve`, nem lendo o 422 do embarque — mesmo erro já cometido e
   corrigido no Jurídico (`ContractsTab.tsx`).
2. **Ação "Aprovar como Diretoria"** (`POST /:id/approve`, sem body) exibida
   conforme `hasModuleAccess('diretor')` **e** `can_register_approval` do
   endpoint. É só UX: a autorização real continua sendo
   `authorizeModule('diretor')` no backend.
3. **Embarque bloqueado na origem**: o botão do próximo marco fica desabilitado
   enquanto `approval_complete === false`, enquanto a consulta da alçada está
   carregando, e também **se a consulta falhar** (a tela diz que não sabe, em
   vez de presumir aprovado). Um aviso âmbar explica o que fazer.
4. **Campos congelados não são oferecidos**: no diálogo do evento `shipped`,
   câmbio/frete/seguro/outras despesas desaparecem (o tipo
   `RegisterImportTrackingInput` virou união discriminada, então o próprio
   compilador impede enviá-los no embarque). Chegada e desembaraço seguem
   iguais.
5. **422 do gate traduzido para linguagem de fábrica** (`translateComexError`):
   `missing_roles`, `frozen_fields`, `current_status` e `approver_role` viram
   frases; o operador nunca vê `rule: G11-COMEX`.

De carona, 2 defeitos pré-existentes da tela foram corrigidos: o
`ItemSearchSelect` do formulário de criação recebia `value={null}` fixo (o item
escolhido sumia do campo depois de selecionado) e o `useForm` usava `z.infer` +
`defaultValues ... as never` em vez da forma de 3 genéricos padronizada no
projeto.

## 2. Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `client/src/api/comex.ts` | `getImportProcessApprovals` / `approveImportProcess`, tipos `ImportProcessApprovalStatus`/`ImportProcessApproval`/`ImportApproverRole`, constante `IMPORT_APPROVAL_RULE`; `RegisterImportTrackingInput` virou união discriminada (embarque sem campos monetários) |
| `client/src/pages/purchases/comexShared.ts` | **NOVO** — rótulos de status/evento/papel + `translateComexError` (tradução dos 422 do gate) |
| `client/src/pages/purchases/comexShared.test.ts` | **NOVO** — 4 testes do tradutor (aprovação pendente, congelamento, aprovação retroativa, fallback genérico) |
| `client/src/pages/purchases/ImportApprovalGateCard.tsx` | **NOVO** — bloco da alçada (situação, ação de aprovar, mensagens) |
| `client/src/pages/purchases/ComexPage.tsx` | Query de aprovações, card do gate, bloqueio do embarque, diálogo de embarque sem campos congelados, `translateComexError` em todas as mutations, `useForm<z.input, unknown, Output>`, `ItemPicker` |

Rotas de API consumidas (todas já existentes — **nenhum backend foi tocado**):
`GET /api/comex/import-processes`, `GET /:id`, `POST /`, `GET /:id/approvals`,
`POST /:id/approve`, `POST /:id/tracking`, `POST /:id/receive`,
`POST /:id/cancel`.

Caminho de menu: **Compras → Importação (Comex)** (`/purchases/comex`), já
existente em `AppLayout.tsx`.

## 3. Documentações atualizadas

- `docs/manual/00-MANUAL_DO_USUARIO.md` — §4.6 novo ("Importar do exterior
  (Comex, UC-19)"), com o caminho de menu e os 6 passos do ciclo, incluindo a
  aprovação da diretoria e o congelamento no embarque (o antigo §4.6 de
  fornecedores virou §4.7).
- `docs/governance/CRONOGRAMA_FRONTEND_2026-07-31.md` — FE3 atualizado.
- `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` — cobertura de
  telas atualizada.

## 4. Instruções de teste (QA / humano)

Pré-requisito: migration `20260810-000031` aplicada, e **dois usuários** — um
analista com o módulo `comex:operate`, e um da diretoria com **`diretor` +
`comex`** (ver risco 1 abaixo).

1. **Caminho feliz:** criar processo → detalhe → bloco "Aprovação da diretoria"
   mostra "Diretoria · Pendente" → botão de embarque **desabilitado** com aviso
   âmbar → logar como diretoria → "Aprovar como Diretoria" → o bloco vira
   "Aprovado" com data → botão de embarque habilita → registrar embarque (o
   diálogo **não** deve mostrar câmbio/frete/seguro/despesas) → chegada (agora
   com campos monetários; confirmar que os tributos recalculam) → desembaraço →
   receber → conferir entrada em estoque, lote em quarentena e custo
   nacionalizado.
2. **Caminho bloqueado (o principal):** com o processo em Rascunho **sem**
   aprovação, confirmar que não há como disparar o embarque pela tela e que a
   mensagem diz o que fazer (não um 422 cru).
3. **Analista sem papel de diretoria:** o bloco aparece em modo leitura, sem
   botão de aprovar, com a frase "Só um usuário com o papel Diretoria pode
   registrar esta aprovação".
4. **Aprovação retroativa:** aprovar, embarcar, e conferir que o bloco passa a
   dizer que a aprovação não pode mais ser registrada.
5. **Aprovação duplicada:** clicar duas vezes em "Aprovar" (ou em duas abas) —
   a segunda deve exibir "Diretoria já aprovou este processo", não erro cru.
6. **Falha de rede na consulta da alçada:** derrubar a API / bloquear
   `GET /:id/approvals` no devtools e conferir que o embarque **continua
   bloqueado**, com o aviso de "não foi possível confirmar a aprovação" — a tela
   nunca deve liberar por falta de informação.
7. **Congelamento:** não há caminho pela UI para enviar valores no embarque; se
   quiser exercitar o 422, chamar a API direto e conferir que a mensagem
   traduzida cita "câmbio, frete..." e sugere cancelar e recriar.

Verificação automatizada já executada: `cd client && npm run build` limpo e
`npx vitest run` — 9 arquivos, 55 testes passando.

## 5. Riscos residuais

1. **Diretoria precisa de 2 módulos para aprovar pela tela.** `GET /approvals` e
   `POST /approve` aceitam `diretor`, mas a rota web `/purchases/comex` e os
   endpoints de listagem/detalhe exigem `comex`. Um diretor **sem** `comex` cai
   em "Acesso Negado" e não chega ao botão. Não inventei rota nem afrouxei
   guard: é decisão de backend/produto (ou se atribui `comex` leitura ao perfil
   da diretoria, ou o backend passa a aceitar `diretor` no detalhe). Enquanto
   isso, a orientação está no manual.
2. **Sem fila de "processos aguardando minha aprovação"** — a diretoria precisa
   abrir o processo específico. Um widget de home (padrão `handoffs`)
   resolveria, mas exigiria endpoint novo.
3. **Nome do aprovador não é exibido**, só a data (e "por você" quando for o
   usuário logado): `import_process_approvals` devolve apenas
   `approver_user_id`, e buscar `/api/users` a partir desta tela daria 403 para
   perfis não-admin.
4. **Sem teste de componente** do card do gate (a suíte do `client/` é varredura
   estática + unidade; não há React Testing Library configurada). O que ficou
   coberto por teste é o tradutor de erro.
5. **Tela ainda não passou pelo `webdesiner`** — `ComexPage.tsx` continua na
   fila de polimento visual registrada no levantamento.

---

# G5 — API de Roteiro de Produção (2026-08-10) — `PromadorFonte` (backend)

## 1. Resumo da feature

`production_routes` / `production_route_steps` existiam desde a baseline, eram
**lidas** pelo custeio real de mão de obra na conclusão da OP, pela
carga-máquina por centro de trabalho e pelo OEE — e **não tinham nenhum
endpoint**: só eram populáveis por script. Esta entrega dá ao PCP a API para
cadastrar, revisar e liberar roteiro de fabricação.

**Por que agora:** é **pré-requisito** do G4 (apontamento de produção
obrigatório, exigência do Bloco K do SPED Fiscal — Ajuste SINIEF 2/09 cláusula
3ª §7º III/§10). Exigir apontamento sem roteiro cadastrável seria regra
inexequível. ⚠️ **O G4 NÃO foi feito aqui — o apontamento continua opcional.**

**Base URL:** `/api/production/routes` (9 endpoints), módulo
`server/src/modules/production/`, Clean Architecture completa:

| Camada | Arquivos |
|---|---|
| Domínio (puro, sem Sequelize) | `domain/productionRouteRules.ts` (ciclo de vida, sequência, totais), `domain/repositories/ProductionRouteRepository.ts` (interface) |
| Aplicação | 9 use cases `*ProductionRoute*` + `application/services/resolveRouteStepWorkCenters.ts` |
| Infraestrutura | `infrastructure/sequelize/SequelizeProductionRouteRepository.ts` (único ponto que conhece Sequelize) |
| Apresentação | `presentation/{controllers,routes,validators}/productionRoute*.ts` |

Transações são abertas no controller e injetadas nos use cases — nenhum use
case importa Sequelize.

**Regras implementadas** (todas devolvem `details.rule`):
sequência **1..N contígua** sem buraco/duplicidade; `step_code` único no
roteiro; `work_center_id` existente **e ativo** (revalidado na liberação);
roteiro `active` **imutável** (muda-se por nova revisão, e a anterior vira
`superseded` com etapas intactas → **OPs abertas não são afetadas**);
`route_code` único global; `(produto, revisão)` único; etapa já apontada não
pode ser apagada; `created_by`/`approved_by` sempre do JWT.

**Correção acoplada:** `aggregateLoadByWorkCenter` (workCenters) somava todas as
revisões de roteiro do produto — passaria a **dobrar a carga-máquina** na
primeira revisão criada. Agora filtra `pr.status = 'active'`.

**Migration `20260810-000034-production-route-active-unique-g5.cjs` — ESCRITA,
NÃO APLICADA** (aplicar está bloqueado por permissão do ambiente). Não cria nem
altera coluna: só o índice único parcial `uq_production_routes_active_per_product`
e `COMMENT ON COLUMN`. `up`/`down` funcionais.

## 2. Documentações atualizadas

| Arquivo | O que entrou |
|---|---|
| `docs/arquitetura/API.md` | **§33 nova** — contrato dos 9 endpoints, ciclo de vida, tabela dos 12 códigos de `details.rule`, payloads |
| `docs/producao/04-ROTEIROS.md` | Seção "Roteiro no sistema (API)" — quem faz o quê, ciclo de vida, `sequence` × `step_code`, tempos, efeito nas OPs abertas |
| `docs/projeto/04-USE_CASES.md` | **UC-71** — fluxo principal, tabela de validações/gatilhos, limitação estrutural |
| `docs/database/DATABASE.md` | Seção "G5" — o que NÃO mudou no schema, o índice parcial e seu risco de aplicação |
| `docs/governance/TODO.md` | Entrada de 2026-08-10 com entregue / decisões a confirmar / pendências |
| JSDoc | Cabeçalho `@module` em todos os 15 arquivos novos, `@param`/`@returns`/`@throws` (com o código de regra) em cada método público |

## 3. Instruções de teste

**Automatizado (já executado nesta entrega):**

```bash
cd server
npm run typecheck                                   # limpo
npx jest tests/unit/production-routes.test.ts       # 43/43
npx tsx -e "require('./app')"                       # boot sem erro
```

⚠️ `npx jest tests/unit --maxWorkers=2` fecha com **2 suítes falhando**
(`item-repository-live-inventory`, `warehouse-invariants`) — falhas de **outro
agente em voo** (`SequelizeItemRepository.ts` e `ReleaseLotUseCase.ts`,
modificados fora desta entrega, G7 de qualidade). Nenhum arquivo do G5 é
importado por essas suítes.

**Manual (exige aplicar a migration e subir o servidor):**

1. `POST /api/production/routes` com `steps` de `sequence` 1 e 3 → 422
   `details.rule = "G5-SEQ-GAP"`, `details.expected = [1,2]`.
2. Corrigir para 1 e 2, criar → `201`, `status = "draft"`, `created_by` = o
   usuário logado **mesmo mandando outro `created_by` no body** (o body é
   rejeitado por `.strict()`).
3. `PATCH /:id/activate` com um usuário `producao:operate` (sem `approve`) →
   `403`. Com `producao:approve` → `200`, `approved_by` do JWT.
4. `PUT /:id/steps` no roteiro já ativo → 422 `G5-ROUTE-NOT-DRAFT`.
5. `POST /:id/revise` → `201` rascunho `revision = "01"`,
   `route_code = "<original>-R01"`; conferir que o roteiro original **continua
   `active`** (só vira `superseded` quando a revisão for ativada).
6. `PATCH /revise-id/activate` → `meta.superseded_route_id` = id do original, e
   o original agora `superseded` **com as etapas ainda lá**.
7. Criar OP do mesmo produto e apontar uma etapa; depois tentar
   `DELETE` do roteiro (rascunho) → 422 `G5-ROUTE-IN-USE`.
8. Desativar um centro de trabalho usado por um rascunho e tentar ativar → 422
   `G5-WC-INACTIVE`.
9. `GET /api/work-centers/load` com 2 revisões (1 ativa, 1 superseded) do mesmo
   produto → a carga **não** pode dobrar.

## 4. Riscos residuais

1. **Migration não aplicada.** Enquanto `20260810-000034` não rodar, a garantia
   de "1 roteiro ativo por produto" é só do use case (transação + lock). Se o
   banco já tiver 2+ ativos do mesmo produto, a criação do índice **falha de
   propósito** — diagnóstico no rodapé do arquivo.
2. **`sequence` contígua 1..N × numeração "OP 10/20/30" do documento
   departamental.** Reconciliado colocando o número de operação no `step_code`,
   mas **precisa de confirmação do PCP**: inserir operação no meio exige
   renumerar, e isso só é possível em rascunho.
3. **OP não é amarrada a uma revisão de roteiro** (`production_orders` não tem
   `production_route_id`). Relatórios derivados usam a revisão ativa **no
   momento da consulta**. Se o Fisco exigir reconstituir o processo exatamente
   como executado, isso vira coluna nova + decisão de negócio — pré-requisito
   honesto do G4.
4. **Sem tela.** O PCP ainda depende de chamada HTTP direta; o G4 continua
   inexequível na prática até a tela existir (`PromadorFonteEnd`).
5. **Sem teste de integração real (Postgres)** do índice parcial sob
   concorrência (2 ativações simultâneas do mesmo produto).
6. **`item_id` é dual-write best-effort** (`products.code` ⇄ `items.codigo`):
   produto sem Item equivalente grava `item_id = NULL` silenciosamente. Mesmo
   comportamento já aceito em outros pontos da fase expand-contract, mas vale
   registrar.

---

# HANDOFF — G7: inspeção de qualidade como entidade + gate de liberação de lote (2026-08-10)

## 1. Resumo da feature

A **inspeção de qualidade passou a existir como entidade** no ERP. Antes,
liberar um lote da quarentena era `POST /api/inventory/lots/:id/release` com
um campo `notes` livre: sem inspetor identificado, sem critério de aceitação,
sem resultado — nenhuma evidência.

Decisão **D-H** do dono (2026-08-10): a empresa pretende se certificar
ISO 9001, então o registro nasce no formato que a norma pede — **§8.6**
(evidência do critério de aceitação + rastreabilidade de quem autorizou a
liberação) e **§8.7** (controle de saída não conforme, incluindo aceitação
sob concessão) — **sem** travar a operação com burocracia que ninguém executa.

O que mudou, concretamente:

1. **Tabela `quality_inspections`** — lote, estágio, critério de aceitação
   (obrigatório), plano/tamanhos de amostra, defeitos, veredito, justificativa
   de concessão, RNC vinculada, inspetor (do JWT) e data.
2. **`lot_controls` ganhou `release_inspection_id`, `released_by`,
   `released_at`** — a rastreabilidade de *quem autorizou a liberação*, que
   a §8.6 exige e que não existia em lugar nenhum.
3. **`ReleaseLotUseCase` passou a exigir inspeção aprovada.** A regra é "a
   inspeção **mais recente** do lote tem veredito `approved` ou
   `approved_under_concession`". Recusa devolve 422 com `details.rule = 'G7'`
   e **não grava nada**.
4. **Módulo novo `server/src/modules/quality/`** com 3 endpoints, incluindo
   `GET /api/quality/lots/:lotId/release-eligibility` (leitura pura, para a
   tela saber se o botão vai funcionar antes de o usuário clicar).
5. **Achado colateral fechado: a quarentena era decorativa.** Confirmado no
   código — o recebimento incrementa `products.quantity` no mesmo passo em que
   cria o lote em `quarantine`, e os dois leitores de planejamento (MRP e
   disponibilidade de OP) usavam esse saldo bruto. Material não inspecionado
   contava como disponível: o MRP **comprava de menos** e a OP era aprovada
   contra material que o FEFO nunca conseguiria consumir. Corrigido **no lado
   da leitura** (`services/quarantineBalanceService.ts`), com
   `max(0, físico − retido)`.

**Integração com o que já existia (não reinventado):** reprovação delega a
`CreateNonConformityUseCase` — o mesmo caminho já corrigido no **G8** (teste
acústico reprovado sempre abre RNC) e no **G10** (RNC que não bloqueia lote
avisa). Ele já abre a RNC, bloqueia o lote, herda o fornecedor e recalcula
`suppliers.quality_score`.

## 2. Arquivos alterados

**Migration (escrita, NÃO aplicada):**
- `server/migrations/20260810-000032-create-quality-inspections-g7.cjs`

**Models:**
- `server/src/models/QualityInspection.ts` (novo)
- `server/src/models/LotControl.ts` (+3 campos de liberação)

**Módulo novo `server/src/modules/quality/`:**
- `README.md`
- `domain/constants.ts` — regra pura `decideLotRelease`
- `domain/repositories/QualityRepository.ts`
- `infrastructure/sequelize/SequelizeQualityRepository.ts`
- `application/use-cases/CreateQualityInspectionUseCase.ts`
- `application/use-cases/ListQualityInspectionsUseCase.ts`
- `application/use-cases/GetLotReleaseEligibilityUseCase.ts`
- `presentation/controllers/qualityInspectionController.ts`
- `presentation/routes/qualityInspections.ts`

**Gate e planejamento:**
- `server/src/modules/inventory/application/use-cases/ReleaseLotUseCase.ts`
- `server/src/modules/inventory/presentation/controllers/inventoryController.ts`
- `server/src/services/quarantineBalanceService.ts` (novo)
- `server/src/services/bomService.ts` (`explodeBOM` desconta saldo retido)
- `server/src/modules/items/infrastructure/sequelize/SequelizeItemRepository.ts`
- `server/app.ts` (montagem de `/api/quality`)

**Testes:**
- `server/tests/unit/quality-inspection-release-gate.test.ts` (novo, 24)
- `server/tests/unit/quarantine-blocks-planning-balance.test.ts` (novo, 12)
- `server/tests/unit/quality-lot-lifecycle.test.ts` (ajustado)
- `server/tests/unit/warehouse-invariants.test.ts` (ajustado)
- `server/tests/unit/item-repository-live-inventory.test.ts` (ajustado + 2 novos)
- `server/tests/unit/module-authorization-map.test.ts` (registro do módulo)

## 3. Documentações atualizadas

- `docs/arquitetura/API.md` — §16.1 novo (Inspeção de Lote), §8 (o gate no
  `POST /lots/:id/release`, com os dois `details.reason`), §13 (o que o MRP
  passou a contar como estoque)
- `docs/qualidade/01-CONTROLE_QUALIDADE.md` — §4 novo (o que existia antes, a
  entidade, o gate, a quarentena, e **o que a Engenharia da Qualidade ainda
  precisa decidir**)
- `docs/qualidade/00-README.md` — tabela de endpoints reais do módulo
- `docs/projeto/04-USE_CASES.md` — **UC-17C novo**; UC-17B e UC-16 atualizados
- `docs/database/DATABASE.md` — §G7 (modelagem, o que não foi modelado e por
  quê, efeito nas linhas existentes)
- `docs/governance/TODO.md` — entrada de 2026-08-10 com pendências e riscos
- `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` — G7 marcado
- JSDoc em todos os arquivos novos e nos alterados

## 4. Instruções de teste

**Comandos (a partir de `server/`):**
```
npm run typecheck                      # limpo
npx jest tests/unit --maxWorkers=2     # 152 suites / 1615 testes
npx tsx -e "require('./app')"          # exit 0
```

**⚠️ Antes de qualquer teste manual, aplicar a migration
`20260810-000032`** — os models já declaram a tabela e as colunas novas, então
sem ela **qualquer `SELECT` em `lot_controls` quebra**.

**Roteiro manual (depois da migration):**

1. Receber uma compra (`POST /api/purchases/:id/receive`) → confirmar que o
   lote nasce em `quarantine` (`GET /api/inventory/lots?status=quarantine`).
2. `GET /api/quality/lots/:lotId/release-eligibility` → deve devolver
   `can_release: false`, `reason: "no_inspection"`.
3. Tentar `POST /api/inventory/lots/:id/release` → **422**, `details.rule =
   "G7"`, `details.reason = "no_inspection"`. **Reconsultar o lote e conferir
   que o status continua `quarantine` e `notes` intacto** — o ponto do gap é
   justamente não gravar nada.
4. `POST /api/quality/inspections` com `verdict: "rejected"` → confere que a
   RNC nasceu (`GET /api/quality/non-conformities`) e que o **lote foi
   bloqueado** (caminho do G8/G10).
5. Tentar liberar de novo → **422** com `reason: "last_inspection_rejected"`.
6. `POST /api/quality/inspections` com `verdict: "approved"` e
   `acceptance_criteria` preenchido → liberar → **200**, e o lote agora tem
   `release_inspection_id`, `released_by` (o usuário do token, **não** o do
   body) e `released_at`.
7. `POST /api/quality/inspections` com `verdict: "approved_under_concession"`
   **sem** `concession_justification` → **400**, `details.field =
   "concession_justification"`.
8. **Quarentena bloqueando planejamento:** com um lote em quarentena, rodar
   `POST /api/mrp/plan` para o item e conferir que `estoque_disponivel`
   **não** inclui a quantidade em quarentena; e tentar criar OP que dependa
   desse material e conferir que a disponibilidade acusa falta.

## 5. Riscos residuais

1. **Migration não aplicada.** Bloqueio de permissão do ambiente. Enquanto não
   rodar, o código **não é executável** (models já declaram as colunas). É o
   risco nº 1 desta entrega.
2. **Impacto no dia da aplicação.** Há hoje **9 lotes em quarentena (281 un.)
   e 1 bloqueado (100 un.)** no banco de dev. Eles passam a exigir inspeção
   registrada para serem liberados, e **não há backfill** — inventar inspeção
   retroativa seria fabricar evidência de auditoria. A Qualidade precisa
   registrar essas inspeções na virada.
3. **`QualityInspection` não registrado em `models/index.ts`** (arquivo sob
   edição concorrente). Sem associações, nenhuma consulta usa `include` — a
   listagem devolve `lot_id`/`inspector_id` crus.
4. **Sem tela.** O botão "Liberar" passa a falhar com 422 e o usuário não
   saberá o que fazer. `GET .../release-eligibility` existe para alimentar a
   tela — mas a tela é escopo de `PromadorFonteEnd`.
5. **RNC da reprovação nasce em transação própria** (herdado do G8): se
   falhar, fica inspeção reprovada sem RNC e resposta 500. A falha é
   conservadora (o gate não abre), mas é um 500.
6. **Sem teste de integração real (Postgres).** A suíte unitária usa
   repositório mockado e não pega erro de enum/coluna.
7. **`inspection_number` = `INSP-<timestamp>`** (mesma convenção do `NC-`):
   colisão no mesmo milissegundo viraria 500 pelo UNIQUE.
8. **Sem motor de amostragem Ac/Re** — nível de inspeção e AQL da ISO 2859-1
   dependem de decisão da Engenharia da Qualidade que **o dono ainda não
   tomou**. Não inventei os números.
9. **A mudança de disponibilidade vista pelo MRP** foi classificada como
   *alto risco* na pesquisa normativa. Mitigações aplicadas: correção só do
   lado da leitura (nenhuma escrita de estoque alterada,
   `services/inventoryService.ts` intocado), clamp em zero, e direção
   conservadora (planeja a mais, nunca consome material bloqueado). Ainda
   assim, **merece observação no primeiro plano de MRP após a aplicação**.

---

# HANDOFF — G5 (frontend): tela de Roteiro de Fabricação (2026-08-10)

## 1. Resumo da entrega

Tela web do gap **G5**, consumindo os 9 endpoints de `/api/production/routes`
entregues no commit `c21f81b`. Até aqui as tabelas `production_routes` /
`production_route_steps` eram lidas pelo sistema (custeio de mão de obra,
carga-máquina, OEE) mas **não havia como cadastrar um roteiro pelo sistema** —
o que tornava inexequível o apontamento por etapa obrigatório (Bloco K do SPED
Fiscal, Ajuste SINIEF 2/09). Esta tela destrava o G4.

**Caminho de menu:** Produção → **Roteiros de Fabricação** (`/production/routes`),
guarda `ModuleRoute module="producao"`.

### Decisão de UX central (é o que resolve o atrito de chão de fábrica)

O chão de fábrica numera operações de 10 em 10 (10, 20, 30) para poder
encaixar etapa no meio; o backend exige `sequence` **1..N contígua** porque é
por ela que o apontamento casa com a etapa. A tela separa as duas coisas:

- **o usuário nunca digita a sequência** — o ordinal vem da posição na lista e
  é recalculado no `submit` (`sequence: index + 1`). Reordenar é setas ↑ ↓ e
  botão "Inserir abaixo";
- o número de fábrica vai em **Código da operação** (`step_code`, texto livre),
  com um atalho "Preencher códigos vazios de 10 em 10".

Consequência: `G5-SEQ-GAP` e `G5-SEQ-DUP` deixam de ser alcançáveis pela tela
(continuam traduzidos, para o caso de chegarem por outro caminho).

## 2. Arquivos criados/alterados (só `client/`, nenhum arquivo de backend tocado)

### Criados
- `client/src/api/productionRoutes.ts` — tipos + os 9 endpoints (`list`, `getById`,
  `create`, `update`, `replaceSteps`, `activate`, `inactivate`, `revise`, `remove`).
  `activate` já desembrulha `meta.superseded_route_id`.
- `client/src/pages/production/productionRouteShared.ts` — rótulos de status/ajuda
  por situação e `translateProductionRouteError`: intercepta os **12 códigos
  `G5-*`** de `error.details.rule` e os 403 de RBAC
  (`APPROVAL_LEVEL_REQUIRED`, `NO_ACCESS_PROFILE`, `MODULE_ACCESS_DENIED`),
  devolvendo o padrão didático de 3 partes. Mesmo desenho de
  `pages/purchases/comexShared.ts`.
- `client/src/pages/production/RouteStepsEditor.tsx` — editor de operações
  (`RouteStepsEditor`) + tabela somente-leitura (`RouteStepsTable`).
- `client/src/pages/production/ProductionRoutesPage.tsx` — lista + detalhe +
  diálogos (criar, editar cabeçalho, revisar, excluir).
- `client/src/pages/production/ProductionRoutesPage.test.tsx` — 5 testes.

### Alterados
- `client/src/App.tsx` — rota `/production/routes` dentro de `ModuleRoute module="producao"`.
- `client/src/layouts/AppLayout.tsx` — item de menu e breadcrumb.
- `docs/manual/00-MANUAL_DO_USUARIO.md` — §6.7 com o passo a passo real.
- `docs/governance/CRONOGRAMA_FRONTEND_2026-07-31.md` (FE4) e
  `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` (cobertura de telas).

## 3. Rotas da API conectadas

| Ação na tela | Endpoint |
|---|---|
| Lista + filtros (busca, produto, situação) | `GET /api/production/routes` |
| Detalhe + etapas + totais | `GET /api/production/routes/:id` |
| "Novo roteiro" | `POST /api/production/routes` |
| "Editar cabeçalho" (só rascunho) | `PUT /api/production/routes/:id` |
| "Salvar operações" (substituição total) | `PUT /api/production/routes/:id/steps` |
| "Liberar roteiro" | `PATCH /api/production/routes/:id/activate` |
| "Aposentar roteiro" | `PATCH /api/production/routes/:id/inactivate` |
| "Criar nova revisão" | `POST /api/production/routes/:id/revise` |
| "Excluir rascunho" | `DELETE /api/production/routes/:id` |

Também consome `GET /api/products` (produtos fabricáveis) e
`GET /api/work-centers` (vínculo opcional da etapa).

## 4. O que o QA (ou humano) deve testar na interface

**Ciclo completo, na ordem:**
1. Criar rascunho para um produto acabado → conferir que ele **nasce em
   "Rascunho"** mesmo que o backend receba outra coisa.
2. Montar 3 operações, usar "Preencher códigos vazios de 10 em 10", salvar.
3. **Mover a 3ª operação para o topo** e salvar → a ordem exibida (1, 2, 3)
   deve bater com `GET /:id` depois do reload, e os códigos de fábrica devem
   ter acompanhado a operação, não a posição.
4. **Inserir uma operação entre a 1ª e a 2ª** ("Inserir abaixo") e salvar →
   nenhum erro de sequência deve aparecer.
5. Liberar (usuário com alçada `approve` em `producao`) → conferir a mensagem
   de que o roteiro ficou congelado.
6. Com o roteiro liberado: confirmar que **não há editor** (só leitura) e que
   "Criar nova revisão" aparece. Revisar deixando revisão/código em branco →
   deve nascer `<CÓDIGO>-R01` com cópia das etapas.
7. Liberar a revisão → a anterior deve ficar **"Substituído"** e a mensagem
   deve dizer isso explicitamente.

**Erros que precisam sair em português de fábrica (nenhum código `G5-` na tela):**
- Tentar salvar dois `step_code` iguais (a tela barra antes do HTTP, na linha).
- Desativar um centro de trabalho em `/production/work-centers`, voltar ao
  rascunho que o usa e tentar liberar → deve explicar o centro desativado e
  oferecer o link para reativá-lo.
- Tentar liberar rascunho **sem nenhuma operação** → checklist "Antes de
  liberar" deve barrar o botão com o motivo visível ao lado.
- Usuário com nível `operate` (não `approve`) → botão de liberar desabilitado
  com a explicação; se o backend for chamado assim mesmo, o 403 deve virar
  "peça à gerência", nunca `APPROVAL_LEVEL_REQUIRED`.
- Excluir rascunho de um roteiro cujas etapas já foram apontadas → deve
  explicar o vínculo com o apontamento e sugerir a revisão.

**Cenário de dois roteiros ativos:** com um roteiro já liberado para o produto,
selecionar outro rascunho do mesmo produto → deve aparecer o aviso âmbar
dizendo qual revisão será substituída.

## 5. Validação executada

- `npm run build` (`tsc -b` + vite) **limpo** — e `npx tsc -b --force` também.
- `npx vitest run`: 10 arquivos, **60 testes**, todos passando (5 novos).
- `npm run lint` (oxlint): nenhum achado nos arquivos novos.

## 6. Riscos residuais / limitações conhecidas

1. **Não testado contra o backend real.** A validação foi build + testes com
   API mockada; o contrato foi lido do código do módulo (`productionRouteRules.ts`,
   controller, validators) e de `docs/arquitetura/API.md` §33.
2. **Sem vínculo OP → revisão de roteiro** (limitação estrutural do backend,
   já registrada em `docs/governance/TODO.md`): a tela não pode mostrar "esta OP
   usou a revisão X", porque a coluna não existe.
3. **Salvar operações é substituição total** — o backend recusa (422
   `G5-ROUTE-IN-USE`) se qualquer etapa já tiver apontamento. A tela traduz o
   erro, mas **não antecipa** essa condição no checklist, porque nenhum endpoint
   expõe a contagem de apontamentos por roteiro antes da tentativa.
4. **`is_active` da etapa é sempre gravado como `true`** pela tela. A coluna
   existe e o backend a respeita nos totais, mas não há caso de uso definido
   para "etapa inativa dentro de roteiro" — evitei inventar semântica.
5. **Filtro de produto na listagem** usa `GET /api/products?limit=200`: fábrica
   com mais de 200 produtos não verá todos no select (mesmo padrão já usado em
   `BomPage.tsx`; combobox com busca server-side é melhoria futura).
6. **Precisão dos tempos:** minutos são `DECIMAL(10,2)` e trafegam como
   `number` (`valueAsNumber`). Não há campo de custo/peso `DECIMAL(18,6)` nesta
   tela, então a regra de precisão industrial não é afetada.

---

## 2026-08-10 — `AdmDBA` → Programador / QA / `AuditorIntegrador`: gap G1, a estrutura de produto passou a ter fonte única

### O que mudou, em uma frase

O ERP tinha **duas** estruturas de produto (BOM) paralelas — o MRP lia
`item_estruturas` (mestre `items`, UUID) e a produção consumia e custeava por
`bill_of_materials` (mestre `products`, INTEGER). **A partir de agora as duas
leituras vêm da mesma fonte: `bill_of_materials`.**

Racional completo da escolha: `docs/producao/06-BOM.md` §G1 e
`docs/database/DATABASE.md` §G1.

### ⚠️ Schema — migration NÃO aplicada

`server/migrations/20260810-000035-bom-single-source-g1.cjs`. **Não altera
tabela nem coluna.** Acrescenta:

- índice único **parcial** `uq_bill_of_materials_active_per_product`
  (`WHERE status = 'active'`) — falha de propósito se o banco já tiver 2+ BOMs
  ativas do mesmo produto; consulta de diagnóstico no rodapé do arquivo
- `COMMENT ON` em `bill_of_materials`/`.revision`/`.status` e em
  `item_estruturas`, marcando esta última como **legado congelado**

`up`/`down` exercitados de fato contra o Postgres dentro de `BEGIN … ROLLBACK`
(banco byte-idêntico). **São 7 migrations pendentes agora (000029–000035).**

### Contratos de API que mudaram (afeta `client/`)

| Endpoint | Antes | Agora |
|---|---|---|
| `POST /api/items/:id/estrutura` | 201, gravava em `item_estruturas` | **422 `G1-ESTRUTURA-DUPLA`**, com `details.endpoint_correto = 'POST /api/engineering/bom'` |
| `PUT /api/engineering/bom/:id` (BOM `active`, mudando `revision`/`notes`) | 200 | **422 `G1-BOM-ATIVA-IMUTAVEL`** |
| `PUT /api/engineering/bom/:id` (BOM `superseded`) | 200 | **422 `G1-BOM-SUPERSEDED-IMUTAVEL`** |
| `PUT /api/engineering/bom/:id` (`active` → `draft`) | 200 | **422 `G1-BOM-STATUS-INVALIDO`** |
| `POST /api/engineering/bom` (revisão repetida do produto) | 201 | **409 `G1-BOM-REV-DUP`** |
| `POST /api/engineering/bom` (produto como componente de si mesmo) | 201, quebrava depois na explosão | **422 `G1-BOM-AUTO-REF`** |

Reenviar os **mesmos** valores de uma BOM vigente **continua funcionando**
(não é alteração de engenharia) — formulários que reenviam o objeto inteiro
não quebram.

### 🔧 Para o Programador de frontend (não toquei em `client/` — trabalho em voo)

1. **`client/src/pages/products/ItemMasterDetailPage.tsx` (~linha 759)** chama
   `itemsApi.createItemStructure`, que agora responde 422. O erro é didático e
   `translateApiError` já lê `details`, mas **a aba deveria deixar de oferecer
   o formulário** e apontar para *Produção > Estrutura de produto*. Enquanto
   isso não for feito, o usuário vê um formulário que só sabe recusar.
   `explodeItemStructure` (mesma tela) **continua funcionando** — e agora
   explode a BOM real, não mais a tabela vazia.
2. **`BomPage.tsx`** ganha 3 erros novos possíveis no salvar
   (`G1-BOM-REV-DUP`, `G1-BOM-AUTO-REF`, e os de imutabilidade na edição).
   Vale expor o campo `revision` no formulário de criação: com o rótulo único
   obrigatório, criar a **segunda** revisão sem informá-lo agora dá 409.

### 🔍 Para o QA

- Cenário-chave: cadastrar BOM pelo módulo de BOM → rodar MRP → conferir que o
  plano explodiu **os mesmos componentes**. Antes disso dava divergência muda.
- Cenário de regressão: item que é componente de BOM ativa **não pode mais ser
  inativado** (o guarda estava cego para a BOM de produção).
- ⚠️ A suíte de integração **continua pulando em silêncio** sem
  `RUN_INTEGRATION` — o fluxo convergido ainda **não** foi exercitado contra
  Postgres ponta a ponta.

### 🧭 Para o `AuditorIntegrador` (rastreabilidade Requisito → Banco → API)

- UC-20 (`docs/projeto/04-USE_CASES.md`) foi atualizado com a fonte única e o
  ciclo de revisão ISO 9001 §8.5.6.
- **Decisão de negócio pendente do dono:** não existe `production_orders.bom_id`
  — a conclusão da OP explode a revisão **vigente no momento da conclusão**, não
  a que foi reservada na liberação. Mesmo gap que o G5 registrou para roteiro.
  Se a rastreabilidade "como fabricado" for requisito (Fisco/ISO), isso vira
  bloqueador e precisa de decisão antes de virar código.
- `MrpRepository.listStructureGaps()` existe e está testado, mas **sem rota** —
  a lacuna de catálogo (produto em BOM ativa sem `items.codigo`) ainda não tem
  como ser vista pela tela. Já há um caso real no banco de dev.

---

## 2026-08-10 — Programador → QA / Contador / `AuditorIntegrador`: gap G13, quando nascem a conta a pagar e a conta a receber

### 1. Resumo da feature

Duas correções contábeis irmãs, entregues juntas porque são o mesmo princípio
aplicado aos dois lados do lançamento, mais um caminho de exceção que o dono
mandou preservar.

| # | O que mudou | Antes | Agora | Norma |
|---|---|---|---|---|
| A | Conta a **pagar** de compra | nascia na **aprovação do pedido**, valor do pedido inteiro, vencimento `expected_date + 30` | nasce no **recebimento**, valor **do que chegou**, vencimento da NF do fornecedor | **CPC 00 (R2) 4.56 e 4.58** |
| B | Conta a **receber** de venda | nascia na **confirmação do pedido**, valor do pedido inteiro; venda à vista nascia com `status: 'paid'` | nasce na **autorização da NF-e**, valor **da emissão**, sempre `pending` | **CPC 47 31, 38 e 108** |
| C | Conta a **receber avulsa** | não havia endpoint | `POST /api/finance/receivable`, sem `sale_id` | decisão **D-J** do dono |

Ponto que dá nome ao gap, dos dois lados: **recebeu metade, deve a metade;
faturou metade, cobra a metade.** O valor acompanha o evento, nunca o
documento inteiro — coerente com o G9, que já tinha feito o estoque baixar
por emissão.

**Nenhuma parcela nasce paga.** A venda à vista dava quitação sem que nenhum
dinheiro tivesse entrado: recebível que nunca aparece como pendência no
extrato, sem registro de quem recebeu, invisível para a régua de cobrança, e
com quem vende dando baixa. Agora a parcela nasce `pending` com vencimento na
data da emissão e a baixa é evento próprio da Tesouraria.

**A alçada do G11 continua íntegra.** Mover a AP para o recebimento não abriu
caminho para passivo sem aprovação: pedido que não passa na alçada nunca
chega a `sent`, e `sent`/`partial` são os únicos status que o recebimento
aceita. A cadeia aprovação → passivo ficou mais longa e mais correta.

### 2. Arquivos criados/alterados

**Criados (backend)**
- `server/src/modules/purchases/domain/services/purchasePayableRules.ts` — regras puras: `calculateReceiptAmount` (soma em centavos) e `resolvePayableDueDate`
- `server/src/services/saleReceivableService.ts` — `buildInstallmentPlan` (pura) e `createInvoiceReceivables`
- `server/src/modules/financial/application/use-cases/CreateReceivableUseCase.ts` — cobrança avulsa (D-J) e a fronteira `G13-AR`

**Alterados (backend)**
- `server/src/modules/purchases/application/use-cases/ChangePurchaseStatusUseCase.ts` — `_createPurchasePayable` removido
- `server/src/modules/purchases/application/use-cases/ReceivePurchaseItemsUseCase.ts` — `createReceiptPayable` na mesma transação
- `server/src/modules/purchases/domain/repositories/PurchaseRepository.ts` + `infrastructure/sequelize/SequelizePurchaseRepository.ts` — `findLegacyPayableByPurchaseId`, `findAccountPayableByPurchaseAndInvoice`
- `server/src/modules/purchases/presentation/validators/purchaseValidators.ts` e `presentation/controllers/purchaseController.ts` — `invoice_date`/`due_date` no payload, `account_payable`/`payable_skip_reason` na resposta
- `server/src/modules/sales/application/use-cases/CreateSaleUseCase.ts` e `ChangeSaleStatusUseCase.ts` — criação de `AccountReceivable` removida
- `server/src/modules/fiscal/application/use-cases/IssueSaleNfeUseCase.ts` e `GetSaleNfeStatusUseCase.ts` — geram as parcelas na transação da autorização
- `server/src/modules/fiscal/domain/repositories/FiscalRepository.ts` + `infrastructure/sequelize/SequelizeFiscalRepository.ts` — `createAccountReceivable`, `findReceivablesBySaleId`
- `server/src/modules/financial/domain/repositories/FinancialRepository.ts` + `infrastructure/sequelize/SequelizeFinancialRepository.ts` — `createReceivable`
- `server/src/modules/financial/presentation/{routes/finance.ts,controllers/financialController.ts,validators/financialValidators.ts}` — `POST /api/finance/receivable`

**Testes**
- Criados: `server/tests/unit/purchase-payable-no-recebimento-g13.test.ts` (11 casos), `server/tests/unit/sale-receivable-na-nfe-g13.test.ts` (13 casos)
- Atualizados (dublês + asserções do comportamento antigo): `create-sale-quote`, `purchase-approval-authority`, `integrity-transaction-guards`, `warehouse-stock`, `requisition-receipt-status`, `material-receipt-quarantine`, `engineering-sample-requisition`, `issue-sale-nfe-partial`, `sales-nfe-rbac`

**Migrations:** nenhuma. O dado legado se autoidentifica por
`invoice_number IS NULL` (conta criada pela regra antiga nunca teve nota),
então não foi preciso criar coluna de flag. As 7 migrations pendentes
continuam 7, e o G13 funciona contra o banco atual sem depender de liberação.

### 3. Documentações atualizadas

- `docs/arquitetura/API.md` — quadro "Quando nasce a conta a receber" na seção Vendas; `POST /api/purchases/:id/receive` (campos novos, regra do passivo, `payable_skip_reason`); `POST /api/sales/:id/nfe` (geração das parcelas); nova seção `POST /api/finance/receivable` com a tabela de `details.rule`; aviso no topo da seção Financeiro
- `docs/financeiro/01-FINANCEIRO.md` — nova seção "Quando cada conta nasce", fluxos de Contas a Pagar e a Receber reescritos, consultas SQL de levantamento do dado legado e os números apurados
- `docs/projeto/04-USE_CASES.md` — UC-04 (venda não gera recebível), UC-06 (recebível de venda × avulso, com as duas regras `details.rule`), UC-15/G11 (aprovação não gera passivo), UC-16 (tabela completa da regra do passivo no recebimento), UC-19/COMEX (motivo detalhado de a AP de tributos seguir parada), UC-27 (embarque)
- `docs/governance/TODO.md` — seção `G13` completa: regra nova, checklist por camada, levantamento do dado legado com números, verificação executada, o que ficou parado e as pendências abertas
- JSDoc de classe/módulo em todos os arquivos citados no item 2, cada um com o dispositivo normativo que justifica a mudança

### 4. Instruções de teste

**Automático (o que eu já rodei — reproduza)**
```bash
cd server
npm run typecheck                      # limpo
npx jest tests/unit --maxWorkers=2     # 1692/1692, 159 suites
npx tsx -e "require('./app')"          # sobe sem erro
```

**Manual, contra o banco — conta a pagar (o caso que dá nome ao gap)**
1. Crie um pedido de compra de 10 unidades a R$ 25,00 e aprove-o.
   **Confira que `accounts_payable` NÃO ganhou linha nenhuma.**
2. Envie o pedido (`sent`) e receba **5 unidades** com
   `invoice_number: "NF-1"`.
   Esperado: 1 conta a pagar de **R$ 125,00** (metade), `status: 'pending'`,
   `invoice_number: 'NF-1'`, `approved_by: null`. A resposta traz
   `account_payable` preenchido e `payable_skip_reason: null`.
3. Receba as 5 restantes com `invoice_number: "NF-2"`.
   Esperado: **segunda** conta a pagar de R$ 125,00. As duas somam o pedido.
4. Informe `due_date` no payload e confira que ele prevalece; omita e confira
   `invoice_date + 30` (ou recebimento + 30 quando também omitido).
5. **Regressão de dado legado:** pegue um dos 8 pedidos já aprovados que têm
   AP antiga (`invoice_number IS NULL`) e receba-o. Esperado: **nenhuma AP
   nova**, `payable_skip_reason: "legacy_created_on_approval"`, e a AP antiga
   intacta.

**Manual — conta a receber**
6. Crie uma venda `confirmed` parcelada em 3x.
   **Confira que `accounts_receivable` NÃO ganhou linha nenhuma.**
7. Emita a NF-e do saldo inteiro. Esperado: 3 parcelas, todas `pending`,
   `payment_date` nulo, `invoice_number` = número da NF-e, somando o pedido.
8. Repita com faturamento **parcial** (`items: [{ sale_item_id, quantity }]`):
   a 1ª nota gera parcelas do valor dela; a 2ª continua a numeração de
   `installment` de onde a 1ª parou.
9. Venda **à vista** (1 parcela): confira que nasce `pending`, vencendo na
   data da emissão — **não** `paid`. Baixe em
   `PUT /api/finance/receivable/:id/pay` e confira `payment_date`,
   `amount_paid` e o usuário.

**Manual — cobrança avulsa (D-J) e as fronteiras**
10. `POST /api/finance/receivable` com `customer_id`, `amount`, `due_date` e
    `notes: "Venda de sucata"` → **201**, `sale_id: null`, `status: 'pending'`.
11. O mesmo payload **com** `sale_id` → **422**, `details.rule = 'G13-AR'`.
12. O mesmo payload **com** `status: 'paid'` → **422**,
    `details.rule = 'G13-AR-PAID'`.

**Para o contador (leitura, não precisa de sistema)**
13. Rode as três consultas de `docs/financeiro/01-FINANCEIRO.md` e confirme
    os números: 8 AP de pedido não recebido (R$ 3.675,02, uma delas de pedido
    **cancelado**), 2 AR de venda não faturada (R$ 150,00), 0 AR nascidas
    pagas. **Nenhuma tem `payment_date`.** Decida: estornar as 8 (correção do
    balanço) ou congelá-las (pragmático)? É a pergunta **C9**, ainda sem
    resposta — nada foi reclassificado por conta própria.

### 5. Riscos residuais

1. **PARADO E REPORTADO — AP dos tributos de importação (COMEX).** Estava no
   escopo registrado do G13 e **não foi implementado**. O momento do
   reconhecimento deixou de ser a dúvida; o que falta são quatro decisões de
   negócio: (a) o ERP não guarda número nem data de registro da **DI**, de
   onde sairia o vencimento de II/IPI/PIS/COFINS; (b) o **ICMS-Importação**
   varia por UF e regime especial; (c) o credor é a União/Estado, não o
   fornecedor estrangeiro, e `accounts_payable.supplier_id` aponta para
   `suppliers`; (d) `AccountPayable` não tem moeda/câmbio (menor problema
   para os tributos, que já saem em BRL, mas bloqueia lançar o FOB). **As
   datas de vencimento não estão confirmadas em fonte oficial na pesquisa
   normativa — não devem ser assumidas.**
2. **Cancelar NF-e autorizada não cancela as parcelas daquela emissão** —
   nem devolve estoque (pré-existente do G9). Mantido coerente de propósito:
   baixado == faturado == cobrado. Reversão automática é entrega própria.
3. **Nenhum `POST` real completo foi executado.** A escrita foi validada por
   transação com **rollback** contra o Postgres de dev (os três payloads
   exatos foram aceitos pelo schema físico; contagens conferidas antes e
   depois, 18 AP e 2 AR inalteradas). O teste de integração HTTP de
   `POST /api/purchases/:id/receive` e `POST /api/sales/:id/nfe` continua
   pendente — mesmo débito do item 3 de
   `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`.
4. **Compromisso de compra ficou sem visão gerencial.** Pedido aprovado e não
   recebido saiu de contas a pagar (correto), mas a tela que deveria
   substituí-la — "pedidos em aberto / desembolso previsto", separada do
   passivo contábil — não existe. Compras perde visibilidade que tinha, ainda
   que pelo lugar errado.
5. **`POST /api/finance/receivable` não tem tela** em `client/` (escopo dos
   agentes de frontend).
6. **Pergunta C7 em aberto** (prazo conta da NF do fornecedor ou do
   recebimento físico?) — muda apenas a data-base do default de 30 dias.
7. **Frete continua fora do valor da AP**, como já ficava fora de
   `total_amount`. Não é regressão, mas é uma parte do custo da compra que
   segue dependendo de lançamento manual.
8. **`cost_center_id` da AP automática continua `NULL`** — o de-para
   departamento → centro de custo nunca foi definido pelo negócio. O TODO
   apenas mudou de lugar (da aprovação para o recebimento).

---

# Handoff — D-K: segregação de função na compra (quem solicita não aprova)
**Data:** 2026-08-10 · **Agente:** `evok-production-remediation` (backend) ·
**Commit:** *(não commitado — o dono verifica antes)*

## 1. Resumo da feature

O dono decidiu em 2026-08-10, respondendo à pergunta direta *"aprovador ≠
solicitante?"*: **"Sim, aprovador ≠ solicitante"** — decisão **D-K**,
registrada em `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4.
Isso fecha o critério de pronto da §5 do mesmo plano (*"quem aprova uma
compra não é quem a solicitou"*), que estava aberto **de propósito** desde o
G11: naquela entrega o pedido foi **alçada** (quem tem poder de aprovar),
não **segregação** (se essa pessoa é a mesma que pediu), e o escopo não foi
estendido por iniciativa do agente.

A regra é única e vive em `server/src/shared/domain/segregationOfDuties.ts`
(`assertApproverIsNotRequester`, `isSelfApproval`, `SEGREGATION_RULES`).
Mora em `shared/` porque os pontos de aprovação pertencem a **3 módulos
diferentes** — uma cópia por módulo garantiria que o próximo ponto ficasse
para trás, que foi exatamente o que aconteceu com o G11 (nasceu em Compras e
só alcançou o COMEX na decisão D-G).

**4 pontos cobertos**, cada um com `details.rule` próprio, verificação
**antes de qualquer escrita** e aprovador **sempre** de `req.user.id` (JWT):

| Endpoint | `details.rule` | Solicitante comparado |
|---|---|---|
| `PATCH /api/purchase-requisitions/:id/status` (`approved`) | `D-K-REQUISICAO` | `purchase_requisitions.requester_id` |
| `PUT /api/purchases/:id/status` (`approved`) | `D-K-PEDIDO` | `purchase_orders.requester_id` |
| `POST /api/purchases/:id/approve` (alçada G11) | `D-K-ALCADA` | `purchase_orders.requester_id` |
| `POST /api/comex/import-processes/:id/approve` (G11-COMEX) | `D-K-COMEX` | `import_processes.created_by` |

Duas decisões de julgamento, com o argumento:

1. **`role = 'admin'` NÃO isenta** — única regra do ERP sem curto-circuito de
   admin. RBAC e alçada respondem a *"tem privilégio?"*, e privilégio é
   concedível; segregação responde a *"é a mesma pessoa?"*, e identidade não
   é. Exceção para `admin` não seria estreita: seria o cancelamento da regra,
   porque `admin` é a conta que opera o sistema.
2. **Solicitante desconhecido não bloqueia.** `purchase_orders.requester_id`
   é `NULL`-able (0 nulos hoje); bloquear por `NULL` tornaria pedidos legados
   inaprováveis para sempre, sem remediação.

**Sem migration.** Nenhuma coluna nova foi necessária.

### 🔴 O que o dono precisa saber ANTES de aplicar

Verificado no banco (somente leitura), não estimado: existem **2 usuários
ativos** e **apenas 1 capaz de aprovar compra** — o próprio `admin`, autor de
18/18 pedidos, 13/13 requisições e 4/4 importações, com **7 de 7 requisições
auto-aprovadas** (`approved_by = requester_id = 1`). Com a regra ativa e sem
novo cadastro, **nenhuma compra é aprovável**. Ação necessária:
**Administração → Perfis de Acesso**, criar um segundo aprovador com
`requisicoes: approve` + `compras: operate` (+ `diretor: operate` se for
assinar alçada/importação).

## 2. Arquivos alterados

**Código (6):**
- `server/src/shared/domain/segregationOfDuties.ts` *(novo)*
- `server/src/modules/purchaseRequisitions/application/use-cases/ChangePurchaseRequisitionStatusUseCase.ts`
- `server/src/modules/purchases/application/use-cases/ChangePurchaseStatusUseCase.ts`
- `server/src/modules/purchases/application/use-cases/ApprovePurchaseUseCase.ts`
- `server/src/modules/comex/application/use-cases/ApproveImportProcessUseCase.ts`
- `server/tests/unit/purchase-segregation-of-duties.test.ts` *(novo, 18 testes)*

Nenhum controller, rota, model ou migration foi tocado.

## 3. Documentações atualizadas

- `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` — decisão **D-K**
  em §4 (mesmo formato de D-A…D-J), critério da §5 marcado `[x]` com a
  ressalva operacional, e linha nova na tabela de execução da §6.
- `docs/arquitetura/API.md` — nova seção *Segregação de função na compra
  (D-K)* com o corpo exato do 422, mais notas nos 4 endpoints.
- `docs/suprimentos/01-COMPRAS.md` — seção nova com a tabela dos 4 pontos e
  a ação operacional necessária.
- `docs/suprimentos/02-COMEX.md` — seção nova sobre o gate da diretoria + D-K.
- `docs/administrativo/04-PERFIS_ACESSO.md` — subseção *"A exceção onde
  `admin` NÃO passa direto"* + perfil mínimo do segundo aprovador.
- `docs/governance/TODO.md` — entrada D-K com entregue, impacto operacional e
  achados.
- JSDoc: cabeçalho completo em `segregationOfDuties.ts` e nos 4 use cases
  (incluindo os `@throws` novos com o `details.rule` de cada um).

## 4. Instruções de teste

```bash
cd server
npm run typecheck                                   # limpo
npx jest tests/unit/purchase-segregation-of-duties.test.ts   # 18/18
npx jest tests/unit --maxWorkers=2                  # ver ressalva abaixo
npx tsx -e "require('./app')"                       # sobe sem erro
```

Manual (exige 2 usuários — é justamente o ponto):
1. Com o usuário A, criar uma requisição de compra e submetê-la (`pending`).
2. Ainda como A, `PATCH /api/purchase-requisitions/:id/status`
   `{ "status": "approved" }` → **422** com
   `error.details.rule = "D-K-REQUISICAO"`; conferir no banco que `status`
   continua `pending` e `approved_by` continua `NULL`.
3. Com o usuário B (perfil `requisicoes: approve`), o mesmo `PATCH` → **200**.
4. Repetir o par recusa/aprovação em `PUT /api/purchases/:id/status`
   (`D-K-PEDIDO`), `POST /api/purchases/:id/approve` (`D-K-ALCADA`) e
   `POST /api/comex/import-processes/:id/approve` (`D-K-COMEX`).
5. Conferir que o solicitante **continua** conseguindo submeter, cancelar,
   converter e enviar (`approved → sent`) — a regra só alcança aprovar.

## 5. Riscos residuais

1. 🔴 **Um único aprovador cadastrado** — detalhado acima. É o risco que pode
   parar a fábrica, e é organizacional, não técnico.
2. **`purchase_orders.requester_id` `NULL`-able** — recomendado
   `ALTER TABLE purchase_orders ALTER COLUMN requester_id SET NOT NULL;` em
   migration futura (não escrita, para não engrossar a fila de 8 pendentes).
3. **Adjudicação de RFQ e recebimento não cobertos** — avaliados, com
   argumento em `docs/governance/TODO.md`; entram com um "sim" do dono.
4. **Nada exercitado por HTTP contra o Postgres.** Validação foi typecheck +
   unitário + boot + conferência de nomes de coluna em
   `information_schema.columns`. Mesmo débito do item 3 de
   `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`.
   Atenuante: esta entrega **não escreve nada** — só decide se uma escrita já
   existente acontece.
5. **A UI ainda não sabe da regra** — o botão "Aprovar" continua visível para
   o solicitante e só falha no clique. `isSelfApproval` está exportado
   justamente para o front resolver isso; `client/` é escopo de outro agente.

---

# Handoff — G17: Plano Mestre de Produção (MPS)

**Data:** 2026-08-10 · **Gap:** G17 (Onda 3) · **Decisão do dono:** **D-F**
**Escopo:** backend (`server/`). Tela web **não** entregue.

## 1. Resumo da feature

Criada a camada de **Plano Mestre de Produção** entre a carteira de pedidos e a
ordem de produção. Antes disto não existia ligação nenhuma entre "o cliente
comprou" e "a fábrica produz": confirmar venda só reservava estoque
(`ChangeSaleStatusUseCase`, G9), o MRP calculava exclusivamente contra a demanda
**digitada no payload** (`GenerateMrpPlanUseCase` → `input.demands`), ninguém lia
o saldo aberto dos pedidos e ninguém tratava `products.min_quantity` como
demanda. A decisão de produção era memória do planejador.

**O que a camada faz:** consolida
`(carteira de pedidos + estoque mínimo + previsão manual)` contra
`(saldo de planejamento + saldo a produzir das OPs abertas)`, registra a
**decisão do planejador** linha a linha, e gera as OPs a partir dessa decisão,
com rastro de origem.

**O que ela deliberadamente NÃO faz:** disparar OP automática na confirmação da
venda. A decisão D-F confirmou que existe PCP formal — há quem planeje —, e a
recomendação do plano de ação é justamente esta camada. Na prática: a linha
nasce `pending` com `planned_quantity = 0` mesmo com sugestão positiva, e
firmar um plano sem nenhuma decisão é recusado (422).

**Ciclo:** `draft → firm → released` (`canceled` a partir de `draft`/`firm`).

**Endpoints** (`/api/production/master-plans`, RBAC `authorizeModule('mrp', …)`
em 100% das rotas): `GET /`, `GET /:id`, `POST /`,
`PATCH /:id/lines/:lineId`, `POST /:id/firm`, `POST /:id/release`,
`POST /:id/cancel`.

### Aderência ao que foi entregue hoje pelos outros gaps

- **G1** — nenhuma segunda estrutura de produto foi criada. A liberação usa
  `BomService.checkAvailability`, que já lê a fonte única.
- **G7/G3/G9** — o saldo usado é o **saldo de planejamento**
  (`max(0, products.quantity − quarentena/bloqueio − reservado)`), o mesmo que o
  G7 impôs ao MRP; o desconto de quarentena delega a
  `services/quarantineBalanceService` para não criar uma segunda definição.
- **G16** — a liberação repete as **mesmas** validações dos outros dois
  caminhos de criação de OP (produto ativo e fabricável, BOM ativa/G2, material
  disponível) e usa a numeração serializada por advisory lock + `MAX`.
- **`ChangeProductionOrderStatusUseCase`, `quality/` e `client/` não foram
  tocados** (agentes concorrentes).

## 2. Arquivos

**Novos**

```
server/migrations/20260810-000037-create-master-production-plan-g17.cjs  (NAO APLICADA)
server/src/models/MasterProductionPlan.ts
server/src/models/MasterProductionPlanLine.ts
server/src/modules/masterProduction/**  (domain, infrastructure, 6 use cases, controller, rotas, README)
server/tests/unit/master-production-plan-g17.test.ts   (40 casos)
```

**Alterados**

```
server/app.ts                                        monta /api/production/master-plans
server/src/models/index.ts                           registro + associacoes dos 2 models
server/tests/unit/module-authorization-map.test.ts   guarda RBAC do modulo novo
```

## 3. Documentações atualizadas

| Arquivo | O que entrou |
|---|---|
| `docs/arquitetura/API.md` | **§34 nova** — contrato completo, RBAC, ciclo de vida, a conta, `details.rule`, limitações |
| `docs/producao/02-PCP.md` | seção "Plano Mestre (MPS) — IMPLEMENTADO", incluindo o registro honesto de que o fluxo desenhado ali era doc e não código |
| `docs/projeto/04-USE_CASES.md` | **UC-72** com fluxo, tabela de validações e decisões em aberto |
| `docs/database/DATABASE.md` | entrada 2026-08-10 G17 — as 2 tabelas, os literais de ENUM conferidos, e a pendência de `sales` sem data de entrega |
| `docs/governance/TODO.md` | entrada 2026-08-10 G17 — entregue, 4 decisões de PCP pendentes, 5 limitações reportadas |
| `server/src/modules/masterProduction/README.md` | visão do módulo para quem pegar depois |
| JSDoc | cabeçalho de módulo em 100% dos arquivos novos; toda função pública documentada com `@param`/`@returns`/`@throws` |

## 4. Instruções de teste

### Verificação automática (roda hoje, sem migration)

```bash
cd server
npm run typecheck
npx jest tests/unit/master-production-plan-g17.test.ts --maxWorkers=2
npx jest tests/unit --maxWorkers=2
npx tsx -e "require('./app')"
```

### Teste funcional — só DEPOIS de aplicar a migration `20260810-000037`

Pré-requisito: um produto `finished` **ativo**, com **BOM ativa** e material em
estoque **liberado** (não em quarentena).

1. **Demanda de venda.** Criar venda desse produto e confirmá-la
   (`confirmed`). Não faturar.
2. **Demanda de estoque mínimo.** Garantir `products.min_quantity > 0` em outro
   produto fabricável.
3. `POST /api/production/master-plans`
   `{ "horizon_start": "2026-08-10", "horizon_end": "2026-09-10" }` → **201**.
   **Conferir na resposta:** o produto vendido aparece com
   `demand_sales_orders` = saldo não faturado; o outro aparece com
   `demand_safety_stock` = `min_quantity`; **toda** linha nasce
   `status: "pending"` e `planned_quantity: 0`.
4. **Quarentena.** Colocar um lote do produto em `quarantine`, criar outro
   plano e conferir que `supply_withheld` > 0 e que `supply_on_hand` **caiu** —
   é a prova de que o plano não conta material não inspecionado.
5. `POST /:id/firm` **antes de decidir qualquer linha** → **422** com
   `details.rule = "G17"` e `details.decided_lines = 0`.
6. `PATCH /:id/lines/:lineId` `{ "planned_quantity": 10 }` → linha `planned`.
   Conferir que `suggested_quantity` **não** mudou.
7. `POST /:id/firm` → **200**. Repetir o `PATCH` da linha → **422**
   (`details.status = "firm"`), decisão congelada.
8. `POST /:id/release` → **201**: uma OP por linha decidida, `order_number`
   `OP-YYYY-NNNN`, `sales_order_id` **NULL**, e
   `master_production_plan_lines.production_order_id` preenchido.
9. **Tudo ou nada.** Repetir com um produto **sem BOM ativa** entre as linhas
   decididas → **422** com `details.blocked_lines[].reason = "no_active_bom"` e
   **nenhuma OP criada** (conferir `SELECT count(*) FROM production_orders`
   antes e depois).
10. **Contagem de linha** (regra prática do §3 da nota de classe de defeito):
    `SELECT count(*) FROM master_production_plans;` — zero depois deste roteiro
    significa que o caminho de escrita nunca executou com sucesso.

## 5. Riscos residuais

1. **Migration `20260810-000037` NÃO aplicada.** Enquanto não for, todo
   endpoint deste módulo responde 500 (tabela inexistente). `up`/`down` foram
   validados por dry-run com `queryInterface` dublê, não contra o Postgres.
2. **Nada exercitado por HTTP contra o Postgres** — os 40 testes usam
   repositório dublê. É o débito do item 3 de
   `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`, e
   aqui ele **pesa mais que o normal**: diferente do G11/D-K, esta entrega
   **escreve** (duas tabelas novas e uma OP).
3. **4 decisões de PCP em aberto** (horizonte, lote mínimo, pedido que chega
   depois do plano fechado, alçada de aprovação do PCP) — detalhadas em
   `docs/governance/TODO.md`. Nenhuma foi inventada.
4. **`sales` não tem data de entrega prometida.** A demanda é consolidada no
   horizonte inteiro, **sem baldes de tempo**. O MPS "Semana 1 / Semana 2 /
   Semana 3" que `docs/producao/02-PCP.md` desenha **não é possível** sem essa
   coluna. É a limitação mais relevante desta entrega.
5. **Concorrência entre linhas do mesmo plano** — `checkAvailability` não
   participa da transação e a reserva só ocorre em `released`; duas linhas que
   consomem o mesmo componente são avaliadas independentemente. Limitação
   herdada, idêntica à do caminho do MRP.
6. **Sem tela** (`client/`) — o planejador só acessa por API hoje.
7. **Numeração `MPS-YYYY-NNNN`** usa `pg_advisory_xact_lock(41002, ano)`; o
   `classid` `41001` já é da OP. Se alguém adicionar outra numeração
   serializada, **não reutilizar esses dois valores**.

---

## 2026-08-10 — `AdmDBA` → Programador / QA / `AuditorIntegrador`: baseline do schema congelado

**Escopo:** só `server/migrations/` e `server/scripts/`. **Nada** em
`server/src/modules/`, `server/tests/` ou `client/` foi tocado.

### 1. O que mudou e por quê

`20260731-000001-baseline-schema.cjs` gerava o schema a partir dos models
**compilados, em tempo de execução**. O efeito estava provado no dado: dois
bancos com as **mesmas 160 migrations** divergiam em 29 colunas, porque o
schema produzido dependia de **quando** o bootstrap rodou.

Agora o `up` aplica DDL estático (`database/postgresql/00_baseline_frozen.sql`,
784 KB, 200 tabelas) e registra as outras 159 migrations em `SequelizeMeta`
como já aplicadas — o umzug 2.x reconsulta o storage por migration, no momento
de executar, então as pula.

### 2. Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `server/migrations/20260731-000001-baseline-schema.cjs` | **reescrito** — DDL congelado no lugar de `DYNAMIC_MODEL_FILES`/`createTableFromModel`; `down` coerente |
| `server/migrations/20260803-000008-create-access-profiles.cjs` | `+ module.exports.seedReferenceData` (aponta para a função de seed já existente) |
| `server/migrations/20260804-000001-create-warehouses.cjs` | seed extraído para `seedWarehouses()` e exportado — **SQL idêntico**, sem mudança de comportamento |
| `server/migrations/20260804-000008-create-production-cost-settings.cjs` | idem, `seedProductionCostSettings()` |
| `server/scripts/comparar-bancos.cjs` | aceita 2 nomes de banco por argumento; passou a comparar **tipo**, **default**, **índice** e **constraint** além de nulabilidade; `exit 2` em divergência |

### 3. O que o programador precisa saber

1. **`npm run migration:up` não depende mais de `dist/`** para o baseline. O
   `npm run build` continua no script (outras migrations podem precisar), mas
   o baseline não lê model nenhum.
2. **Migration nova depois do congelamento roda normal.** A lista de
   pré-marcadas vem de `00_baseline_frozen_meta.sql`, não de um `readdir`.
3. 🔴 **Se você criar uma migration que semeia dado de referência** (não
   backfill — dado que precisa existir em banco vazio), ela **não** roda em
   banco novo, porque será pré-marcada. Duas saídas, ambas documentadas no
   cabeçalho do baseline: entrar em `STILL_RUN_AFTER_FROZEN` (só se for
   DDL-free e idempotente) ou exportar `seedReferenceData`. **Não há guarda
   automática para isso.** É a armadilha mais provável desta entrega.
4. **Ao recongelar o dump** (quando o volume pós-freeze crescer): regerar
   `00_baseline_frozen.sql` (`pg_dump --schema-only --no-owner --no-acl`) e
   `00_baseline_frozen_meta.sql` (`pg_dump --data-only --table=SequelizeMeta`).
   Processo ainda **manual**, sem script versionado.

### 4. Como reproduzir a validação

```bash
docker exec evok-postgres psql -U evok_admin -d postgres \
  -c "CREATE DATABASE erp_evok_audio_baseline_check;"

cd server
DB_NAME=erp_evok_audio_baseline_check node src/scripts/run-sequelize-cli.cjs db:migrate
node scripts/comparar-bancos.cjs erp_evok_audio erp_evok_audio_baseline_check
# esperado: "RESULTADO: os dois bancos sao IDENTICOS."

docker exec evok-postgres psql -U evok_admin -d postgres \
  -c "DROP DATABASE erp_evok_audio_baseline_check;"
```

⚠️ Nunca redirecione a saída de `db:migrate` para `| head` — o SIGPIPE mata o
processo no meio da migração e o banco fica parcial. Use `> arquivo.log`.

### 5. Validação executada nesta entrega

- Banco descartável provisionado só por migrations → **idêntico** ao
  `erp_evok_audio` (0 divergência em coluna, tipo, default, índice,
  constraint). Derrubado em seguida.
- Ciclo `up → down → up`: após o `down` restou 1 tabela (`SequelizeMeta`), 0
  migrations, 0 tipos ENUM; o `up` seguinte reconstruiu tudo, idêntico de novo.
- Dado de referência no descartável: 3 depósitos, 1 perfil de acesso, 26
  permissões, 1 `production_cost_settings`, 30 contas contábeis, GRANT de
  `evok_app` em 199 tabelas.
- `npm run typecheck` limpo · `npx jest tests/unit` **1807/1807** em 166 suítes
  · servidor sobe (`/health/ready` = 200) · as 3 guardas de integração verdes
  (`RUN_INTEGRATION=true DB_NAME=erp_evok_audio_test`).
- `erp_evok_audio` e `erp_evok_audio_test` **não foram tocados** — seguem 160
  up / 0 pendentes.

### 6. Riscos residuais

1. **O atalho `shouldBootstrapCanonicalSchema` foi mantido** (o plano original
   previa removê-lo). É proteção contra aplicar o dump sobre banco que já tem
   tabelas. Consequência: um banco provisionado fora do fluxo de migrations
   continua não recebendo o DDL congelado — o `up` simplesmente não faz nada.
2. **`01_schema.sql`, `02_indexes.sql`, `02a_…` e `04a…04i` ficaram órfãos.**
   Nenhuma migration os lê. Mantidos como histórico; falta decidir se saem ou
   ganham cabeçalho `DEPRECATED`.
3. **O `down` do baseline é destrutivo por natureza** — ele derruba o schema
   inteiro, porque o `up` cria o schema inteiro. A proteção é que só se chega
   nele depois de reverter as 159 acima.
4. **`erp_evok_audio_test` não foi reprovisionado pelo baseline congelado.**
   Ele veio de cópia do dev em `e2a8d7e` e é idêntico, então não há divergência
   — mas a prova do caminho de provisionamento foi feita no descartável, não
   nele.

---

# HANDOFF — Suíte de integração: 31 falhas → 0 (2026-08-10, `programador`)

## 1. Resumo da feature

`npm run test:integration` (API + PostgreSQL reais, banco
`erp_evok_audio_test`) saiu de **97 passando / 31 falhando** para **124
passando / 0 falhando** em 36 suítes, com `assert-jest-no-skips` verde e
resultado estável em duas execuções seguidas contra o mesmo banco sujo.

A leitura das 31 falhas foi, em sua maioria, **regra nova funcionando com
teste desatualizado** — os 17 gaps entregues mais cedo no mesmo dia mudaram o
fluxo real da empresa e a suíte ainda descrevia o fluxo anterior, em que *uma
única pessoa fazia tudo*. Duas falhas, porém, eram **defeito de produção real**
e foram corrigidas no código.

### Defeitos de produção corrigidos

| Endpoint | Sintoma | Causa | Arquivo |
|---|---|---|---|
| `POST /api/sales` | **400** em qualquer payload sem `payment_method` **e** `notes` — não existia venda criável pela API sem os dois | `SaleEntity` coagia ausência para `null` **explícito**; as colunas são `NOT NULL` **COM default** (`'pix'`, `''`) e `null` explícito anula o default do Postgres | `server/src/modules/sales/domain/entities/SaleEntity.ts` (+ `CreateSaleUseCase.ts`) |
| `POST /api/suppliers` | **500** quando `trade_name` era omitido | idem — `suppliers.trade_name` é `NOT NULL DEFAULT ''` | `server/src/modules/suppliers/domain/entities/SupplierEntity.ts` |

Os dois são a **mesma classe** de
`docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`, numa
variante que as 3 guardas **não** cobrem: a guarda de drift isenta de propósito
colunas `NOT NULL` com default (omiti-las não quebra INSERT). O que quebra é
passar `null` explícito — e isso é código, não schema.

### Infraestrutura de teste (o que destravou a cadeia)

- **Segundo administrador** `ci-approver@evok.local` provisionado por
  `server/scripts/run-api-suite.cjs`, com `TEST_APPROVER_TOKEN` exportado. A
  segregação de função **D-K** proíbe que o solicitante aprove, e `admin`
  deliberadamente **não** isenta (permissão é concedível; identidade não).
  Com um único usuário, nenhuma compra do ERP é aprovável — a suíte travava na
  primeira aprovação e derrubava tudo em cascata. `role: 'admin'` também
  entrega a alçada de diretoria do G11/G11-COMEX, então um usuário extra cobre
  os **4** pontos de aprovação.
- `tests/helpers/testApi.ts` ganhou `approverToken()` e `mintToken()`.
  **Nenhuma senha é usada em teste algum**: o JWT é assinado direto, pela mesma
  técnica do runner. As senhas dos 18 logins departamentais
  (`scripts/seed-usuarios-departamentos.cjs`) são aleatórias a cada execução e
  ficam fora do Git — nenhum teste pode depender delas.
- `production_cost_settings.default_labor_rate_per_hour = 50` garantido no
  banco de teste (equivalente ao que o dono configura uma vez em Produção >
  Configuração de Custeio). Sem taxa, o G4 recusa concluir OP cuja etapa não
  tenha centro de trabalho com `cost_per_hour`.
- `run-api-suite.cjs` aceita filtro opcional de caminho para depuração
  (`node server/scripts/run-api-suite.cjs integration sale-`).

### Testes trazidos para a regra nova

`e2e-cadeia-insumo-produto.test.ts` foi o mais afetado: passou a operar com
**dois usuários** e a provar explicitamente os gates novos — `D-K-REQUISICAO`,
`D-K-COMEX`, `G7`/`no_inspection`, `G11-COMEX`, `G1-ESTRUTURA-DUPLA` — além do
caminho feliz. Os **4 contornos BUG-01…BUG-04 foram removidos**: as colunas
`NOT NULL` indevidas caíram na migration `20260810-000028` e os caminhos de API
voltaram a funcionar; manter contorno vivo depois da correção esconde a próxima
regressão.

`sale-quote-confirm.test.ts` **afirmava um comportamento errado como correto**
("confirmar a venda DEBITA o estoque") — exatamente o que o G9 corrigiu, por
contrariar o Ajuste SINIEF 07/05 cl. 9ª §1º (a mercadoria só transita depois da
autorização da NF-e). Foi corrigido para medir reserva, não baixa.

Nenhuma regra de produção foi afrouxada para fazer teste passar.

## 2. Documentações atualizadas

- `docs/governance/TODO.md` — seção "2026-08-10 — Suíte de integração: de 31
  falhas para 0", com a tabela causa × natureza, os dois bugs reais, as
  correções de fixture, a verificação medida e **3 pendências abertas**.
- `docs/governance/HANDOFF_CODEX.md` — este bloco.
- JSDoc novo/revisado em: `tests/helpers/testApi.ts` (`approverToken`,
  `mintToken`), `server/scripts/run-api-suite.cjs` (segundo aprovador, taxa horária,
  `runJestSuite` com filtro), `SaleEntity.ts`, `SupplierEntity.ts`,
  `CreateSaleUseCase.ts`, e o cabeçalho do E2E (tabela "o que mudou e por quê").

## 3. Instruções de teste

```bash
cd server

npm run typecheck                    # limpo
npx jest tests/unit --runInBand      # 1807/1807 em 166 suites
npm run test:integration             # 36/36 suites, 124/124 testes
npm run test:edge:strict             # 3/3
```

`test:integration` sobe o servidor real, aplica migrations, provisiona os
fixtures (inclusive o segundo aprovador) e roda contra `erp_evok_audio_test`.
Rodar **duas vezes seguidas** é parte do aceite: a suíte escreve num banco
persistente e precisa ser idempotente. Confirmado.

Para conferir os dois bugs corrigidos sem a suíte, contra a API no ar:

- `POST /api/suppliers` com apenas `{ company_name, cnpj }` → **201**, com
  `trade_name: ""`.
- `POST /api/sales` com apenas `{ customer_id, items }` → **201**, com
  `payment_method: "pix"` e `notes: ""` vindos do default da coluna.

## 4. Riscos residuais

1. **A variante que causou os dois bugs continua sem rede.** `null` explícito
   em coluna `NOT NULL` **com default** passa por typecheck, pelos 1807
   unitários e pelas 3 guardas. Há **69** colunas nessa condição declaradas
   nulláveis nos models. Guarda por schema seria ruído; varredura estática do
   padrão `?? null` em `domain/entities/` dá 13 candidatos, a maioria
   falso-positivo (não existe mapeamento declarativo entidade→tabela). O que
   fecha de verdade é o item 3 do documento de classe de defeito: **um `POST`
   com payload mínimo por endpoint de criação, no Postgres real**.
2. **Decisão do dono pendente:** `BomService.createBOM` só aceita
   `product_type = 'finished'`. Depois do G1 (MRP lê só BOM ativa), isso
   significa que **subconjunto `semi_finished` não pode ter estrutura
   própria**. O gate G16 do E2E só roda porque tipa o subconjunto como
   `finished` — está comentado no teste e registrado no TODO. A alternativa é
   a árvore multinível dentro da BOM do acabado (`bom_level`/`parent_item_id`),
   que existe no schema mas **não** é o que `bomStructureProjection` projeta
   hoje.
3. `POST /api/inventory/lots/:id/release` com id não numérico responde **500**
   em vez de 400 — inconsistência de contrato, baixo impacto.
4. A suíte de integração roda contra um banco **persistente e acumulativo**.
   Ela é idempotente hoje, mas cada rodada deixa registros (`CI-*`, `E2E-*`).
   Não há rotina de limpeza versionada.

---

## 2026-08-11 — Backend → QA / `AuditorIntegrador`: os 2 defeitos CRÍTICOS do MRP

## 1. Resumo da feature

Correção dos dois defeitos **críticos** que a auditoria de 2026-08-11 achou no
módulo de MRP, mais o achado BAIXO 15 (que vivia no mesmo caminho de código).
**Nenhuma mudança de schema** — não há migration nesta entrega.

### Defeito 1 — netagem multi-demanda: o plano comprava a menos

`GenerateMrpPlanUseCase` chamava o motor **uma vez por demanda**
(`calculateMrpPlan([demand], …)`), sempre com a posição de estoque íntegra.
Cada demanda abatia o saldo inteiro, como se fosse a única da fábrica.

| | bruta | estoque considerado | líquida |
|---|---|---|---|
| demanda A | 100 | 100 (íntegro) | 0 |
| demanda B | 100 | 100 (**de novo**) | 0 |
| **realidade** | **200** | **100** | **100** |

Com líquida 0 nas duas, o filtro `plannedQuantity > 0` do motor descartava as
duas linhas: **nenhuma ordem planejada, nenhuma requisição, e uma falta de 100
peças que só aparece no chão de fábrica.** O motor (`mrpEngine.ts`) sempre
soube agregar várias demandas — era o chamador que não deixava.

Agora a netagem é **conjunta** (uma passagem do motor com todas as demandas) e
a necessidade líquida agregada é **rateada por origem**, proporcionalmente à
necessidade bruta de cada uma, preservando `origem`/`origem_id` — que é o que
motivava o laço defeituoso. O rateio ficou isolado em
`support/allocatePlanByOrigin.ts`, com o racional das decisões no cabeçalho.

Três decisões de desenho do rateio, para quem for auditar:

1. **Base = necessidade bruta da origem.** É a única medida que existe por
   origem antes da netagem. A alternativa (quem precisa antes leva o estoque)
   é alocação por prioridade: muda a decisão de compra e é assunto do dono do
   processo, não de uma correção de defeito.
2. **`estoque_disponivel` também é rateado.** Repetir o saldo inteiro em cada
   linha (comportamento antigo) produz linha que não fecha na tela:
   "bruta 100 − disponível 100 = líquida 50". Rateado, cada linha fecha
   sozinha e a soma continua sendo o saldo real.
3. **Lote mínimo vive no agregado.** O motor arredonda antes do rateio, então
   a linha individual pode não ser múltipla do lote — o pedido que a fábrica
   coloca (a soma) é. Arredondar por linha compraria a mais a cada rodada.
   A última parcela de cada medida é o **resto**, nunca um arredondamento
   independente: a soma das linhas é idêntica ao agregado, sem resíduo.

### Defeito 2 — reexecução do plano ressuscitava ordem convertida

Duas falhas somadas transformavam a rotina do planejador (rodar o MRP várias
vezes por dia) em compra duplicada:

1. `SequelizeMrpRepository.upsertPlannedOrders` aplicava o payload inteiro
   sobre a linha existente — e o plano é sempre montado com
   `status: 'RASCUNHO'`. Uma ordem já convertida (`EM_EXECUCAO`) voltava a
   `RASCUNHO` e, portanto, a ser elegível para conversão automática.
2. `createRequisitionFromPlannedOrders` não tinha idempotência nenhuma: criava
   cabeçalho e itens novos a cada chamada.

Resultado: item com `items.conversao_automatica = true` gerava **uma
requisição de compra nova a cada rodada do MRP**, para o mesmo material,
descoberta só no recebimento. Medido antes da correção: 3 rodadas → 3
requisições.

Correções: `status` saiu do UPDATE do upsert (é máquina de estados, não dado
recalculado — linha nova continua nascendo com o status do payload via
`defaults`); o helper ignora ordem fora de `RASCUNHO`/`APROVADA`, deduplica a
mesma ordem repetida no lote e devolve `null` — sem cabeçalho vazio — quando
nada é convertível.

**Achado colateral, corrigido junto:** as ordens devolvidas por
`POST /api/mrp/plan` diziam `RASCUNHO` mesmo depois de promovidas a
`EM_EXECUCAO` (a promoção é um `UPDATE … WHERE id IN (…)`, que não toca as
instâncias já carregadas). Como `mrpController.generatePlan` decide gravar o
audit log `mrp_auto_convert_to_requisition` filtrando por esse status, **o log
da conversão automática nunca era escrito** — e a API devolvia um status que
não era o do banco.

### Achado BAIXO 15 — numeração da requisição

`RQ-${Date.now()}` virou a série anual `RQ-YYYY-NNNN` do resto do ERP,
emitida por `SequelizePurchaseRequisitionRepository.nextRequisitionNumberForYear`
(advisory lock `41003` + `MAX`, mesmo padrão do G16 para OP). Aplicado nos
**dois** caminhos de criação: MRP e requisição manual
(`CreatePurchaseRequisitionUseCase`). Números legados permanecem no histórico
e são ignorados pela geração.

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `server/src/modules/mrp/application/use-cases/support/allocatePlanByOrigin.ts` | **novo** — rateio por origem + `normalizeOrigem` (movida do use case) |
| `server/src/modules/mrp/application/use-cases/GenerateMrpPlanUseCase.ts` | netagem conjunta; consumo do rateio; sincroniza `status` das instâncias promovidas; trata `null` do helper |
| `server/src/modules/mrp/infrastructure/sequelize/SequelizeMrpRepository.ts` | `status` fora do UPDATE do upsert (+ JSDoc do porquê) |
| `server/src/modules/mrp/application/use-cases/support/createRequisitionFromPlannedOrders.ts` | idempotência por ordem planejada; numeração `RQ-YYYY-NNNN`; retorno `null` |
| `server/src/modules/mrp/application/use-cases/ConvertPlannedOrdersToRequisitionUseCase.ts` | guarda explícita para o retorno `null` do helper |
| `server/src/modules/mrp/application/mrpEngine.ts` | `MrpDemandSourceType` aceita também o enum do banco (o único chamador real nunca usou a união em inglês) |
| `server/src/modules/purchaseRequisitions/domain/repositories/PurchaseRequisitionRepository.ts` | contrato `nextRequisitionNumberForYear` |
| `server/src/modules/purchaseRequisitions/infrastructure/sequelize/SequelizePurchaseRequisitionRepository.ts` | implementação com advisory lock + `MAX` |
| `server/src/modules/purchaseRequisitions/application/use-cases/CreatePurchaseRequisitionUseCase.ts` | usa a numeração serializada |
| `server/scripts/run-api-suite.cjs` | `--testPathPattern` → `--testPathPatterns` (Jest 30 abortava antes de rodar qualquer teste) |

Testes: 2 novos de integração (`mrp-multi-demand-netting`,
`mrp-rerun-idempotency`), 2 novos unitários
(`mrp-multi-demand-allocation`, `mrp-requisition-helper-idempotency`), 1 caso
novo em `mrp-auto-convert` e dublês de repositório atualizados em 5 arquivos
unitários (o método de numeração passou a ser do repositório).

## 2. Documentações atualizadas

- `docs/arquitetura/API.md` §13 — `POST /api/mrp/plan`: netagem conjunta,
  novo significado de `estoque_disponivel` por linha, lote mínimo no agregado
  e idempotência da reexecução; §14 — `requisition_number` no padrão
  `RQ-YYYY-NNNN` (exemplo de payload atualizado)
- `docs/projeto/04-USE_CASES.md` — UC-24b ganhou a seção "Correções de
  2026-08-11", incluindo o audit log que nunca era escrito
- `docs/database/DATABASE.md` — entrada nova "MRP: o `status` da ordem
  planejada deixa de ser dado recalculado" (sem migration; registra a regra
  "coluna de máquina de estados não entra em payload de recálculo") e a
  numeração anual de `purchase_requisitions.requisition_number`
- `docs/database/04-DICIONARIO_DADOS.md` — nota de série anual na coluna
  `requisition_number`
- `docs/governance/TODO.md` — bloco 2026-08-11 com evidência por item e as
  pendências que a entrega deixa
- JSDoc: módulo novo `allocatePlanByOrigin.ts` (cabeçalho explicando o defeito
  e as três decisões de rateio), `upsertPlannedOrders`,
  `createRequisitionFromPlannedOrders`, `nextRequisitionNumberForYear`,
  `MrpDemandSourceType`

## 3. Instruções de teste

Pré-requisito: PostgreSQL de pé (`docker compose up -d` na raiz) e o banco
`erp_evok_audio_test` provisionado (`server/.env.test`).

```bash
cd server
npm run typecheck          # esperado: verde
npm run test:unit          # esperado: 1826/1826, 170 suítes
npm run test:integration   # esperado: 179/179, 47 suítes (sobe a API e usa o banco de teste)
```

Para provar que os testes novos realmente pegam os defeitos (recomendado ao
auditor — é o que separa teste de decoração):

1. Reverta só uma linha de `SequelizeMrpRepository.upsertPlannedOrders`
   (volte `record.update(order, …)`) → `mrp-rerun-idempotency` reprova nas
   etapas 3 e 4 (a 2ª rodada cria requisição nova e rebaixa o status).
2. Volte `GenerateMrpPlanUseCase` a chamar `calculateMrpPlan([demand], …)`
   dentro do laço → `mrp-multi-demand-netting` reprova na etapa 2 com **zero**
   linhas planejadas (foi exatamente o que se mediu antes da correção).

Verificação manual no banco de teste, depois de rodar a suíte:

```sql
-- Duas origens, um saldo: 200 brutos, 100 disponíveis, 100 a comprar.
SELECT i.codigo, o.origem_id, o.necessidade_bruta, o.estoque_disponivel,
       o.necessidade_liquida, o.quantidade_planejada, o.status
  FROM mrp_ordens_planejadas o JOIN items i ON i.id = o.item_id
 WHERE i.codigo LIKE 'MRPNET-%';

-- Numeração anual em uso (os RQ-<timestamp> antigos seguem no histórico).
SELECT requisition_number, origin FROM purchase_requisitions ORDER BY id DESC LIMIT 10;
```

## 4. Riscos residuais

1. **`origem_id NULL` não é coberto pelo índice único** `uq_mrp_sem_duplicidade`
   — no PostgreSQL `NULL` é distinto de `NULL`, então duas rodadas
   **concorrentes** do MRP com demanda `MANUAL` (sem documento de origem)
   ainda podem inserir duas linhas iguais. O `findOrCreate` cobre o caso
   sequencial, não o concorrente. Correção seria índice único parcial com
   `COALESCE(origem_id, …)` ou `NULLS NOT DISTINCT` (PG 15+). Nada observado:
   a rodada do MRP hoje é síncrona e disparada por gente.
2. **Necessidade que cresce depois da conversão fica silenciosa.** Se uma
   rodada posterior aumentar a quantidade de uma ordem já convertida
   (`EM_EXECUCAO`), a ordem é recalculada mas a requisição **não** é ajustada
   e nenhuma complementar é criada. É o lado conservador do trade-off (melhor
   não comprar sozinho do que comprar duas vezes), mas precisa virar sinal na
   tela do planejador.
3. **A base do rateio é decisão de processo.** Rateio proporcional à
   necessidade bruta é a escolha desta correção; alocação por prioridade de
   data é outra política, e mudá-la muda o que a fábrica compra. Precisa de
   decisão do dono, não de código.
4. **Escopo do teste de integração.** Os dois testes novos exercitam a cadeia
   real (HTTP → use case → PostgreSQL), mas o cenário é de laboratório: BOM
   1:1, um nível, saldo controlado. Netagem em BOM multinível com
   subconjuntos e perdas continua coberta apenas por unitário.
5. **`estoque_disponivel` mudou de significado por linha** (parcela, não saldo
   total). A tela de MRP (`client/src/pages/production/MrpPage.tsx`) apenas
   exibe o número, então não quebra — mas quem já tinha lido a coluna como
   "saldo do item" precisa saber que agora é "saldo alocado a esta origem".

---

# HANDOFF — 5 brechas ALTAS da auditoria de 2026-08-11 (working tree, sem commit)

> Entrega **separada** da correção do MRP documentada acima; as duas convivem
> no mesmo working tree e não se tocam (módulos distintos, testes distintos).

## 1. Resumo da feature

Cinco brechas de severidade ALTA, todas com a mesma assinatura: **a regra
existia e estava testada, mas era satisfeita por um caminho lateral.**

| # | Brecha | O que a fechou |
|---|---|---|
| 1 | **G6** — uma linha de apontamento manual (`production_route_step_id: null`) destravava a partida de OP **sem roteiro nenhum** | o gate passou a exigir *lastro de roteiro*: alguma linha ligada a etapa **ou** roteiro ativo do produto. Novo código `G6-START-NO-ROUTE-STEP` |
| 2 | **G7** — lote bloqueado era re-liberado com a inspeção aprovada de **antes** do bloqueio (bloqueio decorativo, ISO 9001 §8.7) | coluna `lot_controls.blocked_at` (migration nova) + exigência de `inspected_at > blocked_at` + liberação em transação com `FOR UPDATE` |
| 3 | `PRODUCTION_TRACKING_REQUIRED=warn` desligava G4 **e** G6 sem existir em nenhum arquivo do repositório | validação de boot em `runtimeEnv` (produção recusa `warn`), declaração em `.env.example` (raiz e `server/`) |
| 4 | **G11** — `is_foreign` opcional + `DEFAULT false` fazia fornecedor estrangeiro nascer nacional, e a alçada de importação simplesmente não acontecia | `is_foreign` obrigatório na criação; origem **efetiva** gravada no pedido; recusa da combinação incoerente (`G11-ORIGIN-SUPPLIER-MISMATCH`) na criação e na aprovação |
| 5 | **G1** — BOM aceitava ciclo multinível (`A→B`, depois `B→A`); só a auto-referência era barrada | detecção de caminho no espaço de `products.id` (`hasProductPathBetween`), 422 `G1-BOM-CICLO`, antes da transação |

### Decisões de desenho que valem registro

- **G6 destrava por roteiro, não por apagar a linha manual.** Recusar
  simplesmente deixaria a OP encalhada (a materialização de etapas só acontece
  na liberação, e ela é idempotente). Aceitar "existe roteiro ativo" faz a
  mensagem de erro ser executável: cadastre o roteiro e a MESMA OP parte.
- **`blocked_at` é coluna, não inferência.** `notes` é texto livre e
  `updated_at` muda a cada escrita de qualquer natureza; derivar o instante do
  bloqueio de qualquer um dos dois seria adivinhar — e adivinhar errado, aqui,
  é liberar material contido.
- **Bloqueio NÃO apaga `release_inspection_id`/`released_by`/`released_at`.**
  São evidência de auditoria da liberação anterior, e o gate não depende deles.
- **Comparação estrita entre inspeção e bloqueio:** empate de instante fica do
  lado seguro. O custo é registrar uma inspeção nova.
- **Typo em `PRODUCTION_TRACKING_REQUIRED` não derruba o boot** — ele resolve
  para `block` (o lado seguro) e só gera log. Derrubar produção por um valor
  que não desliga nada seria punir o lado certo.
- **Fornecedor estrangeiro declarado como "nacional" não é erro** — a origem é
  reescrita para `import`. Erro é o inverso (`import` com fornecedor nacional),
  porque aí há contradição de cadastro com correção clara e barata.
- **Detecção de ciclo no espaço de `products.id`, não em UUID.** A projeção
  `hasPathBetween` depende do crosswalk `products.code = items.codigo`;
  produto sem item correspondente sumiria do grafo e o ciclo passaria
  justamente onde o cadastro está mais incompleto.

## 2. Arquivos alterados

**Backend — regra**
- `server/src/modules/production/domain/productionTrackingRules.ts` (regra G6 + código novo)
- `server/src/modules/production/application/use-cases/ChangeProductionOrderStatusUseCase.ts`
- `server/src/modules/quality/domain/constants.ts` (`decideLotRelease` recebe `blockedAt`)
- `server/src/modules/inventory/application/use-cases/ReleaseLotUseCase.ts` (transação + lock + gate novo)
- `server/src/modules/inventory/application/use-cases/BlockLotUseCase.ts` (`blocked_at`)
- `server/src/modules/nonConformities/application/use-cases/CreateNonConformityUseCase.ts` (`blocked_at` no bloqueio por RNC)
- `server/src/modules/quality/application/use-cases/GetLotReleaseEligibilityUseCase.ts` (mesma decisão do POST)
- `server/src/modules/inventory/domain/repositories/InventoryRepository.ts` + `infrastructure/sequelize/SequelizeInventoryRepository.ts` (`findLotByIdForUpdate`)
- `server/src/modules/purchases/domain/constants.ts` (`checkPurchaseOriginAgainstSupplier`, `PURCHASE_ORIGIN_MISMATCH_RULE`)
- `server/src/modules/purchases/application/use-cases/CreatePurchaseUseCase.ts` e `ChangePurchaseStatusUseCase.ts`
- `server/src/modules/suppliers/presentation/validators/supplierValidators.ts` (`is_foreign` obrigatório na criação)
- `server/src/services/bomStructureProjection.ts` (`hasProductPathBetween`)
- `server/src/services/bomService.ts` (chamada da detecção de ciclo)
- `server/src/config/runtimeEnv.ts` (validação de boot) e `server/src/models/LotControl.ts`

**Migration:** `server/migrations/20260811-000044-lot-blocked-at-quality-gate.cjs`
— aplicada em `erp_evok_audio` **e** `erp_evok_audio_test`.

**Configuração:** `.env.example` (raiz) e `server/.env.example`.

**Fixture:** `server/scripts/run-api-suite.cjs` — o produto de BOM de CI ganhou
centro de trabalho + roteiro ATIVO. Sem isso, `production-order-scrap.test.ts`
não conseguiria iniciar a OP: ele dependia, sem saber, exatamente da brecha 1.

**Frontend (pontual):** `client/src/pages/purchases/SuppliersPage.tsx` e
`client/src/api/suppliers.ts` — campo "Origem do fornecedor" (sem preseleção).
Foi necessário: sem ele, a tela "Novo fornecedor" passaria a receber 400.

**Testes novos:** 4 de integração (`production-start-manual-tracking-bypass`,
`quality-release-after-block`, `purchase-origin-foreign-supplier`,
`bom-cycle-multilevel`) e 2 unitários
(`runtime-env-production-tracking`, `production-start-gate-route-step-g6`),
mais casos novos em `quality-inspection-release-gate`,
`bom-create-revision-rules-g1` e `purchase-approval-authority`.

**Testes ajustados por mudança de contrato** (payload de fornecedor / `update`
com transação): `bom-two-level-reparo`, `e2e-cadeia-insumo-produto`,
`sale-lot-quality-gate`, `clients-suppliers-financial-bom-validation`,
`quality-lot-lifecycle`.

## 3. Documentação atualizada

- `docs/arquitetura/API.md` — `POST /api/suppliers` (campo obrigatório),
  `POST /api/purchases` (tabela origem x cadastro), `PUT /api/production-orders/:id/status`
  (seção nova do gate de partida), `POST /api/inventory/lots/:id/release` e `/block`,
  `POST /api/engineering/bom` (erros de ciclo), `GET .../release-eligibility`
- `docs/database/DATABASE.md` — entrada de changelog da migration
- `docs/database/04-DICIONARIO_DADOS.md` — `lot_controls` (4 colunas do G7)
- `docs/tributario/04-BLOCO_K.md` — `PRODUCTION_TRACKING_REQUIRED` em produção
- `docs/governance/TODO.md` — entrada da entrega + pendências
- JSDoc: todos os módulos citados acima explicam **o furo** que fecharam, não
  só o que fazem

## 4. Instruções de teste

Pré-requisito: `docker compose up -d` na raiz; `erp_evok_audio_test`
provisionado (`server/.env.test`). A migration nova precisa estar nos **dois**
bancos (a guarda `cross-database-drift-guard` reprova se divergirem):

```bash
cd server
npm run migration:up        # aplica em erp_evok_audio (.env)
npm run typecheck           # verde
npm run test:unit           # 1848/1848, 172 suites
npm run test:integration    # 196/196, 51 suites (aplica a migration no banco de teste)
npm run test:edge:strict    # 3/3
cd ../client && npx tsc -b  # verde
```

Para provar que os testes novos pegam os defeitos (o que separa teste de
decoração) — cada reversão abaixo faz a suíte correspondente reprovar:

1. Remova o bloco `G6-START-NO-ROUTE-STEP` de `assertOrderCanStart` →
   `production-start-manual-tracking-bypass` etapa 2 recebe **200** onde
   espera 422.
2. Volte `decideLotRelease(latestInspection)` (sem `blockedAt`) em
   `ReleaseLotUseCase` → `quality-release-after-block` etapas 2 e 4 liberam o
   lote bloqueado com a inspeção antiga.
3. Volte `is_foreign` para `.optional()` no validador → o teste de origem passa
   a aceitar cadastro sem declaração (etapa 1 recebe 201).
4. Remova a chamada de `hasProductPathBetween` em `bomService.createBOM` →
   `bom-cycle-multilevel` grava `B→A` com 201. **Atenção:** isso deixa um
   ciclo real no banco de teste, que faz `catalog-spreadsheet-import` falhar
   nas rodadas seguintes (foi observado). Limpe as BOMs `G1CIC-*` antes de
   seguir.

Conferência manual no banco, depois da suíte:

```sql
-- O bloqueio tem data, e a liberação a zera.
SELECT id, lot_number, status, blocked_at, release_inspection_id
  FROM lot_controls WHERE lot_number LIKE 'G7BLK-%' ORDER BY id;

-- Nenhum ciclo ativo na estrutura (deve devolver 0 linhas).
WITH RECURSIVE edges AS (
  SELECT b.product_id AS parent, i.component_product_id AS child
    FROM bill_of_materials b JOIN bill_of_material_items i ON i.bom_id = b.id
   WHERE b.status = 'active'
), walk AS (
  SELECT parent AS root, child, 1 AS depth FROM edges
  UNION ALL
  SELECT w.root, e.child, w.depth + 1 FROM walk w JOIN edges e ON e.parent = w.child WHERE w.depth < 12
)
SELECT DISTINCT root FROM walk WHERE child = root;

-- Fornecedor estrangeiro nunca fica registrado como compra nacional
-- (deve devolver 0 linhas).
SELECT p.order_number, p.origin, s.company_name, s.is_foreign
  FROM purchase_orders p JOIN suppliers s ON s.id = p.supplier_id
 WHERE s.is_foreign = true AND p.origin <> 'import';
```

## 5. Riscos residuais

1. **Fornecedores antigos com `is_foreign = false` por omissão.** A
   obrigatoriedade só vale para cadastros novos; não há backfill possível por
   código (é informação de negócio). Enquanto Compras não revisar a lista, uma
   importação daquele fornecedor continua passando por baixo da alçada se o
   pedido não declarar `import`. **Ação humana, não de código.**
2. **Lotes já `blocked` antes da migration** ficam com `blocked_at = NULL` e
   seguem liberáveis pela regra antiga (grandfathering deliberado).
3. **O gate de partida aceita "existe roteiro ativo" sem exigir que as linhas
   de apontamento sejam do roteiro.** É a escolha que evita OP encalhada; a
   consequência é que uma OP liberada antes de o roteiro existir continua com
   linhas manuais, e o vínculo "como executado" dela permanece incompleto —
   limitação já conhecida e registrada desde o G4.
4. **A recusa de `origin='import'` com fornecedor nacional vale também para
   pedidos legados** no momento da aprovação. Se existir esse dado hoje, o
   pedido só será aprovado depois de corrigir o cadastro do fornecedor (que é
   escalation-only) ou a origem. Nenhum caso observado nos dois bancos.
5. **Detecção de ciclo é por consulta, não por constraint.** Duas criações de
   BOM concorrentes que fechem o ciclo entre si podem, teoricamente, passar
   (leitura fora da transação). Fechar exigiria constraint recursiva, que o
   PostgreSQL não oferece diretamente; a criação de BOM é ato humano e raro.
6. **Nada foi commitado** — tudo permanece no working tree, junto com a
   entrega do MRP.

---

# HANDOFF — As 2 provas de integração que faltavam: G13 e quarentena no MRP (2026-08-12, working tree, sem commit)

> Terceira entrega do mesmo working tree. Convive com a correção do MRP
> (netagem multi-demanda) e com as 5 brechas ALTAS de 2026-08-11 documentadas
> acima; **nenhum arquivo daquelas entregas foi tocado**. Esta entrega é
> composta de **dois arquivos de teste novos** — nenhuma linha de código de
> produção foi alterada.

## 1. Resumo da feature

A auditoria de 2026-08-11 apontou dois comportamentos que o `CLAUDE.md`
afirma há dois dias e que **nunca tinham sido executados contra o
PostgreSQL**:

| Afirmação | Cobertura que existia | O que faltava |
|---|---|---|
| "conta a pagar nasce no recebimento, conta a receber na NF-e" (G13) | 24 testes unitários com repositório **dublê** | dublê não tem `NOT NULL`, `ENUM`, `DEFAULT` nem transação — nada provava que o `INSERT` funciona |
| "MRP e disponibilidade de OP descontam o saldo retido" (G7) | testes unitários do serviço puro | quarentena só existe em `lot_controls`; sem lote de verdade, a regra nunca roda |

As duas suítes novas percorrem a cadeia **real** (nada de escrita direta no
banco em caminho de negócio) e conferem cada afirmação financeira **duas
vezes**: pela API e por **SQL cru**, nomeando coluna a coluna. Nomear as
colunas é o ponto: é assim que um drift de nome/enum/default derruba o teste,
em vez de passar batido lendo um objeto que só existe na memória do Node.

| Arquivo | Testes | O que prova |
|---|---|---|
| `server/tests/integration/g13-payable-receivable.test.ts` | 8 | pedido aprovado/enviado **não** é passivo; o recebimento cria a AP `pending`, não baixada, sem aprovador, no valor **da entrega**; venda confirmada **não** é recebível; a NF-e autorizada cria as parcelas `pending` somando exatamente a nota |
| `server/tests/integration/mrp-quarantine-discount.test.ts` | 7 | material em quarentena **não** abate demanda no MRP; o desconto é de leitura (banco intacto); liberado o lote, a necessidade cai **exatamente** o que estava retido |

### Decisões de desenho que valem registro

- **Números escolhidos para o defeito não ter onde se esconder.** No teste do
  MRP: 45 livres + 60 em quarentena + segurança 5, e demanda de **100**. Se o
  desconto sumir, o disponível vira 100, a necessidade líquida vira zero, o
  motor filtra `plannedQuantity > 0` e o plano volta **vazio** — a suíte falha
  por ausência de linha, que é o sintoma real do defeito na fábrica.
- **Uma demanda por rodada, no teste do MRP.** Depois da correção de
  2026-08-11 o plano é netado em conjunto e rateado por origem
  (`allocatePlanByOrigin.ts`), então `estoque_disponivel` de uma linha é a
  *parcela* alocada. Com origem única o rateio devolve a linha integral e cada
  asserto fala do número agregado sem ambiguidade. O rateio em si já é provado
  por `mrp-multi-demand-netting.test.ts` — duas suítes medindo a mesma coisa
  se contradizem cedo ou tarde.
- **Recebimento parcial no teste do G13, não só total.** "Recebeu metade,
  deve a metade" é a consequência mais fácil de quebrar do G13 (basta alguém
  usar `purchase.total_amount` no lugar das linhas da entrega) e a que custa
  dinheiro em duplicidade.
- **A venda usa lote de verdade, liberado pela Qualidade.** Seria mais barato
  vender um produto sem lote (o gate D-L degrada e deixa passar), mas aí o
  teste provaria o caminho fácil. O cenário monta compra -> quarentena (G14) ->
  inspeção -> liberação (G7) -> transferência INSUMOS->ACABADOS -> venda -> NF-e.
- **`jest.setTimeout(60_000)` nos dois arquivos.** O default de 5 s do Jest é
  dimensionado para teste unitário; aqui ele transforma lentidão de banco em
  "falha" e esconde o resultado verdadeiro (ver risco residual 2).
- **O achado do plano que nunca encolhe NÃO foi transformado em asserto.**
  Nem "a linha some" (não some) nem "a linha fica" (fixar comportamento errado
  num teste o promove a contrato). Fica registrado em JSDoc e no `TODO.md`.

## 2. Documentações atualizadas

- `docs/governance/TODO.md` — seção **"2026-08-12 — As 2 provas de integração
  que faltavam"**: o que cada suíte prova, os números das execuções reais e
  **3 achados abertos** (plano de MRP que não encolhe; intermitência de 5 s da
  suíte de integração; `estoque_retido_qualidade` que não chega a payload
  nenhum).
- `docs/governance/HANDOFF_CODEX.md` — esta seção.
- **JSDoc**: cabeçalho de módulo em cada arquivo novo (o buraco que fecha, o
  cenário com a tabela de números, a tabela "pergunta x etapa") e JSDoc em
  todas as funções auxiliares, no padrão das suítes existentes.
- **Nada em `docs/database/`**: nenhuma migration, nenhum model, nenhuma
  coluna. **Nada em `docs/projeto/04-USE_CASES.md`**: nenhuma regra de negócio
  mudou — estas suítes *descrevem* regras que já existiam.

## 3. Instruções de teste

Pré-requisitos: PostgreSQL de teste no ar (`erp_evok_audio_test`,
`server/.env.test`).

```bash
cd server
npm run typecheck            # verde
npm run test:unit            # 1848/1848, 172 suites (inalterado)
npm run test:integration     # 211/211, 53 suites
```

Para rodar só as duas suítes novas (o filtro é regex de caminho):

```bash
cd server
node scripts/run-api-suite.cjs integration "g13-payable|mrp-quarantine"
```

Para provar que os testes novos pegam os defeitos (o que separa teste de
decoração) — cada reversão abaixo faz a suíte correspondente reprovar:

1. Em `ReceivePurchaseItemsUseCase.createReceiptPayable`, troque o valor por
   `purchase.total_amount` -> `g13-payable-receivable` etapa 4 acusa
   R$ 750,00 onde espera R$ 450,00.
2. Volte `approved_by: userId` na mesma função -> etapa 4 falha no asserto de
   segregação de funções.
3. Recoloque a criação das parcelas em `ChangeSaleStatusUseCase`
   (`quote -> confirmed`) -> etapa 7 encontra recebível antes da nota.
4. Em `SequelizeItemRepository.listMrpInventoryPositions`, devolva
   `estoque_atual: physicalQuantity` sem o desconto -> `mrp-quarantine-discount`
   etapa 3 recebe **zero linhas** (o plano volta vazio, que é o defeito real).
5. Em `quarantineBalanceService.WITHHELD_LOT_STATUSES`, remova `'quarantine'`
   -> mesmo efeito da reversão 4.

Conferência manual no banco, depois da suíte:

```sql
-- G13: nenhuma conta a pagar de pedido que ainda nao foi recebido
-- (0 linhas para os pedidos criados por esta suite).
SELECT p.order_number, p.status, ap.id, ap.amount, ap.invoice_number
  FROM purchase_orders p
  JOIN accounts_payable ap ON ap.purchase_id = p.id
 WHERE p.status IN ('pending', 'approved', 'sent')
   AND ap.invoice_number IS NOT NULL;

-- G13: nenhuma parcela de venda nasceu baixada.
SELECT COUNT(*) FROM accounts_receivable
 WHERE invoice_number IS NOT NULL AND (status <> 'pending' OR payment_date IS NOT NULL);

-- G7/MRP: saldo fisico x saldo retido do componente da suite do MRP.
SELECT pr.code, pr.quantity AS fisico,
       COALESCE(SUM(l.quantity_available) FILTER (WHERE l.status IN ('quarantine','blocked')), 0) AS retido
  FROM products pr LEFT JOIN lot_controls l ON l.product_id = pr.id
 WHERE pr.code LIKE 'MRPQUAR-COMP-%'
 GROUP BY pr.code, pr.quantity;
```

## 4. Riscos residuais

1. **O plano de MRP cresce mas nunca encolhe** (achado novo, não corrigido).
   A ordem planejada criada enquanto o material estava em quarentena continua
   `RASCUNHO` em `mrp_ordens_planejadas` depois da liberação, dizendo "comprar
   60" quando a necessidade real virou zero — e segue conversível em
   requisição. Causa: `upsertPlannedOrders` só toca as linhas que o motor
   devolveu, e o motor filtra `plannedQuantity > 0`. Corrigir exige decidir o
   destino da linha órfã (zerar? novo status? apagar?), e o ENUM de
   `mrp_ordens_planejadas.status` não tem valor para "não é mais necessária" —
   **decisão de processo, do dono, não de teste**.
2. **A suíte de integração é intermitente por timeout de 5 s.** Em 4
   execuções houve 3 falhas, em 3 arquivos diferentes, todas por estouro de
   5 s sob carga — **duas delas antes** destes arquivos novos. Os 51 arquivos
   antigos continuam sem `jest.setTimeout`.
3. **A prova do G13 cobre o caminho síncrono da NF-e** (provedor `mock`, que
   autoriza na hora). O caminho assíncrono — `GetSaleNfeStatusUseCase`, que
   cria as mesmas parcelas quando o provedor real responde depois — continua
   provado apenas por unitário com dublê.
4. **A AP dos tributos de importação (COMEX) continua fora do G13**, como já
   registrado; nada nesta entrega mudou isso.
5. **O desconto de quarentena na disponibilidade de OP** (`BomService.explodeBOM`,
   o outro leitor citado em `quarantineBalanceService`) **não** é coberto por
   estas suítes — só o caminho do MRP.
6. **Nada foi commitado** — os dois arquivos novos ficam no working tree,
   junto com as duas entregas anteriores.

---

## 2026-08-12 — Guardas documentais ampliadas (drift de doc × realidade)

### Resumo da feature

A auditoria de 2026-08-11 achou a mesma classe de drift documental em 12+
arquivos: documento vivo afirmando estado falso (migration "não aplicada" que
está aplicada) ou citando caminho de arquivo que não existe. Havia **uma**
guarda para isso, e ela olhava um único arquivo (`TODO.md`). Esta entrega
generaliza a cobertura e institui a convenção mecânica que separa
**documento vivo** (deve ser verdade hoje) de **registro datado** (descreve um
dia específico e não se reescreve).

1. **`docs-reality-drift-guard` ampliada** (integração, Postgres real) —
   varre `docs/**/*.md` + `CLAUDE.md` + `AGENTS.md` em vez de só o `TODO.md`.
   Ganhou uma segunda asserção: o total de migrations declarado nos **dois
   pontos de medição canônica** (`CLAUDE.md` §1 e `docs/database/00-INDICE.md`)
   tem de bater com `SequelizeMeta`. Se o marcador "medição canônica" sumir do
   documento, a guarda **falha** em vez de passar em silêncio.
2. **`docs-path-reference-guard` nova** (unitária, sem banco) — todo caminho
   citado em crase que se pareça com arquivo do repo tem de existir no disco.
3. **`docsGuardConventions.ts` novo** — a convenção compartilhada (R1 banner de
   arquivo histórico, R2 citação `>`, R3 caixa `- [x]`), com o raciocínio de
   projeto: **nenhuma lista de exceções mora no teste**; o documento se declara
   histórico escrevendo o banner no próprio topo, onde o humano também lê.
4. **Auto-verificação nas duas guardas** — casos sintéticos que exigem que a
   detecção reprove quando deve e isente quando deve. Guarda documental verde
   por regex quebrada é decoração; é a mesma classe das 34 suítes que pulavam
   em silêncio até 2026-08-10.

### Documentações atualizadas

- `CLAUDE.md` §1 (bloco de guardas reescrito; e correção de caminho:
  `scripts/seed-usuarios-departamentos.cjs` → `server/scripts/…`)
- `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md` §2 — a correção proposta
  foi marcada **implementada em 2026-08-12** (a parte automatizável; a
  separação editorial `TODO.md` × diário continua aberta)
- `docs/database/00-INDICE.md` — marcador "Medição canônica" instituído
- **13 documentos ganharam banner de registro datado/append-only** (topo, sem
  reescrita do corpo — corrigir relatório de auditoria é falsificá-lo)
- **9 citações de caminho corrigidas** em docs vivos
- JSDoc completo nos 3 arquivos de teste/helper novos

### Instruções de teste

```bash
cd server
npm run typecheck        # verde
npm run test:unit        # 173 suítes / 1857 testes — inclui a guarda nova
npm run test:integration # 52 suítes verdes / 215 testes (ver ressalva abaixo)
```

Para provar que as guardas **realmente reprovam** (não confie no verde):

1. Em qualquer doc vivo, cite `` `docs/arquivo-que-nao-existe.md` `` →
   `npm run test:unit` deve falhar apontando arquivo e linha.
2. No `CLAUDE.md` §1, troque o número de migrations da linha 📏 →
   `npm run test:integration` deve falhar dizendo o valor real.
3. Ponha o banner `> ## ⚠️ DOCUMENTO HISTÓRICO` no topo do arquivo do passo 1 →
   as duas voltam ao verde.

### Risco residual

- **1 falha pré-existente na suíte de integração**, NÃO causada e NÃO mascarada
  por esta entrega: `traceability-and-audit-log-regression.test.ts` estoura o
  timeout de 5 s. Provado pré-existente removendo os 3 arquivos desta entrega e
  rodando de novo (mesma falha única). Causa medida: `GET /api/traceability/items/:id`
  carrega o histórico **inteiro** do item numa query com 4 níveis de `include`
  aninhado, **sem paginação e sem limite**; o banco de teste acumulou **286
  lotes** no produto-fixture (`lot_controls`, 1147 linhas no total) e a
  expansão passou de 5 s. **Não subi o timeout de propósito** — seria mascarar
  um provável N+1 num endpoint de produto, que em produção degrada do mesmo
  jeito para item de alto giro. Precisa de decisão: paginar o endpoint ou
  limpar/isolar o banco de teste entre execuções.
- As guardas checam **existência e número**, não semântica. "Tela pendente"
  continua fora do alcance — juízo humano não é grep.
- 13 arquivos saíram da varredura pelo banner R1. É deliberado (são auditorias
  datadas e diários append-only), mas cada banner novo é cobertura a menos:
  usar só quando o documento for genuinamente um registro de data.
- **Nada foi commitado** — tudo fica no working tree, junto com as quatro
  entregas anteriores.

---

## 2026-08-12 — Frontend RH Fase A: Admissão, Contratos, Demissão, Férias (Bloco 6, UC-67/68/69/70)

**Agente:** `PromadorFonteEnd`. **Escopo:** só `client/` (backend do Bloco 6,
`server/src/modules/rh/`, já existia e não foi tocado). Fecha a lacuna de UI
que separava `/api/rh/*` de qualquer tela — os 4 fluxos P0 do módulo RH
(`docs/business/BLOCO_6_RH_API.md` §4/§5/§6/§8, rotas confirmadas por leitura
direta de `server/src/modules/rh/presentation/routes/rh.ts`, controllers e
validators, não só do contrato de API) agora têm interface.

### Arquivos novos

- `client/src/api/hr.ts` — client de `/api/rh/*` (Admissão, Contrato de
  Experiência, Demissão, Documentos do Funcionário, Férias — Grupos 2 a 6 do
  contrato). Tipos batem com os models Sequelize reais (`HrAdmissionProcess`,
  `HrEmployeeContract`, `HrTerminationProcess`, `HrVacationAccrualPeriod`,
  `HrVacationSchedule`), não só com o exemplo de payload do documento (ver
  divergência abaixo).
- `client/src/components/hr/FileUploadDialog.tsx` — dialog multipart
  reutilizável (mesmo padrão `rhFileUpload.single('file')` do backend), usado
  por Demissão para o ASO demissional (`POST /employee-documents`) e o TRCT
  (`POST /termination-processes/:id/trct`).
- `client/src/components/hr/useEmployeeOptions.ts` — hook de seletor/lookup
  de funcionário (`GET /api/employees?limit=200`), compartilhado por
  Contratos, Demissão e Férias.
- `client/src/pages/hr/AdmissionTab.tsx`, `EmployeeContractsTab.tsx`,
  `TerminationTab.tsx`, `VacationTab.tsx` — as 4 abas novas.

### Arquivo editado

- `client/src/pages/hr/HrPage.tsx` — de 2 para 6 abas (Funcionários,
  Departamentos + as 4 novas), mesmo padrão de abas locais já usado.

### RBAC replicado da API

Toda leitura/escrita das 4 abas exige o módulo `rh` no perfil de acesso do
usuário (`hasModuleAccess('rh')`, já existente em `AuthContext`) — igual ao
`authorizeModule('rh', ...)` do backend. As 2 ações de nível `rh:approve`
(concluir demissão, decidir rescisão de contrato de experiência) ficam com o
botão desabilitado + tooltip explicativo para quem só tem `operate`; a
tentativa ainda é recusada pelo backend com 403 se contornada (a UI não é a
única barreira).

### Divergência real encontrada entre o contrato de API e o código do backend

O exemplo de payload de `POST /admission-processes/:id/conclude` no
`BLOCO_6_RH_API.md` §4.3 usa `"work_regime": "experiencia"` — **esse valor
não existe** no ENUM `employees.work_regime` (`clt|pj|estagiario|aprendiz`,
`rhEnums.ts`, com comentário explícito do backend confirmando o erro do
documento). "Experiência" é `EmployeeContract.type`, não regime de trabalho.
`client/src/api/hr.ts` e `AdmissionTab.tsx` seguem o **código real**
(`employeeWorkRegimeEnum`), não o exemplo do documento — o formulário de
conclusão de admissão nunca envia `work_regime='experiencia'`.

Também confirmado por leitura de código (não estava explícito no contrato):
o gate de ASO que libera a conclusão é **diferente** entre Admissão e
Demissão. Na Admissão, o funcionário ainda não existe no momento do gate, e a
validação usa o snapshot gravado no próprio `AdmissionProcess`
(`aso_result`/`aso_valid_until`, via `PATCH .../aso-confirmation`) — por isso
`ConfirmAsoDialog` na Admissão **não** faz upload de arquivo. Na Demissão, o
funcionário já existe, e o gate real é `HrEmployeeDocument` tipo
`aso_demissional` (`hasValidAso`, `domain/services/asoGate.ts`) — por isso
`ConfirmTerminationAsoDialog` usa o `FileUploadDialog` para criar o
`EmployeeDocument` via `POST /api/rh/employee-documents` **antes** de
sincronizar o snapshot informativo no processo (`PATCH
.../aso-confirmation`). Sem essa distinção, uma implementação ingênua do
contrato (só o PATCH, sem o upload) deixaria a demissão **impossível de
concluir** mesmo com o "ASO confirmado" aparecendo na tela.

### Validação

- `cd client && npx tsc -b` — limpo.
- `npm run lint` (oxlint) — sem novos warnings/erros (os existentes são de
  arquivos não tocados nesta entrega).
- `npx vitest run` — 14 arquivos / 83 testes, todos verdes (suíte existente;
  esta entrega não adicionou testes novos — ver pendência abaixo).
- `npm run build` — build de produção conclui sem erro.

### O que o QA/próximo agente deve testar (sem suíte automatizada ainda)

1. **Admissão:** abrir processo → marcar checklist → solicitar ASO →
   confirmar resultado (apto) → concluir (deve criar `Employee` +
   `EmployeeContract` + `EmployeeJobHistory` e abrir o período aquisitivo de
   férias automaticamente, visível na aba Férias) → confirmar eSocial S-2200.
   Tentar concluir **sem** confirmar o ASO deve mostrar o alerta didático
   com a razão de negócio (RF-RH-008), não um erro genérico.
2. **Contratos:** prorrogar (deve bloquear 2ª prorrogação), decidir
   `efetivar`/`rescindir` — testar `rescindir` com um usuário só `rh:operate`
   (botão deve estar desabilitado) e com um usuário `rh:approve`/`admin`
   (deve criar um `TerminationProcess` novo).
3. **Demissão:** criar → solicitar ASO → confirmar ASO com upload de arquivo
   → checklist de ativos (deve reportar pendência se o funcionário tiver
   `Asset.responsible_id` aberto no Patrimônio) → anexar TRCT → confirmar
   eSocial S-2299 → concluir (só com `rh:approve`) — verificar que o login do
   funcionário é desativado no mesmo ato (RF-RH-022).
4. **Férias:** após concluir uma admissão, período aquisitivo deve aparecer
   automaticamente na aba (nunca criado manualmente). Programar uma fração,
   testar os limites (3 frações, abono > 1/3, fracionamento < 5 dias) e
   confirmar que os 422 do backend viram alertas didáticos legíveis, não
   códigos crus. Testar o calendário por departamento e o alerta de "dobra"
   (`vencido_dobra`) num período vencido.

### Pendência conhecida (não resolvida nesta entrega)

- Sem testes automatizados de componente para as 4 abas novas (o projeto não
  tinha um padrão de teste de componente RTL para telas RH antes desta
  entrega; `npx vitest run` cobre apenas a suíte já existente). Fica como
  próximo passo se o time quiser cobertura de regressão nessas telas.
- Grupos P1/P2 do contrato de API (Cargos, Documentos avulsos além do gate
  de ASO, Afastamentos, Benefícios, Treinamentos, Ponto, Histórico
  Contratual, Folha importada, Painel/KPIs, Recrutamento) continuam sem
  tela — fora do escopo desta Fase A.
- **Nada foi commitado** — tudo fica no working tree.

---

## 2026-08-12 — Backend de Afastamentos, Benefícios e Treinamentos (Bloco 6 RH, Grupos 7/8/9)

**Escopo:** `server/` apenas (a tarefa explicitamente não tocou `client/`).
Contrato: `docs/business/BLOCO_6_RH_API.md` §9/§10/§11. Tabelas já existiam
(migrations `20260808-000020/021/022`) — nenhuma migration nova.

**Resumo da feature:** os 16 endpoints de Afastamentos (`/api/rh/absences`),
Benefícios (`/api/rh/benefit-types`, `/api/rh/employee-benefits`) e
Treinamentos (`/api/rh/training-courses`, `/api/rh/employee-trainings`),
Clean Architecture completa (6 models Sequelize novos, 5 repositórios +
implementações, 3 arquivos de regra de domínio pura, 16 use cases, 3
controllers, 3 arquivos de validators Zod). Destaque: `CreateAbsenceUseCase`
é transacional — cria o afastamento, move `employees.status='license'`,
suspende `suspended_days` de benefícios VT/VR ativos e, quando o acumulado
previdenciário (`auxilio_doenca_inss`/`acidente_trabalho`) passa de 6 meses
no período aquisitivo em curso, zera-o na mesma transação reaproveitando
`ResetVacationAccrualPeriodUseCase`/`OpenVacationAccrualPeriodUseCase` já
existentes — fechando o gatilho que a entrega de 2026-08-09 tinha deixado
registrado como pendente ("o use case já existe... mas hoje não tem quem o
chame").

**Documentações atualizadas:**
- `docs/governance/TODO.md` — entrada nova datada 2026-08-12 (detalhe
  completo) + a linha "Pendente para a passada 2" do Bloco 6 marcada `[x]`
  para os 3 grupos entregues.
- JSDoc em 100% dos arquivos novos (models, repositórios, use cases,
  controllers, validators, regras de domínio).
- `server/tests/integration/enum-literal-guard.test.ts` — 1 entrada nova em
  `KNOWN_NON_DB_LITERALS` (o `reason: 'ausente'|'vencido'` do relatório
  "quem não pode operar" é DTO em memória, não coluna).

**Instruções de teste para o próximo agente/humano:**
1. `cd server && npm run typecheck` — limpo.
2. `npm run test:unit` — **1902/1902** (175 suítes), inclui
   `audit-coverage-guard` (rh não entrou em débito) e os 2 arquivos novos
   (`rh-block6-extension-rules.test.ts`, `rh-block6-extension-use-cases.test.ts`).
3. `npm run test:integration` — **221/221** (54 suítes), inclui
   `tests/integration/rh-block6-extension.test.ts` (3 fluxos ponta a ponta
   contra Postgres real: afastar→retornar, aderir→cancelar benefício,
   criar curso→registrar conclusão; cada um confere `audit_logs` via
   `GET /api/audit-logs?entity_type=...&entity_id=...`).
4. Teste manual sugerido: `POST /api/rh/absences` com
   `type=auxilio_doenca_inss` repetido para o mesmo funcionário até
   acumular > 182 dias corridos no mesmo período aquisitivo — a resposta
   deve trazer `accrual_period_zeroed: true` e um novo
   `HrVacationAccrualPeriod` deve existir para o funcionário.

**Riscos residuais / decisões registradas:**
- Integração síncrona `rh`↔`sst` para `validity_months` de curso normativo
  (RF-RH-059) segue **não implementada** — decisão já tomada no próprio
  contrato de API (processo manual, não integração síncrona nesta rodada).
- `hr_job_position_trainings` (matriz cargo × treinamento) não tem CRUD de
  rota nesta entrega — é escopo do Grupo 1 (Cargos), fora deste bloco.
- Suspensão de benefício (RF-RH-047) não é revertida automaticamente no
  retorno do afastamento — decisão de negócio pendente (quando descontar
  de volta: na folha, no retorno, nunca).
- Nenhuma tela em `client/` para estas 3 sub-áreas — fora do escopo desta
  entrega (agentes de frontend).
- Achado incidental corrigido por bloquear a suíte completa, não relacionado
  a este bloco: banco de desenvolvimento (`erp_evok_audio`) estava 1
  migration atrás do de teste (`20260811-000044-lot-blocked-at-quality-gate`)
  — aplicada via `npm run migration:up`.
- **Nada foi commitado** — tudo fica no working tree.

---

## 2026-08-12 (2ª entrada) — Reativação automática de VT/VR no retorno de afastamento + integração RH↔SST na validade de curso normativo

**Escopo:** `server/` (regra de negócio, RBAC, testes) + 2 arquivos pontuais
em `client/` (tipos e as 2 telas que já expunham os fluxos tocados —
`AbsencesTab.tsx`, `TrainingsTab.tsx`). Fecha os 2 riscos residuais
registrados na entrada anterior deste mesmo dia ("suspensão de benefício não
é revertida automaticamente no retorno" e "integração síncrona rh↔sst para
validity_months segue não implementada") — decisão do dono, 2026-08-12.

### Tarefa 1 — Reativação automática de VT/VR (RF-RH-047-A)

**Resumo:** `ReturnFromAbsenceUseCase` passou a rodar dentro de uma
transação (antes não tinha nenhuma) e, depois de reverter
`employees.status='active'`, reativa os benefícios VT/VR suspensos por
ESTE afastamento. `suspended_days` é um contador acumulado, não um link
explícito afastamento→benefício — a reativação é segura porque
`hr_absences` já garante NO MÁXIMO 1 afastamento aberto por funcionário
(`findOpenByEmployeeId`, checado em `CreateAbsenceUseCase`), logo qualquer
`suspended_days > 0` sobre um benefício ainda `ativo` só pode ter vindo
DESTE afastamento, e o número exato de dias somado na suspensão já estava
gravado em `hr_absences.accrual_impact_days` (mesma variável usada nas duas
contas em `CreateAbsenceUseCase` — nenhuma coluna nova foi necessária).
Benefícios cancelados durante o afastamento não voltam (já saem de
`listActiveByEmployee`, que só traz `enrollment_status='ativo'`). A resposta
do `PATCH /absences/:id/return` ganhou o campo aditivo
`reactivated_benefits` (lista de `{ id, benefit_type_id, category,
suspended_days }`, vazia quando nada havia suspenso).

**Arquivos alterados:**
- `server/src/modules/rh/domain/services/absenceRules.ts` — nova constante
  `SUSPENDABLE_BENEFIT_CATEGORIES` (movida de dentro de
  `CreateAbsenceUseCase` para ser compartilhada com `ReturnFromAbsenceUseCase`
  sem duplicar a lista `['vt', 'vr']`).
- `server/src/modules/rh/application/use-cases/absence/CreateAbsenceUseCase.ts`
  — só o import da constante movida (comportamento inalterado).
- `server/src/modules/rh/application/use-cases/absence/ReturnFromAbsenceUseCase.ts`
  — reescrito: construtor ganhou `employeeBenefitRepository?` e
  `runInTransaction?` (opcionais, mesmo padrão de `CreateAbsenceUseCase`,
  compatível com quem ainda instanciar com 3 argumentos — sem os 2 novos,
  simplesmente não reativa nada); método privado
  `reactivateSuspendedBenefits`.
- `server/src/modules/rh/presentation/controllers/absenceController.ts` —
  injeta `employeeBenefitRepository` no `ReturnFromAbsenceUseCase`;
  `logAction` do retorno passou a incluir `reactivated_benefits` em
  `newValues`.
- `server/tests/unit/rh-block6-extension-use-cases.test.ts` — `buildReturnDeps`
  ganhou `employeeBenefitRepository`/`runInTransaction`; 2 casos novos
  (reativa VT/VR suspensos por este afastamento; benefício cancelado durante
  o afastamento não volta) + os 4 testes existentes atualizados para a nova
  assinatura (`updateStatus` agora recebe a transação como 3º argumento).
- `server/tests/integration/rh-block6-extension.test.ts` — 1 fluxo novo
  ponta a ponta contra Postgres real: adere a VT → afasta (suspende 10 dias)
  → confere `suspended_days=10` via `GET /employee-benefits` → retorna →
  confere `reactivated_benefits` na resposta E `suspended_days=0` de volta
  via `GET /employee-benefits`.
- `client/src/api/hr.ts` — `Absence.reactivated_benefits?` (aditivo) +
  interface nova `ReactivatedBenefit`.
- `client/src/pages/hr/AbsencesTab.tsx` — `ReturnAbsenceDialog` ganhou
  `successNotice` (mesmo padrão visual já usado no diálogo de criação de
  afastamento para o aviso de período aquisitivo zerado): quando o retorno
  religou algum benefício, mostra aviso listando as categorias religadas em
  vez de fechar o diálogo direto.

### Tarefa 2 — Validade de curso normativo vem da matriz SST (RF-INT-RH-SST-01)

**Resumo:** `CreateTrainingCourseUseCase`/`UpdateTrainingCourseUseCase` (RH)
passaram a consultar, via novo adapter, a matriz oficial de treinamentos do
SST (`sst_matriz_treinamento`, já existente, sem migration nova). Quando o
curso é `is_normative=true` e o `nr_code` está cadastrado, ATIVO, na matriz
(em qualquer função/`position` vinculada a essa norma), a validade GRAVADA é
a da matriz — o `validity_months` do payload é ignorado nesse caso — e a
resposta traz `validity_source: 'sst_matrix'`, sem o `warning` de
RF-RH-059. Quando o `nr_code` não está na matriz (ou não foi informado),
comportamento de sempre: `validity_months` manual + `warning` +
`validity_source: 'manual'`. A matriz é modelada por função×norma
(`position` + `norma`); como `HrTrainingCourse` não tem conceito de função,
a busca agrega todas as funções vinculadas à norma e usa a MENOR
periodicidade não nula entre elas (política mais conservadora — nunca deixa
ninguém operar com treinamento vencido); `periodicidade_meses: null` só
ocorre quando NENHUMA função vinculada exige reciclagem periódica
(RF-SST-045).

Ponte entre módulos seguiu o padrão já estabelecido por
`SstAsoServiceAdapter` (RH→SST via ASO): novo `TrainingMatrixService`
(interface) + `TrainingMatrixServiceAdapter` (implementação) que chama
`ListTrainingMatrixUseCase` de `modules/sst/` diretamente — nunca lê o model
`SstMatrizTreinamento`. `nr_code` do RH é texto livre; `norma` do SST é ENUM
fechado — um `nr_code` fora do enum faria o Postgres rejeitar o filtro
(`invalid input value for enum`, SQLSTATE `22P02`); o adapter captura
especificamente esse SQLSTATE e trata como "não cadastrado na matriz"
(qualquer outro erro sobe normalmente, não é confundido com "sem
correspondência").

RBAC: `GET /api/sst/training-matrix` passou a aceitar `sst`|`rh` — o módulo
SST já tinha o middleware exato para este padrão (`requireSstOrRh`, usado em
`GET /aso/status/:employeeId` e `GET /cipa/stability/:employeeId`), então
não foi necessário criar nada novo; a escrita da matriz (`POST`/`PUT`)
continua só `sst`.

**Arquivos alterados:**
- `server/src/modules/sst/presentation/routes/sst.ts` — `GET
  /training-matrix` trocou `authorizeModule('sst')` por `requireSstOrRh`;
  comentário de cabeçalho do router atualizado.
- `server/src/modules/rh/application/services/TrainingMatrixService.ts`
  (NOVO) — interface.
- `server/src/modules/rh/infrastructure/adapters/TrainingMatrixServiceAdapter.ts`
  (NOVO) — implementação.
- `server/src/modules/rh/application/use-cases/training/CreateTrainingCourseUseCase.ts`
  e `UpdateTrainingCourseUseCase.ts` — construtor ganhou
  `trainingMatrixService?` opcional; `validity_source` na resposta;
  `UpdateTrainingCourseUseCase` agora busca o registro existente primeiro
  (`findById`) para combinar `is_normative`/`nr_code` efetivos quando o PUT
  só manda um subconjunto de campos (reaplica a validade da matriz mesmo
  quando só `workload_hours`, por exemplo, muda no payload).
- `server/src/modules/rh/presentation/controllers/trainingController.ts` —
  injeta `TrainingMatrixServiceAdapter` nos 2 use cases;
  `logAction` de criação/atualização passou a incluir `validity_source`.
- `server/tests/unit/rh-block6-extension-use-cases.test.ts` — describe novo
  `CreateTrainingCourseUseCase / UpdateTrainingCourseUseCase —
  RF-INT-RH-SST-01` (4 casos: normativo com NR na matriz, normativo com NR
  fora da matriz, não-normativo nunca consulta a matriz, UPDATE reaplica a
  matriz mesmo sem `nr_code` no payload do PUT).
- `server/tests/integration/rh-block6-extension.test.ts` — 2 fluxos novos
  ponta a ponta: `POST /sst/training-matrix` + `POST`/`PUT`
  `/rh/training-courses` provando a sobrescrita (create E update); curso
  normativo com NR fora da matriz mantém manual+warning.
- `client/src/api/hr.ts` — `TrainingCourse.validity_source?`/`warning?`
  (aditivos).
- `client/src/pages/hr/TrainingsTab.tsx` — `TrainingCourseFormDialog` ganhou
  `resultInfo` pós-gravação: quando `validity_source === 'sst_matrix'`,
  mostra aviso informativo (verde) explicando que a validade veio da matriz
  SST e qual foi o valor efetivo, substituindo o aviso amarelo antigo
  (que só existe agora para o caso `manual` de fato); campo "Código da NR"
  ganhou texto auxiliar explicando a sobrescrita.

**Instruções de teste para o próximo agente/humano:**
1. `cd server && npm run typecheck` — limpo.
2. `npm run test:unit` — **1908/1908** (175 suítes, +6 desde a entrada
   anterior deste dia).
3. `npm run test:integration` — **224/224** (54 suítes, +3), inclui os 3
   fluxos novos deste bloco em `tests/integration/rh-block6-extension.test.ts`.
4. `cd client && npx tsc -b` — limpo. `npx vitest run` — **83/83** (14
   arquivos).
5. `npx jest --runInBand tests/unit/audit-coverage-guard.test.ts` — verde
   (nenhum módulo tocado hoje entrou em débito de auditoria).
6. Teste manual sugerido (Tarefa 1): abrir um afastamento com
   `expected_end_date` definida para um funcionário com VT ativo, conferir
   `suspended_days` em `GET /api/rh/employee-benefits?employee_id=...`,
   depois `PATCH /absences/:id/return` e conferir que `suspended_days`
   voltou a 0 e a resposta trouxe `reactivated_benefits`.
7. Teste manual sugerido (Tarefa 2): cadastrar uma norma na matriz SST
   (`POST /api/sst/training-matrix`, ex. `{ position, norma: 'NR-12',
   periodicidade_meses: 12 }`), depois criar um curso RH normativo com o
   mesmo `nr_code` e QUALQUER `validity_months` — a resposta deve trazer
   `validity_months: 12` e `validity_source: 'sst_matrix'`, não o valor
   digitado.

**Semânticas descobertas durante a implementação (diferentes do que o
pedido presumia):**
- `suspended_days` NÃO é um link explícito afastamento→benefício — é um
  contador acumulado em `hr_employee_benefits`. A reativação por
  "subtração exata do que este afastamento somou" só é segura porque o
  sistema já impede 2 afastamentos abertos simultâneos para o mesmo
  funcionário (`ConflictError` 409 em `CreateAbsenceUseCase`); não foi
  necessário desenhar um mecanismo de rastreio novo nem migration.
- A matriz SST (`sst_matriz_treinamento`) é modelada por PAR
  função×norma (`position` + `norma`), não por norma isolada — o pedido
  falava em "buscar por NR"; como `HrTrainingCourse` não tem função, a
  consulta precisou agregar todas as funções vinculadas à mesma norma e
  aplicar uma política de desempate (menor periodicidade não nula) que não
  estava especificada no pedido original. Documentado no JSDoc de
  `TrainingMatrixService.findValidityByNrCode`.
- `norma` em `sst_matriz_treinamento` é ENUM fechado (10 valores fixos,
  incluindo `'outro'`); `nr_code` em `hr_training_courses` é texto livre.
  Um valor fora do enum faz o Postgres rejeitar a query com SQLSTATE
  `22P02` em vez de simplesmente devolver 0 linhas — o adapter trata esse
  erro especificamente como "não cadastrado na matriz" (não confundir com
  falha de banco).

**Riscos residuais / decisões registradas:**
- `CreateEmployeeTrainingUseCase` (conclusão de treinamento, distinto dos 2
  use cases tocados aqui) continua emitindo o aviso "confirme com a SST"
  sempre que o curso é normativo, mesmo quando `validity_source` já é
  `'sst_matrix'` — esse aviso é sobre a CONCLUSÃO, não sobre o CADASTRO do
  curso, e ficou fora do escopo desta tarefa (não foi pedido); pode soar
  redundante agora que o cadastro já veio confirmado pela SST. Fica como
  possível ajuste futuro.
- A reativação de VT/VR não tem teste de integração de concorrência (2
  afastamentos simultâneos não é possível hoje por `findOpenByEmployeeId`,
  mas isso depende de uma leitura-antes-de-escrever fora de lock explícito —
  mesma classe de risco teórico já aceita no resto do módulo RH, não
  introduzida por esta mudança).
- **Nada foi commitado** — tudo fica no working tree.

## 2026-08-12 (3ª entrada) — Importador de ponto eletrônico AEJ (Bloco 6 RH, Grupo 10)

### Resumo da feature

Implementado o importador de ponto eletrônico do módulo RH, full-stack,
conforme a especificação aprovada pelo dono em `docs/rh/04-FREQUENCIA.md`
(decisão INTEGRAR: o ERP importa o AEJ — Arquivo Eletrônico de Jornada,
Portaria MTP 671/2021, Anexo IX — exportado pelo software da administradora
dos REPs RWTech/Pointline; **não** trata AFD bruto, **não** administra
relógio).

Fluxo: `POST /api/rh/time-imports` (upload multipart do AEJ + competência) →
parse tolerante → grava lote (`hr_time_import_batches`) + itens
(`hr_time_import_items`) → casa cada linha por CPF contra `employees.cpf` →
devolve relatório de não-casados → RH revisa em `GET .../:id` →
`POST .../:id/confirm` (só a partir de `status='validated'`) →
`GET /api/rh/attendance/monthly-summary` cruza os lotes CONFIRMADOS com
`hr_absences`.

**Migration:** `server/migrations/20260812-000045-create-hr-time-imports.cjs`
(167ª migration do projeto) — aplicada em `erp_evok_audio` via
`npm run migration:up` e em `erp_evok_audio_test` automaticamente pelo
`scripts/run-api-suite.cjs` (que roda `migration:up` contra o banco de teste
antes de subir a API). `node scripts/comparar-bancos.cjs` → **0
divergências** após a aplicação nos dois bancos.

### O que o parser AEJ cobre de fato

`server/src/modules/rh/domain/services/aejParser.ts` — **decisão
documentada e assumida**: a Portaria 671/2021 não publica um layout
binário/fixed-width único para o AEJ (cada software homologado exporta um
formato próprio, desde que contenha os dados do Anexo IX). **Sem uma
amostra real do arquivo da administradora da Evok Áudio**, o parser adota um
layout textual pragmático — um registro por linha, campos separados por
`;`, tipo de registro no primeiro campo:

- Tipo `1` (cabeçalho) e `9` (rodapé): reconhecidos, ignorados (informativo).
- Tipo `2` (jornada diária): `2;CPF;MATRICULA;DATA;HORAS_TRABALHADAS;HE_50;HE_100;HORAS_NOTURNAS;FALTA;ABONO`
  — único tipo que vira `hr_time_import_items`. Horas aceitam `HH:MM` ou
  decimal. Linha malformada (campos faltando, data/hora inválida) vira
  entrada em `rejected_lines` (JSONB no lote), **sem** abortar o restante do
  arquivo.
- Qualquer outro tipo: contado em `unknown_record_types` (JSONB no lote),
  **sem** abortar o arquivo nem virar erro.
- Lote sem **nenhum** registro tipo `2` reconhecido nasce com
  `status='rejected'` (visível na lista, auditável) em vez de `422` — o
  upload em si nunca falha por conteúdo do arquivo.

**Limitação assumida e registrada** (`docs/rh/04-FREQUENCIA.md`): este
layout precisa ser validado/ajustado contra um arquivo AEJ real da
administradora assim que ele estiver disponível — a troca é localizada em
`parseWorkdayFields`.

### Casamento com `employees`

`employees` não tem coluna `matricula` no modelo atual — o casamento é feito
por **CPF** (campo padrão do Anexo IX), normalizado (só dígitos). A
matrícula do arquivo (`original_registration`) é sempre preservada na linha,
casada ou não, para auditoria. Linha não-casada (`employee_id=NULL`) entra
no relatório de não-casados e **não** entra no resumo mensal.

### Arquivos criados

**Backend:**
- `server/migrations/20260812-000045-create-hr-time-imports.cjs`
- `server/src/models/HrTimeImportBatch.ts`, `HrTimeImportItem.ts` (+ registro
  e relacionamentos em `server/src/models/index.ts`)
- `server/src/modules/rh/domain/services/aejParser.ts` (parser),
  `attendanceSummaryRules.ts` (competência/overlap de afastamento)
- `server/src/modules/rh/domain/repositories/TimeImportRepository.ts`
- `server/src/modules/rh/infrastructure/sequelize/SequelizeTimeImportRepository.ts`
- `server/src/modules/rh/application/use-cases/timeImport/`:
  `CreateTimeImportBatchUseCase.ts`, `ConfirmTimeImportBatchUseCase.ts`,
  `ListTimeImportBatchesUseCase.ts`, `GetTimeImportBatchUseCase.ts`,
  `GetMonthlyAttendanceSummaryUseCase.ts`
- `server/src/modules/rh/presentation/controllers/timeImportController.ts`
- `server/src/modules/rh/presentation/validators/timeImportValidators.ts`
  (+ `timeImportBatchStatusEnum` em `rhEnums.ts`)
- `server/src/modules/rh/presentation/routes/rh.ts` — bloco `// ---- Grupo
  10 — Frequência/Ponto ----` (5 rotas)
- `server/tests/unit/rh-aej-parser.test.ts` (9 casos)
- `server/tests/integration/rh-time-import-attendance.test.ts` (3 casos —
  fluxo completo com asserção de `audit_logs`, lote estrutural rejeitado,
  listagem filtrada)

**Frontend:**
- `client/src/api/hr.ts` — seção "Grupo 10", funções
  `listTimeImportBatches`, `getTimeImportBatch`, `createTimeImportBatch`,
  `confirmTimeImportBatch`, `getMonthlyAttendanceSummary`
- `client/src/pages/hr/AttendanceTab.tsx` (nova aba "Frequência")
- `client/src/pages/hr/HrPage.tsx` — 10ª aba adicionada

### Documentações atualizadas

- `docs/rh/04-FREQUENCIA.md` — banner de especificação trocado pelo estado
  implementado (tabelas/rotas reais, cobertura do parser, limitação do
  layout).
- `docs/rh/00-README.md` — "9 abas" → "10 abas"; ponto eletrônico deixou de
  aparecer na lista do que falta.
- `docs/business/BLOCO_6_RH_API.md` — §12 (Grupo 10) reescrito: o desenho
  antigo (`TimeSheetSummary`, nunca implementado) foi substituído pelos
  endpoints reais do importador AEJ; §21 item 2 marcado resolvido.
- `CLAUDE.md` §1 — medição canônica atualizada (166→167 migrations,
  202→204 tabelas, 467→471 FKs) e bullet de RH atualizado.
- `docs/database/00-INDICE.md` — medição canônica atualizada (mesmos
  números) + nota da 167ª migration.

### Instruções de teste

1. `cd server && npm run typecheck` — limpo.
2. `cd server && npm run test:unit` — **1917/1917** (1908 base + 9 novos do
   parser AEJ), 176 suítes.
3. `cd server && node scripts/run-api-suite.cjs integration` (ou filtrado
   por `rh-time-import`) — suíte completa verde, incluindo
   `audit-coverage-guard`, `cross-database-drift-guard` e
   `docs-reality-drift-guard` (os três exigiram a atualização dos dois
   pontos canônicos acima).
4. `cd client && npx tsc -b` — limpo. `npx vitest run` — 83/83 (sem
   regressão; nenhum teste novo de componente React foi escrito nesta
   rodada — risco residual abaixo). `npm run build` — ok. `npm run lint` —
   sem novos warnings/erros nos arquivos tocados.
5. `node server/scripts/comparar-bancos.cjs` — **0 divergências** entre
   `erp_evok_audio` e `erp_evok_audio_test`.
6. Manual (`/hr`, aba "Frequência"): subir um `.txt` no formato descrito em
   `docs/rh/04-FREQUENCIA.md` §"O que existe hoje", conferir o relatório de
   não-casados no detalhe do lote, confirmar, e ver o resumo mensal
   preenchido.

### Riscos residuais / decisões registradas

- **Layout do AEJ não validado contra um arquivo real** — é a maior
  incerteza da entrega. O parser foi desenhado para a correção ficar
  localizada em `aejParser.ts#parseWorkdayFields`; nenhum outro arquivo
  precisa mudar quando a amostra real chegar.
- **Casamento por CPF, não por matrícula** — `employees` não tem coluna de
  matrícula; decisão documentada em vez de inventar um campo novo no model
  central (`Employee`) só para este importador.
- **Sem `UNIQUE(employee_id, work_date)`** — reimportação da mesma
  competência com dois lotes confirmados soma dupla no resumo mensal (mesma
  decisão já tomada para `hr_payroll_import_batches`).
- **Sem teste de componente React novo** (Vitest) para `AttendanceTab.tsx` —
  cobertura ficou em typecheck + build + teste de integração de API
  (backend). Ajuste futuro se o próximo agente quiser fechar essa lacuna.
- **Nada foi commitado** — tudo fica no working tree, no mesmo padrão das
  entradas anteriores de hoje.

---

## 2026-08-12 — Módulo Diretoria: backend completo (Organograma, Planejamento Estratégico, Atas, Riscos)

**Contexto:** a tabela `directorates` (hierarquia CEO→diretorias→
departamentos) existia desde 2026-08-11 sem nenhuma rota/controller/use-case
— só era lida por seed e associação. `docs/administrativo/01-DIRETORIA.md`
descrevia 3 tabelas de governança (`strategic_planning`, `meeting_minutes`,
`business_risks`) em SQL MySQL aspiracional, nunca aplicadas ao banco. Esta
entrega fecha os dois gaps: dá API ao organograma existente e implementa de
verdade as três tabelas de governança, no padrão PostgreSQL/Sequelize do
projeto (não a sintaxe MySQL do documento original).

### Resumo da feature

- **Migration `20260812-000046-create-directorate-governance.cjs`** — 3
  tabelas novas: `strategic_plannings` (objetivo estratégico anual, dono
  `directorate_id` XOR `department_id` via CHECK
  `strategic_plannings_owner_xor_ck`), `meeting_minutes` (ata de reunião,
  `decisions`/`action_items` em JSONB), `business_risks` (risco corporativo,
  `risk_score` calculado). Aplicada nos DOIS bancos
  (`erp_evok_audio`/`erp_evok_audio_test`) — `node scripts/comparar-bancos.cjs`
  confirma 0 divergências.
- **3 models novos** — `StrategicPlanning`, `MeetingMinute`, `BusinessRisk`
  (`server/src/models/`), registrados e associados em `models/index.ts`
  (`Directorate`/`Department`/`Employee`/`User` como donos das FKs).
- **Módulo `server/src/modules/directorate/`** (Clean Architecture, mesmo
  padrão de `modules/budget`/`modules/quality`):
  - `domain/services/riskScore.ts` — `calculateRiskScore(probability, impact)`,
    função pura (`low=1..critical=4`, score 1–16). É a ÚNICA fonte da
    fórmula; nunca aceita do payload HTTP (schemas Zod `.strict()` nem
    declaram o campo).
  - `domain/repositories/DirectorateRepository.ts` +
    `infrastructure/sequelize/SequelizeDirectorateRepository.ts`.
  - 12 use cases: organograma (`GetExecutiveOrgChartUseCase`,
    `AssignDirectorateManagerUseCase` — recusa prover funcionário
    `status !== 'active'` no cargo de diretor), planejamento estratégico
    (Create/Update/List/GetById + `UpdateStrategicPlanningActualUseCase`,
    que deriva `status` automaticamente quando há `target_value`), atas
    (Create/List/GetById — **sem** Update/Delete, de propósito), riscos
    (Create/Update/List/GetById, `risk_score` sempre recalculado quando
    `probability`/`impact` mudam).
  - 4 controllers + 1 router agregador (`presentation/routes/directorate.ts`),
    montado em `/api/directorate` (`server/app.ts`).
- **RBAC** — módulo `diretoria` adicionado ao catálogo
  (`server/src/shared/domain/accessModules.ts`), owner `DIR`. `GET
  /org-chart` é a única rota do módulo liberada a qualquer autenticado (sem
  `authorizeModule`) — organograma não é segredo interno. Todo o resto:
  leitura em nível padrão, **toda escrita exige `diretoria:approve`**
  (governança sensível, não operação de rotina — mesmo padrão de
  `contabilidade`/`tesouraria`).
- **Auditoria** — `logAction` em toda escrita (provimento de cargo, criação/
  edição de planejamento, criação de ata, criação/edição de risco); módulo
  nasce fora da lista de débito de `audit-coverage-guard.test.ts` (a lista só
  encolhe, e `directorate` nunca esteve nela).

### Decisões tomadas além do especificado

- Nome do módulo de acesso: `diretoria` (novo), **distinto** de `diretor`
  (papel transversal de aprovador de alçada já existente, RF-JUR-003/G11).
  `diretoria` é o DOMÍNIO de dados do módulo Diretoria em si.
- `UpdateStrategicPlanningActualUseCase` separado de
  `UpdateStrategicPlanningUseCase`: registrar o realizado é ato distinto de
  editar o plano (mesmo espírito de "inspecionar" × "liberar" em Qualidade).
  Deriva `status` (`achieved` se realizado ≥ meta, senão `in_progress`)
  apenas quando há `target_value`; nunca sobrescreve `not_achieved`
  automaticamente (decisão humana, via `PUT`).
- Atas: nenhuma trigger de banco impede `UPDATE` SQL direto — a garantia de
  imutabilidade vive só na ausência da rota HTTP (mesmo desenho de
  `AuditLog` no projeto). Documentado explicitamente nos 3 lugares (model,
  migration, doc de negócio) para não ser "redescoberto" como bug depois.
- Conselho de Administração / Assembleia de Sócios (linhas da tabela antiga
  em `01-DIRETORIA.md`) **não** viraram schema — usam `meeting_minutes` com
  `meeting_type = 'board'/'general'`, sem campos dedicados de
  conselheiro/sócio. Aprovação de CAPEX também ficou de fora (regra de
  processo, ainda sem contrapartida em código) — ambos registrados como
  pendência consciente no próprio `01-DIRETORIA.md`.

### Documentações atualizadas

- `docs/administrativo/01-DIRETORIA.md` — banner `[PENDENTE]` removido, SQL
  MySQL aspiracional substituído pelo estado real (tabelas, endpoints,
  regras implementadas, o que ficou de fora e por quê).
- `docs/database/04-DICIONARIO_DADOS.md` — 4 entradas novas: `directorates`
  (débito antigo, existia desde 2026-08-11 sem entrada no dicionário),
  `business_risks`, `meeting_minutes`, `strategic_plannings`. Índice
  atualizado (81→85 catalogadas, 195→207 no banco).
- `docs/arquitetura/API.md` — seção 35 nova ("Diretoria — Organograma,
  Planejamento Estratégico, Atas e Riscos"), com os 4 grupos de endpoint,
  payloads de exemplo e as regras de negócio (XOR de dono, imutabilidade de
  ata, `risk_score` no servidor).
- `CLAUDE.md` §1 — medição canônica atualizada (167→168 migrations,
  204→207 tabelas, 471→478 FKs).
- `docs/database/00-INDICE.md` — medição canônica atualizada (mesmos
  números) + nota da 168ª migration.
- JSDoc em 100% dos arquivos novos (models, repositórios, use cases,
  controllers, rotas, validators, serviço de domínio).

### Instruções de teste

1. `cd server && npm run typecheck` — limpo.
2. `cd server && npm run test:unit` — **1946/1946**, 177 suítes (28 testes
   novos em `tests/unit/directorate-use-cases.test.ts`, cobrindo
   `calculateRiskScore`, XOR de dono do planejamento, imutabilidade de ata
   — via ausência de update/delete use case —, e provimento de cargo com
   funcionário inativo/ativo/inexistente).
3. `cd server && npm run test:integration` (via `scripts/run-api-suite.cjs`)
   — **56/56 suítes, 231/231 testes**, incluindo
   `tests/integration/directorate-governance-cycle.test.ts` (4 testes: prover
   gerente reflete no organograma + audita, criar objetivo→atualizar
   realizado, criar ata→confirmar ausência de PUT/DELETE, criar
   risco→conferir `risk_score` calculado e payload `.strict()` rejeitando
   `risk_score` externo), `audit-coverage-guard`, `cross-database-drift-guard`
   e `docs-reality-drift-guard` — todas verdes.
4. `node server/scripts/comparar-bancos.cjs` — **0 divergências** entre
   `erp_evok_audio` e `erp_evok_audio_test`.
5. Manual (quando a tela existir, fora deste escopo): `GET
   /api/directorate/org-chart` sem token de aprovador deve funcionar (só
   `authenticate`); `PATCH .../directorates/:id/manager` com usuário sem
   `diretoria:approve` deve responder 403 `APPROVAL_LEVEL_REQUIRED`.

### Riscos residuais / decisões registradas

- **Sem tela.** Este escopo era só backend — `client/` fica para o agente de
  frontend (`PromadorFonteEnd`), consumindo o mapa de rotas acima.
- **`action_items` sem dono/prazo estruturado** — array JSON de texto livre;
  virar entidade própria é evolução futura se o volume de reuniões pedir
  cobrança automática de pendência.
- **Aprovação de CAPEX sem endpoint** — regra de processo descrita em
  `01-DIRETORIA.md`, ainda sem contrapartida em código.
- **Nada foi commitado** — tudo fica no working tree, no mesmo padrão das
  entradas anteriores.

## 2026-08-12 (2ª entrada) — Módulo Diretoria: tela nova (`/directorate`)

Fecha a pendência "sem tela" registrada na entrada anterior (backend
completo do módulo Diretoria). Escopo: `client/` apenas, nada em `server/`.

### Arquivos criados

- `client/src/api/directorate.ts` — client tipado das 14 rotas de
  `/api/directorate/*` (org-chart + provimento de cargo, planejamento
  estratégico, atas de reunião, riscos corporativos). `target_value`/
  `actual_value`/`weight` documentados como `DECIMAL` que trafegam como
  `string` na leitura (não truncar); os payloads de escrita mandam `number`
  puro (o backend usa `DECIMAL(15,2)`/`(5,2)`, sem risco de perda de
  precisão nesses ranges). `risk_score` nunca aparece nos tipos de input de
  criação/edição de risco — só no tipo de leitura — porque o schema Zod do
  backend é `.strict()` e rejeitaria o campo.
- `client/src/pages/executive/DirectoratePage.tsx` — página com 4 abas
  (padrão `useState`/`TabButton` de `HrPage.tsx`): Organograma, Planejamento
  Estratégico, Atas de Reunião, Riscos.
- `client/src/pages/executive/OrgChartTab.tsx` — árvore CEO → 4 diretorias →
  departamentos. Card por diretoria com nome, cargo, gestor ou badge "CARGO
  VAGO" (hoje é o caso real de Suprimentos & Logística). Dialog de
  prover/vagar cargo lista só funcionários com `status: 'active'`
  (`employeesApi.listEmployees({ status: 'active' })`, filtro que
  `useEmployeeOptions` não fazia — por isso não foi reaproveitado aqui, para
  não listar funcionário desligado/afastado como candidato a diretor, o
  que o backend rejeitaria com 422 mesmo assim).
- `client/src/pages/executive/StrategicPlanningTab.tsx` — lista com filtros
  (ano, diretoria, departamento, status), criar/editar objetivo (dono =
  empresa toda **ou** diretoria **ou** departamento, nunca dois — a UI
  força isso com um seletor de "tipo de dono" que zera o campo não
  escolhido antes de montar o payload), dialog dedicado para `PATCH
  .../actual` (registrar realizado). Meta × realizado vira uma barra de
  progresso simples (`<Progress>`, componente já existente) com percentual
  — sem lib de gráfico nova, como pedido.
- `client/src/pages/executive/MeetingMinutesTab.tsx` — lista com filtros
  (tipo, período `from`/`to`), criar ata (data, tipo, título, participantes,
  resumo, decisões e itens de ação como listas dinâmicas — adicionar/
  remover item antes de enviar), detalhe em dialog. **Sem botão de
  editar/excluir** — o formulário de criação mostra um aviso âmbar fixo
  ("A ata não pode ser alterada depois de registrada..."), e não existe
  nenhuma chamada de update/delete no client (`directorate.ts` não exporta
  essas funções, de propósito, espelhando a ausência da rota no backend).
  `action_items` vira `{ description, responsible, due_date }[]` (não texto
  livre) — o backend aceita `unknown[]`, então a estrutura é só uma escolha
  de UX para facilitar leitura posterior.
- `client/src/pages/executive/BusinessRisksTab.tsx` — lista com badge de
  score colorido (1–4 verde/`success`, 6–9 âmbar, 12–16 vermelho/
  `destructive`, usando a mesma paleta de `Badge`), filtros (status,
  categoria), criar/editar risco com `probability`/`impact` como selects
  (`low`/`medium`/`high`/`critical` — a nomenclatura real do backend, não a
  escala numérica 1–4 sugerida como atalho na tarefa; o `risk_score`
  1..16 é o mesmo resultado). Um score "previsto" aparece no formulário só
  como prévia visual (`LEVEL_WEIGHT` local, comentado como espelho do
  `domain/services/riskScore.ts` do servidor) — **nunca** é enviado no
  payload; o valor exibido na listagem é sempre `risk.risk_score` vindo da
  resposta da API.

### Arquivos editados

- `client/src/api/accessProfiles.ts` — `AccessModuleKey` ganhou `'diretoria'`
  (o backend já tinha o módulo no catálogo desde a entrega anterior; o tipo
  do client estava desatualizado e bloquearia o typecheck ao usar
  `hasModuleAccess('diretoria')`/`permissions?.diretoria`).
- `client/src/App.tsx` — rota `/directorate` nova, atrás de `<ModuleRoute
  module="diretoria" />` (mesmo padrão de `/dashboard`↔`diretor`), lazy-loaded.
- `client/src/layouts/AppLayout.tsx` — item de menu "Diretoria" novo dentro
  do grupo `department: 'diretoria'` (já existia, continha só "Sala de
  Comando"), ícone `Workflow` (lucide-react não tem `Sitemap`). Nenhuma
  mudança na lista/estrutura de `DEPARTMENTS`/`DIRECTORATES`
  (`@/lib/departments.ts`) — só um `NavItem` a mais, o que
  `departments.seeds.test.ts` não guarda (ele guarda a estrutura de
  departamentos/diretorias, não os itens de menu).

### Decisões tomadas além do especificado

- **Rota inteira atrás de `ModuleRoute module="diretoria"`**, mesmo `GET
  /org-chart` sendo liberado no backend a qualquer autenticado. Consistente
  com o precedente de `/dashboard` (que já gate por `diretor` mesmo tendo
  chamadas que talvez não precisassem) — evita uma tela que renderiza só
  1 de 4 abas para quem não tem o módulo, o que seria mais confuso que
  negar a rota inteira com a tela de "Acesso negado" já existente.
- **Nível de escrita (`diretoria:approve`)** resolvido em cada aba com
  `hasRole('admin') || permissions?.diretoria === 'approve'` — mesmo padrão
  já usado em `RfqPage.tsx` (`permissions?.compras === 'approve'`). Não há
  guard de rota por nível (só por módulo); cada aba esconde os botões de
  escrita quando o nível não é suficiente, e `translateApiError` cobre o
  403 caso o usuário tente mesmo assim (ex.: duas abas abertas, permissão
  mudou no meio da sessão).

### Instruções de teste

1. `cd client && npx tsc -b` — limpo.
2. `cd client && npm run lint` (`oxlint`) — sem avisos novos (confirmado
   filtrando a saída por `executive`/`directorate`; os avisos pré-existentes
   de `only-export-components` em outros arquivos não mudaram).
3. `cd client && npx vitest run` — **83/83** (14 arquivos), nenhuma
   quebra na suíte existente (inclui a guarda de navegação do
   `AppLayout.navigation.test.tsx`, que reprovaria em caso de `to` duplicado).
4. `cd client && npm run build` — ok (`DirectoratePage` vira chunk lazy
   próprio, `40.70 kB`/`8.77 kB` gzip).
5. Manual (não executado nesta sessão — sem servidor rodando): logar como
   usuário sem módulo `diretoria` e confirmar que `/directorate` mostra
   "Acesso negado"; logar como perfil com `diretoria` nível `operate` e
   confirmar que os botões de escrita (novo objetivo, nova ata, prover
   cargo, novo risco) não aparecem, mas a leitura funciona nas 4 abas.

### Riscos residuais / divergências encontradas no mapa de rotas da tarefa

- A tarefa sugeria `probability`/`impact` como escala numérica 1–4; o
  backend real usa os literais `low`/`medium`/`high`/`critical` (mapeados
  para 1–4 só internamente, em `riskScore.ts`). A tela usa os literais reais
  — é o que o Zod `.strict()` aceita.
- Nenhuma outra divergência entre o mapa de rotas fornecido e o código real
  do backend (controllers/validators/router lidos diretamente antes de
  tipar) — os 14 endpoints, o RBAC (`GET /org-chart` sem `authorizeModule`,
  demais leituras em nível padrão, toda escrita `diretoria:approve`) e a
  ausência proposital de `PUT`/`DELETE` em atas bateram exatamente com o
  código.
- **Sem teste de integração real (Postgres) da tela** — só typecheck/
  lint/vitest/build, mesmo critério que já se aplicava ao backend puro
  antes de existir tela (ver ressalva de "escrita real" no topo deste
  arquivo/`CLAUDE.md`).
- **Nada foi commitado** — tudo fica no working tree.
