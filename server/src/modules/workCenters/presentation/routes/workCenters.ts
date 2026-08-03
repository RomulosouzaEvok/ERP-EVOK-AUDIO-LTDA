/**
 * Rotas HTTP do modulo de Centros de Trabalho.
 *
 * IMPORTANTE: a rota `GET /load` deve ser registrada ANTES de `GET /:id`
 * para nao ser capturada pelo parametro `:id`.
 *
 * @module modules/workCenters/presentation/routes/workCenters
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const workCenterController = require('../controllers/workCenterController');

router.get('/load', authenticate, workCenterController.getLoad);
router.get('/', authenticate, workCenterController.list);
router.get('/:id', authenticate, workCenterController.getById);
router.post('/', authenticate, authorize('admin', 'operator'), workCenterController.create);
router.put('/:id', authenticate, authorize('admin', 'operator'), workCenterController.update);
router.put('/:id/shifts', authenticate, authorize('admin', 'operator'), workCenterController.replaceShifts);

module.exports = router;
