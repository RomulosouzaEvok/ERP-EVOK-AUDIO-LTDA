import request from 'supertest';

const authModulePath = '../../src/middlewares/auth';
const auditLogServicePath = '../../src/services/auditLogService';
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

    req.user = {
      id: 1,
      role: roleHeader,
      permissions,
      accessProfileId: 1,
      accessProfileName: 'Perfil CI',
    };
    next();
  };

  const actual = jest.requireActual(authModulePath);
  return { ...actual, authenticate };
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
  const logActionMock = jest.fn();

  jest.doMock(authModulePath, () => createAuthMock());
  jest.doMock(auditLogServicePath, () => ({ logAction: logActionMock }));
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
  return { app, controllerMock, logActionMock };
}

describe('production cost settings route', () => {
  it('GET com nivel operate permite leitura', async () => {
    const { app, controllerMock } = buildApp();

    const response = await request(app)
      .get('/api/production/cost-settings/')
      .set('x-test-role', 'operator')
      .set('x-test-permissions', JSON.stringify({ producao: 'operate' }));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, handler: 'get' });
    expect(controllerMock.get).toHaveBeenCalledTimes(1);
    expect(controllerMock.upsert).not.toHaveBeenCalled();
  });

  it('PUT com nivel operate bloqueia escrita', async () => {
    const { app, controllerMock, logActionMock } = buildApp();

    const response = await request(app)
      .put('/api/production/cost-settings/')
      .set('x-test-role', 'operator')
      .set('x-test-permissions', JSON.stringify({ producao: 'operate' }))
      .send({
        overhead_calculation_basis: 'material_labor',
        overhead_rate_percent: 10,
        default_labor_rate_per_hour: 40,
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('APPROVAL_LEVEL_REQUIRED');
    expect(controllerMock.upsert).not.toHaveBeenCalled();
    expect(logActionMock).toHaveBeenCalled();
  });

  it('PUT com nivel approve permite escrita', async () => {
    const { app, controllerMock, logActionMock } = buildApp();

    const response = await request(app)
      .put('/api/production/cost-settings/')
      .set('x-test-role', 'operator')
      .set('x-test-permissions', JSON.stringify({ producao: 'approve' }))
      .send({
        overhead_calculation_basis: 'material_labor',
        overhead_rate_percent: 10,
        default_labor_rate_per_hour: 40,
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, handler: 'upsert' });
    expect(controllerMock.upsert).toHaveBeenCalledTimes(1);
    expect(logActionMock).not.toHaveBeenCalled();
  });
});
