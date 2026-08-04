/**
 * Rotas HTTP do módulo de Perfis de Acesso Configuráveis, montadas sob
 * `/api/access-profiles` em `server/app.ts` (UC-30 a UC-33).
 *
 * IMPORTANTE: `GET /modules` é registrada ANTES de `GET /:id` para não ser
 * capturada pelo parâmetro dinâmico (mesmo padrão de
 * `modules/laboratory/presentation/routes/laboratory.ts`).
 *
 * Todas as rotas exigem `authenticate` + `authorize('admin')` — CRUD de
 * perfis de acesso é exclusivo do Administrador Global (§3), nunca
 * delegado a um perfil de área, mesmo com nível `approve`.
 *
 * @module modules/accessProfiles/presentation/routes/accessProfiles
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../../../middlewares/auth');
const accessProfilesController = require('../controllers/accessProfilesController');

router.get('/modules', authenticate, authorize('admin'), accessProfilesController.listModules);
router.get('/', authenticate, authorize('admin'), accessProfilesController.list);
router.get('/:id', authenticate, authorize('admin'), accessProfilesController.getById);
router.post('/', authenticate, authorize('admin'), accessProfilesController.create);
router.put('/:id', authenticate, authorize('admin'), accessProfilesController.update);
router.delete('/:id', authenticate, authorize('admin'), accessProfilesController.deactivate);

module.exports = router;
