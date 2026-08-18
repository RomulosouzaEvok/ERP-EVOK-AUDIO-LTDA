import request from 'supertest';

const authModulePath = '../../src/middlewares/auth';
const controllerModulePath = '../../src/modules/production/presentation/controllers/productionCostSettingsController';
const routeModulePath = '../../src/modules/production/presentation/routes/productionCostSettings';

function createAuthMock() {
  const authenticate = (req, res, next) => {
    const roleHeader = req.headers['x-test-role'];

    if (!roleHeader) {
      res.status(401).json({ success: false, error: 'Token nao fornecido' });
      return;
    }

    let permissions = {};
    const permissionsHeader = req.headers['x-test-permissions'];
    if (permissionsHeader) {
      permissions = JSON.parse(String(permissionsHeader));
    }

    req.user = { id: 1, role: roleHeader, permissions };
    next();
  };

  const authorizeModule = (moduleKey: string, requiredLevel: 'operate' | 'approve' = 'operate') => (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Nao autenticado' });
      return;
    }

    if (req.user.role === 'admin') {
      next();
      return;
    }

    const level = req.user.permissions?.[moduleKey];
    if (!level) {
      res.status(403).json({ success: false, error: { code: 'MODULE_ACCESS_DENIED' } });
      return;
    }

    if (requiredLevel === 'approve' && level !== 'approve') {
      res.status(403).json({ success: false, error: { code: 'APPROVAL_LEVEL_REQUIRED' } });
      return;
    }

    next();
  };

  return { authenticate, authorizeModule };
}

function createControllerMock() {
  return {
    get: jest.fn((_req, res) => res.status(200).json({ success: true, handler: 'get' })),
    upsert: jest.fn((_req, res) => res.status(200).json({ success: true, handler: 'upsert' })),
  };
}

function buildApp() {
  jest.resetModules();
  const controllerMock = createControllerMock();

  jest.doMock(authModulePath, () => createAuthMock());
  jest.doMock(controllerModulePath, () => controllerMock);

  let expressModule: any;
  let routeModule: any;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expressModule = require('express');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    routeModule = require(routeModulePath);
  });

  const app = expressModule();
  app.use(expressModule.json());
  app.use('/api/production/cost-settings', routeModule);
  return { app };
}

describe('production cost settings route', () => {
  it('protege leitura e escrita do singleton de custeio', async () => {
    const { app } = buildApp();

    const unauthenticated = await request(app).get('/api/production/cost-settings/');
    expect(unauthenticated.status).toBe(401);

    const forbidden = await request(app)
      .get('/api/production/cost-settings/')
      .set('x-test-role', 'operator')
      .set('x-test-permissions', JSON.stringify({}));
    expect(forbidden.status).toBe(403);

    const readable = await request(app)
      .get('/api/production/cost-settings/')
      .set('x-test-role', 'operator')
      .set('x-test-permissions', JSON.stringify({ producao: 'operate' }));
    expect(readable.status).toBe(200);

    const writable = await request(app)
      .put('/api/production/cost-settings/')
      .set('x-test-role', 'operator')
      .set('x-test-permissions', JSON.stringify({ producao: 'operate' }))
      .send({
        overhead_calculation_basis: 'material_labor',
        overhead_rate_percent: 10,
        default_labor_rate_per_hour: 40,
      });
    expect(writable.status).toBe(200);
  });
});
