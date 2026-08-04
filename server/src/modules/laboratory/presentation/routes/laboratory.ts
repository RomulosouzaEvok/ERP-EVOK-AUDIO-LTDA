/**
 * Rotas HTTP do modulo de Laboratorio, montadas sob `/api/laboratory` em
 * `server/app.ts`.
 *
 * IMPORTANTE: a rota `GET /tests/summary` deve ser registrada ANTES de
 * qualquer rota com parametro dinamico sob `/tests` para nao ser capturada
 * por ela (nao ha `/tests/:id` neste modulo hoje, mas o padrao e mantido
 * por seguranca/consistencia com o restante do projeto).
 *
 * PILOTO `authorizeModule('laboratorio')` (Bloco 1.2, aditivo — NAO
 * substitui `authorize(role)` legado, compoe em camada conforme
 * `docs/business/BUSINESS_RULES.md` §8): leituras exigem `view` implicito
 * (qualquer nivel presente), escritas exigem `operate`. O retrofit dos
 * demais modulos e tarefa propria do `docs/governance/TODO.md`.
 *
 * @module modules/laboratory/presentation/routes/laboratory
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize, authorizeModule } = require('../../../../middlewares/auth');
const laboratoryController = require('../controllers/laboratoryController');

router.get('/tests/summary', authenticate, authorizeModule('laboratorio'), laboratoryController.getSummary);
router.get('/tests', authenticate, authorizeModule('laboratorio'), laboratoryController.listTests);
router.post('/tests', authenticate, authorizeModule('laboratorio', 'operate'), authorize('admin', 'operator'), laboratoryController.createTest);

module.exports = router;
