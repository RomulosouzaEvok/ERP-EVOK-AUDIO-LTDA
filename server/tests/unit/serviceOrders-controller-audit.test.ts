jest.mock('../../src/services/auditLogService', () => ({
  logAction: jest.fn(),
}));

const mockServiceOrdersRepository = {
  findById: jest.fn(),
};

const mockCreateServiceOrderExecute = jest.fn();
const mockUpdateServiceOrderExecute = jest.fn();
const mockCancelServiceOrderExecute = jest.fn();

jest.mock('../../src/modules/serviceOrders/infrastructure/sequelize/SequelizeServiceOrdersRepository', () => {
  return jest.fn().mockImplementation(() => mockServiceOrdersRepository);
});

jest.mock('../../src/modules/serviceOrders/application/use-cases/CreateServiceOrderUseCase', () => {
  return jest.fn().mockImplementation(() => ({ execute: mockCreateServiceOrderExecute }));
});

jest.mock('../../src/modules/serviceOrders/application/use-cases/UpdateServiceOrderUseCase', () => {
  return jest.fn().mockImplementation(() => ({ execute: mockUpdateServiceOrderExecute }));
});

jest.mock('../../src/modules/serviceOrders/application/use-cases/CancelServiceOrderUseCase', () => {
  return jest.fn().mockImplementation(() => ({ execute: mockCancelServiceOrderExecute }));
});

import { logAction } from '../../src/services/auditLogService';
const serviceOrderController = require('../../src/modules/serviceOrders/presentation/controllers/serviceOrderController');

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('serviceOrderController com auditoria (CASE-016)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('audita criação de ordem de serviço com logAction', async () => {
    const req: any = { body: { client_id: 4, priority: 'high' } };
    const res = mockRes();
    const next = jest.fn();
    mockCreateServiceOrderExecute.mockResolvedValueOnce({
      id: 50,
      order_number: 'OS-001',
      client_id: 4,
      product_id: 9,
      status: 'open',
      priority: 'high',
    });

    await serviceOrderController.create(req, res, next);

    expect(logAction).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        action: 'create',
        entityType: 'ServiceOrder',
        entityId: 50,
        entityDescription: 'OS-001',
        newValues: {
          order_number: 'OS-001',
          client_id: 4,
          product_id: 9,
          status: 'open',
          priority: 'high',
        },
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it('audita atualização de ordem de serviço com oldValues e newValues', async () => {
    const req: any = { params: { id: '51' }, body: { status: 'completed', priority: 'urgent' } };
    const res = mockRes();
    const next = jest.fn();
    mockServiceOrdersRepository.findById.mockResolvedValueOnce({
      id: 51,
      order_number: 'OS-002',
      status: 'open',
      priority: 'normal',
      technician_id: 12,
      responsible_id: 15,
    });
    mockUpdateServiceOrderExecute.mockResolvedValueOnce({
      id: 51,
      order_number: 'OS-002',
      status: 'completed',
      priority: 'urgent',
      technician_id: 12,
      responsible_id: 15,
    });

    await serviceOrderController.update(req, res, next);

    expect(logAction).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        action: 'update',
        entityType: 'ServiceOrder',
        entityId: 51,
        entityDescription: 'OS-002',
        oldValues: {
          status: 'open',
          priority: 'normal',
          technician_id: 12,
          responsible_id: 15,
        },
        newValues: {
          status: 'completed',
          priority: 'urgent',
          technician_id: 12,
          responsible_id: 15,
        },
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('audita cancelamento de ordem de serviço com status anterior e novo status', async () => {
    const req: any = { params: { id: '52' } };
    const res = mockRes();
    const next = jest.fn();
    mockServiceOrdersRepository.findById.mockResolvedValueOnce({
      id: 52,
      order_number: 'OS-003',
      status: 'open',
    });
    mockCancelServiceOrderExecute.mockResolvedValueOnce({ message: 'Ordem de serviço cancelada' });

    await serviceOrderController.remove(req, res, next);

    expect(logAction).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        action: 'soft_delete',
        entityType: 'ServiceOrder',
        entityId: 52,
        entityDescription: 'OS-003',
        oldValues: { status: 'open' },
        newValues: { status: 'canceled' },
      }),
    );
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { message: 'Ordem de serviço cancelada' } });
    expect(next).not.toHaveBeenCalled();
  });
});
