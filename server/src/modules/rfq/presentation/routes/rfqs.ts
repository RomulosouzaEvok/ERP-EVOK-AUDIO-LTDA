const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const rfqController = require('../controllers/rfqController');

/**
 * Rotas do modulo `rfq` (Cotacao/RFQ multi-fornecedor). Segue o mesmo
 * padrao `authorizeModule('compras', ...)` de `purchases.ts`/
 * `purchaseRequisitions.ts`: leituras exigem qualquer nivel atribuido ao
 * modulo `compras`, escritas comuns exigem `operate`, e a adjudicacao
 * (`POST /:id/award`, que gera pedido(s) de compra e altera o catalogo
 * item x fornecedor) exige `approve` (nivel gestor da area de compras).
 */
router.get('/', authenticate, authorizeModule('compras'), rfqController.list);
router.get('/:id', authenticate, authorizeModule('compras'), rfqController.getById);
router.get('/:id/comparison', authenticate, authorizeModule('compras'), rfqController.getComparison);
router.post('/', authenticate, authorizeModule('compras', 'operate'), rfqController.create);
router.post('/:id/suppliers', authenticate, authorizeModule('compras', 'operate'), rfqController.inviteSuppliers);
router.post('/:id/quotes', authenticate, authorizeModule('compras', 'operate'), rfqController.registerQuote);
router.post('/:id/award', authenticate, authorizeModule('compras', 'approve'), rfqController.award);

module.exports = router;
