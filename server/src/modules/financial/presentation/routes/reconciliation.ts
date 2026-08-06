const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const ofxUpload = require('../middlewares/ofxUpload');
const reconciliationController = require('../controllers/reconciliationController');

/**
 * Rotas da Conciliação Bancária v1 (importação OFX, gap "conciliação
 * bancária/CNAB" de `docs/governance/TODO.md` — CNAB fica fora desta v1).
 *
 * Montado como sub-router em `server/src/modules/financial/presentation/routes/finance.ts`
 * sob `/reconciliation`, dentro do mesmo prefixo `/api/finance` já
 * registrado em `server/app.ts` — resulta em `/api/finance/reconciliation/...`.
 *
 * RBAC: todas as rotas exigem `authorizeModule('financeiro', ...)`, mesmo
 * padrão do restante do módulo `financial` (`finance.ts`). Leituras
 * (listar extratos/lançamentos/sugestões) exigem apenas o módulo
 * `financeiro`; escritas (upload, match, ignore, unmatch) exigem
 * `'operate'`.
 */

router.post('/statements', authenticate, authorizeModule('financeiro', 'operate'), ofxUpload.single('file'), reconciliationController.importStatement);
router.get('/statements', authenticate, authorizeModule('financeiro'), reconciliationController.listStatements);
router.get('/statements/:id/entries', authenticate, authorizeModule('financeiro'), reconciliationController.listStatementEntries);
router.get('/statements/:id/suggestions', authenticate, authorizeModule('financeiro'), reconciliationController.getSuggestions);

router.post('/entries/:id/match', authenticate, authorizeModule('financeiro', 'operate'), reconciliationController.matchEntry);
router.post('/entries/:id/ignore', authenticate, authorizeModule('financeiro', 'operate'), reconciliationController.ignoreEntry);
router.post('/entries/:id/unmatch', authenticate, authorizeModule('financeiro', 'operate'), reconciliationController.unmatchEntry);

module.exports = router;
