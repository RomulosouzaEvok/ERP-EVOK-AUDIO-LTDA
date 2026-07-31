const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const fiscalController = require('../controllers/fiscalController');

/**
 * Rotas do módulo `fiscal` sob `/api/fiscal`. Os endpoints de NF-e por
 * venda/compra ficam em `/api/sales/:id/nfe*` e `/api/purchases/:id/nfe`
 * (ver `server/src/modules/sales/presentation/routes/sales.ts` e
 * `.../purchases/presentation/routes/purchases.ts`); aqui fica apenas a
 * configuração fiscal do emitente (dado sensível, só admin).
 */

router.get('/config', authenticate, authorize('admin'), fiscalController.getCompanyFiscalConfig);
router.put('/config', authenticate, authorize('admin'), fiscalController.upsertCompanyFiscalConfig);

module.exports = router;
