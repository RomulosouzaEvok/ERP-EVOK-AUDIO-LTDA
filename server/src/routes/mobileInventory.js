const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const mobileController = require('../controllers/mobileInventoryController');

// Rotas para App Mobile de Inventário
router.get('/scan', authenticate, mobileController.scanProduct);
router.post('/adjust', authenticate, mobileController.quickAdjust);
router.post('/batch', authenticate, mobileController.batchScan);
router.get('/by-location', authenticate, mobileController.inventoryByLocation);
router.get('/history', authenticate, mobileController.productHistory);

module.exports = router;

