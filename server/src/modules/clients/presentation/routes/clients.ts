/**
 * Rotas do modulo clients.
 *
 * RETROFIT `authorizeModule('clientes')` (docs/governance/TODO.md, Bloco
 * 1.2 retrofit geral — substitui `authorize(role)` legado conforme decisão
 * de `docs/business/BUSINESS_RULES.md` §8): leituras exigem `view`
 * implicito, escritas exigem `operate`. Remoção (delete) é tratada como
 * `approve` (equivalente ao antigo `authorize('admin')` pontual).
 *
 * @module modules/clients/presentation/routes/clients
 */

import express = require('express');
const { authenticate, authorizeModule }: any = require('../../../../middlewares/auth');
const clientController: any = require('../controllers/clientController');

const router = express.Router();

router.get('/', authenticate, authorizeModule('clientes'), clientController.list);
router.get('/:id', authenticate, authorizeModule('clientes'), clientController.getById);
router.post('/', authenticate, authorizeModule('clientes', 'operate'), clientController.create);
router.put('/:id', authenticate, authorizeModule('clientes', 'operate'), clientController.update);
router.delete('/:id', authenticate, authorizeModule('clientes', 'approve'), clientController.remove);

export = router;
