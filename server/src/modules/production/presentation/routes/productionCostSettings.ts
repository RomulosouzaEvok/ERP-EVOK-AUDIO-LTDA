const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const productionCostSettingsController = require('../controllers/productionCostSettingsController');

/**
 * Rotas da configuracao singleton de custeio de producao.
 *
 * Leitura exige apenas o modulo `producao`; escrita exige `operate`.
 */

router.get('/', authenticate, authorizeModule('producao'), productionCostSettingsController.get);
router.put('/', authenticate, authorizeModule('producao', 'operate'), productionCostSettingsController.upsert);

module.exports = router;
