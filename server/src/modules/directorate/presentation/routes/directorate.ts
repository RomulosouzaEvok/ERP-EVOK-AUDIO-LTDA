/**
 * Router agregador do módulo Diretoria. Monta todos os grupos de recurso
 * sob `/api/directorate` em `server/app.ts`.
 *
 * ESCOPO: Organograma Executivo (leitura + provimento de cargo), Planejamento
 * Estratégico, Atas de Reunião (create/list/getById — SEM update/delete, ver
 * `meetingMinuteController`) e Riscos Corporativos.
 *
 * RBAC (`authorizeModule('diretoria', ...)`):
 * - `GET /org-chart` é a ÚNICA rota deste módulo liberada a qualquer usuário
 *   autenticado (apenas `authenticate`, sem `authorizeModule`) — a hierarquia
 *   executiva não é segredo interno, é a mesma informação que já aparece na
 *   navegação do frontend;
 * - toda LEITURA do restante do módulo usa o nível padrão
 *   (`authorizeModule('diretoria')`, `operate` implícito);
 * - toda ESCRITA (provimento de cargo, criação/edição de planejamento,
 *   registro de ata, criação/edição de risco) exige nível `approve`
 *   (`authorizeModule('diretoria', 'approve')`) — decisão do dono do produto
 *   de que este é conteúdo sensível de governança, não operação de rotina.
 *
 * @module modules/directorate/presentation/routes/directorate
 */

const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const orgChartController = require('../controllers/orgChartController');
const strategicPlanningController = require('../controllers/strategicPlanningController');
const meetingMinuteController = require('../controllers/meetingMinuteController');
const businessRiskController = require('../controllers/businessRiskController');

router.use(authenticate);

// ---- Organograma Executivo ----
router.get('/org-chart', orgChartController.getOrgChart);
router.patch('/directorates/:id/manager', authorizeModule('diretoria', 'approve'), orgChartController.assignManager);

// ---- Planejamento Estratégico ----
router.get('/strategic-plannings', authorizeModule('diretoria'), strategicPlanningController.list);
router.get('/strategic-plannings/:id', authorizeModule('diretoria'), strategicPlanningController.getById);
router.post('/strategic-plannings', authorizeModule('diretoria', 'approve'), strategicPlanningController.create);
router.put('/strategic-plannings/:id', authorizeModule('diretoria', 'approve'), strategicPlanningController.update);
router.patch('/strategic-plannings/:id/actual', authorizeModule('diretoria', 'approve'), strategicPlanningController.updateActual);

// ---- Atas de Reunião (SEM update/delete — imutável após criação) ----
router.get('/meeting-minutes', authorizeModule('diretoria'), meetingMinuteController.list);
router.get('/meeting-minutes/:id', authorizeModule('diretoria'), meetingMinuteController.getById);
router.post('/meeting-minutes', authorizeModule('diretoria', 'approve'), meetingMinuteController.create);

// ---- Riscos Corporativos ----
router.get('/business-risks', authorizeModule('diretoria'), businessRiskController.list);
router.get('/business-risks/:id', authorizeModule('diretoria'), businessRiskController.getById);
router.post('/business-risks', authorizeModule('diretoria', 'approve'), businessRiskController.create);
router.put('/business-risks/:id', authorizeModule('diretoria', 'approve'), businessRiskController.update);

module.exports = router;
