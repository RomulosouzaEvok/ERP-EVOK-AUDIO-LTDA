const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middlewares/auth');
const nonConformityController = require('../controllers/nonConformityController');

router.get('/', authenticate, nonConformityController.list);
router.get('/:id', authenticate, nonConformityController.getById);
router.post('/', authenticate, nonConformityController.create);
router.put('/:id', authenticate, nonConformityController.update);
router.delete('/:id', authenticate, nonConformityController.remove);

module.exports = router;

