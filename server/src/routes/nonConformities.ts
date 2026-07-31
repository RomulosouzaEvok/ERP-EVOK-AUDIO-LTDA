const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../middlewares/auth');
const nonConformityController = require('../controllers/nonConformityController');

router.get('/', authenticate, nonConformityController.list);
router.get('/:id', authenticate, nonConformityController.getById);
router.post('/', authenticate, authorize('admin', 'operator'), nonConformityController.create);
router.put('/:id', authenticate, authorize('admin', 'operator'), nonConformityController.update);
router.delete('/:id', authenticate, authorize('admin'), nonConformityController.remove);

module.exports = router;

