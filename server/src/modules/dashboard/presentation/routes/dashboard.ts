const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const dashboardController = require('../controllers/dashboardController');

/**
 * Rotas do módulo `dashboard` (Clean Architecture), montadas sob
 * `/api/dashboard` em `server/app.ts`.
 *
 * RETROFIT `authorizeModule('dashboard')` (docs/governance/TODO.md, Bloco
 * 1.2 retrofit geral — módulo agregador concedido a todos os perfis na
 * matriz, ver `docs/business/BUSINESS_RULES.md` §6.1): a filtragem de
 * cards por interseção com os demais módulos do perfil é responsabilidade
 * do controller/frontend, não desta rota.
 *
 * `GET /handoffs` (Bloco 3.3, UC-40): resumo por área do semáforo de
 * handoff, para o badge/contador do menu lateral. Mesma autorização do
 * dashboard principal (`authorizeModule('dashboard')`).
 */

router.get('/', authenticate, authorizeModule('dashboard'), dashboardController.index);
router.get('/handoffs', authenticate, authorizeModule('dashboard'), dashboardController.handoffs);

module.exports = router;
