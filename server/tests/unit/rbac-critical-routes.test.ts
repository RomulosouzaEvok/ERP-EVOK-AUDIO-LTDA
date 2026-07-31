import request from 'supertest';

type Role = 'admin' | 'operator' | 'financial';
type HttpMethod = 'post' | 'put' | 'patch' | 'delete';

const authModulePath = '../../src/middlewares/auth';

function createControllerMock() {
  return new Proxy(
    {},
    {
      get: (_target, property) =>
        jest.fn((_req, res) => {
          res.status(200).json({ success: true, handler: String(property) });
        }),
    },
  ) as Record<string, jest.Mock>;
}

function createAuthMock() {
  const authenticate = (req, res, next) => {
    const roleHeader = req.headers['x-test-role'];

    if (!roleHeader) {
      res.status(401).json({ success: false, error: 'Token nao fornecido' });
      return;
    }

    req.user = {
      id: 1,
      name: 'Teste',
      email: 'teste@evok.local',
      role: roleHeader,
      active: true,
    };

    next();
  };

  const authorize = (...roles: Role[]) => (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Nao autenticado' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Sem permissao para esta acao' });
      return;
    }

    next();
  };

  return { authenticate, authorize };
}

function buildRouteApp(routeModulePath: string, controllerModulePath: string, mountPath: string) {
  jest.resetModules();

  const controllerMock = createControllerMock();

  jest.doMock(authModulePath, () => createAuthMock());
  jest.doMock(controllerModulePath, () => controllerMock);

  let routeModule;
  let expressModule;

  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expressModule = require('express');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    routeModule = require(routeModulePath);
  });

  const app = expressModule();
  app.use(expressModule.json());
  app.use(mountPath, routeModule);

  return { app, controllerMock };
}

async function expectRbacFlow(params: {
  routeModulePath: string;
  controllerModulePath: string;
  mountPath: string;
  method: HttpMethod;
  path: string;
  allowedRole: Role;
  deniedRole: Role;
}) {
  const { app } = buildRouteApp(params.routeModulePath, params.controllerModulePath, params.mountPath);

  const unauthenticated = await request(app)[params.method](params.path);
  expect(unauthenticated.status).toBe(401);

  const forbidden = await request(app)[params.method](params.path).set('x-test-role', params.deniedRole);
  expect(forbidden.status).toBe(403);

  const allowed = await request(app)[params.method](params.path).set('x-test-role', params.allowedRole);
  expect(allowed.status).toBe(200);
}

describe('RBAC critical write routes', () => {
  it('protege escrita de produtos', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/products/presentation/routes/products',
      controllerModulePath: '../../src/modules/products/presentation/controllers/productController',
      mountPath: '/api/products',
      method: 'post',
      path: '/api/products/',
      allowedRole: 'admin',
      deniedRole: 'financial',
    });
  });

  it('protege alteracao de vendas', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/sales/presentation/routes/sales',
      controllerModulePath: '../../src/modules/sales/presentation/controllers/saleController',
      mountPath: '/api/sales',
      method: 'put',
      path: '/api/sales/10/status',
      allowedRole: 'operator',
      deniedRole: 'financial',
    });
  });

  it('protege escrita de compras', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/purchases/presentation/routes/purchases',
      controllerModulePath: '../../src/modules/purchases/presentation/controllers/purchaseController',
      mountPath: '/api/purchases',
      method: 'post',
      path: '/api/purchases/10/receive',
      allowedRole: 'operator',
      deniedRole: 'financial',
    });
  });

  it('protege movimentacao de estoque', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/inventory/presentation/routes/inventory',
      controllerModulePath: '../../src/modules/inventory/presentation/controllers/inventoryController',
      mountPath: '/api/inventory',
      method: 'post',
      path: '/api/inventory/movements',
      allowedRole: 'operator',
      deniedRole: 'financial',
    });
  });

  it('protege aprovacao de inventario ciclico para admin', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/inventory/presentation/routes/inventoryCounts',
      controllerModulePath: '../../src/modules/inventory/presentation/controllers/inventoryCountController',
      mountPath: '/api/inventory-counts',
      method: 'post',
      path: '/api/inventory-counts/10/approve',
      allowedRole: 'admin',
      deniedRole: 'operator',
    });
  });

  it('protege ordens de producao', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/production/presentation/routes/productionOrders',
      controllerModulePath: '../../src/modules/production/presentation/controllers/productionOrderController',
      mountPath: '/api/production-orders',
      method: 'put',
      path: '/api/production-orders/10/status',
      allowedRole: 'operator',
      deniedRole: 'financial',
    });
  });

  it('protege manutencao de itens', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/items/presentation/routes/items',
      controllerModulePath: '../../src/modules/items/presentation/controllers/itemController',
      mountPath: '/api/items',
      method: 'post',
      path: '/api/items/10/estrutura',
      allowedRole: 'operator',
      deniedRole: 'financial',
    });
  });

  it('protege escrita de BOM', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/bom/presentation/routes/bom',
      controllerModulePath: '../../src/modules/bom/presentation/controllers/bomController',
      mountPath: '/api/engineering/bom',
      method: 'delete',
      path: '/api/engineering/bom/10',
      allowedRole: 'operator',
      deniedRole: 'financial',
    });
  });

  it('protege geracao de MRP', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/mrp/presentation/routes/mrp',
      controllerModulePath: '../../src/modules/mrp/presentation/controllers/mrpController',
      mountPath: '/api/mrp',
      method: 'post',
      path: '/api/mrp/plan',
      allowedRole: 'operator',
      deniedRole: 'financial',
    });
  });

  it('protege escrita financeira para admin ou financial', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/financial/presentation/routes/finance',
      controllerModulePath: '../../src/modules/financial/presentation/controllers/financialController',
      mountPath: '/api/finance',
      method: 'put',
      path: '/api/finance/payable/10/pay',
      allowedRole: 'financial',
      deniedRole: 'operator',
    });
  });
});
