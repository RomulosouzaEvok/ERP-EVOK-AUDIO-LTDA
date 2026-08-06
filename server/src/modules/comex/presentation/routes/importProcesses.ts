const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const importProcessController = require('../controllers/importProcessController');

/**
 * Rotas do modulo `comex` (Importacao/COMEX, UC-19). Todas as acoes exigem
 * o modulo `comex` atribuido ao perfil de acesso do usuario; leituras
 * aceitam qualquer nivel, escritas exigem `operate`. Diferente de
 * `rfqs.ts` (cuja adjudicacao exige `approve`), o UC-19 define um unico
 * ator (Analista de Comex) sem etapa de aprovacao por um segundo nivel —
 * por isso todas as escritas usam `operate`, sem exigir `approve`.
 */
router.get('/', authenticate, authorizeModule('comex'), importProcessController.list);
router.get('/:id', authenticate, authorizeModule('comex'), importProcessController.getById);
router.post('/', authenticate, authorizeModule('comex', 'operate'), importProcessController.create);
router.post('/:id/tracking', authenticate, authorizeModule('comex', 'operate'), importProcessController.registerTracking);
router.post('/:id/receive', authenticate, authorizeModule('comex', 'operate'), importProcessController.receive);
router.post('/:id/cancel', authenticate, authorizeModule('comex', 'operate'), importProcessController.cancel);

module.exports = router;
