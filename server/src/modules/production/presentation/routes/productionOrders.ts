/**
 * Rotas do modulo production.
 *
 * @module modules/production/presentation/routes/productionOrders
 */

import express = require('express');
const { authenticate, authorize }: any = require('../../../../middlewares/auth');
const productionOrderController: any = require('../controllers/productionOrderController');

const router = express.Router();

router.get('/', authenticate, productionOrderController.list);
router.get('/report', authenticate, productionOrderController.getProductionReport);
router.post('/tracking/:trackingId/start', authenticate, authorize('admin', 'operator'), productionOrderController.startTracking);
router.post('/tracking/:trackingId/complete', authenticate, authorize('admin', 'operator'), productionOrderController.completeTracking);
router.get('/:id/tracking', authenticate, productionOrderController.listTracking);
router.post('/:id/tracking', authenticate, authorize('admin', 'operator'), productionOrderController.createTracking);
router.get('/:id', authenticate, productionOrderController.getById);
router.post('/', authenticate, authorize('admin', 'operator'), productionOrderController.create);
router.put('/:id', authenticate, authorize('admin', 'operator'), productionOrderController.update);
router.put('/:id/status', authenticate, authorize('admin', 'operator'), productionOrderController.updateStatus);
router.delete('/:id', authenticate, authorize('admin'), productionOrderController.remove);

export = router;
