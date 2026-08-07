/**
 * Router agregador do módulo Controladoria (subárea CTR do departamento
 * Financeiro, sem linha própria em `departments`). Monta todos os grupos de
 * recurso sob `/api/budget` em `server/app.ts`.
 *
 * ESCOPO: Linhas de Orçamento (CRUD completo, incluindo DELETE físico — este
 * é planejamento, não histórico transacional imutável) e o relatório
 * Orçado × Realizado (derivado, somente leitura, reaproveitando a agregação
 * de contas a pagar por centro de custo já existente no módulo Financeiro).
 * Custeio industrial (mão-de-obra/overhead) e Centros de Custo NÃO fazem
 * parte deste módulo — já existem, reais e funcionais, em
 * `server/src/modules/production`/`server/src/modules/reports` e
 * `server/src/modules/financial/`, respectivamente.
 *
 * RBAC: todas as rotas usam `authorizeModule('controladoria', ...)` —
 * leitura usa o nível padrão (`operate` implícito), escrita (CRUD de linha
 * de orçamento) usa `authorizeModule('controladoria', 'operate')`. Sem
 * nível `approve`: diferente de Contabilidade/Tesouraria, este módulo não
 * tem uma transição de status sensível a proteger — planejamento
 * orçamentário é editável/excluível livremente por quem tem acesso de
 * escrita ao módulo.
 *
 * @module modules/budget/presentation/routes/budget
 */

const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const budgetLineController = require('../controllers/budgetLineController');
const budgetReportController = require('../controllers/budgetReportController');

router.use(authenticate);

// ---- Linhas de Orçamento ----
router.get('/lines', authorizeModule('controladoria'), budgetLineController.list);
router.get('/lines/:id', authorizeModule('controladoria'), budgetLineController.getById);
router.post('/lines', authorizeModule('controladoria', 'operate'), budgetLineController.create);
router.put('/lines/:id', authorizeModule('controladoria', 'operate'), budgetLineController.update);
router.delete('/lines/:id', authorizeModule('controladoria', 'operate'), budgetLineController.remove);

// ---- Orçado × Realizado ----
router.get('/report', authorizeModule('controladoria'), budgetReportController.get);

module.exports = router;
