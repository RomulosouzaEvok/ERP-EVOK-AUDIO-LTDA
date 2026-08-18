jest.mock('../../src/services/auditLogService', () => ({
  logAction: jest.fn(),
}));

const mockClientsRepository = {
  findById: jest.fn(),
};

const mockCreateClientExecute = jest.fn();
const mockUpdateClientExecute = jest.fn();
const mockDeactivateClientExecute = jest.fn();

jest.mock('../../src/modules/clients/infrastructure/sequelize/SequelizeClientsRepository', () => {
  return jest.fn().mockImplementation(() => mockClientsRepository);
});

jest.mock('../../src/modules/clients/application/use-cases/CreateClientUseCase', () => {
  return jest.fn().mockImplementation(() => ({ execute: mockCreateClientExecute }));
});

jest.mock('../../src/modules/clients/application/use-cases/UpdateClientUseCase', () => {
  return jest.fn().mockImplementation(() => ({ execute: mockUpdateClientExecute }));
});

jest.mock('../../src/modules/clients/application/use-cases/DeactivateClientUseCase', () => {
  return jest.fn().mockImplementation(() => ({ execute: mockDeactivateClientExecute }));
});

import { logAction } from '../../src/services/auditLogService';
const clientController = require('../../src/modules/clients/presentation/controllers/clientController');

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function mockNext() {
  return jest.fn();
}

describe('clientController com auditoria (CASE-016)', () => {
  beforeEach(() => {
    (logAction as jest.Mock).mockClear();
    mockClientsRepository.findById.mockReset();
    mockCreateClientExecute.mockReset();
    mockUpdateClientExecute.mockReset();
    mockDeactivateClientExecute.mockReset();
  });

  it('audita criação de cliente com logAction', async () => {
    const req: any = { body: { name: 'Cliente Alpha', cpf_cnpj: '12345678000199' } };
    const res = mockRes();
    const next = mockNext();
    mockCreateClientExecute.mockResolvedValueOnce({ id: 10, name: 'Cliente Alpha', status: 'active' });

    await clientController.create(req, res, next);

    expect(mockCreateClientExecute).toHaveBeenCalledTimes(1);
    expect(logAction).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        action: 'create',
        entityType: 'Client',
        entityId: 10,
        entityDescription: 'Cliente Alpha',
        newValues: { name: 'Cliente Alpha', status: 'active' },
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 10, name: 'Cliente Alpha', status: 'active' } });
    expect(next).not.toHaveBeenCalled();
  });

  it('audita atualização de cliente sem expor cpf_cnpj, email ou phone', async () => {
    const req: any = { params: { id: '12' }, body: { name: 'Cliente Beta' } };
    const res = mockRes();
    const next = mockNext();
    mockClientsRepository.findById.mockResolvedValueOnce({ id: 12, name: 'Cliente Alpha', status: 'inactive' });
    mockUpdateClientExecute.mockResolvedValueOnce({ id: 12, name: 'Cliente Beta', status: 'active' });

    await clientController.update(req, res, next);

    expect(mockClientsRepository.findById).toHaveBeenCalledWith(12);
    expect(logAction).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        action: 'update',
        entityType: 'Client',
        entityId: 12,
        oldValues: { name: 'Cliente Alpha', status: 'inactive' },
        newValues: { name: 'Cliente Beta', status: 'active' },
      }),
    );
    const [, payload] = (logAction as jest.Mock).mock.calls[0];
    expect(payload.oldValues).not.toHaveProperty('cpf_cnpj');
    expect(payload.newValues).not.toHaveProperty('cpf_cnpj');
    expect(payload.oldValues).not.toHaveProperty('email');
    expect(payload.newValues).not.toHaveProperty('email');
    expect(payload.oldValues).not.toHaveProperty('phone');
    expect(payload.newValues).not.toHaveProperty('phone');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 12, name: 'Cliente Beta', status: 'active' } });
    expect(next).not.toHaveBeenCalled();
  });

  it('audita inativação de cliente com status anterior e novo status', async () => {
    const req: any = { params: { id: '14' } };
    const res = mockRes();
    const next = mockNext();
    mockClientsRepository.findById.mockResolvedValueOnce({ id: 14, name: 'Cliente Gamma', status: 'active' });
    mockDeactivateClientExecute.mockResolvedValueOnce({ message: 'Cliente inativado com sucesso' });

    await clientController.remove(req, res, next);

    expect(mockClientsRepository.findById).toHaveBeenCalledWith(14);
    expect(logAction).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        action: 'soft_delete',
        entityType: 'Client',
        entityId: 14,
        entityDescription: 'Cliente Gamma',
        oldValues: { status: 'active' },
        newValues: { status: 'inactive' },
      }),
    );
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { message: 'Cliente inativado com sucesso' } });
    expect(next).not.toHaveBeenCalled();
  });
});
