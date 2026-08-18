import request from 'supertest';

const authModulePath = '../../src/middlewares/auth';
const controllerModulePath = '../../src/modules/fiscal/presentation/controllers/blocoKController';
const routeModulePath = '../../src/modules/fiscal/presentation/routes/blocoK';

function createAuthMock() {
  const authenticate = (req, res, next) => {
    const roleHeader = req.headers['x-test-role'];

    if (!roleHeader) {
      res.status(401).json({ success: false, error: 'Token nao fornecido' });
      return;
    }

    req.user = { id: 1, role: roleHeader, permissions: {} };
    next();
  };

  const authorize = (_requiredRole: string) => (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Nao autenticado' });
      return;
    }

    if (req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: { code: 'MODULE_ACCESS_DENIED' } });
      return;
    }

    next();
  };

  return { authenticate, authorize };
}

function buildApp() {
  jest.resetModules();
  const controllerMock = {
    getBlocoKPreview: jest.fn((_req, res) => res.status(200).json({ success: true, handler: 'bloco-k' })),
  };

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
  app.use('/api/fiscal/bloco-k', routeModule);
  return { app };
}

describe('bloco-k route', () => {
  it('exige autenticacao e papel de admin', async () => {
    const { app } = buildApp();

    const unauthenticated = await request(app).get('/api/fiscal/bloco-k/');
    expect(unauthenticated.status).toBe(401);

    const forbidden = await request(app)
      .get('/api/fiscal/bloco-k/')
      .set('x-test-role', 'operator');
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .get('/api/fiscal/bloco-k/')
      .set('x-test-role', 'admin');
    expect(allowed.status).toBe(200);
  });
});
