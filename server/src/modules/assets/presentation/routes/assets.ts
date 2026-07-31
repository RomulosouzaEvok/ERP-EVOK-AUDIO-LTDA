const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const imageUpload = require('../../../../middlewares/imageUpload');
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
router.post('/:id/photo', authenticate, authorize('admin', 'operator'), imageUpload.single('photo'), assetController.uploadPhoto);
router.get('/:id/qrcode', authenticate, assetController.getQrCode);

module.exports = router;
