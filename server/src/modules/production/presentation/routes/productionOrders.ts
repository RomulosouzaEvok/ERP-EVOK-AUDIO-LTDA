/**
 * Rotas do modulo production.
 *
 * RETROFIT `authorizeModule` (docs/governance/TODO.md, Bloco 1.2 retrofit
 * geral — substitui `authorize(role)` legado conforme decisão de
 * `docs/business/BUSINESS_RULES.md` §8): rotas de OP (Ordem de Produção)
 * mapeiam para o módulo `producao` (leitura = `view` implicito, escrita
 * comum = `operate`; remoção tratada como `approve`, equivalente ao antigo
 * `authorize('admin')` pontual). Rotas de apontamento/tracking do chão de
 * fábrica (`/tracking/*`, `/:id/tracking`) pertencem ao módulo de
 * permissão `chao_de_fabrica` (módulo dono da ação, ver
 * `BUSINESS_RULES.md` §4).
 *
 * @module modules/production/presentation/routes/productionOrders
 */

import express = require('express');
const { authenticate, authorizeModule }: any = require('../../../../middlewares/auth');
const productionOrderController: any = require('../controllers/productionOrderController');

const router = express.Router();

router.get('/', authenticate, authorizeModule('producao'), productionOrderController.list);
router.get('/report', authenticate, authorizeModule('producao'), productionOrderController.getProductionReport);
router.post('/tracking/:trackingId/start', authenticate, authorizeModule('chao_de_fabrica', 'operate'), productionOrderController.startTracking);
router.post('/tracking/:trackingId/complete', authenticate, authorizeModule('chao_de_fabrica', 'operate'), productionOrderController.completeTracking);
router.get('/:id/tracking', authenticate, authorizeModule('chao_de_fabrica'), productionOrderController.listTracking);
router.post('/:id/tracking', authenticate, authorizeModule('chao_de_fabrica', 'operate'), productionOrderController.createTracking);
router.get('/:id', authenticate, authorizeModule('producao'), productionOrderController.getById);
router.post('/', authenticate, authorizeModule('producao', 'operate'), productionOrderController.create);
router.put('/:id', authenticate, authorizeModule('producao', 'operate'), productionOrderController.update);
router.put('/:id/status', authenticate, authorizeModule('producao', 'operate'), productionOrderController.updateStatus);
router.delete('/:id', authenticate, authorizeModule('producao', 'approve'), productionOrderController.remove);

export = router;
