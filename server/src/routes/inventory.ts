const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middlewares/auth');
const inventoryController = require('../controllers/inventoryController');

router.get('/movements', authenticate, inventoryController.listMovements);
router.get('/movements/:id', authenticate, inventoryController.getMovementById);
router.post('/movements', authenticate, inventoryController.createMovement);
router.get('/stock-report', authenticate, inventoryController.stockReport);
router.get('/low-stock', authenticate, inventoryController.lowStock);

module.exports = router;

