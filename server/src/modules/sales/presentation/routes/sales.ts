const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../../middlewares/auth');
const saleController = require('../controllers/saleController');

/**
 * Rotas do módulo `sales` (Clean Architecture). Mantém exatamente o mesmo
 * contrato dos 4 endpoints anteriors de `server/src/routes/sales.ts` (mesmos
 * paths, métodos e formato de resposta), agora montado sob o mesmo prefixo
 * `/api/sales` em `server/index.ts`.
 *
 * O arquivo anterior importava `authorize` de `../middlewares/auth` mas nunca
 * o utilizava em nenhuma rota — apenas `authenticate` era aplicado. Esse
 * comportamento é preservado aqui (nenhuma rota exige papel específico
 * hoje; ver pendência de RBAC no README do módulo).
 */

router.get('/', authenticate, saleController.list);
router.get('/:id', authenticate, saleController.getById);
router.post('/', authenticate, saleController.create);
router.put('/:id/status', authenticate, saleController.updateStatus);

module.exports = router;


