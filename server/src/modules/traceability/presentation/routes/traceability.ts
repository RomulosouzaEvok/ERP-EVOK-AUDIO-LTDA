/**
 * Rotas do modulo de rastreabilidade industrial.
 *
 * @module modules/traceability/presentation/routes/traceability
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../../middlewares/auth');
const traceabilityController = require('../controllers/traceabilityController');

/**
 * Rotas publicas de consulta de rastreabilidade (autenticacao obrigatoria).
 */
router.get('/items/:id', authenticate, traceabilityController.getItemTraceability);
router.get('/lots/:id', authenticate, traceabilityController.getLotTraceability);
router.get('/production-orders/:id', authenticate, traceabilityController.getProductionOrderTraceability);

module.exports = router;

