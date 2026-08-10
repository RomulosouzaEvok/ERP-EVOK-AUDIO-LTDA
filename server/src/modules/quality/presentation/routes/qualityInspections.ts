const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const qualityInspectionController = require('../controllers/qualityInspectionController');

/**
 * Rotas do registro de inspeção de qualidade (G7), montadas sob
 * `/api/quality` em `server/app.ts` — ao lado de
 * `/api/quality/non-conformities`, que já existia.
 *
 * RBAC (`authorizeModule('qualidade')`, `docs/business/BUSINESS_RULES.md` §8):
 * - leitura exige `view` implícito;
 * - registrar inspeção exige `operate` — é o ato do inspetor;
 * - **liberar o lote continua exigindo `qualidade:approve`**, na rota que já
 *   existe (`POST /api/inventory/lots/:id/release`). A separação é
 *   deliberada: inspecionar (evidência) e autorizar a liberação (decisão)
 *   são atos distintos na ISO 9001 §8.6, e agora são também níveis de
 *   permissão distintos.
 *
 * @module modules/quality/presentation/routes/qualityInspections
 */

router.get('/inspections', authenticate, authorizeModule('qualidade'), qualityInspectionController.list);
router.post('/inspections', authenticate, authorizeModule('qualidade', 'operate'), qualityInspectionController.create);
router.get('/lots/:lotId/release-eligibility', authenticate, authorizeModule('qualidade'), qualityInspectionController.getLotReleaseEligibility);

module.exports = router;
