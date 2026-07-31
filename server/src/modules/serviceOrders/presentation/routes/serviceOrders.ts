const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const serviceOrderController = require('../controllers/serviceOrderController');

/**
 * Rotas do módulo `serviceOrders` (Clean Architecture), montadas sob
 * `/api/service-orders` em `server/app.ts`. Mantém exatamente o mesmo RBAC
 * do roteador legado (`server/src/routes/serviceOrders.ts`).
 */

router.get('/', authenticate, serviceOrderController.list);
router.get('/:id', authenticate, serviceOrderController.getById);
router.post('/', authenticate, authorize('admin', 'operator'), serviceOrderController.create);
router.put('/:id', authenticate, authorize('admin', 'operator'), serviceOrderController.update);
router.delete('/:id', authenticate, authorize('admin'), serviceOrderController.remove);

module.exports = router;
