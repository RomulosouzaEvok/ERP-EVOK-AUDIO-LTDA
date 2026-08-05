const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const serviceOrderController = require('../controllers/serviceOrderController');

/**
 * Rotas do módulo `serviceOrders` (Clean Architecture), montadas sob
 * `/api/service-orders` em `server/app.ts`.
 *
 * RETROFIT `authorizeModule('garantia')` (docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md,
 * Bloco D — substitui `authorize(role)` legado conforme o mesmo padrão já
 * aplicado ao módulo `patrimonio` em
 * `server/src/modules/assets/presentation/routes/assets.ts`): leituras
 * exigem `view` implícito, escritas exigem `operate`. Remoção (delete) é
 * tratada como `approve` (equivalente ao antigo `authorize('admin')`
 * pontual).
 */

router.get('/', authenticate, authorizeModule('garantia'), serviceOrderController.list);
router.get('/:id', authenticate, authorizeModule('garantia'), serviceOrderController.getById);
router.post('/', authenticate, authorizeModule('garantia', 'operate'), serviceOrderController.create);
router.put('/:id', authenticate, authorizeModule('garantia', 'operate'), serviceOrderController.update);
router.delete('/:id', authenticate, authorizeModule('garantia', 'approve'), serviceOrderController.remove);

module.exports = router;
