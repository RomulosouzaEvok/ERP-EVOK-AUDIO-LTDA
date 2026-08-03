/**
 * Rotas HTTP do modulo de Laboratorio, montadas sob `/api/laboratory` em
 * `server/app.ts`.
 *
 * IMPORTANTE: a rota `GET /tests/summary` deve ser registrada ANTES de
 * qualquer rota com parametro dinamico sob `/tests` para nao ser capturada
 * por ela (nao ha `/tests/:id` neste modulo hoje, mas o padrao e mantido
 * por seguranca/consistencia com o restante do projeto).
 *
 * @module modules/laboratory/presentation/routes/laboratory
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const laboratoryController = require('../controllers/laboratoryController');

router.get('/tests/summary', authenticate, laboratoryController.getSummary);
router.get('/tests', authenticate, laboratoryController.listTests);
router.post('/tests', authenticate, authorize('admin', 'operator'), laboratoryController.createTest);

module.exports = router;
