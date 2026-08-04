const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const purchaseRequisitionController = require('../controllers/purchaseRequisitionController');

/**
 * RETROFIT `authorizeModule('requisicoes')` (docs/governance/TODO.md,
 * Bloco 1.2 retrofit geral — substitui `authorize(role)` legado conforme
 * decisão de `docs/business/BUSINESS_RULES.md` §8): leituras exigem `view`
 * implicito, escritas comuns exigem `operate`. `PATCH /:id/status` exige
 * `approve` na camada de rota (aprovar requisição é ação de gestor da
 * área) — MANTIDA a checagem hard-coded `role !== 'admin'` dentro de
 * `purchaseRequisitionController.changeStatus` para o caso específico de
 * transição para `status = 'approved'` (fora do escopo desta tarefa
 * tocar em controllers; ver pendência anotada em `docs/governance/TODO.md`
 * — o controller hoje aceita apenas `admin`, então um usuário com perfil
 * "Gestor de Compras" (`level = 'approve'` em `requisicoes`) passará pela
 * rota mas ainda pode ser bloqueado pelo controller legado, replicando o
 * risco de convivência documentado em `BUSINESS_RULES.md` §8).
 */
router.get('/', authenticate, authorizeModule('requisicoes'), purchaseRequisitionController.list);
router.get('/:id', authenticate, authorizeModule('requisicoes'), purchaseRequisitionController.getById);
router.post('/', authenticate, authorizeModule('requisicoes', 'operate'), purchaseRequisitionController.create);
// Nivel 'operate' na rota: draft->pending e cancelamento sao do operador.
// A transicao para 'approved' exige nivel approve, checado no controller
// (a rota nao enxerga o payload).
router.patch('/:id/status', authenticate, authorizeModule('requisicoes', 'operate'), purchaseRequisitionController.changeStatus);
router.post('/:id/convert', authenticate, authorizeModule('requisicoes', 'operate'), purchaseRequisitionController.convert);

module.exports = router;

