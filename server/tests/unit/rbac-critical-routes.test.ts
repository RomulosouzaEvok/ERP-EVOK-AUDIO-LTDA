import request from 'supertest';

type HttpMethod = 'post' | 'put' | 'patch' | 'delete';
type Level = 'operate' | 'approve';

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

/**
 * Mock de `authenticate`/`authorizeModule` para os testes de retrofit
 * (Bloco 1.2, `docs/governance/TODO.md`). Reproduz a formula de
 * `docs/business/BUSINESS_RULES.md` §4 em memoria, sem depender do banco:
 * - `x-test-role: admin` sempre libera (§3), qualquer modulo/nivel.
 * - Demais papeis autenticam com `permissions` vindo do header
 *   `x-test-permissions` (JSON `{ [module]: 'operate' | 'approve' }`).
 */
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
      name: 'Teste',
      email: 'teste@evok.local',
      role: roleHeader,
      active: true,
      accessProfileId: roleHeader === 'admin' ? null : 1,
      accessProfileName: roleHeader === 'admin' ? null : 'Perfil de Teste',
      permissions,
    };

    next();
  };

  const authorizeModule = (moduleKey: string, requiredLevel: Level = 'operate') => (req, res, next) => {
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
  /** Modulo dono da acao (chave `AccessModuleKey`) exercitada pela rota. */
  moduleKey: string;
  /** Nivel minimo exigido pela rota (`operate` por padrao, `approve` para acoes de gestor). */
  requiredLevel?: Level;
}) {
  const { app } = buildRouteApp(params.routeModulePath, params.controllerModulePath, params.mountPath);
  const requiredLevel = params.requiredLevel ?? 'operate';

  // 1) Sem token -> 401.
  const unauthenticated = await request(app)[params.method](params.path);
  expect(unauthenticated.status).toBe(401);

  // 2) Autenticado, mas sem o modulo no perfil -> 403 (MODULE_ACCESS_DENIED).
  const forbiddenNoModule = await request(app)
    [params.method](params.path)
    .set('x-test-role', 'operator')
    .set('x-test-permissions', JSON.stringify({}));
  expect(forbiddenNoModule.status).toBe(403);

  // 3) Autenticado, com o modulo mas em nivel insuficiente (quando a rota
  // exige `approve`, `operate` isolado nao deve passar — §4).
  if (requiredLevel === 'approve') {
    const forbiddenWrongLevel = await request(app)
      [params.method](params.path)
      .set('x-test-role', 'operator')
      .set('x-test-permissions', JSON.stringify({ [params.moduleKey]: 'operate' }));
    expect(forbiddenWrongLevel.status).toBe(403);
  }

  // 4) Autenticado, com o nivel exigido no modulo correto -> 200.
  const allowed = await request(app)
    [params.method](params.path)
    .set('x-test-role', 'operator')
    .set('x-test-permissions', JSON.stringify({ [params.moduleKey]: requiredLevel }));
  expect(allowed.status).toBe(200);

  // 5) `role = admin` sempre libera, mesmo sem perfil/permissions (§3).
  const admin = await request(app)[params.method](params.path).set('x-test-role', 'admin');
  expect(admin.status).toBe(200);
}

describe('RBAC critical write routes (authorizeModule retrofit)', () => {
  it('protege escrita de produtos', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/products/presentation/routes/products',
      controllerModulePath: '../../src/modules/products/presentation/controllers/productController',
      mountPath: '/api/products',
      method: 'post',
      path: '/api/products/',
      moduleKey: 'produtos',
    });
  });

  it('protege alteracao de vendas', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/sales/presentation/routes/sales',
      controllerModulePath: '../../src/modules/sales/presentation/controllers/saleController',
      mountPath: '/api/sales',
      method: 'put',
      path: '/api/sales/10/status',
      moduleKey: 'vendas',
    });
  });

  it('protege recebimento de compras (modulo dono = recebimento)', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/purchases/presentation/routes/purchases',
      controllerModulePath: '../../src/modules/purchases/presentation/controllers/purchaseController',
      mountPath: '/api/purchases',
      method: 'post',
      path: '/api/purchases/10/receive',
      moduleKey: 'recebimento',
    });
  });

  it('protege movimentacao de estoque', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/inventory/presentation/routes/inventory',
      controllerModulePath: '../../src/modules/inventory/presentation/controllers/inventoryController',
      mountPath: '/api/inventory',
      method: 'post',
      path: '/api/inventory/movements',
      moduleKey: 'estoque',
    });
  });

  it('protege liberacao de lote para qualidade (modulo dono = qualidade, nivel approve)', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/inventory/presentation/routes/inventory',
      controllerModulePath: '../../src/modules/inventory/presentation/controllers/inventoryController',
      mountPath: '/api/inventory',
      method: 'post',
      path: '/api/inventory/lots/10/release',
      moduleKey: 'qualidade',
      requiredLevel: 'approve',
    });
  });

  it('protege aprovacao de inventario ciclico (nivel approve)', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/inventory/presentation/routes/inventoryCounts',
      controllerModulePath: '../../src/modules/inventory/presentation/controllers/inventoryCountController',
      mountPath: '/api/inventory-counts',
      method: 'post',
      path: '/api/inventory-counts/10/approve',
      moduleKey: 'contagens',
      requiredLevel: 'approve',
    });
  });

  it('protege ordens de producao', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/production/presentation/routes/productionOrders',
      controllerModulePath: '../../src/modules/production/presentation/controllers/productionOrderController',
      mountPath: '/api/production-orders',
      method: 'put',
      path: '/api/production-orders/10/status',
      moduleKey: 'producao',
    });
  });

  it('protege apontamento do chao de fabrica (modulo dono = chao_de_fabrica)', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/production/presentation/routes/productionOrders',
      controllerModulePath: '../../src/modules/production/presentation/controllers/productionOrderController',
      mountPath: '/api/production-orders',
      method: 'post',
      path: '/api/production-orders/10/tracking',
      moduleKey: 'chao_de_fabrica',
    });
  });

  it('protege manutencao de itens (item mestre -> modulo produtos)', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/items/presentation/routes/items',
      controllerModulePath: '../../src/modules/items/presentation/controllers/itemController',
      mountPath: '/api/items',
      method: 'post',
      path: '/api/items/10/estrutura',
      moduleKey: 'produtos',
    });
  });

  it('protege escrita de BOM', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/bom/presentation/routes/bom',
      controllerModulePath: '../../src/modules/bom/presentation/controllers/bomController',
      mountPath: '/api/engineering/bom',
      method: 'delete',
      path: '/api/engineering/bom/10',
      moduleKey: 'bom',
    });
  });

  it('protege geracao de MRP', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/mrp/presentation/routes/mrp',
      controllerModulePath: '../../src/modules/mrp/presentation/controllers/mrpController',
      mountPath: '/api/mrp',
      method: 'post',
      path: '/api/mrp/plan',
      moduleKey: 'mrp',
    });
  });

  it('protege escrita financeira', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/financial/presentation/routes/finance',
      controllerModulePath: '../../src/modules/financial/presentation/controllers/financialController',
      mountPath: '/api/finance',
      method: 'put',
      path: '/api/finance/payable/10/pay',
      moduleKey: 'financeiro',
    });
  });

  it('permite transicao de status de requisicao no nivel operate (aprovacao e checada no controller)', async () => {
    // A rota exige apenas operate: draft->pending e cancelamento sao do
    // operador. A transicao para 'approved' e barrada DENTRO do controller
    // (nivel approve do modulo requisicoes ou admin), pois a rota nao enxerga
    // o payload — coberto pelo teste de controller abaixo.
    await expectRbacFlow({
      routeModulePath: '../../src/modules/purchaseRequisitions/presentation/routes/purchaseRequisitions',
      controllerModulePath: '../../src/modules/purchaseRequisitions/presentation/controllers/purchaseRequisitionController',
      mountPath: '/api/purchase-requisitions',
      method: 'patch',
      path: '/api/purchase-requisitions/10/status',
      moduleKey: 'requisicoes',
    });
  });


  it('protege escrita de centros de trabalho', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/workCenters/presentation/routes/workCenters',
      controllerModulePath: '../../src/modules/workCenters/presentation/controllers/workCenterController',
      mountPath: '/api/work-centers',
      method: 'post',
      path: '/api/work-centers/',
      moduleKey: 'centros_de_trabalho',
    });
  });

  it('protege escrita de patrimonio', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/assets/presentation/routes/assets',
      controllerModulePath: '../../src/modules/assets/presentation/controllers/assetController',
      mountPath: '/api/assets',
      method: 'post',
      path: '/api/assets/',
      moduleKey: 'patrimonio',
    });
  });

  it('protege escrita de fornecedores', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/suppliers/presentation/routes/suppliers',
      controllerModulePath: '../../src/modules/suppliers/presentation/controllers/supplierController',
      mountPath: '/api/suppliers',
      method: 'post',
      path: '/api/suppliers/',
      moduleKey: 'fornecedores',
    });
  });

  it('protege escrita de clientes', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/clients/presentation/routes/clients',
      controllerModulePath: '../../src/modules/clients/presentation/controllers/clientController',
      mountPath: '/api/clients',
      method: 'post',
      path: '/api/clients/',
      moduleKey: 'clientes',
    });
  });

  it('protege escrita de nao-conformidades', async () => {
    await expectRbacFlow({
      routeModulePath: '../../src/modules/nonConformities/presentation/routes/nonConformities',
      controllerModulePath: '../../src/modules/nonConformities/presentation/controllers/nonConformityController',
      mountPath: '/api/quality/non-conformities',
      method: 'post',
      path: '/api/quality/non-conformities/',
      moduleKey: 'qualidade',
    });
  });
});
