const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const purchaseController = require('../controllers/purchaseController');
const fiscalController = require('../../../fiscal/presentation/controllers/fiscalController');

/**
 * Rotas do módulo `purchases` (Clean Architecture). Mantém exatamente o
 * mesmo contrato dos endpoints anteriores de `server/src/routes/purchases.ts`
 * (mesmos paths, métodos e formato de resposta), agora montado sob o mesmo
 * prefixo `/api/purchases` em `server/index.ts`.
 *
 * RETROFIT `authorizeModule` (docs/governance/TODO.md, Bloco 1.2 retrofit
 * geral — substitui `authorize(role)` legado conforme decisão de
 * `docs/business/BUSINESS_RULES.md` §8): a maior parte das rotas pertence
 * ao módulo `compras` (leitura = `view` implicito, escrita comum =
 * `operate`). ATENÇÃO: `POST /:id/receive` é fisicamente parte deste
 * router mas pertence ao módulo de permissão `recebimento` (rota
 * dono-da-ação diferente do módulo de origem, ver `BUSINESS_RULES.md` §4 —
 * "a checagem de autorização é sempre avaliada pelo módulo dono da ação
 * sendo executada").
 */

router.get('/', authenticate, authorizeModule('compras'), purchaseController.list);
// Rota especifica ANTES de '/:id' para nao ser capturada pela rota
// parametrizada (Express casaria '/cockpit' com ':id' = 'cockpit' senao).
router.get('/cockpit', authenticate, authorizeModule('compras'), purchaseController.cockpit);
router.get('/:id', authenticate, authorizeModule('compras'), purchaseController.getById);
router.post('/', authenticate, authorizeModule('compras', 'operate'), purchaseController.create);
router.put('/:id', authenticate, authorizeModule('compras', 'operate'), purchaseController.update);
router.put('/:id/status', authenticate, authorizeModule('compras', 'operate'), purchaseController.updateStatus);
router.post('/:id/receive', authenticate, authorizeModule('recebimento', 'operate'), purchaseController.receiveItems);
router.post('/:id/nfe', authenticate, authorizeModule('compras', 'operate'), fiscalController.registerIncomingNfe);

module.exports = router;


