const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const imageUpload = require('../../../../middlewares/imageUpload');
const productController = require('../controllers/productController');

/**
 * Rotas do módulo `products` (Clean Architecture). Mantém exatamente o mesmo
 * contrato de endpoints do arquivo anterior `server/src/routes/products.ts`
 * (mesmos paths, métodos e formato de resposta), agora montado sob o mesmo
 * prefixo `/api/products` em `server/index.ts`.
 *
 * RETROFIT `authorizeModule('produtos')` (docs/governance/TODO.md, Bloco
 * 1.2 retrofit geral — substitui `authorize(role)` legado conforme decisão
 * de `docs/business/BUSINESS_RULES.md` §8): leituras exigem `view`
 * implicito (qualquer nivel presente), escritas exigem `operate`.
 */

router.get('/', authenticate, authorizeModule('produtos'), productController.list);
router.get('/:id', authenticate, authorizeModule('produtos'), productController.getById);
router.post('/', authenticate, authorizeModule('produtos', 'operate'), productController.create);
router.put('/:id', authenticate, authorizeModule('produtos', 'operate'), productController.update);
router.delete('/:id', authenticate, authorizeModule('produtos', 'operate'), productController.remove);
router.post('/movements', authenticate, authorizeModule('produtos', 'operate'), productController.movement);
router.post('/:id/photo', authenticate, authorizeModule('produtos', 'operate'), imageUpload.single('photo'), productController.uploadPhoto);
router.get('/:id/qrcode', authenticate, authorizeModule('produtos'), productController.getQrCode);

module.exports = router;


