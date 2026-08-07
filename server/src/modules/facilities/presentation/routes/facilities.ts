/**
 * Router agregador do módulo Facilities (departamento 17, sigla FAC).
 * Monta todos os grupos de recurso sob `/api/facilities` em `server/app.ts`.
 *
 * ESCOPO: Frota de veículos, Abastecimento, Programação de Limpeza e Áreas
 * Físicas — CRUD completo (create/list/get/update, sem delete — ver nota
 * de decisão na migration `20260807-000200-create-facilities-module.cjs`).
 *
 * RBAC: todas as rotas usam `authorizeModule('facilities', ...)` — leitura
 * usa o nível padrão (`operate`, mesmo padrão de `centros_de_trabalho`/
 * `sst`/`ti`, que não distinguem view de operate), escrita usa
 * `authorizeModule('facilities', 'operate')` explicitamente. Nenhuma rota
 * deste módulo usa nível `approve` — não há fluxo de aprovação crítico o
 * suficiente para justificar (módulo essencialmente de cadastro/controle).
 *
 * @module modules/facilities/presentation/routes/facilities
 */

const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const vehicleController = require('../controllers/vehicleController');
const fuelRecordController = require('../controllers/fuelRecordController');
const cleaningScheduleController = require('../controllers/cleaningScheduleController');
const areaController = require('../controllers/areaController');

router.use(authenticate);

// ---- Frota de veículos ----
router.get('/vehicles', authorizeModule('facilities'), vehicleController.list);
router.get('/vehicles/:id', authorizeModule('facilities'), vehicleController.getById);
router.post('/vehicles', authorizeModule('facilities', 'operate'), vehicleController.create);
router.put('/vehicles/:id', authorizeModule('facilities', 'operate'), vehicleController.update);

// ---- Abastecimento ----
router.get('/fuel-records', authorizeModule('facilities'), fuelRecordController.list);
router.get('/fuel-records/:id', authorizeModule('facilities'), fuelRecordController.getById);
router.post('/fuel-records', authorizeModule('facilities', 'operate'), fuelRecordController.create);
router.put('/fuel-records/:id', authorizeModule('facilities', 'operate'), fuelRecordController.update);

// ---- Programação de limpeza ----
router.get('/cleaning-schedules', authorizeModule('facilities'), cleaningScheduleController.list);
router.get('/cleaning-schedules/:id', authorizeModule('facilities'), cleaningScheduleController.getById);
router.post('/cleaning-schedules', authorizeModule('facilities', 'operate'), cleaningScheduleController.create);
router.put('/cleaning-schedules/:id', authorizeModule('facilities', 'operate'), cleaningScheduleController.update);

// ---- Áreas físicas ----
router.get('/areas', authorizeModule('facilities'), areaController.list);
router.get('/areas/:id', authorizeModule('facilities'), areaController.getById);
router.post('/areas', authorizeModule('facilities', 'operate'), areaController.create);
router.put('/areas/:id', authorizeModule('facilities', 'operate'), areaController.update);

module.exports = router;
