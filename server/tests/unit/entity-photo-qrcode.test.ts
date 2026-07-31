jest.mock('../../src/services/uploadService', () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
}));
jest.mock('../../src/services/qrCodeService', () => ({
  generate: jest.fn(),
  generateSvg: jest.fn(),
}));

const { uploadFile, deleteFile } = require('../../src/services/uploadService');
const QRCodeService = require('../../src/services/qrCodeService');
import UploadEntityPhotoUseCase = require('../../src/shared/application/UploadEntityPhotoUseCase');
import GenerateEntityQrCodeUseCase = require('../../src/shared/application/GenerateEntityQrCodeUseCase');
import { NotFoundError, ValidationError } from '../../src/errors';

describe('UploadEntityPhotoUseCase', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejeita quando nenhum arquivo foi enviado', async () => {
    const useCase = new UploadEntityPhotoUseCase();
    const repository = { findById: jest.fn(), update: jest.fn() };

    await expect(
      useCase.execute({ repository, id: 1, file: undefined, subfolder: 'products', entityLabel: 'Produto' })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita quando a entidade nao existe', async () => {
    const useCase = new UploadEntityPhotoUseCase();
    const repository = { findById: jest.fn(async () => null), update: jest.fn() };

    await expect(
      useCase.execute({
        repository, id: 999,
        file: { originalname: 'foto.jpg', mimetype: 'image/jpeg', size: 100, buffer: Buffer.from('x') },
        subfolder: 'products', entityLabel: 'Produto',
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('salva a foto, atualiza photo_path e remove o arquivo antigo', async () => {
    uploadFile.mockResolvedValue({ success: true, path: 'uploads/products/novo.jpg', filename: 'novo.jpg', size: 100, mime: 'image/jpeg' });

    const repository = {
      findById: jest.fn()
        .mockResolvedValueOnce({ id: 1, photo_path: 'uploads/products/antigo.jpg' })
        .mockResolvedValueOnce({ id: 1, photo_path: 'uploads/products/novo.jpg' }),
      update: jest.fn(async () => 1),
    };

    const useCase = new UploadEntityPhotoUseCase();
    const result = await useCase.execute({
      repository, id: 1,
      file: { originalname: 'foto.jpg', mimetype: 'image/jpeg', size: 100, buffer: Buffer.from('x') },
      subfolder: 'products', entityLabel: 'Produto',
    });

    expect(uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ originalname: 'foto.jpg' }),
      expect.objectContaining({ subfolder: 'products', allowedMimes: expect.arrayContaining(['image/jpeg']) })
    );
    expect(repository.update).toHaveBeenCalledWith(1, { photo_path: 'uploads/products/novo.jpg' });
    expect(deleteFile).toHaveBeenCalledWith('uploads/products/antigo.jpg');
    expect(result.photo_path).toBe('uploads/products/novo.jpg');
  });

  it('nao tenta remover arquivo antigo quando a entidade nunca teve foto', async () => {
    uploadFile.mockResolvedValue({ success: true, path: 'uploads/assets/novo.jpg', filename: 'novo.jpg', size: 100, mime: 'image/jpeg' });
    const repository = {
      findById: jest.fn()
        .mockResolvedValueOnce({ id: 5, photo_path: null })
        .mockResolvedValueOnce({ id: 5, photo_path: 'uploads/assets/novo.jpg' }),
      update: jest.fn(async () => 1),
    };

    const useCase = new UploadEntityPhotoUseCase();
    await useCase.execute({
      repository, id: 5,
      file: { originalname: 'foto.jpg', mimetype: 'image/jpeg', size: 100, buffer: Buffer.from('x') },
      subfolder: 'assets', entityLabel: 'Ativo',
    });

    expect(deleteFile).not.toHaveBeenCalled();
  });
});

describe('GenerateEntityQrCodeUseCase', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejeita quando a entidade nao existe', async () => {
    const useCase = new GenerateEntityQrCodeUseCase();
    const repository = { findById: jest.fn(async () => null) };

    await expect(
      useCase.execute({ repository, id: 1, entityType: 'product', entityLabel: 'Produto', buildData: () => ({}) })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('gera QR Code PNG por padrao, repassando os dados construidos da entidade', async () => {
    QRCodeService.generate.mockResolvedValue({ qrDataUrl: 'data:image/png;base64,xyz', qrCodeData: '{"type":"product"}' });
    const repository = { findById: jest.fn(async () => ({ id: 1, code: 'P-001', name: 'Produto X' })) };

    const useCase = new GenerateEntityQrCodeUseCase();
    const result = await useCase.execute({
      repository, id: 1, entityType: 'product', entityLabel: 'Produto',
      buildData: (product: any) => ({ code: product.code, name: product.name }),
    });

    expect(QRCodeService.generate).toHaveBeenCalledWith('product', 1, { code: 'P-001', name: 'Produto X' });
    expect(result.format).toBe('png');
    expect(result.qrDataUrl).toContain('data:image/png');
  });

  it('gera QR Code em SVG quando format=svg', async () => {
    QRCodeService.generateSvg.mockResolvedValue({ qrSvg: '<svg></svg>', qrCodeData: '{"type":"asset"}' });
    const repository = { findById: jest.fn(async () => ({ id: 2, tag: 'AT-001', name: 'Máquina' })) };

    const useCase = new GenerateEntityQrCodeUseCase();
    const result = await useCase.execute({
      repository, id: 2, entityType: 'asset', entityLabel: 'Ativo', format: 'svg',
      buildData: (asset: any) => ({ tag: asset.tag, name: asset.name }),
    });

    expect(result.format).toBe('svg');
    expect(result.qrSvg).toBe('<svg></svg>');
  });
});
