const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const bomController = require('../controllers/bomController');

/**
 * Rotas do módulo `bom` (Clean Architecture). Mantém exatamente o mesmo
 * contrato dos endpoints anteriores de `server/src/routes/bom.ts` (mesmos
 * paths, métodos e formato de resposta), agora montado sob o mesmo
 * prefixo `/api/engineering/bom` em `server/index.ts`, e acrescenta o novo
 * endpoint aditivo `GET /product/:productId/versions`.
 *
 * RETROFIT `authorizeModule('bom')` (docs/governance/TODO.md, Bloco 1.2
 * retrofit geral — substitui `authorize(role)` legado conforme decisão de
 * `docs/business/BUSINESS_RULES.md` §8): leituras exigem `view` implicito,
 * escritas exigem `operate`.
 */

// CRUD BOM
router.get('/', authenticate, authorizeModule('bom'), bomController.list);
router.get('/product/:productId/versions', authenticate, authorizeModule('bom'), bomController.listVersions); // NOVO - aditivo
router.get('/product/:productId', authenticate, authorizeModule('bom'), bomController.getByProduct);
router.get('/:id', authenticate, authorizeModule('bom'), bomController.getById);
router.post('/', authenticate, authorizeModule('bom', 'operate'), bomController.create);
router.put('/:id', authenticate, authorizeModule('bom', 'operate'), bomController.update);
router.delete('/:id', authenticate, authorizeModule('bom', 'operate'), bomController.remove);

// Operações de engenharia
router.get('/:id/explode', authenticate, authorizeModule('bom'), bomController.explode);
router.get('/:id/cost', authenticate, authorizeModule('bom'), bomController.cost);
router.get('/:id/availability', authenticate, authorizeModule('bom'), bomController.availability);
router.get('/:id/tree', authenticate, authorizeModule('bom'), bomController.tree);
router.get('/:id/items', authenticate, authorizeModule('bom'), bomController.listItems);

module.exports = router;


