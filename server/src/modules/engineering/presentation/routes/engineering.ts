/**
 * Rotas HTTP do modulo de Engenharia (Projetos P&D, Desenhos Tecnicos e
 * Ficha Tecnica Thiele-Small de Itens), montadas sob `/api/engineering` em
 * `server/app.ts`.
 *
 * IMPORTANTE: este router NAO inclui o prefixo `/bom` (montado
 * separadamente em `modules/bom/presentation/routes/bom.ts` sob
 * `/api/engineering/bom`). A ordem de registro em `app.ts` importa: o
 * router de `bom` deve continuar montado ANTES deste, para que
 * `/api/engineering/bom/*` seja resolvido pelo router de BOM em vez de
 * cair em `/api/engineering/projects` etc. deste router (Express testa os
 * `app.use` na ordem declarada).
 *
 * PILOTO `authorizeModule('engenharia')` (Bloco 1.2, aditivo — NAO
 * substitui `authorize(role)` legado, compoe em camada conforme
 * `docs/business/BUSINESS_RULES.md` §8): leituras exigem `view` implicito
 * (qualquer nivel presente), escritas comuns exigem `operate`. Liberar
 * (`release`) e obsoletar (`obsolete`) um desenho tecnico sao acoes de
 * aprovacao/gestao da area e exigem `approve` no perfil — o admin global
 * continua liberado pelo curto-circuito de `authorizeModule` (§3),
 * preservando o comportamento anterior de `authorize('admin')` para quem
 * nao tem perfil de area configurado. O retrofit dos demais modulos e
 * tarefa propria do `docs/governance/TODO.md`.
 *
 * @module modules/engineering/presentation/routes/engineering
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize, authorizeModule } = require('../../../../middlewares/auth');
const engineeringController = require('../controllers/engineeringController');

// Projetos de Engenharia (P&D)
router.get('/projects', authenticate, authorizeModule('engenharia'), engineeringController.listProjects);
router.get('/projects/:id', authenticate, authorizeModule('engenharia'), engineeringController.getProjectById);
router.post('/projects', authenticate, authorizeModule('engenharia', 'operate'), authorize('admin', 'operator'), engineeringController.createProject);
router.put('/projects/:id', authenticate, authorizeModule('engenharia', 'operate'), authorize('admin', 'operator'), engineeringController.updateProject);

// Desenhos Tecnicos
router.get('/drawings', authenticate, authorizeModule('engenharia'), engineeringController.listDrawings);
router.post('/drawings', authenticate, authorizeModule('engenharia', 'operate'), authorize('admin', 'operator'), engineeringController.createDrawing);
router.put('/drawings/:id', authenticate, authorizeModule('engenharia', 'operate'), authorize('admin', 'operator'), engineeringController.updateDrawing);
router.post('/drawings/:id/release', authenticate, authorizeModule('engenharia', 'approve'), authorize('admin'), engineeringController.releaseDrawing);
router.post('/drawings/:id/obsolete', authenticate, authorizeModule('engenharia', 'approve'), authorize('admin'), engineeringController.obsoleteDrawing);

// Ficha Tecnica Thiele-Small (ItemEspecificacaoTecnica)
router.get('/items/:itemId/technical-spec', authenticate, authorizeModule('engenharia'), engineeringController.getTechnicalSpec);
router.put('/items/:itemId/technical-spec', authenticate, authorizeModule('engenharia', 'operate'), authorize('admin', 'operator'), engineeringController.upsertTechnicalSpec);

module.exports = router;
