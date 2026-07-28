const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const clientController = require('../controllers/clientController');

router.get('/', authenticate, clientController.list);
router.get('/:id', authenticate, clientController.getById);
router.post('/', authenticate, clientController.create);
router.put('/:id', authenticate, clientController.update);
router.delete('/:id', authenticate, clientController.remove);

module.exports = router;

