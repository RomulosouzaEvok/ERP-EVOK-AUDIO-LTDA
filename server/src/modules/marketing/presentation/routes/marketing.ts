/**
 * Router agregador do módulo Marketing (departamento 14, sigla MKT).
 * Monta todos os grupos de recurso sob `/api/marketing` em `server/app.ts`.
 *
 * ESCOPO: Campanhas, Leads (com funil dedicado) e Materiais de Divulgação
 * (com upload de arquivo) — CRUD completo (create/list/get/update, sem
 * delete — mesma decisão de design do módulo Facilities, ver nota em
 * `20260807-000210-create-marketing-module.cjs`).
 *
 * RBAC: todas as rotas usam `authorizeModule('marketing', ...)` — leitura
 * usa o nível padrão (`operate`, mesmo padrão de `facilities`/
 * `centros_de_trabalho`/`sst`/`ti`, que não distinguem view de operate),
 * escrita usa `authorizeModule('marketing', 'operate')` explicitamente.
 * Nenhuma rota deste módulo usa nível `approve` — não há fluxo de aprovação
 * crítico o suficiente para justificar (módulo essencialmente de
 * cadastro/controle de funil, sem efeito colateral de estoque/financeiro).
 *
 * @module modules/marketing/presentation/routes/marketing
 */

const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const materialFileUpload = require('../middlewares/materialFileUpload');
const campaignController = require('../controllers/campaignController');
const leadController = require('../controllers/leadController');
const materialController = require('../controllers/materialController');

router.use(authenticate);

// ---- Campanhas ----
router.get('/campaigns', authorizeModule('marketing'), campaignController.list);
router.get('/campaigns/:id', authorizeModule('marketing'), campaignController.getById);
router.post('/campaigns', authorizeModule('marketing', 'operate'), campaignController.create);
router.put('/campaigns/:id', authorizeModule('marketing', 'operate'), campaignController.update);

// ---- Leads ----
router.get('/leads', authorizeModule('marketing'), leadController.list);
router.get('/leads/:id', authorizeModule('marketing'), leadController.getById);
router.post('/leads', authorizeModule('marketing', 'operate'), leadController.create);
router.put('/leads/:id', authorizeModule('marketing', 'operate'), leadController.update);
router.post('/leads/:id/status', authorizeModule('marketing', 'operate'), leadController.changeStatus);

// ---- Materiais de divulgação ----
router.get('/materials', authorizeModule('marketing'), materialController.list);
router.get('/materials/:id', authorizeModule('marketing'), materialController.getById);
router.post('/materials', authorizeModule('marketing', 'operate'), materialController.create);
router.put('/materials/:id', authorizeModule('marketing', 'operate'), materialController.update);
router.post('/materials/:id/file', authorizeModule('marketing', 'operate'), materialFileUpload.single('file'), materialController.uploadFile);

module.exports = router;
