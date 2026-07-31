const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const categoryController = require('../controllers/categoryController');

/**
 * Rotas do módulo `categories` (Clean Architecture), montadas sob
 * `/api/categories` em `server/app.ts`. Mantém exatamente o mesmo RBAC do
 * roteador legado (`server/src/routes/categories.ts`).
 */

router.get('/', authenticate, categoryController.list);
router.get('/:id', authenticate, categoryController.getById);
router.post('/', authenticate, authorize('admin', 'operator'), categoryController.create);
router.put('/:id', authenticate, authorize('admin', 'operator'), categoryController.update);
router.delete('/:id', authenticate, authorize('admin'), categoryController.remove);

module.exports = router;
