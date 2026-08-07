/**
 * Router agregador do módulo Marketing (departamento 14, sigla MKT).
 * Monta todos os grupos de recurso sob `/api/marketing` em `server/app.ts`.
 *
 * ESCOPO (BLOCO 5 MKT, correção): Campanhas (+ aprovação de orçamento +
 * recálculo de métricas), Leads (funil dedicado + handoff + conversão
 * atômica + captação em lote), Evento/Feira (NOVO, com checklist),
 * Relatórios/KPIs de funil (NOVO) e Materiais de Divulgação (+ aprovação
 * dedicada) — CRUD completo (create/list/get/update, sem delete — mesma
 * decisão de design do módulo Facilities).
 *
 * RBAC: leitura usa o nível padrão (`authorizeModule('marketing')`,
 * `operate` implícito), escrita usa `authorizeModule('marketing',
 * 'operate')`. DUAS ações ganham nível `approve` pontual (RF-MKT §5.1):
 * aprovação de orçamento de campanha (`POST /campaigns/:id/budget-decision`)
 * e aprovação de material (`PATCH /materials/:id/approve`) — mesmo
 * precedente de `facilities`/`contabilidade` (não é o módulo inteiro que
 * muda de padrão). `POST /leads/:id/handoff` usa RBAC composta (OR) via
 * `authorizeAnyModule(['marketing', 'vendas'])` (RF-MKT-015) — o vendedor
 * pode aceitar/reatribuir o próprio handoff sem depender de Marketing
 * operar por ele.
 *
 * @module modules/marketing/presentation/routes/marketing
 */

const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const { authorizeAnyModule } = require('../../../../middlewares/authorizeAnyModule');
const materialFileUpload = require('../middlewares/materialFileUpload');
const campaignController = require('../controllers/campaignController');
const leadController = require('../controllers/leadController');
const materialController = require('../controllers/materialController');
const eventController = require('../controllers/eventController');
const reportController = require('../controllers/reportController');

router.use(authenticate);

// ---- Campanhas ----
router.get('/campaigns', authorizeModule('marketing'), campaignController.list);
router.get('/campaigns/:id', authorizeModule('marketing'), campaignController.getById);
router.post('/campaigns', authorizeModule('marketing', 'operate'), campaignController.create);
router.put('/campaigns/:id', authorizeModule('marketing', 'operate'), campaignController.update);
router.post('/campaigns/:id/budget-decision', authorizeModule('marketing', 'approve'), campaignController.budgetDecision);
router.post('/campaigns/:id/recalculate-metrics', authorizeModule('marketing', 'operate'), campaignController.recalculateMetrics);

// ---- Leads ----
router.get('/leads', authorizeModule('marketing'), leadController.list);
router.get('/leads/:id', authorizeModule('marketing'), leadController.getById);
router.post('/leads', authorizeModule('marketing', 'operate'), leadController.create);
router.post('/leads/bulk', authorizeModule('marketing', 'operate'), leadController.bulkCreate);
router.put('/leads/:id', authorizeModule('marketing', 'operate'), leadController.update);
router.post('/leads/:id/status', authorizeModule('marketing', 'operate'), leadController.changeStatus);
router.post(
  '/leads/:id/handoff',
  authorizeAnyModule([{ moduleKey: 'marketing', requiredLevel: 'operate' }, { moduleKey: 'vendas', requiredLevel: 'operate' }]),
  leadController.handoff,
);
router.post('/leads/:id/convert', authorizeModule('marketing', 'operate'), leadController.convert);

// ---- Evento/Feira ----
router.get('/events', authorizeModule('marketing'), eventController.list);
router.get('/events/:id', authorizeModule('marketing'), eventController.getById);
router.post('/events', authorizeModule('marketing', 'operate'), eventController.create);
router.put('/events/:id', authorizeModule('marketing', 'operate'), eventController.update);
router.post('/events/:id/checklist', authorizeModule('marketing', 'operate'), eventController.addChecklistItem);
router.put('/events/:id/checklist/:itemId', authorizeModule('marketing', 'operate'), eventController.updateChecklistItem);
router.post('/events/:id/close', authorizeModule('marketing', 'operate'), eventController.close);
router.get('/events/:id/leads', authorizeModule('marketing'), eventController.getLeads);

// ---- Relatórios / KPIs de funil ----
router.get('/reports/funnel', authorizeModule('marketing'), reportController.funnel);
router.get('/reports/events', authorizeModule('marketing'), reportController.events);

// ---- Materiais de divulgação ----
router.get('/materials', authorizeModule('marketing'), materialController.list);
router.get('/materials/:id', authorizeModule('marketing'), materialController.getById);
router.post('/materials', authorizeModule('marketing', 'operate'), materialController.create);
router.put('/materials/:id', authorizeModule('marketing', 'operate'), materialController.update);
router.post('/materials/:id/file', authorizeModule('marketing', 'operate'), materialFileUpload.single('file'), materialController.uploadFile);
router.patch('/materials/:id/approve', authorizeModule('marketing', 'approve'), materialController.approve);

module.exports = router;
