const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middlewares/auth');
const serviceOrderController = require('../controllers/serviceOrderController');

router.get('/', authenticate, serviceOrderController.list);
router.get('/:id', authenticate, serviceOrderController.getById);
router.post('/', authenticate, serviceOrderController.create);
router.put('/:id', authenticate, serviceOrderController.update);
router.delete('/:id', authenticate, serviceOrderController.remove);

module.exports = router;

