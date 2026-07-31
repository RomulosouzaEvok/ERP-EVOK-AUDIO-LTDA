const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../middlewares/auth');
const categoryController = require('../controllers/categoryController');

router.get('/', authenticate, categoryController.list);
router.get('/:id', authenticate, categoryController.getById);
router.post('/', authenticate, authorize('admin', 'operator'), categoryController.create);
router.put('/:id', authenticate, authorize('admin', 'operator'), categoryController.update);
router.delete('/:id', authenticate, authorize('admin'), categoryController.remove);

module.exports = router;

