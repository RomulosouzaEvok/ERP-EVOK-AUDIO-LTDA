const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const nonConformityController = require('../controllers/nonConformityController');

/**
 * Rotas do módulo `nonConformities` (Clean Architecture), montadas sob
 * `/api/quality/non-conformities` em `server/app.ts`.
 *
 * RETROFIT `authorizeModule('qualidade')` (docs/governance/TODO.md, Bloco
 * 1.2 retrofit geral — substitui `authorize(role)` legado conforme decisão
 * de `docs/business/BUSINESS_RULES.md` §8): leituras exigem `view`
 * implicito, escritas exigem `operate`. Remoção (delete) é tratada como
 * `approve` (equivalente ao antigo `authorize('admin')` pontual).
 */

router.get('/', authenticate, authorizeModule('qualidade'), nonConformityController.list);
router.get('/:id', authenticate, authorizeModule('qualidade'), nonConformityController.getById);
router.post('/', authenticate, authorizeModule('qualidade', 'operate'), nonConformityController.create);
router.put('/:id', authenticate, authorizeModule('qualidade', 'operate'), nonConformityController.update);
router.delete('/:id', authenticate, authorizeModule('qualidade', 'approve'), nonConformityController.remove);

module.exports = router;
