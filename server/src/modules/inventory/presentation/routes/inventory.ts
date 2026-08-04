const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const inventoryController = require('../controllers/inventoryController');

/**
 * Rotas do módulo `inventory` (Clean Architecture). Mantém exatamente o
 * mesmo contrato dos endpoints anteriores de `server/src/routes/inventory.ts`
 * (mesmos paths, métodos e formato de resposta), agora montado sob o mesmo
 * prefixo `/api/inventory` em `server/index.ts`, e acrescenta o novo
 * endpoint aditivo `GET /low-stock`.
 *
 * RETROFIT `authorizeModule('estoque')` (docs/governance/TODO.md, Bloco
 * 1.2 retrofit geral — substitui `authorize(role)` legado conforme decisão
 * de `docs/business/BUSINESS_RULES.md` §8): leituras exigem `view`
 * implicito, escritas comuns exigem `operate`. Liberar (`release`) e
 * bloquear (`block`) um lote são ações de aprovação/gestão da área de
 * Qualidade (UC-37 "Qualidade libera lote que o Recebimento criou" —
 * módulo dono da ação diferente do módulo de origem do dado, ver
 * `BUSINESS_RULES.md` §4) e exigem `authorizeModule('qualidade','approve')`.
 */

router.get('/movements', authenticate, authorizeModule('estoque'), inventoryController.list);
router.get('/movements/:id', authenticate, authorizeModule('estoque'), inventoryController.getById);
router.post('/movements', authenticate, authorizeModule('estoque', 'operate'), inventoryController.create);
router.get('/stock-report', authenticate, authorizeModule('estoque'), inventoryController.getStockReport);
router.get('/low-stock', authenticate, authorizeModule('estoque'), inventoryController.listLowStock);
router.get('/lots', authenticate, authorizeModule('estoque'), inventoryController.listLots);
router.post('/lots/:id/release', authenticate, authorizeModule('qualidade', 'approve'), inventoryController.releaseLot);
router.post('/lots/:id/block', authenticate, authorizeModule('qualidade', 'approve'), inventoryController.blockLot);

// Multiplos Depositos (Bloco 4, UC-42, BUSINESS_RULES.md §12).
router.get('/warehouses', authenticate, authorizeModule('estoque'), inventoryController.listWarehouses);
router.get('/warehouse-stock', authenticate, authorizeModule('estoque'), inventoryController.listWarehouseStock);
router.get('/transfers', authenticate, authorizeModule('estoque'), inventoryController.listTransfers);
router.post('/transfers', authenticate, authorizeModule('estoque', 'operate'), inventoryController.createTransfer);
router.put('/transfers/:id/approve', authenticate, authorizeModule('estoque', 'approve'), inventoryController.approveTransfer);
router.put('/transfers/:id/reject', authenticate, authorizeModule('estoque', 'approve'), inventoryController.rejectTransfer);

module.exports = router;


