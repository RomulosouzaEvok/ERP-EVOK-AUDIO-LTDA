const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../../middlewares/auth');
const productController = require('../controllers/productController');

/**
 * Rotas do módulo `products` (Clean Architecture). Mantém exatamente o mesmo
 * contrato de endpoints do arquivo anterior `server/src/routes/products.ts`
 * (mesmos paths, métodos e formato de resposta), agora montado sob o mesmo
 * prefixo `/api/products` em `server/index.ts`.
 */

router.get('/', authenticate, productController.list);
router.get('/:id', authenticate, productController.getById);
router.post('/', authenticate, productController.create);
router.put('/:id', authenticate, productController.update);
router.delete('/:id', authenticate, productController.remove);
router.post('/movements', authenticate, productController.movement);

module.exports = router;


