const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const serviceOrderController = require('../controllers/serviceOrderController');

router.get('/', authenticate, serviceOrderController.list);
router.get('/report', authenticate, serviceOrderController.getServiceReport);
router.get('/:id', authenticate, serviceOrderController.getById);
router.post('/', authenticate, serviceOrderController.create);
router.put('/:id', authenticate, serviceOrderController.update);
router.put('/:id/status', authenticate, serviceOrderController.updateStatus);
router.post('/:id/parts', authenticate, serviceOrderController.addPart);
router.delete('/:id', authenticate, serviceOrderController.remove);

module.exports = router;
