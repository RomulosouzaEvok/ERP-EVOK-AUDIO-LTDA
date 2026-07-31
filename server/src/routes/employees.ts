const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../middlewares/auth');
const employeeController = require('../controllers/employeeController');

// Dados de RH (salário, admissão etc.) - escrita restrita a admin.
router.get('/', authenticate, employeeController.list);
router.get('/:id', authenticate, employeeController.getById);
router.post('/', authenticate, authorize('admin'), employeeController.create);
router.put('/:id', authenticate, authorize('admin'), employeeController.update);
router.delete('/:id', authenticate, authorize('admin'), employeeController.remove);

module.exports = router;

