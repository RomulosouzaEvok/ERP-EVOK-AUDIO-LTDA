/**
 * Router agregador do módulo Jurídico (departamento 16, JUR).
 * Monta todos os grupos de recurso sob `/api/jur` em `server/app.ts`.
 *
 * ESCOPO DESTA PASSADA (1/2): Contratos (13 endpoints, UC-52), Contencioso
 * (15 endpoints, UC-53) e Prazos Processuais Fatais (7 endpoints, UC-54) —
 * 35 dos 71 endpoints do contrato (`docs/business/BLOCO_3_JUR_API.md`).
 * Procurações, Propriedade Intelectual, LGPD e o Grupo Transversal
 * (alertas/relatório financeiro/fichas cruzadas) ficam para a passada 2 —
 * ver `docs/governance/HANDOFF_CODEX.md`.
 *
 * SUBSTITUI o módulo Jurídico enxuto (`/api/legal`, commit `2ad27fd`) — ver
 * plano de substituição em `docs/business/BLOCO_3_JUR_AUDITORIA.md` §6.
 *
 * RBAC: `authorizeModule('juridico', ...)` bloqueando a rota inteira em
 * TODAS as rotas (desenho mais restritivo do projeto, igual a `sst`/`ti` —
 * nenhuma exceção de auto-serviço neste módulo, diferente de `ti`).
 * `approve` é exigido para: avaliação de risco `probable` (RF-JUR-015) e
 * encerramento de processo (`close`); a alçada de ativação de contrato por
 * valor (RF-JUR-003) fica pendente da tabela de configuração ainda não
 * modelada (ver `docs/business/BLOCO_3_JUR_API.md` §2.7) — todo
 * `juridico:operate` pode ativar nesta passada.
 *
 * @module modules/juridico/presentation/routes/juridico
 */

const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const contractController = require('../controllers/contractController');
const legalCaseController = require('../controllers/legalCaseController');
const deadlineController = require('../controllers/deadlineController');

router.use(authenticate);
router.use(authorizeModule('juridico', 'operate'));

// ---- Grupo 1 — Contratos (UC-52, 13 endpoints) ----
router.get('/contracts', contractController.list);
router.get('/contracts/:id', contractController.getById);
router.post('/contracts', contractController.create);
router.put('/contracts/:id', contractController.update);
router.post('/contracts/:id/documents', contractController.addDocument);
router.get('/contracts/:id/documents', contractController.listDocuments);
router.post('/contracts/:id/signatories', contractController.addSignatory);
router.get('/contracts/:id/signatories', contractController.listSignatories);
router.post('/contracts/:id/checklist', contractController.updateChecklist);
router.post('/contracts/:id/activate', contractController.activate);
router.post('/contracts/:id/addendums', contractController.addAddendum);
router.get('/contracts/:id/addendums', contractController.listAddendums);
router.post('/contracts/:id/terminate', contractController.terminate);

// ---- Grupo 2 — Contencioso (UC-53, 15 endpoints) ----
router.get('/external-lawyers', legalCaseController.listExternalLawyers);
router.get('/external-lawyers/:id', legalCaseController.getExternalLawyerById);
router.post('/external-lawyers', legalCaseController.createExternalLawyer);
router.put('/external-lawyers/:id', legalCaseController.updateExternalLawyer);

router.get('/legal-cases', legalCaseController.list);
router.get('/legal-cases/:id', legalCaseController.getById);
router.post('/legal-cases', legalCaseController.create);
router.post('/legal-cases/:id/events', legalCaseController.addEvent);
router.get('/legal-cases/:id/events', legalCaseController.listEvents);
router.post('/legal-cases/:id/provisions', legalCaseController.addProvision);
router.get('/legal-cases/:id/provisions', legalCaseController.listProvisions);
router.get('/legal-cases/:id/provisions/current', legalCaseController.getCurrentProvision);
router.post('/legal-cases/:id/costs', legalCaseController.registerCost);
router.post('/legal-cases/:id/close', authorizeModule('juridico', 'approve'), legalCaseController.close);
router.get('/reports/provisions', legalCaseController.provisionsReport);

// ---- Grupo 3 — Prazos Processuais Fatais (UC-54, 7 endpoints) ----
// Ordem importa: /critical antes de /:id.
router.get('/legal-case-deadlines/critical', deadlineController.critical);
router.get('/legal-case-deadlines', deadlineController.list);
router.get('/legal-case-deadlines/:id', deadlineController.getById);
router.post('/legal-cases/:caseId/deadlines', deadlineController.create);
router.post('/legal-case-deadlines/:id/acknowledge', deadlineController.acknowledge);
router.post('/legal-case-deadlines/:id/fulfill', deadlineController.fulfill);
router.post('/legal-case-deadlines/:id/confirm', deadlineController.confirm);

module.exports = router;
