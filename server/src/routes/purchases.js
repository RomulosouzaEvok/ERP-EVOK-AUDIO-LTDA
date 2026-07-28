const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const purchaseController = require('../controllers/purchaseController');

router.get('/', authenticate, purchaseController.list);
router.get('/:id', authenticate, purchaseController.getById);
router.post('/', authenticate, purchaseController.create);
router.put('/:id', authenticate, purchaseController.update);
router.put('/:id/status', authenticate, purchaseController.updateStatus);
router.post('/:id/receive', authenticate, purchaseController.receiveItems);

module.exports = router;
