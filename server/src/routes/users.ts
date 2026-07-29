const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../middlewares/auth');
const userController = require('../controllers/userController');

router.get('/', authenticate, authorize('admin'), userController.list);
router.get('/:id', authenticate, authorize('admin'), userController.getById);
router.post('/', authenticate, authorize('admin'), userController.create);
router.put('/:id', authenticate, authorize('admin'), userController.update);
router.delete('/:id', authenticate, authorize('admin'), userController.remove);

module.exports = router;

