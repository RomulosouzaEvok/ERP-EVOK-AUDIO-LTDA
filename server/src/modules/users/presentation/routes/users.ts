const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const userController = require('../controllers/userController');

/**
 * Rotas do módulo `users` (Clean Architecture). Mantém exatamente o mesmo
 * contrato dos 5 endpoints anteriors de `server/src/routes/users.ts` (mesmos
 * paths, métodos, middlewares e formato de resposta), agora montado sob o
 * mesmo prefixo `/api/users` em `server/index.ts`. Todas as rotas exigem
 * `authenticate` + `authorize('admin')`, preservado 1:1 do anterior.
 */

router.get('/', authenticate, authorize('admin'), userController.list);
router.get('/:id', authenticate, authorize('admin'), userController.getById);
router.post('/', authenticate, authorize('admin'), userController.create);
router.put('/:id', authenticate, authorize('admin'), userController.update);
router.delete('/:id', authenticate, authorize('admin'), userController.remove);

module.exports = router;


