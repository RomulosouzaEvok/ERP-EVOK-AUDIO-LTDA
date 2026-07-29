# ✅ CHECKLIST DETALHADO DE CORREÇÕES — ERP EVOK ÁUDIO

**Ordenado por Criticidade** | **Total: 23 itens**

---

## 🔴 SPRINT 0 — CORREÇÕES CRÍTICAS (P0) — 2h

### [P0-A01] Corrigir assinatura do `bomController.create`
- [ ] `server/src/controllers/bomController.ts:32-40`
- [ ] Alterar de `BomService.createBOM({...}, items, userId)` para `BomService.createBOM({...items, created_by, ...})`
- [ ] Validar que a BOM salva tem `items` e `created_by`

### [P0-A02] Corrigir `explodeBOM` — busca product_id do banco
- [ ] `server/src/controllers/bomController.ts:71-74`
- [ ] Adicionar `const bom = await BillOfMaterial.findByPk(req.params.id)` antes de chamar
- [ ] Passar `bom.product_id` em vez de `req.params.id`

### [P0-A03] Corrigir parâmetros do `InventoryService.consume` no saleController
- [ ] `server/src/controllers/saleController.ts:72`
- [ ] Trocar ordem: `userId = req.user.id`, `transaction = t`, options no 5º param

### [P0-A04] Corrigir `productionOrder.updateStatus` (finalização)
- [ ] `server/src/controllers/productionOrderController.ts:88-97`
- [ ] Envolver em `sequelize.transaction()`
- [ ] Consumir componentes via `BomService.explodeBOM` + `InventoryService.consume`
- [ ] Usar `InventoryService.receive` com parâmetros corretos

### [P0-A05] Corrigir parâmetros do `InventoryService.receive` no cancelamento de venda
- [ ] `server/src/controllers/saleController.ts:93`

### [P0-A06] Corrigir `userId = null` na finalização da OP
- [ ] `server/src/controllers/productionOrderController.ts:90`
- [ ] Passar `req.user.id` como userId

### [P0-A08] Remover controllers e routes do exclude do tsconfig
- [ ] `server/tsconfig.json:19`
- [ ] Alterar `"exclude": ["node_modules", "dist", "src/routes", "src/controllers"]`
- [ ] Para `"exclude": ["node_modules", "dist"]`

### [P0-A09] Implementar `validateFileMagic` ou corrigir uploadService
- [ ] `server/src/utils/validators.ts` — adicionar função
- [ ] Ou `server/src/services/uploadService.js` — remover chamada inexistente

---

## 🔴 SPRINT 1 — RASTREABILIDADE E MODELAGEM (P1) — 6h

### [P1-A07] Adicionar campos de rastreabilidade ao Product
- [ ] `server/src/models/Product.ts`
- [ ] Adicionar `serial_number: STRING(50) unique`, `lot_number: STRING(50)`, `batch_id: INTEGER`, `manufacture_date: DATEONLY`, `expiry_date: DATEONLY`
- [ ] `server/src/controllers/productionOrderController.ts` — popular na finalização

### [P1-B05] Adicionar validação de `due_date` no controller de OP
- [ ] `server/src/controllers/productionOrderController.ts:28`
- [ ] Adicionar `if (!due_date) return res.status(400)...`

### [P1-B06] Bloquear remoção de OP com venda vinculada
- [ ] `server/src/controllers/productionOrderController.ts:113-120`
- [ ] Se `op.sales_order_id`, retornar erro 400

### [P1-B07] Remover `sync({ alter: true })` em produção
- [ ] `server/src/config/database.ts`
- [ ] Adicionar guardrail: `if (isProduction) { await sequelize.authenticate() } else { await sequelize.sync({ alter: true }) }`

---

## 🟡 SPRINT 2 — SEGURANÇA (P2) — 5h

### [P2-B01] Sanitizar `Op.like` no bomController
- [ ] `server/src/controllers/bomController.ts:12`
- [ ] `search.replace(/[%_]/g, '\\$&')`

### [P2-B02] Sanitizar `Op.like` em todos os controllers
- [ ] `server/src/controllers/clientController.ts`
- [ ] `server/src/controllers/productController.ts`
- [ ] `server/src/controllers/supplierController.ts`
- [ ] Demais controllers com busca

### [P2-B03] Implementar middleware de validação de payload
- [ ] `server/src/middlewares/validate.ts`
- [ ] Schema-based validation (Zod recomendado)
- [ ] Aplicar nas 22 rotas

### [P2-B04] Remover/desabilitar `server/config/db.js` legado
- [ ] `server/config/db.js`
- [ ] Opção: `mv db.js db.js.legacy` + `console.error('OBSOLETO')` + `process.exit(1)`

---

## 🟢 SPRINT 3 — MELHORIAS DE CÓDIGO (P3) — 3h

### [P3-C01] Alterar `quantity` para DECIMAL(12,4) no Product
- [ ] `server/src/models/Product.ts:68`
- [ ] Mudar de `DataTypes.INTEGER` para `DataTypes.DECIMAL(12,4)`

### [P3-C02] Remover `mongoose` do package.json
- [ ] `server/package.json`
- [ ] `npm uninstall mongoose --save`

### [P3-C04] Corrigir `fromCents`
- [ ] `server/src/shared/utils/money.ts:33`
- [ ] Simplificar para `return Math.round(cents) / 100`

---

## 🔵 SPRINT 4 — CLEAN CODE (P4) — 2h

### [P4-D01] Centralizar constantes de status machine
- [ ] `server/src/shared/utils/constants.ts`
- [ ] Extrair de controllers para constantes centralizadas

### [P4-D02] Implementar logger estruturado
- [ ] Criar `server/src/services/loggerService.ts`
- [ ] Winston ou Pino

### [P4-D03] Remover `.js` legados após validar `.ts`
- [ ] Verificar cada `.ts` compila e funciona
- [ ] Remover 44+ arquivos `.js` duplicados
