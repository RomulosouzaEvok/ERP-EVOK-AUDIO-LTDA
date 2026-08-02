# Handoff Codex — Migração Product/Item

Documento de handoff entre desenvolvimento (Backend Engineer) e QA/auditoria (Codex agent).

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
- `docs/HANDOFF_CODEX.md` — Este arquivo

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

Cada tabela é sua própria micro-entrega + commit, executadas na ordem de risco documentada em `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md` (Suppliers → Purchases → Inventory → Sales → Production → ...).

Só após todas as 15 tabelas expandidas (Fase 4 "expand" finalizada) é que módulos de aplicação serão migrados (Fase 5, com dual-read em repositories e use-cases) e `product_id` será removido das tabelas (Fase 4 "contract" final).

---

**Desenvolvedor**: Claude Code (Backend Engineer)  
**Data**: 2026-07-30  
**Próximo checkpoint**: Fase 4.2 (próxima tabela) ou Fase 5 (módulos de aplicação)
