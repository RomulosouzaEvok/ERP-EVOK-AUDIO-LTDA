const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const itemController = require('../controllers/itemController');

/**
 * Rotas do modulo canonico de itens industriais.
 *
 * RETROFIT `authorizeModule('produtos')` (docs/governance/TODO.md, Bloco
 * 1.2 retrofit geral — item mestre mapeado ao mesmo modulo de permissao de
 * `products`, substitui `authorize(role)` legado conforme decisao de
 * `docs/business/BUSINESS_RULES.md` §8): leituras exigem `view` implicito
 * (qualquer nivel presente), escritas exigem `operate`.
 */
router.get('/', authenticate, authorizeModule('produtos'), itemController.list);
router.post('/', authenticate, authorizeModule('produtos', 'operate'), itemController.create);
router.post('/:id/estrutura', authenticate, authorizeModule('produtos', 'operate'), itemController.createStructure);
router.get('/:id/estrutura/explode', authenticate, authorizeModule('produtos'), itemController.explode);
router.patch('/:id/inactivate', authenticate, authorizeModule('produtos', 'operate'), itemController.inactivate);
router.delete('/:id', authenticate, authorizeModule('produtos', 'operate'), itemController.inactivate);

router.get('/:id/suppliers', authenticate, authorizeModule('produtos'), itemController.listSuppliers);
router.post('/:id/suppliers', authenticate, authorizeModule('produtos', 'operate'), itemController.createSupplier);
router.put('/:id/suppliers/:linkId', authenticate, authorizeModule('produtos', 'operate'), itemController.updateSupplier);
router.delete('/:id/suppliers/:linkId', authenticate, authorizeModule('produtos', 'operate'), itemController.removeSupplier);
router.get('/:id/purchase-history', authenticate, authorizeModule('produtos'), itemController.getPurchaseHistory);

module.exports = router;
