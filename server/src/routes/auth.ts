const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middlewares/auth');
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/register', authenticate, authController.register);
router.get('/me', authenticate, authController.me);

module.exports = router;

