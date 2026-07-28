const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../../middlewares/auth');
const supplierController = require('../controllers/supplierController');

/**
 * Rotas do módulo `suppliers` (Clean Architecture). Mantém exatamente o
 * mesmo contrato dos 5 endpoints legados de `server/src/routes/suppliers.js`
 * (mesmos paths, métodos, middlewares e formato de resposta), agora montado
 * sob o mesmo prefixo `/api/suppliers` em `server/index.js`. Todas as rotas
 * usam apenas `authenticate` (sem `authorize` por papel), preservado 1:1 do
 * legado.
 */

router.get('/', authenticate, supplierController.list);
router.get('/:id', authenticate, supplierController.getById);
router.post('/', authenticate, supplierController.create);
router.put('/:id', authenticate, supplierController.update);
router.delete('/:id', authenticate, supplierController.remove);

module.exports = router;
