const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const masterProductionPlanController = require('../controllers/masterProductionPlanController');

/**
 * Rotas do **Plano Mestre de Produção (MPS, G17)**, montadas sob
 * `/api/production/master-plans` em `server/app.ts`.
 *
 * ## Por que o módulo RBAC é `mrp`, e não `producao`
 *
 * O caminho é `/api/production/...` porque o artefato gerado é a OP, mas o
 * **ator** é o PCP — o mesmo que opera o MRP. A escolha segue o precedente
 * mais próximo que já existe no ERP: `POST /api/mrp/planned-orders/convert-to-production`
 * também cria Ordens de Produção e exige `mrp:operate`. Usar `producao` aqui
 * daria acesso ao planejamento a quem só toca chão de fábrica; usar `mrp`
 * mantém a fronteira que o sistema já desenhou. Rotas de leitura exigem o
 * nível `view` implícito.
 *
 * ## Por que nenhuma rota exige `approve`
 *
 * Firmar e liberar são atos de decisão, e seria natural pedir `approve`. Não
 * foi feito **de propósito**: nível de alçada do PCP é política de governança
 * que o dono do produto não definiu (a decisão D-F confirmou apenas que existe
 * PCP formal, não como ele se aprova), e a rota equivalente do MRP que gera OP
 * usa `operate`. Inventar a alçada aqui criaria um segundo padrão e poderia
 * travar a operação com um nível que nenhum perfil tem. Registrado como
 * pendência de decisão em `docs/governance/TODO.md`.
 *
 * @module modules/masterProduction/presentation/routes/masterProductionPlans
 */

router.get('/', authenticate, authorizeModule('mrp'), masterProductionPlanController.list);
router.get('/:id', authenticate, authorizeModule('mrp'), masterProductionPlanController.getById);
router.post('/', authenticate, authorizeModule('mrp', 'operate'), masterProductionPlanController.create);
router.patch('/:id/lines/:lineId', authenticate, authorizeModule('mrp', 'operate'), masterProductionPlanController.decideLine);
router.post('/:id/firm', authenticate, authorizeModule('mrp', 'operate'), masterProductionPlanController.firm);
router.post('/:id/release', authenticate, authorizeModule('mrp', 'operate'), masterProductionPlanController.release);
router.post('/:id/cancel', authenticate, authorizeModule('mrp', 'operate'), masterProductionPlanController.cancel);

module.exports = router;
