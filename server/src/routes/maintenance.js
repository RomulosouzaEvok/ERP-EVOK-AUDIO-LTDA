const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const authz = require('../middlewares/auth').authorize;
const maintenanceController = require('../controllers/maintenanceController');

router.get('/', auth, maintenanceController.list);
router.get('/schedule', auth, maintenanceController.getSchedule);
router.get('/report', auth, maintenanceController.getReport);
router.get('/:id', auth, maintenanceController.getById);
router.post('/', auth, maintenanceController.create);
router.put('/:id', auth, maintenanceController.update);
router.patch('/:id/status', auth, maintenanceController.updateStatus);
router.delete('/:id', auth, authz('admin'), maintenanceController.remove);

module.exports = router;

