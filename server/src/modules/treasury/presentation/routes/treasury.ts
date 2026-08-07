/**
 * Router agregador do módulo Tesouraria (subárea TES do departamento
 * Financeiro, sem linha própria em `departments`). Monta todos os grupos de
 * recurso sob `/api/treasury` em `server/app.ts`.
 *
 * ESCOPO: Contas Bancárias (CRUD, saldo mantido manualmente pela
 * Tesouraria), Operações Financeiras (empréstimos, aplicações,
 * financiamentos, leasing — create/list/get/update — só em `active` — + 2
 * ações dedicadas de transição de status, `settle`/`cancel`) e Posição de
 * Caixa (relatório derivado, somente leitura). Conciliação bancária
 * (extrato OFX/CNAB) NÃO faz parte deste módulo — já existe, real e
 * funcional, em `server/src/modules/financial/presentation/routes/
 * reconciliation.ts`/`cnab.ts`.
 *
 * RBAC: todas as rotas usam `authorizeModule('tesouraria', ...)` — leitura
 * usa o nível padrão (`operate` implícito, mesmo padrão de
 * `facilities`/`marketing`/`juridico`), escrita comum (CRUD de conta
 * bancária e de operação em `active`) usa
 * `authorizeModule('tesouraria', 'operate')`. As duas transições de status
 * de uma operação financeira (`settle`/`cancel`, que encerram um contrato
 * financeiro) exigem `approve` — mesmo padrão de
 * `authorizeModule('contabilidade', 'approve')` em `post`/`reverse` de
 * lançamento contábil.
 *
 * @module modules/treasury/presentation/routes/treasury
 */

const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const bankAccountController = require('../controllers/bankAccountController');
const financialOperationController = require('../controllers/financialOperationController');
const cashPositionController = require('../controllers/cashPositionController');

router.use(authenticate);

// ---- Contas Bancárias ----
router.get('/bank-accounts', authorizeModule('tesouraria'), bankAccountController.list);
router.get('/bank-accounts/:id', authorizeModule('tesouraria'), bankAccountController.getById);
router.post('/bank-accounts', authorizeModule('tesouraria', 'operate'), bankAccountController.create);
router.put('/bank-accounts/:id', authorizeModule('tesouraria', 'operate'), bankAccountController.update);

// ---- Operações Financeiras ----
router.get('/financial-operations', authorizeModule('tesouraria'), financialOperationController.list);
router.get('/financial-operations/:id', authorizeModule('tesouraria'), financialOperationController.getById);
router.post('/financial-operations', authorizeModule('tesouraria', 'operate'), financialOperationController.create);
router.put('/financial-operations/:id', authorizeModule('tesouraria', 'operate'), financialOperationController.update);
router.patch('/financial-operations/:id/settle', authorizeModule('tesouraria', 'approve'), financialOperationController.settle);
router.patch('/financial-operations/:id/cancel', authorizeModule('tesouraria', 'approve'), financialOperationController.cancel);

// ---- Posição de Caixa ----
router.get('/cash-position', authorizeModule('tesouraria'), cashPositionController.get);

module.exports = router;
