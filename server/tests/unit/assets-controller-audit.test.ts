jest.mock('../../src/services/auditLogService', () => ({
  logAction: jest.fn(),
}));

const mockAssetsRepository = {
  findById: jest.fn(),
};

const mockCreateAssetExecute = jest.fn();
const mockUpdateAssetExecute = jest.fn();
const mockDeactivateAssetExecute = jest.fn();
const mockUploadEntityPhotoExecute = jest.fn();

jest.mock('../../src/modules/assets/infrastructure/sequelize/SequelizeAssetsRepository', () => {
  return jest.fn().mockImplementation(() => mockAssetsRepository);
});

jest.mock('../../src/modules/assets/application/use-cases/CreateAssetUseCase', () => {
  return jest.fn().mockImplementation(() => ({ execute: mockCreateAssetExecute }));
});

jest.mock('../../src/modules/assets/application/use-cases/UpdateAssetUseCase', () => {
  return jest.fn().mockImplementation(() => ({ execute: mockUpdateAssetExecute }));
});

jest.mock('../../src/modules/assets/application/use-cases/DeactivateAssetUseCase', () => {
  return jest.fn().mockImplementation(() => ({ execute: mockDeactivateAssetExecute }));
});

jest.mock('../../src/shared/application/UploadEntityPhotoUseCase', () => {
  return jest.fn().mockImplementation(() => ({ execute: mockUploadEntityPhotoExecute }));
});

jest.mock('../../src/shared/application/GenerateEntityQrCodeUseCase', () => {
  return jest.fn().mockImplementation(() => ({ execute: jest.fn() }));
});

import { logAction } from '../../src/services/auditLogService';
const assetController = require('../../src/modules/assets/presentation/controllers/assetController');

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('assetController com auditoria (CASE-016)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('audita criação de ativo com logAction', async () => {
    const req: any = { body: { tag: 'AT-001', name: 'Compressor', department_id: 7 } };
    const res = mockRes();
    const next = jest.fn();
    mockCreateAssetExecute.mockResolvedValueOnce({
      id: 30,
      tag: 'AT-001',
      name: 'Compressor',
      department_id: 7,
      status: 'active',
    });

    await assetController.create(req, res, next);

    expect(logAction).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        action: 'create',
        entityType: 'Asset',
        entityId: 30,
        entityDescription: 'AT-001',
        newValues: { tag: 'AT-001', name: 'Compressor', department_id: 7, status: 'active' },
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it('audita atualização de ativo com oldValues e newValues estruturais', async () => {
    const req: any = { params: { id: '31' }, body: { name: 'Compressor 2', status: 'active' } };
    const res = mockRes();
    const next = jest.fn();
    mockAssetsRepository.findById.mockResolvedValueOnce({
      id: 31,
      tag: 'AT-001',
      name: 'Compressor',
      department_id: 7,
      status: 'decommissioned',
    });
    mockUpdateAssetExecute.mockResolvedValueOnce({
      id: 31,
      tag: 'AT-001',
      name: 'Compressor 2',
      department_id: 7,
      status: 'active',
    });

    await assetController.update(req, res, next);

    expect(logAction).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        action: 'update',
        entityType: 'Asset',
        entityId: 31,
        oldValues: {
          tag: 'AT-001',
          name: 'Compressor',
          department_id: 7,
          status: 'decommissioned',
        },
        newValues: {
          tag: 'AT-001',
          name: 'Compressor 2',
          department_id: 7,
          status: 'active',
        },
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('audita inativação de ativo com novo status decommissioned', async () => {
    const req: any = { params: { id: '32' } };
    const res = mockRes();
    const next = jest.fn();
    mockAssetsRepository.findById.mockResolvedValueOnce({
      id: 32,
      tag: 'AT-002',
      name: 'Balança',
      status: 'active',
    });
    mockDeactivateAssetExecute.mockResolvedValueOnce({ message: 'Ativo inativado' });

    await assetController.remove(req, res, next);

    expect(logAction).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        action: 'soft_delete',
        entityType: 'Asset',
        entityId: 32,
        entityDescription: 'AT-002',
        oldValues: { status: 'active' },
        newValues: { status: 'decommissioned' },
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('audita upload de foto sem gravar caminho do arquivo', async () => {
    const req: any = { params: { id: '33' }, file: { originalname: 'foto.jpg', mimetype: 'image/jpeg', size: 100 } };
    const res = mockRes();
    const next = jest.fn();
    mockAssetsRepository.findById.mockResolvedValueOnce({
      id: 33,
      tag: 'AT-003',
      name: 'Prensa',
      photo_path: null,
    });
    mockUploadEntityPhotoExecute.mockResolvedValueOnce({
      entity: { id: 33, tag: 'AT-003', name: 'Prensa', photo_path: 'uploads/assets/foto.jpg' },
    });

    await assetController.uploadPhoto(req, res, next);

    const [, payload] = (logAction as jest.Mock).mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        action: 'update',
        entityType: 'Asset',
        entityId: 33,
        entityDescription: 'AT-003',
        oldValues: { has_photo: false },
        newValues: { has_photo: true },
      }),
    );
    expect(JSON.stringify(payload)).not.toContain('uploads/assets/foto.jpg');
    expect(next).not.toHaveBeenCalled();
  });
});
