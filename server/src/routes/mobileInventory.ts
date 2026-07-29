const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middlewares/auth');
const mobileInventoryController = require('../controllers/mobileInventoryController');

router.post('/scan', authenticate, mobileInventoryController.scanItem);
router.post('/batch', authenticate, mobileInventoryController.batchScan);
router.get('/movements', authenticate, mobileInventoryController.listMovements);

module.exports = router;

