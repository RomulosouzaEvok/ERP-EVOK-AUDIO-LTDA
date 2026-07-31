const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../middlewares/auth');
const maintenanceController = require('../controllers/maintenanceController');

router.get('/', authenticate, maintenanceController.list);
router.get('/:id', authenticate, maintenanceController.getById);
router.post('/', authenticate, authorize('admin', 'operator'), maintenanceController.create);
router.put('/:id', authenticate, authorize('admin', 'operator'), maintenanceController.update);
router.delete('/:id', authenticate, authorize('admin'), maintenanceController.remove);

module.exports = router;

