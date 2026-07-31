const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../middlewares/auth');
const assetController = require('../controllers/assetController');

router.get('/', authenticate, assetController.list);
router.get('/:id', authenticate, assetController.getById);
router.post('/', authenticate, authorize('admin', 'operator'), assetController.create);
router.put('/:id', authenticate, authorize('admin', 'operator'), assetController.update);
router.delete('/:id', authenticate, authorize('admin'), assetController.remove);

module.exports = router;

