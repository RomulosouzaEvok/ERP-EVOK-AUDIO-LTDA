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

  jest.doMock('../../src/services/auditLogService', () => ({
    logAction: jest.fn(async () => undefined),
  }));

  jest.doMock('../../src/services/itemProductMirrorService', () => ({
    ensureProductMirrorForItem: jest.fn(async () => null),
  }));

  jest.doMock('../../src/modules/items/application/use-cases/CreateItemUseCase', () =>
    jest.fn().mockImplementation(() => ({
      execute: jest.fn(async (input: Record<string, any>) => ({
        id: 'item-1',
        codigo: input.codigo,
        descricao: input.descricao,
        tipo: input.tipo,
        unidade: input.unidade,
      })),
    })));

  jest.doMock('../../src/modules/items/application/use-cases/UpdateItemUseCase', () =>
    jest.fn().mockImplementation(() => ({
      execute: jest.fn(async ({ itemId, data }: any) => ({
        id: itemId,
        codigo: 'ITEM-ATUALIZADO',
        ...data,
      })),
    })));

  jest.doMock('../../src/modules/items/application/use-cases/DeactivateItemUseCase', () =>
    jest.fn().mockImplementation(() => ({
      execute: jest.fn(async ({ itemId }: any) => ({
        id: itemId,
        codigo: 'ITEM-INATIVO',
        status: 'INATIVO',
      })),
    })));

  jest.doMock('../../src/modules/items/application/use-cases/CreateItemStructureUseCase', () =>
    jest.fn().mockImplementation(() => ({ execute: jest.fn() })));
  jest.doMock('../../src/modules/items/application/use-cases/ExplodeItemStructureUseCase', () =>
    jest.fn().mockImplementation(() => ({ execute: jest.fn() })));
  jest.doMock('../../src/modules/items/application/use-cases/ListItemSuppliersUseCase', () =>
    jest.fn().mockImplementation(() => ({ execute: jest.fn() })));
  jest.doMock('../../src/modules/items/application/use-cases/CreateItemSupplierUseCase', () =>
    jest.fn().mockImplementation(() => ({ execute: jest.fn() })));
  jest.doMock('../../src/modules/items/application/use-cases/UpdateItemSupplierUseCase', () =>
    jest.fn().mockImplementation(() => ({ execute: jest.fn() })));
  jest.doMock('../../src/modules/items/application/use-cases/DeactivateItemSupplierUseCase', () =>
    jest.fn().mockImplementation(() => ({ execute: jest.fn() })));
  jest.doMock('../../src/modules/items/application/use-cases/GetItemPurchaseHistoryUseCase', () =>
    jest.fn().mockImplementation(() => ({ execute: jest.fn() })));

  jest.doMock('../../src/modules/items/infrastructure/sequelize/SequelizeItemRepository', () =>
    jest.fn().mockImplementation(() => ({
      findByCode: jest.fn(async () => null),
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

describe('auditoria do modulo de itens', () => {
  it('audita create, update e inactivate', async () => {
    const app = buildApp();
    const { logAction } = require('../../src/services/auditLogService');

    await request(app).post('/api/items').send({
      codigo: 'ITEM-AUDIT',
      descricao: 'Item auditado',
      tipo: 'MATERIA_PRIMA',
      unidade: 'UN',
    });

    await request(app).patch('/api/items/item-1').send({
      descricao: 'Item auditado atualizado',
    });

    await request(app).patch('/api/items/item-1/inactivate').send({});

    expect(logAction).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      action: 'create',
      entityType: 'Item',
      entityDescription: 'ITEM-AUDIT',
    }));
    expect(logAction).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      action: 'update',
      entityType: 'Item',
      entityDescription: 'ITEM-ATUALIZADO',
    }));
    expect(logAction).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      action: 'soft_delete',
      entityType: 'Item',
      entityDescription: 'ITEM-INATIVO',
    }));
  });
});
