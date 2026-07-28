const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../../middlewares/auth');
const clientController = require('../controllers/clientController');

/**
 * Rotas do módulo `clients` (Clean Architecture). Mantém exatamente o
 * mesmo contrato dos 5 endpoints legados de `server/src/routes/clients.js`
 * (mesmos paths, métodos, middlewares e formato de resposta), agora montado
 * sob o mesmo prefixo `/api/clients` em `server/index.js`. Todas as rotas
 * usam apenas `authenticate` (sem `authorize` por papel), preservado 1:1 do
 * legado.
 */

router.get('/', authenticate, clientController.list);
router.get('/:id', authenticate, clientController.getById);
router.post('/', authenticate, clientController.create);
router.put('/:id', authenticate, clientController.update);
router.delete('/:id', authenticate, clientController.remove);

module.exports = router;
