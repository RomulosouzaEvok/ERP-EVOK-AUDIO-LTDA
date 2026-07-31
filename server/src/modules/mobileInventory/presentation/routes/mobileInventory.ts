const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const mobileInventoryController = require('../controllers/mobileInventoryController');

/**
 * Rotas do módulo `mobileInventory` (Clean Architecture), montadas sob
 * `/api/mobile-inventory` em `server/app.ts`. Mantém exatamente o mesmo
 * RBAC do roteador legado (`server/src/routes/mobileInventory.ts`). Afeta
 * estoque de verdade - mesmo RBAC de `/api/inventory/movements`.
 */

router.post('/scan', authenticate, authorize('admin', 'operator'), mobileInventoryController.scanItem);
router.post('/batch', authenticate, authorize('admin', 'operator'), mobileInventoryController.batchScan);
router.get('/movements', authenticate, mobileInventoryController.listMovements);

module.exports = router;
