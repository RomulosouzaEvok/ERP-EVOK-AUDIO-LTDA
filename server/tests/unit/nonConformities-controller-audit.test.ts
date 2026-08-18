jest.mock('../../src/services/auditLogService', () => ({
  logAction: jest.fn(),
}));

const mockNonConformitiesRepository = {
  findById: jest.fn(),
};

const mockCreateNonConformityExecute = jest.fn();
const mockUpdateNonConformityExecute = jest.fn();
const mockCloseNonConformityExecute = jest.fn();

jest.mock('../../src/modules/nonConformities/infrastructure/sequelize/SequelizeNonConformitiesRepository', () => {
  return jest.fn().mockImplementation(() => mockNonConformitiesRepository);
});

jest.mock('../../src/modules/nonConformities/application/use-cases/CreateNonConformityUseCase', () => {
  return jest.fn().mockImplementation(() => ({ execute: mockCreateNonConformityExecute }));
});

jest.mock('../../src/modules/nonConformities/application/use-cases/UpdateNonConformityUseCase', () => {
  return jest.fn().mockImplementation(() => ({ execute: mockUpdateNonConformityExecute }));
});

jest.mock('../../src/modules/nonConformities/application/use-cases/CloseNonConformityUseCase', () => {
  return jest.fn().mockImplementation(() => ({ execute: mockCloseNonConformityExecute }));
});

import { logAction } from '../../src/services/auditLogService';
const nonConformityController = require('../../src/modules/nonConformities/presentation/controllers/nonConformityController');

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('nonConformityController com auditoria (CASE-016)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('audita criação de não conformidade com logAction', async () => {
    const req: any = { body: { description: 'Falha no lote', severity: 'major', origin: 'in_process' }, user: { id: 7 } };
    const res = mockRes();
    const next = jest.fn();
    mockCreateNonConformityExecute.mockResolvedValueOnce({
      id: 40,
      nc_number: 'NC-001',
      status: 'open',
      severity: 'major',
      origin: 'in_process',
      immediate_action: 'contain',
    });

    await nonConformityController.create(req, res, next);

    expect(logAction).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        action: 'create',
        entityType: 'NonConformity',
        entityId: 40,
        entityDescription: 'NC-001',
        newValues: {
          status: 'open',
          severity: 'major',
          origin: 'in_process',
          immediate_action: 'contain',
        },
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it('audita atualização de não conformidade com oldValues e newValues', async () => {
    const req: any = { params: { id: '41' }, body: { status: 'closed' }, user: { id: 9 } };
    const res = mockRes();
    const next = jest.fn();
    mockNonConformitiesRepository.findById.mockResolvedValueOnce({
      id: 41,
      nc_number: 'NC-002',
      status: 'open',
      severity: 'minor',
      origin: 'in_process',
      immediate_action: 'contain',
    });
    mockUpdateNonConformityExecute.mockResolvedValueOnce({
      id: 41,
      nc_number: 'NC-002',
      status: 'closed',
      severity: 'minor',
      origin: 'in_process',
      immediate_action: 'contain',
    });

    await nonConformityController.update(req, res, next);

    expect(logAction).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        action: 'update',
        entityType: 'NonConformity',
        entityId: 41,
        entityDescription: 'NC-002',
        oldValues: {
          status: 'open',
          severity: 'minor',
          origin: 'in_process',
          immediate_action: 'contain',
        },
        newValues: {
          status: 'closed',
          severity: 'minor',
          origin: 'in_process',
          immediate_action: 'contain',
        },
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('audita fechamento de não conformidade com status closed', async () => {
    const req: any = { params: { id: '42' }, user: { id: 11 } };
    const res = mockRes();
    const next = jest.fn();
    mockNonConformitiesRepository.findById.mockResolvedValueOnce({
      id: 42,
      nc_number: 'NC-003',
      status: 'open',
    });
    mockCloseNonConformityExecute.mockResolvedValueOnce({ message: 'Não conformidade fechada' });

    await nonConformityController.remove(req, res, next);

    expect(logAction).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        action: 'soft_delete',
        entityType: 'NonConformity',
        entityId: 42,
        entityDescription: 'NC-003',
        oldValues: { status: 'open' },
        newValues: { status: 'closed' },
      }),
    );
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { message: 'Não conformidade fechada' } });
    expect(next).not.toHaveBeenCalled();
  });
});
