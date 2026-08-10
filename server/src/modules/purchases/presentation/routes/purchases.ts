const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const { authorizeAnyModule } = require('../../../../middlewares/authorizeAnyModule');
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
 *
 * G11 (alçada de aprovação de compra por ORIGEM, decisão D-C do dono do
 * produto em 2026-08-10) acrescenta 2 rotas com módulo dono DIFERENTE de
 * `compras`, pelo mesmo motivo do Jurídico (RF-JUR-003): quem aprova a
 * alçada é a DIRETORIA, que não necessariamente tem o módulo `compras`.
 * - `POST /:id/approve` → `authorizeModule('diretor')`: registrar a
 *   aprovação de alçada é ação exclusiva do papel `diretor`. Um usuário de
 *   `compras` (mesmo com `approve`) não consegue registrá-la.
 * - `GET /:id/approvals` → `compras` OU `diretor` (leitura da situação da
 *   alçada, necessária dos dois lados).
 * Aprovar o PEDIDO em si (`PUT /:id/status`) continua em
 * `authorizeModule('compras', 'operate')` — a alçada é verificada DENTRO do
 * use case (`ChangePurchaseStatusUseCase`), consultando as aprovações já
 * registradas, e não como um nível de RBAC extra na rota de status.
 */

router.get('/', authenticate, authorizeModule('compras'), purchaseController.list);
// Rota especifica ANTES de '/:id' para nao ser capturada pela rota
// parametrizada (Express casaria '/cockpit' com ':id' = 'cockpit' senao).
router.get('/cockpit', authenticate, authorizeModule('compras'), purchaseController.cockpit);
router.get('/:id', authenticate, authorizeModule('compras'), purchaseController.getById);
router.post('/', authenticate, authorizeModule('compras', 'operate'), purchaseController.create);
router.put('/:id', authenticate, authorizeModule('compras', 'operate'), purchaseController.update);
router.put('/:id/status', authenticate, authorizeModule('compras', 'operate'), purchaseController.updateStatus);
// G11 — alçada de aprovação por origem/valor (ver cabeçalho).
router.post('/:id/approve', authenticate, authorizeModule('diretor'), purchaseController.approveAuthority);
router.get('/:id/approvals', authenticate, authorizeAnyModule([{ moduleKey: 'compras' }, { moduleKey: 'diretor' }]), purchaseController.listApprovals);
router.post('/:id/receive', authenticate, authorizeModule('recebimento', 'operate'), purchaseController.receiveItems);
router.post('/:id/nfe', authenticate, authorizeModule('compras', 'operate'), fiscalController.registerIncomingNfe);

module.exports = router;


