const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middlewares/auth');
const dashboardController = require('../controllers/dashboardController');

router.get('/', authenticate, dashboardController.index);

module.exports = router;

