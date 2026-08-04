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
router.get('/me/permissions', authenticate, authController.getMyPermissions);
router.put('/change-password', authenticate, authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export = router;
