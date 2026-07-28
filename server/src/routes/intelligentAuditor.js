const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const auditorController = require('../controllers/intelligentAuditorController');

router.get('/report', authenticate, auditorController.auditReport);
router.get('/valuation', authenticate, auditorController.stockValuation);
router.get('/summary', authenticate, auditorController.auditSummary);

module.exports = router;

