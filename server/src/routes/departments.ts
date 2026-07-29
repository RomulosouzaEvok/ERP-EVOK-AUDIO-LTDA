const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middlewares/auth');
const departmentController = require('../controllers/departmentController');

router.get('/', authenticate, departmentController.list);
router.get('/:id', authenticate, departmentController.getById);
router.post('/', authenticate, departmentController.create);
router.put('/:id', authenticate, departmentController.update);
router.delete('/:id', authenticate, departmentController.remove);

module.exports = router;

