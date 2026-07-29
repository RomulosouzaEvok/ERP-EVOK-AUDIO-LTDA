const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middlewares/auth');
const assetController = require('../controllers/assetController');

router.get('/', authenticate, assetController.list);
router.get('/:id', authenticate, assetController.getById);
router.post('/', authenticate, assetController.create);
router.put('/:id', authenticate, assetController.update);
router.delete('/:id', authenticate, assetController.remove);

module.exports = router;

