const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const purchaseRequisitionController = require('../controllers/purchaseRequisitionController');

router.get('/', authenticate, purchaseRequisitionController.list);
router.get('/:id', authenticate, purchaseRequisitionController.getById);
router.post('/', authenticate, authorize('admin', 'operator'), purchaseRequisitionController.create);
router.patch('/:id/status', authenticate, purchaseRequisitionController.changeStatus);

module.exports = router;

