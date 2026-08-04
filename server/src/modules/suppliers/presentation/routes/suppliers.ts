const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const supplierController = require('../controllers/supplierController');

/**
 * Rotas do módulo `suppliers` (Clean Architecture), montadas sob `/api/suppliers`
 * em `server/index.ts`.
 *
 * RETROFIT `authorizeModule('fornecedores')` (docs/governance/TODO.md,
 * Bloco 1.2 retrofit geral — substitui `authorize(role)` legado conforme
 * decisão de `docs/business/BUSINESS_RULES.md` §8): leituras exigem `view`
 * implicito, escritas exigem `operate`. Remoção (delete) é tratada como
 * `approve` (equivalente ao antigo `authorize('admin')` pontual).
 */

router.get('/', authenticate, authorizeModule('fornecedores'), supplierController.list);
router.get('/:id', authenticate, authorizeModule('fornecedores'), supplierController.getById);
router.get('/:id/items', authenticate, authorizeModule('fornecedores'), supplierController.listItems);
router.post('/', authenticate, authorizeModule('fornecedores', 'operate'), supplierController.create);
router.put('/:id', authenticate, authorizeModule('fornecedores', 'operate'), supplierController.update);
router.delete('/:id', authenticate, authorizeModule('fornecedores', 'approve'), supplierController.remove);

module.exports = router;


