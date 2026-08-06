# 🎯 Plano de Implementação — 4 Bloqueadores Críticos
**Versão 1.0** | **Escopo:** 30h | **Go-Live G6**

---

## 📊 Matriz de Implementação

| # | Bloqueador | PR | Arquivos Afetados | O que Muda | Dependências | Tempo | Teste Crítico |
|---|---|---|---|---|---|---|---|
| **1.1** | Requisição de Compra inexistente | `feat/purchase-requisition` | `server/src/modules/purchases/application/use-cases/CreatePurchaseRequisitionUseCase.ts`, `server/src/modules/purchases/infrastructure/sequelize/SequelizePurchaseRequisitionRepository.ts`, `server/src/modules/purchases/domain/entities/PurchaseRequisitionEntity.ts`, `server/src/models/PurchaseRequisition.ts`, `server/src/routes/api/purchases.ts` | Novo modelo Sequelize `PurchaseRequisition` com FK de item + usuário solicitante. Cria tabela canônica `requisicoes_compra` e `requisicao_compra_items`. Requisição origina compra via use-case dedicado. Auditoria automática via `AuditLog`. MRP referencia requisição como origem. | Nenhuma (base) | 8h | Criar requisição → verificar que `requisicao_compra_items` tem `item_id` NOT NULL e `requisicao_id` FK restrita |
| **1.2** | MRP usa estoque congelado | `feat/mrp-live-inventory` | `server/src/modules/mrp/application/use-cases/CalculateMrpUseCase.ts`, `server/src/modules/inventory/application/use-cases/GetRealInventoryUseCase.ts`, `server/src/modules/items/application/use-cases/RefreshItemEstoqueUseCase.ts`, `server/src/models/Item.ts`, `server/src/models/MrpOrdemPlanejada.ts` | MRP lê `estoque_disponivel = items.estoque_atual - items.estoque_reservado` (não coluna congelada). Netting por nível de BOM: só aloca MPs se `quantidade_necessaria > estoque_disponivel`. Query transacional usa LOCK IN SHARE MODE em `items` durante cálculo. Reserva criada via `movimentos_estoque` tipo `RESERVA`. | 2.1 (requer FK de reserva) | 6h | Executar MRP → verificar que MP com estoque suficiente NÃO é requisitada; que `necessidade_liquida = necessidade_bruta - estoque_disponivel` |
| **2.1** | 37 tabelas SEM FKs estruturais | `fix/add-missing-foreign-keys` | `server/database/postgresql/02_add_missing_fks_migration.sql`, `server/src/models/[7 arquivos]`, `server/src/config/database.ts` (assoc.), Testes em `__tests__/integration/fk-integrity.test.ts` | Adicionar 18 FKs faltantes (ex: `production_orders → item_id`, `account_payable → purchase_id`, `movement → item_id`). Cascata DELETE/RESTRICT conforme auditoria. Testes verificam orfandade. Seed preparado sem FKs temporariamente mantido. | Nenhuma (estrutural) | 4h | Inserir OP sem item → erro FK; deletar item com OP ativa → erro RESTRICT; deletar compra → cascata DELETE em payable |
| **3.1** | IDOR: usuários acessam outras empresas | `fix/tenant-isolation-idor` | `server/src/middlewares/auth.ts`, `server/src/modules/purchases/presentation/controllers/PurchaseController.ts`, `server/src/modules/production/presentation/controllers/ProductionOrderController.ts`, `server/src/shared/validators/TenantIsolationValidator.ts`, `__tests__/unit/middlewares/auth.test.ts` | Middleware `auth.ts` extrai `company_id` de JWT e injeta em `requestContext`. Todos os controllers GET/PUT/DELETE validam `resource.company_id === requestContext.company_id` via `TenantIsolationValidator.assertOwnership()`. List queries filtram `WHERE company_id = ?`. Auditoria registra tentativas negadas. | Nenhuma | 3h | Logar como User_A, tentar acessar recurso de User_B (diferente company) → 403 Forbidden; log de auditoria gerado |

---

## 🔄 Ordem de Merge Recomendada

### **Fase 1A: Estrutura (Bloqueador 2.1)**
```
1. fix/add-missing-foreign-keys (4h)
   └─ Adiciona FKs estruturais a 37 tabelas
   └─ Bloqueador de integridade: sem isso, P1 falha
```

### **Fase 1B: Segurança (Bloqueador 3.1)**
```
2. fix/tenant-isolation-idor (3h)
   └─ Middleware de validação company_id
   └─ PARALELO com 1A (não há deps)
```

### **Fase 1C: Negócio (Bloqueadores 1.1 + 1.2)**
```
3. feat/purchase-requisition (8h)
   ├─ Depende de: ✅ Bloqueador 2.1 (FKs)
   └─ Habilita rastreabilidade P0 de MRP
   
4. feat/mrp-live-inventory (6h)
   ├─ Depende de: ✅ Bloqueador 2.1 (FKs) + ✅ Bloqueador 1.1 (requisição como origem)
   └─ Corrige netting de estoque
```

### **Sequência de Merge (Git Flow)**
```bash
# Paralelo (Fase 1A + 1B — 1h cada, 2h wall-clock)
git push origin fix/add-missing-foreign-keys
git push origin fix/tenant-isolation-idor
# ↓ Aguardar CI/CD + review (2h-3h)

# Sequencial após Fase 1 (Fase 1C — 8h + 6h = 14h)
git push origin feat/purchase-requisition  # aguarda 2.1 merged
git push origin feat/mrp-live-inventory     # aguarda 1.1 merged
```

**Wall-clock total:** ~7-8 dias (reviews + CI/CD + hotfixes)

---

## 📋 Dependências Detalhadas

| PR | Bloqueador | Bloqueia | Pré-req |
|---|---|---|---|
| 2.1 | FKs | 1.1, 1.2, 3.1 | Nenhum |
| 3.1 | IDOR | Produção segura | Nenhum |
| 1.1 | Req. Compra | 1.2 (origem), auditoria | 2.1 ✅ |
| 1.2 | MRP real | Go-Live | 2.1 ✅ + 1.1 ✅ |

---

## 🧪 Casos de Teste Críticos por Bloqueador

### 2.1 — Foreign Keys
```javascript
// ✅ DEVE FALHAR (RESTRICT)
await ProductionOrder.create({
  item_id: null,  // NOT NULL
  quantidade_planejada: 100
}); // → SequelizeValidationError

// ✅ DEVE FALHAR (FK violation)
await ProductionOrder.create({
  item_id: '00000000-0000-0000-0000-000000000000', // UUID não existe
  quantidade_planejada: 100
}); // → SequelizeConstraintError

// ✅ DEVE DELETAR em cascata
await Purchase.destroy({ where: { id } });
const orphanedPayables = await AccountPayable.findAll({
  where: { purchase_id: id }
});
expect(orphanedPayables).toHaveLength(0); // Cascata funcionou
```

### 3.1 — Tenant Isolation (IDOR)
```javascript
// ✅ DEVE FALHAR (403 Forbidden)
const user_A = { id: '1', company_id: 'EMPRESA_A' };
const purchase_B = { id: '1', company_id: 'EMPRESA_B' };

const res = await GET('/purchases/1', {
  headers: { Authorization: `Bearer ${jwt_user_A}` }
});
expect(res.status).toBe(403);
expect(auditLog).toContainEqual({
  acao: 'TENTATIVA_ACESSO_NEGADO_TENANT',
  entidade_id: purchase_B.id
});
```

### 1.1 — Purchase Requisition
```javascript
// ✅ CRIAR requisição com itens rastreados
const req = await CreatePurchaseRequisition.execute({
  solicitante_id: user.id,
  items: [{ item_id, quantidade: 10, data_necessidade }]
});
expect(req.codigo).toMatch(/^REQ-\d{8}/); // Sequência
expect(await AuditLog.count({
  where: { entidade: 'requisicoes_compra', entidade_id: req.id }
})).toBeGreaterThan(0);
```

### 1.2 — MRP Live Inventory
```javascript
// ✅ MRP NÃO requisita se estoque suficiente
const item = await Item.create({
  estoque_atual: 100,
  estoque_reservado: 20,
  // estoque_disponível = 80
});
const mrp = await CalculateMrp.execute({
  necessidade_bruta: 50  // < 80
});
expect(mrp.ordens).toHaveLength(0); // Nenhuma requisição
expect(item.necessidade_liquida).toBe(0);

// ✅ Reserva é registrada como movimento
const reservation = await InventoryMovement.findOne({
  where: { tipo: 'RESERVA', item_id }
});
expect(reservation).toBeDefined();
```

---

## 📦 Arquivos de Migração (Seqüência)

1. **Bloqueador 2.1:**
   ```sql
   server/database/postgresql/02_add_missing_fks_migration.sql
   -- ALTER TABLE production_orders ADD CONSTRAINT fk_po_item
   --   FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT;
   -- [+ 17 mais]
   ```

2. **Bloqueador 1.1:**
   ```sql
   -- Já existe em 01_schema.sql (requisicoes_compra, requisicao_compra_items)
   -- Apenas criar indices:
   -- CREATE INDEX idx_req_solicitante ON requisicoes_compra(solicitante_id);
   -- CREATE INDEX idx_req_status ON requisicoes_compra(status);
   ```

3. **Bloqueador 1.2:**
   ```sql
   -- ALTER TABLE items ADD COLUMN estoque_congelado NUMERIC(18,6) DEFAULT 0;
   -- UPDATE items SET estoque_congelado = estoque_atual;
   -- Migração reversa: deletar coluna após MRP live
   ```

---

## 🎬 Checklist de Implementação

### Bloqueador 2.1 — FKs
- [ ] Executar migration SQL (02_add_missing_fks_migration.sql)
- [ ] Atualizar modelos Sequelize com `foreignKey` + `onDelete`
- [ ] Testes de integridade referencial (`__tests__/integration/fk-integrity.test.ts`)
- [ ] CI/CD valida schema com `psql -d erp_evok -f 01_schema.sql`

### Bloqueador 3.1 — IDOR
- [ ] Parsear `company_id` em `auth.ts` (JWT claim)
- [ ] Implementar `TenantIsolationValidator.assertOwnership()`
- [ ] Auditar todos controllers GET/:id, PUT/:id, DELETE/:id
- [ ] Testes unitários de auth (+ integração)

### Bloqueador 1.1 — Purchase Requisition
- [ ] Criar modelo + repository + use-cases
- [ ] Endpoint POST /requisicoes-compra (criar)
- [ ] Endpoint GET /requisicoes-compra/:id (detalhes rastreados)
- [ ] Auditoria automática em AuditLog

### Bloqueador 1.2 — MRP Live Inventory
- [ ] Atualizar `CalculateMrpUseCase` com netting por nível
- [ ] Query transacional com LOCK IN SHARE MODE
- [ ] Reservas via `InventoryMovement` tipo RESERVA
- [ ] Testes de edge case (estoque insuficiente, múltiplas requisições)

---

## 📈 Estimativa Revisada

| Bloqueador | Tempo Original | Tempo Revisado | Motivo |
|---|---|---|---|
| 2.1 | 4h | **4h** | Apenas SQL + modelo; CI valida |
| 3.1 | 3h | **3h** | Middleware simples; TenantValidator genérico |
| 1.1 | 8h | **8h** | Novo módulo completo + auditoria |
| 1.2 | 6h | **6h** | Refactor de lógica existente + testes |
| **Total P0** | **30h** | **30h** | ✅ Mantido |

---

## 🚀 Triggers de Ação

**Antes de Merge:**
- [ ] Cada PR com 2+ aprovações
- [ ] CI/CD 100% green (testes + linting + SAST)
- [ ] Go-Live readiness checklist assinado (CTO/CFO)

**Após Go-Live G6:**
- [ ] Backlog P1 (TypeScript strict, desacoplamento Sequelize, BOM transação)
- [ ] Monitoramento de auditoria (TenantIsolation denies)
- [ ] Runbook: rollback MRP em <5min se necessário

---

**Próximo passo:** Sincronizar com PMs; iniciar 2.1 + 3.1 em paralelo. Bloqueadores não impedem paralelo após estrutura (2.1) estar pronta.
