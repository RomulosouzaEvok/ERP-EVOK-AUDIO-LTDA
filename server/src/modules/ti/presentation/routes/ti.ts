/**
 * Router agregador do módulo TI (Tecnologia da Informação, dept. 13).
 * Monta todos os grupos de recurso sob `/api/ti` em `server/app.ts`.
 *
 * ESCOPO: Helpdesk (categorias/chamados/comentários), Termo de
 * Responsabilidade de Equipamento, Licenças de Software, Solicitações de
 * Acesso (onboarding/change/offboarding) e Backup/Continuidade — 57
 * endpoints do contrato (`docs/business/BLOCO_2_TI_API.md`).
 *
 * RBAC: a maior parte das rotas usa `authorizeModule('ti', ...)`, IGUAL a
 * `sst` — EXCETO as rotas de auto-serviço de chamado (BR-TI-001/RNF-TI-02),
 * que usam `authenticate` puro (abertura/`mine`) ou
 * `authorizeSelfOrModule('ti', 'operate', ownershipCheck)` (detalhe/
 * comentários/confirmação/reabertura do PRÓPRIO chamado) — nunca
 * `authorizeModule('ti')` bloqueando a rota inteira para essas 6 rotas.
 *
 * @module modules/ti/presentation/routes/ti
 */

const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const { authorizeSelfOrModule } = require('../../../../middlewares/authorizeSelfOrModule');
const ticketController = require('../controllers/ticketController');
const termController = require('../controllers/termController');
const licenseController = require('../controllers/licenseController');
const accessRequestController = require('../controllers/accessRequestController');
const backupController = require('../controllers/backupController');

router.use(authenticate);

// ---- Categorias de chamado (RF-TI-001) ----
router.get('/ticket-categories', authorizeModule('ti'), ticketController.listCategories);
router.get('/ticket-categories/active', ticketController.listActiveCategories); // público-autenticado
router.post('/ticket-categories', authorizeModule('ti', 'operate'), ticketController.createCategory);
router.put('/ticket-categories/:id', authorizeModule('ti', 'operate'), ticketController.updateCategory);

// ---- Chamados (UC-49) — auto-serviço primeiro (ordem importa: /mine antes de /:id) ----
router.post('/tickets', ticketController.create); // público-autenticado
router.get('/tickets/mine', ticketController.mine); // público-autenticado, auto-filtrado
router.get('/tickets', authorizeModule('ti', 'operate'), ticketController.list); // fila completa
router.get('/tickets/:id', authorizeSelfOrModule('ti', 'operate', ticketController.ticketOwnershipCheck), ticketController.getById);
router.post('/tickets/:id/assign', authorizeModule('ti', 'operate'), ticketController.assign);
router.put('/tickets/:id/priority', authorizeModule('ti', 'operate'), ticketController.changePriority);
router.post('/tickets/:id/wait', authorizeModule('ti', 'operate'), ticketController.wait);
router.post('/tickets/:id/resume', authorizeModule('ti', 'operate'), ticketController.resume);
router.post('/tickets/:id/link-maintenance-order', authorizeModule('ti', 'operate'), ticketController.linkMaintenanceOrder);
router.post('/tickets/:id/resolve', authorizeModule('ti', 'operate'), ticketController.resolve);
router.post('/tickets/:id/confirm', authorizeSelfOrModule('ti', 'operate', ticketController.ticketOwnershipCheck), ticketController.confirm);
router.post('/tickets/:id/reopen', authorizeSelfOrModule('ti', 'operate', ticketController.ticketOwnershipCheck), ticketController.reopen);
router.post('/tickets/:id/cancel', authorizeModule('ti', 'operate'), ticketController.cancel);
router.get('/tickets/:id/comments', authorizeSelfOrModule('ti', 'operate', ticketController.ticketOwnershipCheck), ticketController.listComments);
router.post('/tickets/:id/comments', authorizeSelfOrModule('ti', 'operate', ticketController.ticketOwnershipCheck), ticketController.addComment);

// ---- Termo de Responsabilidade (UC-50) ----
router.get('/responsibility-terms', authorizeModule('ti', 'operate'), termController.list);
router.get('/responsibility-terms/by-employee/:employeeId', authorizeModule('ti', 'operate'), termController.byEmployee);
router.get('/responsibility-terms/pending-for-offboarding/:employeeId', authorizeModule('ti', 'operate'), termController.pendingForOffboarding);
router.get('/responsibility-terms/:id', authorizeModule('ti', 'operate'), termController.getById);
router.post('/responsibility-terms', authorizeModule('ti', 'operate'), termController.create);
router.post('/responsibility-terms/:id/return', authorizeModule('ti', 'operate'), termController.returnTerm);
router.post('/responsibility-terms/:id/lost', authorizeModule('ti', 'approve'), termController.markLost);

// ---- Licenças de Software (P3) ----
router.get('/licenses/expiring', authorizeModule('ti', 'operate'), licenseController.expiring); // antes de /:assetId
router.get('/licenses', authorizeModule('ti', 'operate'), licenseController.list);
router.get('/licenses/:assetId', authorizeModule('ti', 'operate'), licenseController.getById);
router.post('/licenses', authorizeModule('ti', 'operate'), licenseController.create);
router.put('/licenses/:assetId', authorizeModule('ti', 'operate'), licenseController.update);
router.post('/licenses/:assetId/reveal-key', authorizeModule('ti', 'operate'), licenseController.revealKey);
router.get('/licenses/:assetId/seats', authorizeModule('ti', 'operate'), licenseController.listSeats);
router.post('/licenses/:assetId/seats', authorizeModule('ti', 'operate'), licenseController.allocateSeat);
router.delete('/licenses/:assetId/seats/:seatId', authorizeModule('ti', 'operate'), licenseController.revokeSeat);
router.post('/licenses/:assetId/request-renewal', authorizeModule('ti', 'approve'), licenseController.requestRenewal);

// ---- Solicitações de Acesso (UC-51) ----
router.get('/access-requests', authorizeModule('ti', 'operate'), accessRequestController.list);
router.get('/access-requests/:id', authorizeModule('ti', 'operate'), accessRequestController.getById);
router.post('/access-requests', authorizeModule('ti', 'operate'), accessRequestController.create);
// §4.1 da API: elegível = ti:approve OU gestor do department_id da solicitação
// (mesmo sem módulo `ti` nenhum) — por isso usa authorizeSelfOrModule, não authorizeModule.
router.post('/access-requests/:id/approve', authorizeSelfOrModule('ti', 'approve', accessRequestController.approverEligibilityCheck), accessRequestController.approve);
router.post('/access-requests/:id/reject', authorizeSelfOrModule('ti', 'approve', accessRequestController.approverEligibilityCheck), accessRequestController.reject);
router.post('/access-requests/:id/execute', authorizeModule('ti', 'operate'), accessRequestController.execute);
router.post('/access-requests/:id/checklist', authorizeModule('ti', 'operate'), accessRequestController.updateChecklist);
router.post('/access-requests/:id/cancel', authorizeModule('ti', 'operate'), accessRequestController.cancel);

// ---- Backup e Continuidade (P5) ----
router.get('/backup-logs/health', authorizeModule('ti', 'operate'), backupController.health); // antes de nenhuma rota :id (não existe, mantido por padrão)
router.get('/backup-logs', authorizeModule('ti', 'operate'), backupController.list);
router.post('/backup-logs', authorizeModule('ti', 'operate'), backupController.create);

module.exports = router;
