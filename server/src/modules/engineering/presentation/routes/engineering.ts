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
 * @module modules/engineering/presentation/routes/engineering
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const engineeringController = require('../controllers/engineeringController');

// Projetos de Engenharia (P&D)
router.get('/projects', authenticate, engineeringController.listProjects);
router.get('/projects/:id', authenticate, engineeringController.getProjectById);
router.post('/projects', authenticate, authorize('admin', 'operator'), engineeringController.createProject);
router.put('/projects/:id', authenticate, authorize('admin', 'operator'), engineeringController.updateProject);

// Desenhos Tecnicos
router.get('/drawings', authenticate, engineeringController.listDrawings);
router.post('/drawings', authenticate, authorize('admin', 'operator'), engineeringController.createDrawing);
router.put('/drawings/:id', authenticate, authorize('admin', 'operator'), engineeringController.updateDrawing);
router.post('/drawings/:id/release', authenticate, authorize('admin'), engineeringController.releaseDrawing);
router.post('/drawings/:id/obsolete', authenticate, authorize('admin'), engineeringController.obsoleteDrawing);

// Ficha Tecnica Thiele-Small (ItemEspecificacaoTecnica)
router.get('/items/:itemId/technical-spec', authenticate, engineeringController.getTechnicalSpec);
router.put('/items/:itemId/technical-spec', authenticate, authorize('admin', 'operator'), engineeringController.upsertTechnicalSpec);

module.exports = router;
