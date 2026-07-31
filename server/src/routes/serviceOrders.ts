const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../middlewares/auth');
const serviceOrderController = require('../controllers/serviceOrderController');

router.get('/', authenticate, serviceOrderController.list);
router.get('/:id', authenticate, serviceOrderController.getById);
router.post('/', authenticate, authorize('admin', 'operator'), serviceOrderController.create);
router.put('/:id', authenticate, authorize('admin', 'operator'), serviceOrderController.update);
router.delete('/:id', authenticate, authorize('admin'), serviceOrderController.remove);

module.exports = router;

