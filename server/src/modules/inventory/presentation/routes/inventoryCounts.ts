const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const inventoryCountController = require('../controllers/inventoryCountController');

/**
 * Rotas do submódulo `inventory-counts` (Inventário Cíclico, Fase F09),
 * montadas sob o prefixo `/api/inventory-counts` em `server/index.ts`.
 * Todas as rotas exigem JWT válido (`authenticate`).
 */

router.post('/', authenticate, authorize('admin', 'operator'), inventoryCountController.create);
router.get('/', authenticate, inventoryCountController.list);
router.get('/:id', authenticate, inventoryCountController.getById);
router.post('/:id/start', authenticate, authorize('admin', 'operator'), inventoryCountController.start);
router.post('/:id/items/:itemId/count', authenticate, authorize('admin', 'operator'), inventoryCountController.countItem);
router.post('/:id/submit', authenticate, authorize('admin', 'operator'), inventoryCountController.submit);
router.post('/:id/approve', authenticate, authorize('admin'), inventoryCountController.approve);
router.post('/:id/reject', authenticate, authorize('admin'), inventoryCountController.reject);

module.exports = router;


