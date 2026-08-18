jest.mock('../../src/services/auditLogService', () => ({
  logAction: jest.fn(),
}));

const mockSuppliersRepository = {
  findById: jest.fn(),
};

const mockCreateSupplierExecute = jest.fn();
const mockUpdateSupplierExecute = jest.fn();
const mockDeactivateSupplierExecute = jest.fn();

jest.mock('../../src/modules/suppliers/infrastructure/sequelize/SequelizeSuppliersRepository', () => {
  return jest.fn().mockImplementation(() => mockSuppliersRepository);
});

jest.mock('../../src/modules/suppliers/application/use-cases/CreateSupplierUseCase', () => {
  return jest.fn().mockImplementation(() => ({ execute: mockCreateSupplierExecute }));
});

jest.mock('../../src/modules/suppliers/application/use-cases/UpdateSupplierUseCase', () => {
  return jest.fn().mockImplementation(() => ({ execute: mockUpdateSupplierExecute }));
});

jest.mock('../../src/modules/suppliers/application/use-cases/DeactivateSupplierUseCase', () => {
  return jest.fn().mockImplementation(() => ({ execute: mockDeactivateSupplierExecute }));
});

import { logAction } from '../../src/services/auditLogService';
const supplierController = require('../../src/modules/suppliers/presentation/controllers/supplierController');

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('supplierController com auditoria (CASE-016)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('audita criação de fornecedor com logAction', async () => {
    const req: any = {
      body: {
        company_name: 'Fornecedor Alpha',
        cnpj: '12345678000199',
        is_foreign: false,
      },
    };
    const res = mockRes();
    const next = jest.fn();
    mockCreateSupplierExecute.mockResolvedValueOnce({
      id: 20,
      company_name: 'Fornecedor Alpha',
      status: 'active',
      is_foreign: false,
    });

    await supplierController.create(req, res, next);

    expect(logAction).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        action: 'create',
        entityType: 'Supplier',
        entityId: 20,
        entityDescription: 'Fornecedor Alpha',
        newValues: { company_name: 'Fornecedor Alpha', status: 'active', is_foreign: false },
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: 20, company_name: 'Fornecedor Alpha', status: 'active', is_foreign: false },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('audita atualização de fornecedor sem expor cnpj ou contato', async () => {
    const req: any = { params: { id: '21' }, body: { company_name: 'Fornecedor Beta', is_foreign: true } };
    const res = mockRes();
    const next = jest.fn();
    mockSuppliersRepository.findById.mockResolvedValueOnce({
      id: 21,
      company_name: 'Fornecedor Alpha',
      status: 'active',
      is_foreign: false,
    });
    mockUpdateSupplierExecute.mockResolvedValueOnce({
      id: 21,
      company_name: 'Fornecedor Beta',
      status: 'active',
      is_foreign: true,
    });

    await supplierController.update(req, res, next);

    const [, payload] = (logAction as jest.Mock).mock.calls[0];
    expect(payload.oldValues).toEqual({
      company_name: 'Fornecedor Alpha',
      status: 'active',
      is_foreign: false,
    });
    expect(payload.newValues).toEqual({
      company_name: 'Fornecedor Beta',
      status: 'active',
      is_foreign: true,
    });
    expect(payload.oldValues).not.toHaveProperty('cnpj');
    expect(payload.newValues).not.toHaveProperty('cnpj');
    expect(payload.oldValues).not.toHaveProperty('phone');
    expect(payload.newValues).not.toHaveProperty('phone');
    expect(payload.oldValues).not.toHaveProperty('contact_phone');
    expect(payload.newValues).not.toHaveProperty('contact_phone');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: 21, company_name: 'Fornecedor Beta', status: 'active', is_foreign: true },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('audita inativação de fornecedor com status anterior e novo status', async () => {
    const req: any = { params: { id: '22' } };
    const res = mockRes();
    const next = jest.fn();
    mockSuppliersRepository.findById.mockResolvedValueOnce({
      id: 22,
      company_name: 'Fornecedor Gamma',
      status: 'active',
      is_foreign: false,
    });
    mockDeactivateSupplierExecute.mockResolvedValueOnce({ message: 'Fornecedor inativado com sucesso' });

    await supplierController.remove(req, res, next);

    expect(logAction).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        action: 'soft_delete',
        entityType: 'Supplier',
        entityId: 22,
        entityDescription: 'Fornecedor Gamma',
        oldValues: { status: 'active' },
        newValues: { status: 'inactive' },
      }),
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { message: 'Fornecedor inativado com sucesso' },
    });
    expect(next).not.toHaveBeenCalled();
  });
});
