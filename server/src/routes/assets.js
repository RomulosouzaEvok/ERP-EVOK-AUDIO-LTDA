const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const assetController = require('../controllers/assetController');

// Rota específica ANTES de /:id para evitar conflito
router.get('/qr-code', authenticate, assetController.getByQRCode);
router.get('/', authenticate, assetController.list);
router.get('/:id', authenticate, assetController.getById);
router.post('/', authenticate, authorize('admin'), assetController.create);
router.put('/:id', authenticate, authorize('admin'), assetController.update);
router.delete('/:id', authenticate, authorize('admin'), assetController.remove);
router.post('/:id/qrcode', authenticate, assetController.generateQRCode);

module.exports = router;
