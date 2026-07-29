const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../../middlewares/auth');
const inventoryCountController = require('../controllers/inventoryCountController');

/**
 * Rotas do submódulo `inventory-counts` (Inventário Cíclico, Fase F09),
 * montadas sob o prefixo `/api/inventory-counts` em `server/index.ts`.
 * Todas as rotas exigem JWT válido (`authenticate`).
 */

router.post('/', authenticate, inventoryCountController.create);
router.get('/', authenticate, inventoryCountController.list);
router.get('/:id', authenticate, inventoryCountController.getById);
router.post('/:id/start', authenticate, inventoryCountController.start);
router.post('/:id/items/:itemId/count', authenticate, inventoryCountController.countItem);
router.post('/:id/submit', authenticate, inventoryCountController.submit);
router.post('/:id/approve', authenticate, inventoryCountController.approve);
router.post('/:id/reject', authenticate, inventoryCountController.reject);

module.exports = router;


