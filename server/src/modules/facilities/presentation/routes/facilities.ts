/**
 * Router agregador do módulo Facilities (departamento 17, sigla FAC).
 * Monta todos os grupos de recurso sob `/api/facilities` em `server/app.ts`.
 *
 * BLOCO 4 FAC (correção, 2026-08-07): reescrito para os 60 endpoints do
 * contrato `docs/business/BLOCO_4_FAC_API.md` — frota como extensão de
 * `Asset` (D-2, BREAKING), condutor, diário de uso, abastecimento,
 * documento de veículo, multa, manutenção predial (D-1, sobre
 * `maintenance_orders` existente), visitante/visita, correspondência,
 * limpeza plano×execução, reserva de recursos.
 *
 * RBAC: nível `approve` (RF-FAC-057) protege: liberação de saída com doc
 * vencido, aprovação de divergência de odômetro (embutida em `.../depart`,
 * checada no controller/use-case), suspensão de condutor,
 * indicação/pagamento de multa, plano de limpeza (create/update). Chamado
 * predial: abertura é auto-serviço (`authenticate` apenas, RF-FAC-040);
 * leitura usa `authorizeAnyModule(['manutencao','facilities'])` (achado 9
 * da auditoria — `authorizeModule` só aceita um módulo por vez).
 *
 * @module modules/facilities/presentation/routes/facilities
 */

const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const { authorizeAnyModule } = require('../../../../middlewares/authorizeAnyModule');

const vehicleController = require('../controllers/vehicleController');
const fuelRecordController = require('../controllers/fuelRecordController');
const cleaningScheduleController = require('../controllers/cleaningScheduleController');
const cleaningExecutionController = require('../controllers/cleaningExecutionController');
const areaController = require('../controllers/areaController');
const driverController = require('../controllers/driverController');
const tripController = require('../controllers/tripController');
const fineController = require('../controllers/fineController');
const maintenanceTicketController = require('../controllers/maintenanceTicketController');
const visitorController = require('../controllers/visitorController');
const visitController = require('../controllers/visitController');
const correspondenceController = require('../controllers/correspondenceController');
const reservationController = require('../controllers/reservationController');

router.use(authenticate);

// ---- Grupo 1: Frota — Veículo (extensão de Asset, D-2) + Documento (§2) ----
router.get('/vehicles', authorizeModule('facilities'), vehicleController.list);
router.get('/vehicles/:assetId', authorizeModule('facilities'), vehicleController.getById);
router.post('/vehicles', authorizeModule('facilities', 'operate'), vehicleController.create);
router.put('/vehicles/:assetId', authorizeModule('facilities', 'operate'), vehicleController.update);
router.get('/vehicles/:assetId/documents', authorizeModule('facilities'), vehicleController.listDocuments);
router.post('/vehicles/:assetId/documents', authorizeModule('facilities', 'operate'), vehicleController.createDocument);
router.post('/vehicles/:assetId/documents/:docId/renew', authorizeModule('facilities', 'operate'), vehicleController.renewDocument);
router.post('/vehicles/:assetId/documents/:docId/release', authorizeModule('facilities', 'approve'), vehicleController.releaseDocument);

// ---- Grupo 2: Condutor (§3) ----
router.get('/drivers', authorizeModule('facilities'), driverController.list);
router.get('/drivers/:id', authorizeModule('facilities'), driverController.getById);
router.post('/drivers', authorizeModule('facilities', 'operate'), driverController.create);
router.put('/drivers/:id', authorizeModule('facilities', 'operate'), driverController.update);
router.post('/drivers/:id/authorize', authorizeModule('facilities', 'operate'), driverController.authorize);
router.post('/drivers/:id/suspend', authorizeModule('facilities', 'approve'), driverController.suspend);

// ---- Grupo 3: Diário de Uso (trips) + Abastecimento (fuel-records) (§4) ----
router.get('/trips', authorizeModule('facilities'), tripController.list);
router.get('/trips/:id', authorizeModule('facilities'), tripController.getById);
router.post('/trips', authorizeModule('facilities', 'operate'), tripController.create);
router.post('/trips/:id/depart', authorizeModule('facilities', 'operate'), tripController.depart);
router.post('/trips/:id/return', authorizeModule('facilities', 'operate'), tripController.return);
router.post('/trips/:id/cancel', authorizeModule('facilities', 'operate'), tripController.cancel);

router.get('/fuel-records', authorizeModule('facilities'), fuelRecordController.list);
router.get('/fuel-records/:id', authorizeModule('facilities'), fuelRecordController.getById);
router.post('/fuel-records', authorizeModule('facilities', 'operate'), fuelRecordController.create);
router.put('/fuel-records/:id', authorizeModule('facilities', 'operate'), fuelRecordController.update);

// ---- Grupo 4: Multa (§5) ----
router.get('/fines', authorizeModule('facilities'), fineController.list);
router.get('/fines/:id', authorizeModule('facilities'), fineController.getById);
router.post('/fines', authorizeModule('facilities', 'operate'), fineController.create);
router.get('/fines/:id/suggested-driver', authorizeModule('facilities'), fineController.suggestedDriver);
router.post('/fines/:id/indicate', authorizeModule('facilities', 'approve'), fineController.indicate);
router.post('/fines/:id/appeal', authorizeModule('facilities', 'operate'), fineController.appeal);
router.post('/fines/:id/pay', authorizeModule('facilities', 'approve'), fineController.pay);
router.post('/fines/:id/charge-driver', authorizeModule('facilities', 'operate'), fineController.chargeDriver);

// ---- Grupo 5: Manutenção Predial (D-1, sobre maintenance_orders) (§6) ----
router.get('/maintenance-tickets', authorizeAnyModule([{ moduleKey: 'manutencao' }, { moduleKey: 'facilities' }]), maintenanceTicketController.list);
router.get('/maintenance-tickets/:id', authorizeAnyModule([{ moduleKey: 'manutencao' }, { moduleKey: 'facilities' }]), maintenanceTicketController.getById);
// Abertura de chamado: auto-serviço, apenas `authenticate` (já aplicado acima) — RF-FAC-040.
router.post('/maintenance-tickets', maintenanceTicketController.create);
router.post('/maintenance-tickets/:id/triage', authorizeModule('facilities', 'operate'), maintenanceTicketController.triage);
router.post('/maintenance-tickets/:id/execute', authorizeModule('facilities', 'operate'), maintenanceTicketController.execute);
router.post('/maintenance-tickets/:id/close', authorizeModule('facilities', 'operate'), maintenanceTicketController.close);
router.post('/maintenance-tickets/:id/generate-preventive', authorizeModule('facilities', 'operate'), maintenanceTicketController.generatePreventive);

// ---- Grupo 7: Visitantes e Correspondência (§8) ----
router.get('/visitors', authorizeModule('facilities'), visitorController.list);
router.post('/visitors', authorizeModule('facilities', 'operate'), visitorController.create);

router.get('/visits/onsite-overdue', authorizeModule('facilities'), visitController.onsiteOverdue);
router.get('/visits', authorizeModule('facilities'), visitController.list);
router.get('/visits/:id', authorizeModule('facilities'), visitController.getById);
router.post('/visits', authorizeModule('facilities', 'operate'), visitController.create);
router.post('/visits/:id/checkout', authorizeModule('facilities', 'operate'), visitController.checkout);

router.get('/correspondences', authorizeModule('facilities'), correspondenceController.list);
router.post('/correspondences', authorizeModule('facilities', 'operate'), correspondenceController.create);
router.post('/correspondences/:id/deliver', authorizeModule('facilities', 'operate'), correspondenceController.deliver);

// ---- Grupo 8: Limpeza — Plano × Execução (§9) ----
router.get('/cleaning-schedules', authorizeModule('facilities'), cleaningScheduleController.list);
router.get('/cleaning-schedules/:id', authorizeModule('facilities'), cleaningScheduleController.getById);
router.get('/cleaning-schedules/:id/adherence', authorizeModule('facilities'), cleaningScheduleController.adherence);
router.post('/cleaning-schedules', authorizeModule('facilities', 'approve'), cleaningScheduleController.create);
router.put('/cleaning-schedules/:id', authorizeModule('facilities', 'approve'), cleaningScheduleController.update);

router.get('/cleaning-executions', authorizeModule('facilities'), cleaningExecutionController.list);
router.post('/cleaning-executions', authorizeModule('facilities', 'operate'), cleaningExecutionController.create);

// ---- Grupo 9: Reserva de Recursos (P2) (§10) ----
router.get('/resource-reservations', authorizeModule('facilities'), reservationController.list);
router.get('/resource-reservations/:id', authorizeModule('facilities'), reservationController.getById);
router.post('/resource-reservations', authorizeModule('facilities', 'operate'), reservationController.create);
router.post('/resource-reservations/:id/cancel', authorizeModule('facilities', 'operate'), reservationController.cancel);

// ---- Áreas físicas (mantido, sem mudança de contrato) ----
router.get('/areas', authorizeModule('facilities'), areaController.list);
router.get('/areas/:id', authorizeModule('facilities'), areaController.getById);
router.post('/areas', authorizeModule('facilities', 'operate'), areaController.create);
router.put('/areas/:id', authorizeModule('facilities', 'operate'), areaController.update);

module.exports = router;
