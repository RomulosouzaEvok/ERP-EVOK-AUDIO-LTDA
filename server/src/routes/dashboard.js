const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const dashboardController = require('../controllers/dashboardController');

router.get('/', authenticate, dashboardController.getDashboard);

module.exports = router;

