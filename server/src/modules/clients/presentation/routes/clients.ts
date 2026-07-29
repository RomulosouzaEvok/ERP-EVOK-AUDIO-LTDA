/**
 * Rotas do modulo clients.
 *
 * @module modules/clients/presentation/routes/clients
 */

import express = require('express');
const { authenticate }: any = require('../../../../middlewares/auth');
const clientController: any = require('../controllers/clientController');

const router = express.Router();

router.get('/', authenticate, clientController.list);
router.get('/:id', authenticate, clientController.getById);
router.post('/', authenticate, clientController.create);
router.put('/:id', authenticate, clientController.update);
router.delete('/:id', authenticate, clientController.remove);

export = router;
