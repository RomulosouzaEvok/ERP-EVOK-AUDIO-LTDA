const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middlewares/auth');
const saleController = require('../controllers/saleController');

router.get('/', authenticate, saleController.list);
router.get('/:id', authenticate, saleController.getById);
router.post('/', authenticate, saleController.create);
router.put('/:id/status', authenticate, saleController.updateStatus);

module.exports = router;

