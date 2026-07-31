const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const imageUpload = require('../../../../middlewares/imageUpload');
const productController = require('../controllers/productController');

/**
 * Rotas do módulo `products` (Clean Architecture). Mantém exatamente o mesmo
 * contrato de endpoints do arquivo anterior `server/src/routes/products.ts`
 * (mesmos paths, métodos e formato de resposta), agora montado sob o mesmo
 * prefixo `/api/products` em `server/index.ts`.
 */

router.get('/', authenticate, productController.list);
router.get('/:id', authenticate, productController.getById);
router.post('/', authenticate, authorize('admin', 'operator'), productController.create);
router.put('/:id', authenticate, authorize('admin', 'operator'), productController.update);
router.delete('/:id', authenticate, authorize('admin', 'operator'), productController.remove);
router.post('/movements', authenticate, authorize('admin', 'operator'), productController.movement);
router.post('/:id/photo', authenticate, authorize('admin', 'operator'), imageUpload.single('photo'), productController.uploadPhoto);
router.get('/:id/qrcode', authenticate, productController.getQrCode);

module.exports = router;


