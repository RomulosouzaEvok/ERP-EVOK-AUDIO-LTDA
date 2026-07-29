const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middlewares/auth');
const productController = require('../controllers/productController');

router.get('/', authenticate, productController.list);
router.get('/:id', authenticate, productController.getById);
router.post('/', authenticate, productController.create);
router.put('/:id', authenticate, productController.update);
router.delete('/:id', authenticate, productController.remove);
router.post('/movements', authenticate, productController.createMovement);

module.exports = router;

