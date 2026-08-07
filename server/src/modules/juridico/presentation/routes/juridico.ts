/**
 * Router agregador do módulo Jurídico (departamento 16, JUR).
 * Monta todos os grupos de recurso sob `/api/jur` em `server/app.ts`.
 *
 * PASSADA 2/2 (final): completa os 71 endpoints do contrato
 * (`docs/business/BLOCO_3_JUR_API.md`) — Procurações (Grupo 4, 4 dos 6
 * endpoints do grupo; `corporate-acts` fica pendente, RF-JUR-030, sem
 * tabela), Propriedade Intelectual (Grupo 5, 6), LGPD — RoPA/Solicitação de
 * Titular/Incidente (Grupo 6, 17) e Transversal — Alertas/Relatório
 * Financeiro/Fichas Cruzadas (Grupo 7, 7). A passada 1 (commit `0d97b12`)
 * entregou Contratos (13), Contencioso (15) e Prazos Fatais (7) — 35/71.
 *
 * SUBSTITUI o módulo Jurídico enxuto (`/api/legal`, commit `2ad27fd`) — ver
 * plano de substituição em `docs/business/BLOCO_3_JUR_AUDITORIA.md` §6.
 *
 * RBAC: `authorizeModule('juridico', ...)` bloqueando a rota inteira em
 * TODAS as rotas (desenho mais restritivo do projeto, igual a `sst`/`ti` —
 * nenhuma exceção de auto-serviço neste módulo, diferente de `ti`), com
 * DUAS exceções documentadas no contrato: `GET /reports/financeiro` (também
 * aceita `authorizeModule('financeiro', 'operate')`, checagem inline no
 * controller — §8.2) e o recurso `trade_secret` de PI (`role==='admin'`,
 * verificado no use case — §6.3). `approve` é exigido para: avaliação de
 * risco `probable` (RF-JUR-015), encerramento de processo (`close`),
 * revogação de procuração, e rejeição de solicitação de titular/decisão e
 * encerramento de incidente LGPD; a alçada de ativação de contrato por
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
const proxyController = require('../controllers/proxyController');
const ipAssetController = require('../controllers/ipAssetController');
const lgpdController = require('../controllers/lgpdController');
const alertController = require('../controllers/alertController');
const reportController = require('../controllers/reportController');

router.use(authenticate);

// `GET /reports/financeiro` é a única rota do módulo aberta também a
// `authorizeModule('financeiro', 'operate')` (checagem OR inline no
// controller, §8.2) — por isso é montada ANTES do gate geral
// `authorizeModule('juridico', 'operate')` abaixo, que bloquearia
// `financeiro` sem módulo `juridico`.
router.get('/reports/financeiro', reportController.financeiro);

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

// ---- Grupo 4 — Procurações (UC-55, 4 dos 6 endpoints do grupo) ----
// `corporate-acts` (2 endpoints, RF-JUR-030) NÃO implementado nesta passada
// — sem tabela modelada (`jur_corporate_acts` não existe nas 16 migrations
// aplicadas). Pendência explícita, ver `docs/governance/HANDOFF_CODEX.md`.
router.get('/proxies', proxyController.list);
router.get('/proxies/:id', proxyController.getById);
router.post('/proxies', proxyController.create);
router.post('/proxies/:id/revoke', authorizeModule('juridico', 'approve'), proxyController.revoke);

// ---- Grupo 5 — Propriedade Intelectual (RF-JUR-031 a 034, 6 endpoints) ----
// `trade_secret` exige role==='admin' — verificado dentro do use case
// (GetIpAssetByIdUseCase/filtro em ListIpAssetsUseCase), não aqui na rota,
// pois `authorizeModule('juridico', ...)` sozinho não expressa a regra de
// papel global (§6.3).
router.get('/ip-assets', ipAssetController.list);
router.get('/ip-assets/:id', ipAssetController.getById);
router.post('/ip-assets', ipAssetController.create);
router.put('/ip-assets/:id', ipAssetController.update);
router.post('/ip-assets/:id/contracts', ipAssetController.linkContract);
router.get('/ip-assets/:id/contracts', ipAssetController.listContractLinks);

// ---- Grupo 6 — LGPD (UC-56, 17 endpoints) ----
// RoPA (5 endpoints)
router.get('/lgpd/processing-activities', lgpdController.listActivities);
router.get('/lgpd/processing-activities/:id', lgpdController.getActivityById);
router.post('/lgpd/processing-activities', lgpdController.createActivity);
router.put('/lgpd/processing-activities/:id', lgpdController.updateActivity);
router.post('/lgpd/processing-activities/:id/review', lgpdController.reviewActivity);

// Solicitação de Titular (7 endpoints) — /pending-critical antes de /:id.
router.get('/lgpd/data-subject-requests/pending-critical', lgpdController.pendingCriticalDataSubjectRequests);
router.get('/lgpd/data-subject-requests', lgpdController.listDataSubjectRequests);
router.get('/lgpd/data-subject-requests/:id', lgpdController.getDataSubjectRequestById);
router.post('/lgpd/data-subject-requests', lgpdController.createDataSubjectRequest);
router.post('/lgpd/data-subject-requests/:id/verify-identity', lgpdController.verifyIdentity);
router.post('/lgpd/data-subject-requests/:id/resolve', lgpdController.resolveDataSubjectRequest);
router.post('/lgpd/data-subject-requests/:id/reject', authorizeModule('juridico', 'approve'), lgpdController.rejectDataSubjectRequest);

// Incidente (5 endpoints)
router.get('/lgpd/incidents', lgpdController.listIncidents);
router.get('/lgpd/incidents/:id', lgpdController.getIncidentById);
router.post('/lgpd/incidents', lgpdController.createIncident);
router.post('/lgpd/incidents/:id/decision', authorizeModule('juridico', 'approve'), lgpdController.decideIncident);
router.post('/lgpd/incidents/:id/close', authorizeModule('juridico', 'approve'), lgpdController.closeIncident);

// ---- Grupo 7 — Transversal (7 endpoints) ----
// Alertas (3 endpoints)
router.get('/alerts', alertController.list);
router.get('/alerts/:id', alertController.getById);
router.post('/alerts/:id/acknowledge', alertController.acknowledge);

// `GET /reports/financeiro` já montado ANTES do gate `authorizeModule('juridico', ...)`, ver topo do arquivo.

// Fichas cruzadas (3 endpoints, RF-JUR-045)
router.get('/contracts/by-supplier/:supplierId', contractController.bySupplier);
router.get('/contracts/by-client/:clientId', contractController.byClient);
router.get('/contracts/by-employee/:employeeId', contractController.byEmployee);

module.exports = router;
