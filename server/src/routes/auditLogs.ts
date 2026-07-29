const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../middlewares/auth');
const auditLogController = require('../controllers/auditLogController');

router.get('/', authenticate, authorize('admin'), auditLogController.list);
router.get('/:id', authenticate, authorize('admin'), auditLogController.getById);

module.exports = router;

