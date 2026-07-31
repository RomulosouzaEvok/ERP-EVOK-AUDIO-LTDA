const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const bomController = require('../controllers/bomController');

/**
 * Rotas do módulo `bom` (Clean Architecture). Mantém exatamente o mesmo
 * contrato dos 11 endpoints anteriors de `server/src/routes/bom.ts` (mesmos
 * paths, métodos e formato de resposta), agora montado sob o mesmo
 * prefixo `/api/engineering/bom` em `server/index.ts`, e acrescenta o novo
 * endpoint aditivo `GET /product/:productId/versions`.
 */

// CRUD BOM
router.get('/', authenticate, bomController.list);
router.get('/product/:productId/versions', authenticate, bomController.listVersions); // NOVO - aditivo
router.get('/product/:productId', authenticate, bomController.getByProduct);
router.get('/:id', authenticate, bomController.getById);
router.post('/', authenticate, authorize('admin', 'operator'), bomController.create);
router.put('/:id', authenticate, authorize('admin', 'operator'), bomController.update);
router.delete('/:id', authenticate, authorize('admin', 'operator'), bomController.remove);

// Operações de engenharia
router.get('/:id/explode', authenticate, bomController.explode);
router.get('/:id/cost', authenticate, bomController.cost);
router.get('/:id/availability', authenticate, bomController.availability);
router.get('/:id/tree', authenticate, bomController.tree);
router.get('/:id/items', authenticate, bomController.listItems);

module.exports = router;


