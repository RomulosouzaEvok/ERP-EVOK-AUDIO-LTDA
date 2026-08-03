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

- `docs/DATABASE.md` — nova seção `### Tabela: item_suppliers` (colunas,
  constraints, regra do `preferred`, referência à migration).
- `docs/projeto/04-USE_CASES.md` — `UC-22: Gerenciar Catálogo Item ×
  Fornecedor` e `UC-23: Workflow de Aprovação da Requisição de Compra`.
- `docs/HANDOFF_CODEX.md` — esta seção.
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
- `docs/HANDOFF_CODEX.md` — esta seção

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
- `docs/HANDOFF_CODEX.md` — esta seção

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

- `docs/DATABASE.md` — nova seção "Tabela `lot_controls` (Rastreabilidade de Lotes + Quarentena de Qualidade)", com diagrama ASCII do lifecycle do enum `status` e tabela de endpoints.
- `docs/projeto/04-USE_CASES.md` — UC-16 (Receber Pedido de Compra) e UC-17 (Realizar Inspeção de Qualidade) atualizados para refletir quarentena e bloqueio de lote pela RNC; novo UC-17B (Liberar/Bloquear Lote).
- `server/src/modules/inventory/README.md` — tabela de endpoints, estrutura de use cases e seção de auditoria atualizadas; nova subseção "Quarentena de lotes de recebimento (item 8)".
- `docs/LEVANTAMENTO_ERP_2026-08-02.md` — item 8 da tabela de prioridades marcado como resolvido (parcial — rating de fornecedor pendente).
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

- `docs/CRONOGRAMA_FRONTEND_2026-07-31.md` — nova subseção "Qualidade (item 8 do backlog de telas)" sob FE4, item marcado `[x]`.
- `docs/LEVANTAMENTO_ERP_2026-08-02.md` — seção "Frontend" atualizada: contagem de "9 módulos com UI completa" → "10 módulos" (incluindo qualidade/RNC) e "12 módulos sem tela" → "11 módulos" (removido qualidade/RNC da lista de lacunas).

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
- `docs/HANDOFF_CODEX.md` — esta seção.

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
- `docs/HANDOFF_CODEX.md` — esta seção.

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
- Não foram tocados `docs/DATABASE_DICTIONARY.md`/`docs/DATABASE.md` nem
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
- `docs/CRONOGRAMA_FRONTEND_2026-07-31.md` — marcado item de Centros de
  Trabalho como concluído na seção FE4.
- `docs/LEVANTAMENTO_ERP_2026-08-02.md` — itens 5 e 7 da tabela de
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
**Data**: 2026-08-03
