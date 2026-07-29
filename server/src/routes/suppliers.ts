const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middlewares/auth');
const supplierController = require('../controllers/supplierController');

router.get('/', authenticate, supplierController.list);
router.get('/:id', authenticate, supplierController.getById);
router.post('/', authenticate, supplierController.create);
router.put('/:id', authenticate, supplierController.update);
router.delete('/:id', authenticate, supplierController.remove);

module.exports = router;

