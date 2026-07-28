const express = require('express');
const router = express.Router();
const { login, register, getMe } = require('../controllers/authController');
const auth = require('../middlewares/auth');
const { authorize } = require('../middlewares/auth');

router.post('/login', login);
router.post('/register', auth, authorize('admin'), register);
router.get('/me', auth, getMe);

module.exports = router;
