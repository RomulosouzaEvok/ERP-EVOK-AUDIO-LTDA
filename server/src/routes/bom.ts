const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middlewares/auth');
const bomController = require('../controllers/bomController');

router.get('/', authenticate, bomController.list);
router.get('/product/:productId', authenticate, bomController.getActiveByProduct);
router.get('/product/:productId/versions', authenticate, bomController.listVersions);
router.get('/:id', authenticate, bomController.getById);
router.post('/', authenticate, bomController.create);
router.put('/:id', authenticate, bomController.update);
router.delete('/:id', authenticate, bomController.remove);
router.get('/:id/explode', authenticate, bomController.explode);
router.get('/:id/cost', authenticate, bomController.calculateCost);
router.get('/:id/availability', authenticate, bomController.checkAvailability);
router.get('/:id/tree', authenticate, bomController.getTree);
router.get('/:id/items', authenticate, bomController.listItems);

module.exports = router;

