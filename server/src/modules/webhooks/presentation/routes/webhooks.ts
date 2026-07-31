import express from 'express';
const webhookController = require('../controllers/webhookController');

/**
 * Rotas do módulo `webhooks` (Clean Architecture), montadas sob
 * `/api/webhooks` em `server/app.ts`. Sem `authenticate`/`authorize` — é um
 * webhook de sistema externo (n8n), mesmo comportamento do roteador legado
 * (`server/src/routes/webhooks.ts`).
 */
const router = express.Router();

router.post('/n8n', webhookController.n8n);
router.post('/focus-nfe', webhookController.focusNfeStatusChange);

export default router;
module.exports = router;
