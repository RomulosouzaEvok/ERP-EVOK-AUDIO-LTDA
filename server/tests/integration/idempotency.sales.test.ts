import express from 'express';
import request from 'supertest';

const routeModulePath = '../../src/modules/sales/presentation/routes/sales';
const authModulePath = '../../src/middlewares/auth';
const controllerModulePath = '../../src/modules/sales/presentation/controllers/saleController';
const idempotencyModelPath = '../../src/models/IdempotencyKeyModel';

function createAuthMock() {
  return {
    authenticate: (_req: any, _res: any, next: any) => next(),
    authorizeModule: () => (_req: any, _res: any, next: any) => next(),
  };
}

function createIdempotencyStore() {
  const store = new Map<string, any>();

  return {
    findByPk: jest.fn(async (key: string) => store.get(key) ?? null),
    create: jest.fn(async (data: any) => {
      const row = {
        ...data,
        status: data.status ?? 'in_progress',
      };
      store.set(data.key, row);
      return row;
    }),
    upsert: jest.fn(async (data: any) => {
      const row = {
        ...store.get(data.key),
        ...data,
      };
      store.set(data.key, row);
      return row;
    }),
    __store: store,
  };
}

function createControllerMock(overrides: Record<string, any> = {}) {
  return new Proxy(
    overrides,
    {
      get: (target, property) => {
        if (property in target) {
          return target[property as keyof typeof target];
        }
        return jest.fn((_req: any, res: any) => {
          res.status(200).json({ success: true, handler: String(property) });
        });
      },
    },
  );
}

describe('POST /api/sales - idempotencia', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  function buildApp() {
    const idempotencyStore = createIdempotencyStore();
    const createSale = jest.fn(async (_req: any, res: any) => {
      res.status(201).json({ success: true, data: { id: 101, code: 'SALE-101' } });
    });

    jest.doMock(authModulePath, () => createAuthMock());
    jest.doMock(controllerModulePath, () => createControllerMock({ create: createSale }));
    jest.doMock('../../src/modules/fiscal/presentation/controllers/fiscalController', () => createControllerMock());
    jest.doMock(idempotencyModelPath, () => ({ IdempotencyKey: idempotencyStore }));

    const route = require(routeModulePath);
    const app = express();
    app.use(express.json());
    app.use('/api/sales', route);

    return { app, createSale, idempotencyStore };
  }

  it('cacheia a resposta na segunda chamada com a mesma Idempotency-Key', async () => {
    const { app, createSale, idempotencyStore } = buildApp();
    const payload = {
      customer_id: 1,
      items: [{ product_id: 1, quantity: 1, unit_price: 10 }],
    };

    const first = await request(app)
      .post('/api/sales')
      .set('Authorization', 'Bearer test')
      .set('Idempotency-Key', 'sale-idem-001')
      .send(payload);

    expect(first.status).toBe(201);
    expect(first.body.data.id).toBe(101);
    expect(createSale).toHaveBeenCalledTimes(1);

    const second = await request(app)
      .post('/api/sales')
      .set('Authorization', 'Bearer test')
      .set('Idempotency-Key', 'sale-idem-001')
      .send(payload);

    expect(second.status).toBe(201);
    expect(second.headers['x-idempotency-cache']).toBe('HIT');
    expect(second.body.data.id).toBe(101);
    expect(createSale).toHaveBeenCalledTimes(1);
    expect(idempotencyStore.findByPk).toHaveBeenCalledTimes(2);
  });
});
