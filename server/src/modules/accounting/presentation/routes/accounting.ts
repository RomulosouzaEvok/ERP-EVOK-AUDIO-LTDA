/**
 * Router agregador do módulo Contabilidade (subárea CONT do departamento
 * Financeiro, sem linha própria em `departments`). Monta todos os grupos de
 * recurso sob `/api/accounting` em `server/app.ts`.
 *
 * ESCOPO: Plano de Contas (CRUD sem delete físico — só `active: false`),
 * Lançamentos Contábeis (create/list/get/update — só em `draft` — + 2 ações
 * dedicadas de transição de status, `post`/`reverse`) e Balancete (relatório
 * derivado, somente leitura).
 *
 * RBAC: todas as rotas usam `authorizeModule('contabilidade', ...)` —
 * leitura usa o nível padrão (`operate`, mesmo padrão de
 * `facilities`/`marketing`/`juridico`, que não distinguem view de operate),
 * escrita comum (`create`/`update` de conta e lançamento) usa
 * `authorizeModule('contabilidade', 'operate')` explicitamente. As duas
 * transições de status mais sensíveis (`post`/`reverse`, que "fecham" um
 * lançamento contábil ou desfazem um fechado) exigem `approve` — nível
 * gestor da área contábil, mesmo padrão de `POST /api/rfqs/:id/award`.
 *
 * @module modules/accounting/presentation/routes/accounting
 */

const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const chartOfAccountsController = require('../controllers/chartOfAccountsController');
const accountingEntryController = require('../controllers/accountingEntryController');
const trialBalanceController = require('../controllers/trialBalanceController');

router.use(authenticate);

// ---- Plano de Contas ----
router.get('/accounts', authorizeModule('contabilidade'), chartOfAccountsController.list);
router.get('/accounts/:id', authorizeModule('contabilidade'), chartOfAccountsController.getById);
router.post('/accounts', authorizeModule('contabilidade', 'operate'), chartOfAccountsController.create);
router.put('/accounts/:id', authorizeModule('contabilidade', 'operate'), chartOfAccountsController.update);

// ---- Lançamentos Contábeis ----
router.get('/entries', authorizeModule('contabilidade'), accountingEntryController.list);
router.get('/entries/:id', authorizeModule('contabilidade'), accountingEntryController.getById);
router.post('/entries', authorizeModule('contabilidade', 'operate'), accountingEntryController.create);
router.put('/entries/:id', authorizeModule('contabilidade', 'operate'), accountingEntryController.update);
router.patch('/entries/:id/post', authorizeModule('contabilidade', 'approve'), accountingEntryController.post);
router.patch('/entries/:id/reverse', authorizeModule('contabilidade', 'approve'), accountingEntryController.reverse);

// ---- Balancete ----
router.get('/trial-balance', authorizeModule('contabilidade'), trialBalanceController.get);

module.exports = router;
