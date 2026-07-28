# TODO - PROJETO ERP EVOK ÁUDIO

---

## ✅ FASE 1, 2, 3 - Análise, Expansão e Segurança (COMPLETAS)

| Fase | Status | Descrição |
|------|--------|-----------|
| **Fase 1** | ✅ | 22 controllers, 18 models, 19 routes, 4 services analisados e corrigidos |
| **Fase 2** | ✅ | NonConformity, MaintenanceOrder, AuditLog (3 novos módulos) |
| **Fase 3** | ✅ | Validators (CPF/CNPJ), bugs críticos corrigidos, 31 issues documentados |

---

## ⚠️ FASE 4 - Correção de Bugs Críticos para Produção em Massa

### 🟢 Corrigidos (8 issues)

| # | Bug | Arquivos Corrigidos | Status |
|---|-----|---------------------|--------|
| F27 | **CPF/CNPJ sem validação real** | `clientController.js`, `supplierController.js`, `employeeController.js` | ✅ |
| F16 | **Error handler vaza stack trace** | `errorHandler.js` → sanitizado com msgs genéricas em produção | ✅ |
| F28 | **Upload path traversal + magic bytes** | `uploadService.js` → sanitização nome, validação magic bytes | ✅ |
| F25 | **LIKE injection nas buscas** | `validators.js` → sanitizeSearch() + sanitizeError() | ✅ |
| F26 | **Client remove sem verificar vendas** | `clientController.js` → bloqueio com vendas ativas | ✅ |
| L1 | **Missing rating field no update** | `supplierController.js` → campo `rating` adicionado | ✅ |
| — | **Documento armazenado formatado** | Todos 3 controllers → armazenam apenas números | ✅ |
| — | **Error messages vazando detalhes** | Todos 3 controllers → Validators.sanitizeError() | ✅ |

### 🟡 Em Andamento (próximas correções)

| # | Bug | Severidade | Impacto |
|---|-----|------------|---------|
| F10 | **Race condition no estoque** | 🔴 Crítico | Venda simultânea pode gerar estoque negativo |
| F20 | **AuditLog não integrado** | 🔴 Crítico | Sem rastreabilidade de alterações críticas |
| F21 | **AccountPayable gerado no recebimento** | ⚠️ Alto | Deveria ser na aprovação da compra |
| F24 | **Arredondamento parcelas impreciso** | ⚠️ Alto | Diferença de centavos nas parcelas |
| F22 | **Sem reserva de estoque** | ⚠️ Alto | Quotes reservam estoque sem baixar |
| F15 | **Depreciação de ativos automática** | 🟡 Médio | Valor contábil nunca atualiza |
| F19 | **sequelize.literal() nos controllers** | 🟡 Médio | Race condition via SQL direto |

---

## 📋 PRÓXIMAS CORREÇÕES PRIORIZADAS

### Prioridade 1 - Race Condition no Estoque (F10)
**Arquivos:** `saleController.js`, `purchaseController.js`, `inventoryController.js`

**Solução:** Substituir `sequelize.literal('quantity - X')` por `sequelize.increment()`/`decrement()` com transação serializável.

```javascript
// ANTES (race condition)
await Product.update(
  { quantity: sequelize.literal(`quantity - ${qty}`) },
  { where: { id: productId }, transaction: t }
);

// DEPOIS (thread-safe)
const product = await Product.findByPk(productId, { 
  transaction: t, 
  lock: t.LOCK.UPDATE 
});
if (product.quantity < qty) throw new Error('Estoque insuficiente');
await product.decrement('quantity', { by: qty, transaction: t });
```

### Prioridade 2 - AuditLog Integration (F20)
**Arquivos:** Todos os 22 controllers + `models/index.js`

Adicionar chamada `AuditLog.register()` em todas as operações de create, update, delete, status change.

### Prioridade 3 - AccountPayable na Aprovação (F21)
**Arquivo:** `purchaseController.js`

Mover geração de AccountPayable do `receiveItems` para `updateStatus` quando status = 'approved'.

### Prioridade 4 - Arredondamento Preciso (F24)
**Arquivo:** `saleController.js`

Usar `Math.round(value * 100) / 100` em todas as operações de parcelas, garantindo que a soma das parcelas = total líquido exato.

### Prioridade 5 - Sistema de Reserva de Estoque (F22)
**Arquivo:** `Product.js` model + `saleController.js`

- Criar campo `reserved_quantity` no Product
- Ao criar quote, incrementar reserved_quantity
- Ao confirmar, baixar de reserved_quantity e quantity
- Ao cancelar/devolver, decrementar reserved_quantity

---

## 🔧 MÓDULOS FUTUROS (Fase 5+)

| Módulo | Prioridade | Status |
|--------|------------|--------|
| **Frontend React** | Alta | 🔄 Planejado |
| **MRP Engine (BOM Explosion)** | Alta | 🔄 Planejado |
| **Migração PostgreSQL + Docker** | Alta | 🔄 Planejado |
| **Folha de Pagamento (Payroll)** | Média | 📝 Pendente |
| **NFe Integration** | Média | 📝 Pendente |
| **Logística/Expedição** | Média | 📝 Pendente |
| **Testes Automatizados (Jest)** | Média | 📝 Pendente |
| **CI/CD Pipeline** | Baixa | 📝 Pendente |

---

## 📊 RESUMO DO PROJETO

| Categoria | Total |
|-----------|-------|
| **Models** | 21 |
| **Controllers** | 25 |
| **Routes** | 22 |
| **Services** | 4 |
| **Middlewares** | 2 |
| **Utils** | 1 |
| **Documentos** | 30+ |
| **Arquivos** | ~80 |
| **Endpoints** | 80+ |
| **Bugs Críticos Corrigidos (Fase 4)** | **8/15** |

---

*Última atualização: Fase 4 - Correção de Bugs Críticos*
*8 de 15 bugs críticos corrigidos (53%)*
*Próximo alvo: Race condition no estoque*

