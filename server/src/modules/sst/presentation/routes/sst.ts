/**
 * Router agregador do módulo SST (Segurança e Saúde do Trabalho, dept. 15).
 * Monta todos os grupos de recurso sob `/api/sst` em `server/src/app.ts`.
 *
 * ESCOPO: EPI (catálogo, matriz, entrega), ASO/PCMSO, Acidente/CAT, fila
 * eSocial (passada 1, commit `8482e79`) + CIPA, PGR/GES, Treinamentos,
 * Rotina Preventiva e Ações Corretivas — CRUD dedicado (passada 2, 37
 * endpoints restantes, 75/75 endpoints do contrato completos) — ver
 * `docs/governance/HANDOFF_CODEX.md`.
 *
 * RBAC: `authorizeModule('sst', ...)` em todas as rotas, exceto
 * `GET /aso/status/:employeeId` e `GET /cipa/stability/:employeeId`
 * (exceção `sst`|`rh`, checagem inline no controller — mesmo padrão
 * documentado para Requisição de Compra em `docs/arquitetura/API.md` §15).
 *
 * @module modules/sst/presentation/routes/sst
 */

const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const epiController = require('../controllers/epiController');
const asoController = require('../controllers/asoController');
const accidentController = require('../controllers/accidentController');
const esocialController = require('../controllers/esocialController');
const cipaController = require('../controllers/cipaController');
const pgrController = require('../controllers/pgrController');
const trainingController = require('../controllers/trainingController');
const safetyRoutineController = require('../controllers/safetyRoutineController');
const correctiveActionController = require('../controllers/correctiveActionController');

router.use(authenticate);

// ---- EPI (NR-6) ----
router.get('/epi-types', authorizeModule('sst'), epiController.listTypes);
router.get('/epi-types/:id', authorizeModule('sst'), epiController.getTypeById);
router.post('/epi-types', authorizeModule('sst', 'operate'), epiController.createType);
router.put('/epi-types/:id', authorizeModule('sst', 'operate'), epiController.updateType);

router.get('/epi-matrix', authorizeModule('sst'), epiController.listMatrix);
router.post('/epi-matrix', authorizeModule('sst', 'operate'), epiController.createMatrix);
router.put('/epi-matrix/:id', authorizeModule('sst', 'operate'), epiController.updateMatrix);
router.delete('/epi-matrix/:id', authorizeModule('sst', 'approve'), epiController.deleteMatrix);

router.get('/epi-deliveries', authorizeModule('sst'), epiController.listDeliveries);
router.get('/epi-deliveries/pending-report', authorizeModule('sst'), epiController.pendingReport);
router.get('/epi-deliveries/ficha/:employeeId', authorizeModule('sst'), epiController.ficha);
router.get('/epi-deliveries/:id', authorizeModule('sst'), epiController.getDeliveryById);
router.post('/epi-deliveries', authorizeModule('sst', 'operate'), epiController.createDelivery);
router.patch('/epi-deliveries/:id/evidence', authorizeModule('sst', 'operate'), epiController.attachEvidence);
router.post('/epi-deliveries/:id/confirm', authorizeModule('sst', 'approve'), epiController.confirmDelivery);
router.post('/epi-deliveries/:id/return', authorizeModule('sst', 'operate'), epiController.returnDelivery);

// ---- ASO / PCMSO (NR-7) ----
router.get('/exam-plans', authorizeModule('sst'), asoController.listExamPlans);
router.post('/exam-plans', authorizeModule('sst', 'operate'), asoController.createExamPlan);
router.put('/exam-plans/:id', authorizeModule('sst', 'operate'), asoController.updateExamPlan);

router.get('/aso/status/:employeeId', requireSstOrRh, asoController.status);
router.get('/aso/upcoming', authorizeModule('sst'), asoController.upcoming);
router.get('/aso', authorizeModule('sst'), asoController.list);
router.get('/aso/:id', authorizeModule('sst'), asoController.getById);
router.post('/aso', authorizeModule('sst', 'operate'), asoController.create);
router.post('/aso/:id/complementary-exams', authorizeModule('sst', 'operate'), asoController.createComplementaryExam);

// ---- Acidente e CAT (Lei 8.213/91) ----
router.get('/accidents', authorizeModule('sst'), accidentController.list);
router.get('/accidents/:id', authorizeModule('sst'), accidentController.getById);
router.post('/accidents', authorizeModule('sst', 'operate'), accidentController.create);
router.post('/accidents/:id/complements', authorizeModule('sst', 'operate'), accidentController.createComplement);
router.post('/accidents/:id/close', authorizeModule('sst', 'approve'), accidentController.close);
router.post('/accidents/:id/cat', authorizeModule('sst', 'approve'), accidentController.emitCat);
router.get('/accidents/:id/cat', authorizeModule('sst'), accidentController.listCats);
router.post('/cat/:catId/reopen', authorizeModule('sst', 'approve'), accidentController.reopenCat);
router.post('/accidents/:id/investigation', authorizeModule('sst', 'operate'), accidentController.createInvestigation);
router.get('/accidents/:id/investigation', authorizeModule('sst'), accidentController.getInvestigation);

// ---- Fila de eventos eSocial (S-2210/S-2220/S-2240) ----
router.get('/esocial-events', authorizeModule('sst'), esocialController.list);
router.get('/esocial-events/:id', authorizeModule('sst'), esocialController.getById);
router.post('/esocial-events/:id/resend', authorizeModule('sst', 'approve'), esocialController.resend);

// ---- CIPA (NR-5, CF/88) ----
router.get('/cipa/dimensioning', authorizeModule('sst'), cipaController.dimensioning);
router.get('/cipa/mandates', authorizeModule('sst'), cipaController.listMandates);
router.get('/cipa/mandates/:id', authorizeModule('sst'), cipaController.getMandateById);
router.post('/cipa/mandates', authorizeModule('sst', 'approve'), cipaController.createMandate);
router.post('/cipa/mandates/:id/members', authorizeModule('sst', 'approve'), cipaController.addMember);
router.post('/cipa/members/:id/take-office', authorizeModule('sst', 'approve'), cipaController.takeOffice);
router.post('/cipa/electoral-processes', authorizeModule('sst', 'approve'), cipaController.openElectoralProcess);
router.post('/cipa/electoral-processes/:id/candidates', authorizeModule('sst', 'operate'), cipaController.addCandidate);
router.post('/cipa/electoral-processes/:id/close', authorizeModule('sst', 'approve'), cipaController.closeElectoralProcess);
router.get('/cipa/meetings', authorizeModule('sst'), cipaController.listMeetings);
router.post('/cipa/meetings', authorizeModule('sst', 'operate'), cipaController.createMeeting);
router.get('/cipa/stability/:employeeId', requireSstOrRh, cipaController.stability);

// ---- PGR/GRO e Exposição (NR-1) ----
router.get('/risks', authorizeModule('sst'), pgrController.listRisks);
router.post('/risks', authorizeModule('sst', 'operate'), pgrController.createRisk);
router.put('/risks/:id', authorizeModule('sst', 'operate'), pgrController.updateRisk);
router.get('/ges', authorizeModule('sst'), pgrController.listGes);
router.post('/ges', authorizeModule('sst', 'operate'), pgrController.createGes);
router.post('/ges/:id/members', authorizeModule('sst', 'operate'), pgrController.addGesMember);

// ---- Treinamentos de Segurança (NRs) ----
router.get('/training-matrix', authorizeModule('sst'), trainingController.listMatrix);
router.post('/training-matrix', authorizeModule('sst', 'operate'), trainingController.createMatrix);
router.put('/training-matrix/:id', authorizeModule('sst', 'operate'), trainingController.updateMatrix);
router.get('/trainings/blocklist', authorizeModule('sst'), trainingController.blocklist);
router.get('/trainings', authorizeModule('sst'), trainingController.list);
router.post('/trainings', authorizeModule('sst', 'operate'), trainingController.create);

// ---- Rotina Preventiva — Inspeções, PT, Brigada, DDS ----
router.get('/inspections', authorizeModule('sst'), safetyRoutineController.listInspections);
router.post('/inspections', authorizeModule('sst', 'operate'), safetyRoutineController.createInspection);
router.get('/work-permits', authorizeModule('sst'), safetyRoutineController.listWorkPermits);
router.post('/work-permits', authorizeModule('sst', 'operate'), safetyRoutineController.createWorkPermit);
router.post('/work-permits/:id/close', authorizeModule('sst', 'operate'), safetyRoutineController.closeWorkPermit);
router.get('/brigade', authorizeModule('sst'), safetyRoutineController.listBrigade);
router.post('/brigade', authorizeModule('sst', 'operate'), safetyRoutineController.createBrigadeMember);
router.put('/brigade/:id', authorizeModule('sst', 'operate'), safetyRoutineController.updateBrigadeMember);
router.get('/dds', authorizeModule('sst'), safetyRoutineController.listDds);
router.post('/dds', authorizeModule('sst', 'operate'), safetyRoutineController.createDds);

// ---- Ações Corretivas (recurso reutilizável, multi-origem) ----
router.get('/corrective-actions', authorizeModule('sst'), correctiveActionController.list);
router.post('/corrective-actions', authorizeModule('sst', 'operate'), correctiveActionController.create);
router.put('/corrective-actions/:id', authorizeModule('sst', 'operate'), correctiveActionController.update);

/**
 * Middleware de exceção `sst`|`rh` (`BLOCO_1_SST_API.md` §0): usado apenas
 * pelas 2 rotas de leitura enxuta cross-módulo (status ASO e — quando o
 * cluster CIPA for implementado — estabilidade CIPA). Espelha o mesmo
 * padrão de checagem redundante já documentado para Requisição de Compra.
 */
function requireSstOrRh(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado.' } });
  }
  if (req.user.role === 'admin' || req.user.permissions?.sst || req.user.permissions?.rh) {
    return next();
  }
  return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Acesso negado — requer módulo sst ou rh.' } });
}

module.exports = router;
// Exportado à parte apenas para teste unitário direto da função (RBAC
// exceção sst|rh, `tests/unit/sst-rbac.test.ts`).
module.exports.requireSstOrRh = requireSstOrRh;
