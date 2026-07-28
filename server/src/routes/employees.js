const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const employeeController = require('../controllers/employeeController');

router.get('/', authenticate, employeeController.list);
router.get('/:id', authenticate, employeeController.getById);
router.post('/', authenticate, authorize('admin'), employeeController.create);
router.put('/:id', authenticate, authorize('admin'), employeeController.update);
router.delete('/:id', authenticate, authorize('admin'), employeeController.remove);
router.get('/department/:departmentId', authenticate, employeeController.getByDepartment);

module.exports = router;

