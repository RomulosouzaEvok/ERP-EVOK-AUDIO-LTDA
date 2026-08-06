const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const cnabReturnUpload = require('../middlewares/cnabReturnUpload');
const cnabController = require('../controllers/cnabController');

/**
 * Rotas da Cobrança CNAB 240 v1 (remessa/retorno) — pendência "CNAB
 * (boleto/remessa/retorno)" de `docs/governance/TODO.md`. Emissão visual do
 * boleto (PDF) fica FORA desta v1 (pendência futura registrada em
 * `docs/governance/TODO.md`).
 *
 * Montado como sub-router em `server/src/modules/financial/presentation/routes/finance.ts`
 * sob `/cnab`, dentro do mesmo prefixo `/api/finance` já registrado em
 * `server/app.ts` — resulta em `/api/finance/cnab/...`.
 *
 * RBAC: mesmo padrão do restante do módulo `financial` — leituras exigem
 * apenas o módulo `financeiro`; escritas (configuração bancária, geração de
 * remessa, upload de retorno) exigem `'operate'`.
 */

router.get('/banking-config', authenticate, authorizeModule('financeiro'), cnabController.getBankingConfig);
router.put('/banking-config', authenticate, authorizeModule('financeiro', 'operate'), cnabController.upsertBankingConfig);

router.post('/remittances', authenticate, authorizeModule('financeiro', 'operate'), cnabController.generateRemittance);
router.get('/remittances', authenticate, authorizeModule('financeiro'), cnabController.listRemittances);
router.get('/remittances/:id/download', authenticate, authorizeModule('financeiro'), cnabController.downloadRemittance);

router.post('/returns', authenticate, authorizeModule('financeiro', 'operate'), cnabReturnUpload.single('file'), cnabController.processReturnFile);
router.get('/returns', authenticate, authorizeModule('financeiro'), cnabController.listReturnFiles);
router.get('/returns/:id/occurrences', authenticate, authorizeModule('financeiro'), cnabController.listReturnOccurrences);

module.exports = router;
