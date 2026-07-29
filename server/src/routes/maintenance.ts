const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middlewares/auth');
const maintenanceController = require('../controllers/maintenanceController');

router.get('/', authenticate, maintenanceController.list);
router.get('/:id', authenticate, maintenanceController.getById);
router.post('/', authenticate, maintenanceController.create);
router.put('/:id', authenticate, maintenanceController.update);
router.delete('/:id', authenticate, maintenanceController.remove);

module.exports = router;

