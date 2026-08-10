const express = require('express');
const router = express.Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const { authorizeAnyModule } = require('../../../../middlewares/authorizeAnyModule');
const importProcessController = require('../controllers/importProcessController');

/**
 * Rotas do modulo `comex` (Importacao/COMEX, UC-19). A maior parte das
 * acoes exige o modulo `comex` atribuido ao perfil de acesso do usuario;
 * leituras aceitam qualquer nivel, escritas exigem `operate`.
 *
 * G11-COMEX (gate de aprovacao da diretoria no processo de importacao,
 * decisao D-G do dono do produto em 2026-08-10) acrescenta 2 rotas com
 * modulo dono DIFERENTE de `comex`, pelo mesmo motivo do G11 em Compras e
 * do Juridico (RF-JUR-003): quem aprova a alcada e a DIRETORIA, que nao
 * necessariamente tem o modulo `comex`.
 * - `POST /:id/approve` → `authorizeModule('diretor')`: registrar a
 *   aprovacao e acao exclusiva do papel `diretor`. Um analista de comex
 *   (mesmo com `comex:approve`) nao consegue registra-la — e exatamente o
 *   ponto: antes desta rodada TODAS as escritas do modulo eram
 *   `comex:operate`, ou seja, uma importacao de R$ 1 milhao embarcava sem
 *   passar por ninguem.
 * - `GET /:id/approvals` → `comex` OU `diretor` (leitura da situacao da
 *   alcada, necessaria dos dois lados).
 * Embarcar (`POST /:id/tracking` com `event = 'shipped'`) continua em
 * `authorizeModule('comex', 'operate')` — a alcada e verificada DENTRO do
 * use case (`RegisterImportTrackingUseCase`), consultando as aprovacoes ja
 * registradas, e nao como um nivel de RBAC extra na rota.
 */
router.get('/', authenticate, authorizeModule('comex'), importProcessController.list);
router.get('/:id', authenticate, authorizeModule('comex'), importProcessController.getById);
// G11-COMEX — situacao da alcada (leitura pura) e registro da aprovacao.
router.get('/:id/approvals', authenticate, authorizeAnyModule([{ moduleKey: 'comex' }, { moduleKey: 'diretor' }]), importProcessController.listApprovals);
router.post('/:id/approve', authenticate, authorizeModule('diretor'), importProcessController.approveAuthority);
router.post('/', authenticate, authorizeModule('comex', 'operate'), importProcessController.create);
router.post('/:id/tracking', authenticate, authorizeModule('comex', 'operate'), importProcessController.registerTracking);
router.post('/:id/receive', authenticate, authorizeModule('comex', 'operate'), importProcessController.receive);
router.post('/:id/cancel', authenticate, authorizeModule('comex', 'operate'), importProcessController.cancel);

module.exports = router;
