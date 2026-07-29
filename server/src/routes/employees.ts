const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middlewares/auth');
const employeeController = require('../controllers/employeeController');

router.get('/', authenticate, employeeController.list);
router.get('/:id', authenticate, employeeController.getById);
router.post('/', authenticate, employeeController.create);
router.put('/:id', authenticate, employeeController.update);
router.delete('/:id', authenticate, employeeController.remove);

module.exports = router;

