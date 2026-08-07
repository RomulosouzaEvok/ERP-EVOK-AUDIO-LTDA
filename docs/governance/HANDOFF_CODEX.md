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

Uma rodada completa de `node scripts/run-api-suite.cjs integration`
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
  + PostgreSQL reais via `scripts/run-api-suite.cjs`), seguindo
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
   na porta 3101 via `scripts/run-api-suite.cjs` (não usa os containers
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
- `node scripts/run-api-suite.cjs api` (suíte de integração completa)
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
