const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const saleController = require('../controllers/saleController');
const fiscalController = require('../../../fiscal/presentation/controllers/fiscalController');

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
router.post('/', authenticate, authorize('admin', 'operator'), saleController.create);
router.put('/:id/status', authenticate, authorize('admin', 'operator'), saleController.updateStatus);
router.post('/:id/nfe', authenticate, authorize('admin', 'operator'), fiscalController.issueSaleNfe);
router.get('/:id/nfe', authenticate, authorize('admin', 'operator'), fiscalController.getSaleNfeStatus);
router.post('/:id/nfe/cancel', authenticate, authorize('admin'), fiscalController.cancelSaleNfe);

module.exports = router;


