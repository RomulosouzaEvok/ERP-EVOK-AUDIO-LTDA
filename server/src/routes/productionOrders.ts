const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../middlewares/auth');
const productionOrderController = require('../controllers/productionOrderController');

router.get('/', authenticate, productionOrderController.list);
router.get('/report', authenticate, productionOrderController.report);
router.get('/:id', authenticate, productionOrderController.getById);
router.post('/', authenticate, authorize('admin', 'operator'), productionOrderController.create);
router.put('/:id', authenticate, productionOrderController.update);
router.put('/:id/status', authenticate, productionOrderController.updateStatus);
router.delete('/:id', authenticate, authorize('admin'), productionOrderController.remove);

module.exports = router;

