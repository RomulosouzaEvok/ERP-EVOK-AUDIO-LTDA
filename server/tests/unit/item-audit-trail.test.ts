jest.mock('../../src/services/auditLogService', () => ({
  logAction: jest.fn(),
}));

const createExecute = jest.fn();
const updateExecute = jest.fn();
const deactivateExecute = jest.fn();

jest.mock('../../src/modules/items/infrastructure/sequelize/SequelizeItemRepository', () =>
  jest.fn().mockImplementation(() => ({}))
);
jest.mock('../../src/modules/items/infrastructure/sequelize/SequelizeItemEstruturaRepository', () =>
  jest.fn().mockImplementation(() => ({}))
);
jest.mock('../../src/modules/items/infrastructure/sequelize/SequelizeItemSupplierRepository', () =>
  jest.fn().mockImplementation(() => ({}))
);
jest.mock('../../src/modules/items/application/use-cases/CreateItemUseCase', () =>
  jest.fn().mockImplementation(() => ({ execute: createExecute }))
);
jest.mock('../../src/modules/items/application/use-cases/UpdateItemUseCase', () =>
  jest.fn().mockImplementation(() => ({ execute: updateExecute }))
);
jest.mock('../../src/modules/items/application/use-cases/DeactivateItemUseCase', () =>
  jest.fn().mockImplementation(() => ({ execute: deactivateExecute }))
);

import { logAction } from '../../src/services/auditLogService';
import itemController = require('../../src/modules/items/presentation/controllers/itemController');

function createResponse() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('itemController audit trail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('audita create', async () => {
    createExecute.mockResolvedValue({
      id: 'item-1',
      codigo: 'SKU-001',
      descricao: 'Item 1',
      tipo: 'MATERIA_PRIMA',
      unidade: 'UN',
      status: 'ATIVO',
    });

    const req: any = {
      body: {
        codigo: 'SKU-001',
        descricao: 'Item 1',
        tipo: 'MATERIA_PRIMA',
        unidade: 'UN',
      },
    };
    const res = createResponse();
    const next = jest.fn();

    await itemController.create(req, res, next);

    expect(logAction).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        action: 'create',
        entityType: 'Item',
        entityId: 'item-1',
        entityDescription: 'SKU-001',
        description: 'Item SKU-001 criado',
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it('audita update', async () => {
    updateExecute.mockResolvedValue({
      id: 'item-1',
      codigo: 'SKU-001',
      descricao: 'Item 1 atualizado',
      status: 'ATIVO',
    });

    const req: any = {
      params: { id: 'item-1' },
      body: { descricao: 'Item 1 atualizado' },
    };
    const res = createResponse();
    const next = jest.fn();

    await itemController.update(req, res, next);

    expect(logAction).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        action: 'update',
        entityType: 'Item',
        entityId: 'item-1',
        entityDescription: 'SKU-001',
        newValues: { descricao: 'Item 1 atualizado' },
        description: 'Item SKU-001 atualizado',
      })
    );
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('audita inactivate', async () => {
    deactivateExecute.mockResolvedValue({
      id: 'item-1',
      codigo: 'SKU-001',
      status: 'INATIVO',
    });

    const req: any = {
      params: { id: 'item-1' },
    };
    const res = createResponse();
    const next = jest.fn();

    await itemController.inactivate(req, res, next);

    expect(logAction).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        action: 'soft_delete',
        entityType: 'Item',
        entityId: 'item-1',
        entityDescription: 'SKU-001',
        newValues: { status: 'INATIVO' },
        description: 'Item SKU-001 inativado',
      })
    );
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
