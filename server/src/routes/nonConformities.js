const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const ncController = require('../controllers/nonConformityController');

router.get('/', auth, ncController.list);
router.get('/report', auth, ncController.getReport);
router.get('/:id', auth, ncController.getById);
router.post('/', auth, ncController.create);
router.put('/:id', auth, ncController.update);
router.patch('/:id/status', auth, ncController.updateStatus);

module.exports = router;

