const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const inventoryController = require('../controllers/inventoryController');

router.get('/movements', authenticate, inventoryController.list);
router.get('/movements/:id', authenticate, inventoryController.getById);
router.post('/movements', authenticate, inventoryController.create);
router.get('/stock-report', authenticate, inventoryController.getStockReport);

module.exports = router;

