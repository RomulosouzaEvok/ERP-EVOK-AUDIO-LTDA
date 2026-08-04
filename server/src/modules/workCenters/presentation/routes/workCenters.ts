/**
 * Rotas HTTP do modulo de Centros de Trabalho.
 *
 * IMPORTANTE: a rota `GET /load` deve ser registrada ANTES de `GET /:id`
 * para nao ser capturada pelo parametro `:id`.
 *
 * RETROFIT `authorizeModule('centros_de_trabalho')` (docs/governance/TODO.md,
 * Bloco 1.2 retrofit geral — substitui `authorize(role)` legado conforme
 * decisão de `docs/business/BUSINESS_RULES.md` §8): leituras exigem `view`
 * implicito, escritas exigem `operate`.
 *
 * @module modules/workCenters/presentation/routes/workCenters
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const workCenterController = require('../controllers/workCenterController');

router.get('/load', authenticate, authorizeModule('centros_de_trabalho'), workCenterController.getLoad);
router.get('/', authenticate, authorizeModule('centros_de_trabalho'), workCenterController.list);
router.get('/:id', authenticate, authorizeModule('centros_de_trabalho'), workCenterController.getById);
router.post('/', authenticate, authorizeModule('centros_de_trabalho', 'operate'), workCenterController.create);
router.put('/:id', authenticate, authorizeModule('centros_de_trabalho', 'operate'), workCenterController.update);
router.put('/:id/shifts', authenticate, authorizeModule('centros_de_trabalho', 'operate'), workCenterController.replaceShifts);

module.exports = router;
