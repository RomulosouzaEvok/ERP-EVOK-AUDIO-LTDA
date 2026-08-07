/**
 * Router agregador do módulo Jurídico (departamento 16, sigla JUR).
 * Monta todos os grupos de recurso sob `/api/legal` em `server/app.ts`.
 *
 * ESCOPO: Contratos (com upload de instrumento e endpoint de vencimento
 * próximo), Aditivos Contratuais (com upload), Lembretes de Prazo
 * Contratual e Propriedade Intelectual (com endpoint de vencimento
 * próximo) — CRUD completo (create/list/get/update, sem delete — mesma
 * decisão de design dos módulos Facilities/Marketing, ver nota de decisão
 * na migration `20260807-000220-create-legal-module.cjs`).
 *
 * RBAC: todas as rotas usam `authorizeModule('juridico', ...)` — leitura
 * usa o nível padrão (`operate`, mesmo padrão de `facilities`/`marketing`/
 * `centros_de_trabalho`/`sst`/`ti`, que não distinguem view de operate),
 * escrita usa `authorizeModule('juridico', 'operate')` explicitamente.
 * Nenhuma rota deste módulo usa nível `approve` — não há fluxo de aprovação
 * crítico o suficiente para justificar (módulo essencialmente de
 * cadastro/controle de contrato e PI, sem efeito colateral de
 * estoque/financeiro).
 *
 * Aditivos e lembretes são expostos como recursos de topo-nível filtráveis
 * por `contract_id` (não aninhados sob `/contracts/:id/...`), mesmo padrão
 * de `marketing_leads` (filtrável por `campaign_id`) e
 * `marketing_materials` (filtrável por `product_id`).
 *
 * @module modules/legal/presentation/routes/legal
 */

const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const contractFileUpload = require('../middlewares/contractFileUpload');
const contractController = require('../controllers/contractController');
const contractAddendumController = require('../controllers/contractAddendumController');
const contractReminderController = require('../controllers/contractReminderController');
const intellectualPropertyController = require('../controllers/intellectualPropertyController');

router.use(authenticate);

// ---- Contratos ----
router.get('/contracts/expiring', authorizeModule('juridico'), contractController.listExpiring);
router.get('/contracts', authorizeModule('juridico'), contractController.list);
router.get('/contracts/:id', authorizeModule('juridico'), contractController.getById);
router.post('/contracts', authorizeModule('juridico', 'operate'), contractController.create);
router.put('/contracts/:id', authorizeModule('juridico', 'operate'), contractController.update);
router.post('/contracts/:id/file', authorizeModule('juridico', 'operate'), contractFileUpload.single('file'), contractController.uploadFile);

// ---- Aditivos contratuais ----
router.get('/contract-addendums', authorizeModule('juridico'), contractAddendumController.list);
router.get('/contract-addendums/:id', authorizeModule('juridico'), contractAddendumController.getById);
router.post('/contract-addendums', authorizeModule('juridico', 'operate'), contractAddendumController.create);
router.put('/contract-addendums/:id', authorizeModule('juridico', 'operate'), contractAddendumController.update);
router.post('/contract-addendums/:id/file', authorizeModule('juridico', 'operate'), contractFileUpload.single('file'), contractAddendumController.uploadFile);

// ---- Lembretes de prazo contratual ----
router.get('/contract-reminders', authorizeModule('juridico'), contractReminderController.list);
router.get('/contract-reminders/:id', authorizeModule('juridico'), contractReminderController.getById);
router.post('/contract-reminders', authorizeModule('juridico', 'operate'), contractReminderController.create);
router.put('/contract-reminders/:id', authorizeModule('juridico', 'operate'), contractReminderController.update);

// ---- Propriedade Intelectual ----
router.get('/intellectual-property/expiring', authorizeModule('juridico'), intellectualPropertyController.listExpiring);
router.get('/intellectual-property', authorizeModule('juridico'), intellectualPropertyController.list);
router.get('/intellectual-property/:id', authorizeModule('juridico'), intellectualPropertyController.getById);
router.post('/intellectual-property', authorizeModule('juridico', 'operate'), intellectualPropertyController.create);
router.put('/intellectual-property/:id', authorizeModule('juridico', 'operate'), intellectualPropertyController.update);

module.exports = router;
