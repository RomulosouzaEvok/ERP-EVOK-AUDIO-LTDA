const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const maintenanceController = require('../controllers/maintenanceController');

/**
 * Rotas do módulo `maintenance` (Clean Architecture), montadas sob
 * `/api/maintenance` em `server/app.ts`.
 *
 * RETROFIT `authorizeModule('manutencao')` (docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md,
 * Bloco D — substitui `authorize(role)` legado conforme o mesmo padrão já
 * aplicado ao módulo `patrimonio` em
 * `server/src/modules/assets/presentation/routes/assets.ts`): leituras
 * exigem `view` implícito, escritas exigem `operate`. Remoção (delete) é
 * tratada como `approve` (equivalente ao antigo `authorize('admin')`
 * pontual).
 */

router.get('/', authenticate, authorizeModule('manutencao'), maintenanceController.list);
router.get('/:id', authenticate, authorizeModule('manutencao'), maintenanceController.getById);
router.post('/', authenticate, authorizeModule('manutencao', 'operate'), maintenanceController.create);
router.put('/:id', authenticate, authorizeModule('manutencao', 'operate'), maintenanceController.update);
router.delete('/:id', authenticate, authorizeModule('manutencao', 'approve'), maintenanceController.remove);

module.exports = router;
