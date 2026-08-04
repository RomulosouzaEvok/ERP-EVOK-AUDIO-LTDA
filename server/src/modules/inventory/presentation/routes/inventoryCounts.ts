const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const inventoryCountController = require('../controllers/inventoryCountController');

/**
 * Rotas do submódulo `inventory-counts` (Inventário Cíclico, Fase F09),
 * montadas sob o prefixo `/api/inventory-counts` em `server/index.ts`.
 * Todas as rotas exigem JWT válido (`authenticate`).
 *
 * RETROFIT `authorizeModule('contagens')` (docs/governance/TODO.md, Bloco
 * 1.2 retrofit geral — substitui `authorize(role)` legado conforme decisão
 * de `docs/business/BUSINESS_RULES.md` §8): leituras exigem `view`
 * implicito, escritas comuns exigem `operate`. Aprovar/rejeitar contagem
 * são ações de gestor da área e exigem `approve` no perfil (o admin global
 * continua liberado pelo curto-circuito de `authorizeModule`, §3).
 */

router.post('/', authenticate, authorizeModule('contagens', 'operate'), inventoryCountController.create);
router.get('/', authenticate, authorizeModule('contagens'), inventoryCountController.list);
router.get('/:id', authenticate, authorizeModule('contagens'), inventoryCountController.getById);
router.post('/:id/start', authenticate, authorizeModule('contagens', 'operate'), inventoryCountController.start);
router.post('/:id/items/:itemId/count', authenticate, authorizeModule('contagens', 'operate'), inventoryCountController.countItem);
router.post('/:id/submit', authenticate, authorizeModule('contagens', 'operate'), inventoryCountController.submit);
router.post('/:id/approve', authenticate, authorizeModule('contagens', 'approve'), inventoryCountController.approve);
router.post('/:id/reject', authenticate, authorizeModule('contagens', 'approve'), inventoryCountController.reject);

module.exports = router;


