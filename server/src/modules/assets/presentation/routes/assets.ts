const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const imageUpload = require('../../../../middlewares/imageUpload');
const assetController = require('../controllers/assetController');

/**
 * Rotas do módulo `assets` (Clean Architecture), montadas sob `/api/assets`
 * em `server/app.ts`.
 *
 * RETROFIT `authorizeModule('patrimonio')` (docs/governance/TODO.md, Bloco
 * 1.2 retrofit geral — substitui `authorize(role)` legado conforme decisão
 * de `docs/business/BUSINESS_RULES.md` §8): leituras exigem `view`
 * implicito, escritas exigem `operate`. Remoção (delete) é tratada como
 * `approve` (equivalente ao antigo `authorize('admin')` pontual).
 */

router.get('/', authenticate, authorizeModule('patrimonio'), assetController.list);
router.get('/:id', authenticate, authorizeModule('patrimonio'), assetController.getById);
router.post('/', authenticate, authorizeModule('patrimonio', 'operate'), assetController.create);
router.put('/:id', authenticate, authorizeModule('patrimonio', 'operate'), assetController.update);
router.delete('/:id', authenticate, authorizeModule('patrimonio', 'approve'), assetController.remove);
router.post('/:id/photo', authenticate, authorizeModule('patrimonio', 'operate'), imageUpload.single('photo'), assetController.uploadPhoto);
router.get('/:id/qrcode', authenticate, authorizeModule('patrimonio'), assetController.getQrCode);

module.exports = router;
