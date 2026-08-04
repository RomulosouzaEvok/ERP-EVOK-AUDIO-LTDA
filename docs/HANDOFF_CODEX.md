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
- `docs/DATABASE.md` — 3 novas seções no Dicionário de Dados
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
- `docs/DATABASE.md` — enum de `sales.status` documentado com `'shipped'` e referência à migration.
- `docs/API.md` — `GET /api/sales` (query `status`), `PUT /api/sales/:id/status` (regras de `shipped`), `GET /api/purchases/cockpit` (novo, com contrato JSON completo) e `GET /api/finance/cash-flow-projection` (novo, com contrato JSON completo).
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
- `docs/CRONOGRAMA_FRONTEND_2026-07-31.md` — checklist FE1 (Onda 3 — Expedição), FE3 (cockpit de compras) e FE5 (fluxo de caixa projetado) marcados `[x]` com descrição da entrega.
- `docs/LEVANTAMENTO_ERP_2026-08-02.md` — seção "Frontend" com 3 novos itens (Expedição, Cockpit de Compras, Fluxo de caixa projetado).

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
   registrar a entrega nesta mesma seção de `docs/HANDOFF_CODEX.md`, no
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
- `docs/DATABASE.md` — nota de escopo de `access_profiles`/
  `access_profile_permissions` atualizada (removida a referência a
  `access_level` como pendência de schema)
- `docs/API.md` — nova seção "1.2 Perfis de Acesso (Access Profiles)",
  `GET /api/auth/me/permissions` e `PUT /api/users/:id/access-profile`
  documentados em "1. Autenticação"/"1.1 Usuários"

### Documentações atualizadas

`docs/governance/TODO.md`, `docs/business/BUSINESS_RULES.md`,
`docs/projeto/04-USE_CASES.md`, `docs/DATABASE.md`, `docs/API.md`,
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
- `docs/HANDOFF_CODEX.md` — esta seção.
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
- `docs/DATABASE.md` — seção de Múltiplos Depósitos expandida: tabela
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
**Data**: 2026-08-04
