/**
 * Rotas do modulo auth.
 *
 * @module modules/auth/presentation/routes/auth
 */

import express = require('express');
const { authenticate, authorize }: any = require('../../../../middlewares/auth');
const authController: any = require('../controllers/authController');

const router = express.Router();

router.post('/login', authController.login);
router.post('/register', authenticate, authorize('admin'), authController.register);
router.get('/me', authenticate, authController.getMe);

export = router;
