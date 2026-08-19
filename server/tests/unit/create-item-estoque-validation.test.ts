import request from 'supertest';

function buildApp() {
  jest.resetModules();

  const transaction = {
    commit: jest.fn(async () => undefined),
    rollback: jest.fn(async () => undefined),
  };

  jest.doMock('../../src/middlewares/auth', () => ({
    authenticate: (_req: any, _res: any, next: any) => next(),
    authorizeModule: () => (_req: any, _res: any, next: any) => next(),
  }));

  jest.doMock('../../src/config/database', () => ({
    sequelize: { transaction: jest.fn(async () => transaction) },
  }));

  jest.doMock('../../src/services/itemProductMirrorService', () => ({
    ensureProductMirrorForItem: jest.fn(async () => null),
  }));

  jest.doMock('../../src/modules/items/application/use-cases/DeactivateItemUseCase', () =>
    jest.fn().mockImplementation(() => ({
      execute: jest.fn(),
    })));

  jest.doMock('../../src/modules/items/application/use-cases/UpdateItemUseCase', () =>
    jest.fn().mockImplementation(() => ({
      execute: jest.fn(),
    })));

  jest.doMock('../../src/modules/items/application/use-cases/CreateItemStructureUseCase', () =>
    jest.fn().mockImplementation(() => ({
      execute: jest.fn(),
    })));

  jest.doMock('../../src/modules/items/application/use-cases/ExplodeItemStructureUseCase', () =>
    jest.fn().mockImplementation(() => ({
      execute: jest.fn(),
    })));

  jest.doMock('../../src/modules/items/application/use-cases/ListItemSuppliersUseCase', () =>
    jest.fn().mockImplementation(() => ({
      execute: jest.fn(),
    })));

  jest.doMock('../../src/modules/items/application/use-cases/CreateItemSupplierUseCase', () =>
    jest.fn().mockImplementation(() => ({
      execute: jest.fn(),
    })));

  jest.doMock('../../src/modules/items/application/use-cases/UpdateItemSupplierUseCase', () =>
    jest.fn().mockImplementation(() => ({
      execute: jest.fn(),
    })));

  jest.doMock('../../src/modules/items/application/use-cases/DeactivateItemSupplierUseCase', () =>
    jest.fn().mockImplementation(() => ({
      execute: jest.fn(),
    })));

  jest.doMock('../../src/modules/items/application/use-cases/GetItemPurchaseHistoryUseCase', () =>
    jest.fn().mockImplementation(() => ({
      execute: jest.fn(),
    })));

  jest.doMock('../../src/modules/items/infrastructure/sequelize/SequelizeItemRepository', () =>
    jest.fn().mockImplementation(() => ({
      findByCode: jest.fn(async () => null),
      create: jest.fn(async (data: Record<string, any>) => ({
        id: 'item-1',
        ...data,
        estoque_atual: data.estoque_atual ?? 0,
      })),
    })));

  jest.doMock('../../src/modules/items/infrastructure/sequelize/SequelizeItemEstruturaRepository', () =>
    jest.fn().mockImplementation(() => ({})));

  jest.doMock('../../src/modules/items/infrastructure/sequelize/SequelizeItemSupplierRepository', () =>
    jest.fn().mockImplementation(() => ({})));

  const express = require('express');
  const routes = require('../../src/modules/items/presentation/routes/items');
  const errorHandler = require('../../src/middlewares/errorHandler');

  const app = express();
  app.use(express.json());
  app.use('/api/items', routes);
  app.use(errorHandler);

  return app;
}

describe('POST /api/items - bloqueio de estoque_atual', () => {
  it('rejeita estoque_atual: 100 com 422', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/items')
      .send({
        codigo: 'ITEM-100',
        descricao: 'Item com saldo',
        tipo: 'MATERIA_PRIMA',
        unidade: 'UN',
        estoque_atual: 100,
      });

    expect(response.status).toBe(422);
  });

  it('rejeita estoque_atual: 0 com 422', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/items')
      .send({
        codigo: 'ITEM-000',
        descricao: 'Item com saldo zero declarado',
        tipo: 'MATERIA_PRIMA',
        unidade: 'UN',
        estoque_atual: 0,
      });

    expect(response.status).toBe(422);
  });

  it('aceita POST sem estoque_atual e cria com saldo 0', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/items')
      .send({
        codigo: 'ITEM-SEM-SALDO',
        descricao: 'Item sem saldo inicial',
        tipo: 'MATERIA_PRIMA',
        unidade: 'UN',
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(expect.objectContaining({
      codigo: 'ITEM-SEM-SALDO',
      estoque_atual: 0,
    }));
  });
});
