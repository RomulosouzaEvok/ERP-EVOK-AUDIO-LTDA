/**
 * Rotas de Paradas de Máquina/Centro de Trabalho (downtime).
 *
 * Módulo de permissão `chao_de_fabrica` (mesmo módulo do apontamento de
 * etapas de OP, ver `productionOrders.ts`) — quem aponta produção também
 * registra e encerra paradas do centro de trabalho.
 *
 * @module modules/production/presentation/routes/productionDowntimes
 */

import express = require('express');
const { authenticate, authorizeModule }: any = require('../../../../middlewares/auth');
const productionDowntimeController: any = require('../controllers/productionDowntimeController');

const router = express.Router();

router.get('/', authenticate, authorizeModule('chao_de_fabrica'), productionDowntimeController.list);
router.post('/', authenticate, authorizeModule('chao_de_fabrica', 'operate'), productionDowntimeController.open);
router.put('/:id/finish', authenticate, authorizeModule('chao_de_fabrica', 'operate'), productionDowntimeController.finish);

export = router;
