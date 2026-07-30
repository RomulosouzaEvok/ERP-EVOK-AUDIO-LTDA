# Fase 5 — Migração de Módulos de Aplicação (Item/ItemEstrutura)

**Data**: 2026-07-30  
**Escopo**: Reescrever 8 módulos para usar `item_id` (UUID) em vez de `product_id` (INTEGER)  
**Estimativa**: 3-4 semanas (work-in-progress)  
**Status**: 🔍 Exploração em andamento

---

## Contexto

Após Fase 2 (backfill completo) e Fase 4 (expand-contract nas 16 tabelas), os módulos de aplicação ainda usam `product_id` em suas queries, DTOs, use-cases e controllers. Fase 5 reescreve a lógica de negócio de cada módulo.

---

## Módulos a Migrar (Ordem Sugerida)

### 1. **Suppliers** (Fornecedores) — LOW ⏳ ~2-3 dias
   - **Por quê primeiro?** Independente de outros; dados estáticos
   - **Arquivos**: `SequelizeSuppliersRepository.ts`, `SupplierEntity.ts`
   - **Mudanças**: Manter supplier como-é (fornecedores não migram), mas queries podem precisar ajustes
   - **Teste**: Listar fornecedores, criar/atualizar, desativar
   - **Risco**: BAIXO

### 2. **Purchases** (Compras) — HIGH ⏳ ~5-7 dias
   - **Por quê?** Alimenta inventory; precisa ser sólido antes de inventory
   - **Arquivos**: `SequelizePurchaseRepository.ts`, `CreatePurchaseUseCase.ts`, `ReceivePurchaseItemsUseCase.ts`
   - **Mudanças**:
     - `purchase_items.product_id` → `item_id` (foi feito em Fase 4, agora ajustar queries)
     - `PurchaseItemDTO.product_id` → `item_id`
     - `CreatePurchaseUseCase`: validar se item existe (não product)
     - `ReceivePurchaseItemsUseCase`: criar LotControl via Item, não Product
   - **Tabelas afetadas**: `purchases`, `purchase_items`, `inventory_movements`
   - **Dependências**: `suppliers`, `items` (novo), `lotControl` (novo)
   - **Teste**: Criar compra → receber item → gerar lote
   - **Risco**: ALTO (toca estoque e rastreabilidade)

### 3. **Inventory** (Estoque) — HIGH ⏳ ~5-7 dias
   - **Por quê?** Core do sistema; usado por todos
   - **Arquivos**: `SequelizeInventoryRepository.ts`, `InventoryService.ts`, `CreateInventoryCountUseCase.ts`, `GetStockReportUseCase.ts`
   - **Mudanças**:
     - `inventory_movements.product_id` → `item_id`
     - `inventory_counts.product_id` → `item_id`
     - `InventoryService.adjust()`: validar item_id ao invés de product_id
     - Queries de estoque: buscar por `item_id`
   - **Tabelas afetadas**: `inventory_movements`, `inventory_counts`, `inventory_count_items`
   - **Dependências**: `items` (novo), `purchases`, `sales`, `production`
   - **Teste**: Consultar estoque → ajustar → gerar relatório
   - **Risco**: ALTO (crítico para MRP)

### 4. **Sales** (Vendas) — HIGH ⏳ ~5-7 dias
   - **Por quê?** Paralelo a purchases; alimenta estoque e custos
   - **Arquivos**: `SequelizeSaleRepository.ts`, `CreateSaleUseCase.ts`, `ChangeSaleStatusUseCase.ts`
   - **Mudanças**:
     - `sale_items.product_id` → `item_id`
     - `SaleItemDTO.product_id` → `item_id`
     - Validar item ao criar venda (não product)
     - Calcular preço via `ItemDetalheComercial.preco_venda`
   - **Tabelas afetadas**: `sales`, `sale_items`, `inventory_movements`
   - **Dependências**: `items`, `inventory`, `customers`
   - **Teste**: Criar venda → mudar status → descontar estoque
   - **Risco**: ALTO (financeiro + estoque)

### 5. **Production** (Produção) — CRITICAL ⏳ ~7-10 dias
   - **Por quê?** Mais complexo; usa BOM (ItemEstrutura agora)
   - **Arquivos**: `SequelizeProductionOrderRepository.ts`, `ChangeProductionOrderStatusUseCase.ts`, `CreateProductionOrderUseCase.ts`
   - **Mudanças**:
     - `production_orders.product_id` → `item_id` (produto acabado que será produzido)
     - `production_lot_consumptions.product_id` → `item_id` (insumos consumidos)
     - `production_routes.product_id` → `item_id` (roteiro de produção)
     - Explodir BOM via `ExplodeItemStructureUseCase` (não `BomService`)
     - Validar disponibilidade via `ItemEstrutura` (não `BillOfMaterial`)
     - Registrar consumo via `Item` + `InventoryService`
     - Gerar `LotControl` para produto acabado
   - **Tabelas afetadas**: `production_orders`, `production_lot_consumptions`, `production_routes`, `lot_controls`, `serial_numbers`
   - **Dependências**: `items`, `item_estruturas`, `inventory`, `lot_controls`, `serial_numbers`
   - **Teste**: Criar OP → reservar insumos → consumir → gerar lote → marcar serials
   - **Risco**: CRÍTICO (explosão de BOM, rastreabilidade, custo)

### 6. **Traceability** (Rastreabilidade) — MEDIUM ⏳ ~3-5 dias
   - **Por quê?** Lê dados (não escreve); depende de Production e Purchases
   - **Arquivos**: `SequelizeTraceabilityRepository.ts`, `GetItemTraceabilityUseCase.ts`, `GetLotTraceabilityUseCase.ts`, `GetProductionOrderTraceabilityUseCase.ts`
   - **Mudanças**:
     - Queries consultam `item_id` em `inventory_movements`, `lot_controls`, `production_lot_consumptions`
     - Retornar dados de `Item` + `ItemDetalheComercial` (não Product)
   - **Tabelas afetadas**: `lot_controls`, `serial_numbers`, `inventory_movements`, `production_lot_consumptions`
   - **Dependências**: `items`, `lot_controls`, `serial_numbers`
   - **Teste**: Rastrear item → listar lotes → listar serials
   - **Risco**: MÉDIO (read-only)

### 7. **BOM** (Estrutura do Produto) — LOW ⏳ ~2-3 dias
   - **Por quê?** Será deprecado (lógica move para ItemEstrutura); apenas cleanup
   - **Arquivos**: `BomService.ts`, `ExplodeItemStructureUseCase.ts`
   - **Mudanças**:
     - `BomService` continua existindo (para compatibilidade), mas chama `ExplodeItemStructureUseCase`
     - `ExplodeItemStructureUseCase`: já usa `ItemEstrutura` (não mudança necessária)
     - Deprecar `bomController.ts` (legacy endpoints)
   - **Tabelas afetadas**: Nenhuma (leitura em `item_estruturas`)
   - **Dependências**: `items`, `item_estruturas`
   - **Teste**: Explodir BOM → validar estrutura
   - **Risco**: BAIXO (já migrado em Fase 2C)

### 8. **Products** (Produtos - Deprecação) — MEDIUM ⏳ ~3-5 dias
   - **Por quê?** Legacy; apenas cleanup (controllers retornam Item)
   - **Arquivos**: `productController.ts`, `ProductEntity.ts`, `SequelizeProductRepository.ts`
   - **Mudanças**:
     - `GET /api/products/:id` → redireciona para `/api/items/:id` ou retorna Item
     - `POST /api/products` → bloqueado (criar via Item)
     - `ThieleSmallParams.ts`: move de Product para `ItemEspecificacaoTecnica`
     - Controllers: listar products → listar items
   - **Tabelas afetadas**: `products` (apenas leitura de crosswalk)
   - **Dependências**: `items`, `item_detalhes_comerciais`, `item_especificacoes_tecnicas`
   - **Teste**: GET products retorna items; POST bloqueado
   - **Risco**: MÉDIO (compatibilidade com clientes legados)

---

## Ordem de Execução Recomendada

```
1. Suppliers ─────────────┐
                          ├─→ Purchases ───┐
2. Inventory ────────────┬┤                ├─→ Production ─────┐
                         ├─→ Sales ────────┤                   ├─→ Traceability → BOM → Products
                                           ├─→ (insumos OK) ───┘
```

**Sequencial** (não paralelo) porque cada módulo depende do anterior:
- Purchases precisa de Inventory (criar movements)
- Sales precisa de Inventory (descontar estoque)
- Production precisa de Inventory + Purchases (insumos) + Sales (demanda)
- Traceability depende de Production (rastreabilidade)

---

## Por Módulo: Checklist de Migração

### Template para cada módulo:

```markdown
## Módulo: XXX

### 1. Arquivos a Modificar
- [ ] SequelizeXXXRepository.ts — queries `product_id` → `item_id`
- [ ] CreateXXXUseCase.ts — validação de item
- [ ] XXXEntity.ts — DTO com `item_id`
- [ ] XXXController.ts — request/response payloads

### 2. Tabelas Afetadas
- `table1`: `product_id` → `item_id` (feito em Fase 4, validar)
- `table2`: updates nas queries

### 3. Testes
- [ ] CRUD básico (create, read, update)
- [ ] Dependências (ex: Purchase → Inventory)
- [ ] Edge cases (null items, inactive items)
- [ ] Integração com MRP

### 4. Validação Pós-Migração
- [ ] Sem "Product" em queries (grep por 'product_id')
- [ ] Crosswalk usado corretamente (migracao_product_item_map)
- [ ] Sem regressões em testes existentes
```

---

## Risks e Mitigations

| Risco | Módulo | Mitigação |
|-------|--------|-----------|
| Estoque inconsistente | Inventory, Purchases, Sales | Snapshot de estoque antes/depois; testes de integração |
| BOM quebrada | Production | Validar ItemEstrutura.check_cycles antes de criar OP |
| Rastreabilidade perdida | Traceability, Production | Manter audit tables (migracao_bom_log, etc.) |
| Clientes legados quebram | Products | Manter compatibilidade 6 meses (redirect endpoints) |
| MRP usa produto errado | Production, Inventory | Testar mrpEngine.ts com Item, não Product |

---

## Definition of Done (por módulo)

- ✅ Todos os arquivos usam `item_id` (não `product_id`)
- ✅ Nenhum `product_id` em queries (validado via grep)
- ✅ Testes unitários passam
- ✅ Testes de integração passam
- ✅ Nenhuma regressão em features existentes
- ✅ DTOs, payloads atualizados
- ✅ Documentação atualizada (HANDOFF_CODEX.md)
- ✅ Commit limpo com message descritiva

---

## Timeline Realista

- **Semana 1**: Suppliers + Purchases (HIGH risk, comece aqui)
- **Semana 2**: Inventory + Sales (cores do sistema)
- **Semana 3**: Production (CRÍTICO, mais testes)
- **Semana 4**: Traceability + BOM + Products (cleanup)

**Parallelização possível**: Inventory e Sales podem rodar em paralelo se você tiver 2 devs.

---

## Próximos Passos

1. ✅ Esperar resultado da exploração (mapeamento de módulos)
2. ⏳ Escolher primeiro módulo (Suppliers recomendado)
3. ⏳ Criar plano detalhado por módulo (arquivos exatos, linhas)
4. ⏳ Executar um módulo por vez, com testes
5. ⏳ Integração e validação pós-Fase-5

---

**Responsável**: Backend Engineer  
**Aprovação**: CTO / Tech Lead  
**Revisão**: DevSecOps (Codex)

