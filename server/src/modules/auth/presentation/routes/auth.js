const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const authController = require('../controllers/authController');

/**
 * Rotas do módulo `auth` (Clean Architecture). Mantém exatamente o mesmo
 * contrato dos 3 endpoints legados de `server/src/routes/auth.js` (mesmos
 * paths, métodos, middlewares e formato de resposta), agora montado sob o
 * mesmo prefixo `/api/auth` em `server/index.js`.
 */

router.post('/login', authController.login);
router.post('/register', authenticate, authorize('admin'), authController.register);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
