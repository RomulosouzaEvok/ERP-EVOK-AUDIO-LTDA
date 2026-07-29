# 📋 AUDITORIA COMPLETA — ERP EVOK ÁUDIO LTDA

**Auditor:** Lead Software Auditor & QA Specialist  
**Data:** 2026  
**Status:** 🔴 9 CRÍTICOS | 🟡 7 ALTOS | 🟢 4 MÉDIOS | 🔵 3 BAIXOS  
**Arquivos Auditados:** 50+ (22 controllers, 22 models, 6 services, 2 middlewares, config)

---

## 🔴 ITENS CRÍTICOS

### A01 — Assinatura incompatível: `bomController.create` vs `BomService.createBOM`
**Arquivo:** `server/src/controllers/bomController.ts:32-40`
**Problema:** Controller passa `items` e `user.id` como argumentos separados, mas service espera objeto único.
**Impacto:** BOM criada SEM componentes e SEM criador.

### A02 — `explodeBOM` recebe `bomId` em vez de `productId`
**Arquivo:** `server/src/controllers/bomController.ts:71-74`
**Problema:** Passa `req.params.id` (bom_id) como product_id.
**Impacto:** Explosão de BOM nunca encontra produto.

### A03 — `saleController` parâmetros invertidos no `InventoryService.consume`
**Arquivo:** `server/src/controllers/saleController.ts:72`
**Problema:** Transaction passada como userId.
**Impacto:** Estoque não baixado, transação falha.

### A04 — `productionOrder.updateStatus` sem transação e sem consumo de BOM
**Arquivo:** `server/src/controllers/productionOrderController.ts:88-97`
**Problema:** Não consome componentes da BOM, não usa transação, userId = null.
**Impacto:** Produto acabado nunca entra no estoque; componentes nunca baixados.

### A05 — `saleController.updateStatus` parâmetros invertidos
**Arquivo:** `server/src/controllers/saleController.ts:93`
**Problema:** Mesmo erro do A03 no cancelamento de venda.
**Impacto:** Estoque não restaurado ao cancelar venda.

### A06 — `productionOrder.updateStatus` com userId = null
**Arquivo:** `server/src/controllers/productionOrderController.ts:90`
**Problema:** `InventoryService.receive` recebe `null` como userId.
**Impacto:** Produto acabado não entra no estoque.

### A07 — Sem `serial_number`/`lot_number` para rastreabilidade
**Arquivo:** `server/src/models/Product.ts:60-80`
**Problema:** Modelo Product sem campos de lote/série.
**Impacto:** Impossível rastrear recall de lote.

### A08 — `tsconfig.json` exclui controllers e routes do typecheck
**Arquivo:** `server/tsconfig.json:19`
**Problema:** `"exclude": ["src/routes", "src/controllers"]`
**Impacto:** Erros de tipo nos controllers não são detectados.

### A09 — `uploadService.js` referencia `validateFileMagic` inexistente
**Arquivo:** `server/src/services/uploadService.js:136-155`
**Problema:** Chama função que não existe em validators.ts.
**Impacto:** Upload quebra em runtime.

---

## 🟡 ITENS ALTOS

### B01 — SQL Injection via `Op.like` em BOM search
**Arquivo:** `server/src/controllers/bomController.ts:12`

### B02 — `Op.like` sem sanitização em múltiplos controllers
**Arquivos:** clientController, productController, supplierController

### B03 — Nenhuma validação de payload com Zod/Joi
**Arquivo:** Global (22 controllers)

### B04 — `database.js` legado com MySQL ainda existe
**Arquivo:** `server/config/db.js`

### B05 — `due_date` obrigatório sem validação no controller de OP
**Arquivo:** `server/src/controllers/productionOrderController.ts:28`

### B06 — Remoção de OP não verifica vínculo com venda
**Arquivo:** `server/src/controllers/productionOrderController.ts:113-120`

### B07 — Sequelize `sync({ alter: true })` em risco de produção
**Arquivo:** `server/config/db.js:20`

---

## 🟢 ITENS MÉDIOS

### C01 — Estoque fracionado sem precisão DECIMAL
**Arquivo:** `server/src/models/Product.ts:68`

### C02 — `mongoose` instalado mas não utilizado
**Arquivo:** `server/package.json`

### C03 — Mix de CommonJS/ESM em arquivos `.ts`
**Arquivo:** Global

### C04 — `fromCents` com precisão冗余
**Arquivo:** `server/src/shared/utils/money.ts:33`

---

## 🔵 ITENS BAIXOS (CLEAN CODE)

### D01 — Constantes de status machine espalhadas
### D02 — Logs com `console.log` em vez de logger
### D03 — Arquivos `.js` legados vs `.ts` duplicados
