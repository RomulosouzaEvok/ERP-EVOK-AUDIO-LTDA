const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const mobileInventoryController = require('../controllers/mobileInventoryController');

/**
 * Rotas do módulo `mobileInventory` (Clean Architecture), montadas sob
 * `/api/mobile-inventory` em `server/app.ts`. Afeta estoque de verdade —
 * mesmo módulo de permissão de `/api/inventory/movements` (`estoque`).
 *
 * RETROFIT `authorizeModule('estoque')` (docs/governance/TODO.md, Bloco
 * 1.2 retrofit geral — substitui `authorize(role)` legado conforme decisão
 * de `docs/business/BUSINESS_RULES.md` §8): leituras exigem `view`
 * implicito, escritas exigem `operate`.
 */

router.post('/scan', authenticate, authorizeModule('estoque', 'operate'), mobileInventoryController.scanItem);
router.post('/batch', authenticate, authorizeModule('estoque', 'operate'), mobileInventoryController.batchScan);
router.get('/movements', authenticate, authorizeModule('estoque'), mobileInventoryController.listMovements);

module.exports = router;
