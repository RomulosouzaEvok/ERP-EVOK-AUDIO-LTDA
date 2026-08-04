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
router.get('/:id', authenticate, authorizeModule('vendas'), saleController.getById);
router.post('/', authenticate, authorizeModule('vendas', 'operate'), saleController.create);
router.put('/:id/status', authenticate, authorizeModule('vendas', 'operate'), saleController.updateStatus);
router.post('/:id/nfe', authenticate, authorizeModule('vendas', 'approve'), fiscalController.issueSaleNfe);
router.get('/:id/nfe', authenticate, authorizeModule('vendas'), fiscalController.getSaleNfeStatus);
router.post('/:id/nfe/cancel', authenticate, authorizeModule('vendas', 'approve'), fiscalController.cancelSaleNfe);

module.exports = router;


