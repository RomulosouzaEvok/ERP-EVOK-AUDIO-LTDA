/**
 * Rotas HTTP do Roteiro de Producao (gap G5) — montadas em
 * `/api/production/routes` (ver `server/app.ts`).
 *
 * RBAC (`docs/business/BUSINESS_RULES.md` §8, catalogo em
 * `server/src/shared/domain/accessModules.ts`):
 * - leitura: `authorizeModule('producao')` (nivel `operate` implicito) — o
 *   PCP, o chao de fabrica e o custeio precisam consultar o roteiro;
 * - escrita de conteudo (criar/alterar rascunho, etapas, revisao, remover
 *   rascunho): `authorizeModule('producao', 'operate')`;
 * - LIBERACAO/APOSENTADORIA (`activate`/`inactivate`):
 *   `authorizeModule('producao', 'approve')`. Estas duas sao as unicas
 *   transicoes que mudam o que a fabrica executa de fato e o que o sistema
 *   usa para custear mao-de-obra — mesmo criterio ja aplicado em
 *   `contabilidade` (`post`/`reverse`) e `tesouraria` (`settle`/`cancel`).
 *   O modelo ja tinha `approved_by`/`approved_at` justamente porque liberar
 *   roteiro e um ato de aprovacao, nao de digitacao.
 *
 * IMPORTANTE: nenhuma rota aceita `created_by`/`approved_by` do body — os
 * dois vem de `req.user.id` no controller (regra anti-spoofing P0).
 *
 * @module modules/production/presentation/routes/productionRoutes
 */

import express = require('express');
const { authenticate, authorizeModule }: any = require('../../../../middlewares/auth');
const productionRouteController: any = require('../controllers/productionRouteController');

const router = express.Router();

router.get('/', authenticate, authorizeModule('producao'), productionRouteController.list);
router.get('/:id', authenticate, authorizeModule('producao'), productionRouteController.getById);
router.post('/', authenticate, authorizeModule('producao', 'operate'), productionRouteController.create);
router.put('/:id', authenticate, authorizeModule('producao', 'operate'), productionRouteController.update);
router.put('/:id/steps', authenticate, authorizeModule('producao', 'operate'), productionRouteController.replaceSteps);
router.post('/:id/revise', authenticate, authorizeModule('producao', 'operate'), productionRouteController.revise);
router.patch('/:id/activate', authenticate, authorizeModule('producao', 'approve'), productionRouteController.activate);
router.patch('/:id/inactivate', authenticate, authorizeModule('producao', 'approve'), productionRouteController.inactivate);
router.delete('/:id', authenticate, authorizeModule('producao', 'operate'), productionRouteController.remove);

export = router;
