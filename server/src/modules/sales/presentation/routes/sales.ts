const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const saleController = require('../controllers/saleController');
const fiscalController = require('../../../fiscal/presentation/controllers/fiscalController');

/**
 * Rotas do módulo `sales` (Clean Architecture). Mantém exatamente o mesmo
 * contrato dos endpoints anteriores de `server/src/routes/sales.ts` (mesmos
 * paths, métodos e formato de resposta), agora montado sob o mesmo prefixo
 * `/api/sales` em `server/index.ts`.
 *
 * RETROFIT `authorizeModule('vendas')` (docs/governance/TODO.md, Bloco 1.2
 * retrofit geral — substitui `authorize(role)` legado conforme decisão de
 * `docs/business/BUSINESS_RULES.md` §8): leituras exigem `view` implicito,
 * escritas exigem `operate`.
 *
 * UC-41 / BUSINESS_RULES.md §11 (Bloco 5, DECIDIDO 2026-08-03): emissão
 * **e** cancelamento de NF-e exigem nível `approve` (gestor) do módulo
 * `vendas` — sem distinção entre as duas operações, mesma fórmula de
 * `authorizeModule('vendas', 'approve')` para ambas. `GET .../nfe`
 * (consulta de status) permanece em `view`/`operate` implícito — não é uma
 * ação de aprovação.
 *
 * PENDÊNCIA registrada (ver enunciado da tarefa/`docs/governance/TODO.md`):
 * `PUT /:id/status` é usado tanto para transições operacionais comuns
 * quanto para a transição `shipped` (que, na matriz de negócio, seria de
 * responsabilidade do módulo `expedicao`). Não é possível diferenciar por
 * payload na definição da rota sem inspecionar o body em tempo de
 * middleware — a rota inteira permanece mapeada em `vendas` por ora; a
 * segregação fina de `shipped` → `expedicao` fica para decisão futura.
 */

router.get('/', authenticate, authorizeModule('vendas'), saleController.list);

// Gap 1/3 ("Tabela de preços por cliente"): rotas sob /customers/:id/prices,
// sem colisão com /:id (3 segmentos vs 1) independente da ordem de
// declaração — mantidas antes por clareza.
router.get('/customers/:id/prices', authenticate, authorizeModule('vendas'), saleController.listCustomerPrices);
router.post('/customers/:id/prices', authenticate, authorizeModule('vendas', 'operate'), saleController.createCustomerPrice);
router.put('/customers/:id/prices/:priceId', authenticate, authorizeModule('vendas', 'operate'), saleController.updateCustomerPrice);
router.delete('/customers/:id/prices/:priceId', authenticate, authorizeModule('vendas', 'operate'), saleController.deactivateCustomerPrice);

router.get('/:id', authenticate, authorizeModule('vendas'), saleController.getById);
router.post('/', authenticate, authorizeModule('vendas', 'operate'), saleController.create);
router.put('/:id/status', authenticate, authorizeModule('vendas', 'operate'), saleController.updateStatus);
// Gap 2/3 ("Alteração de pedido"): substitui o conjunto de itens de uma
// venda quote/confirmed (bloqueado a partir de partially_invoiced/invoiced
// pelo use case, ver EditSaleItemsUseCase).
router.put('/:id/items', authenticate, authorizeModule('vendas', 'operate'), saleController.editItems);
// Gap 3/3 ("Faturamento parcial"): POST /:id/nfe aceita payload opcional
// `{ items: [{ sale_item_id, quantity }] }` — ver IssueSaleNfeUseCase
// (módulo fiscal, dono real do fluxo de emissão de NF-e).
router.post('/:id/nfe', authenticate, authorizeModule('vendas', 'approve'), fiscalController.issueSaleNfe);
router.get('/:id/nfe', authenticate, authorizeModule('vendas'), fiscalController.getSaleNfeStatus);
router.post('/:id/nfe/cancel', authenticate, authorizeModule('vendas', 'approve'), fiscalController.cancelSaleNfe);

module.exports = router;


