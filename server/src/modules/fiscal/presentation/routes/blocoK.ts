const express = require('express');
const { authenticate, authorize } = require('../../../../middlewares/auth');
const blocoKController = require('../controllers/blocoKController');

const router = express.Router();

router.get('/', authenticate, authorize('admin'), blocoKController.getBlocoKPreview);

module.exports = router;
