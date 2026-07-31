const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const assetController = require('../controllers/assetController');

/**
 * Rotas do módulo `assets` (Clean Architecture), montadas sob `/api/assets`
 * em `server/app.ts`. Mantém exatamente o mesmo RBAC do roteador legado
 * (`server/src/routes/assets.ts`).
 */

router.get('/', authenticate, assetController.list);
router.get('/:id', authenticate, assetController.getById);
router.post('/', authenticate, authorize('admin', 'operator'), assetController.create);
router.put('/:id', authenticate, authorize('admin', 'operator'), assetController.update);
router.delete('/:id', authenticate, authorize('admin'), assetController.remove);

module.exports = router;
