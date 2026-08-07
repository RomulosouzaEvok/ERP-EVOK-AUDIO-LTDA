/**
 * Testes: casos de uso de Material de Divulgação (módulo Marketing),
 * incluindo `UploadMaterialFileUseCase`.
 *
 * @group unit
 */

jest.mock('../../src/services/uploadService', () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
}));

const { uploadFile, deleteFile } = require('../../src/services/uploadService');
const CreateMaterialUseCase = require('../../src/modules/marketing/application/use-cases/material/CreateMaterialUseCase');
const UpdateMaterialUseCase = require('../../src/modules/marketing/application/use-cases/material/UpdateMaterialUseCase');
const GetMaterialByIdUseCase = require('../../src/modules/marketing/application/use-cases/material/GetMaterialByIdUseCase');
const UploadMaterialFileUseCase = require('../../src/modules/marketing/application/use-cases/material/UploadMaterialFileUseCase');
const { NotFoundError, ValidationError } = require('../../src/errors');

function makeMaterialRepository(overrides: Partial<any> = {}) {
  return {
    findMaterialById: jest.fn(async () => null),
    createMaterial: jest.fn(async (data: any) => ({ id: 1, version: '01', approved: false, ...data })),
    updateMaterial: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    listMaterials: jest.fn(async () => ({ rows: [], count: 0 })),
    ...overrides,
  };
}

describe('CreateMaterialUseCase', () => {
  it('FLUXO PRINCIPAL: cria material', async () => {
    const repo = makeMaterialRepository();
    const result = await new CreateMaterialUseCase(repo).execute({ title: 'Catálogo 2026', material_type: 'catalog' });

    expect(repo.createMaterial).toHaveBeenCalledWith(expect.objectContaining({ title: 'Catálogo 2026' }));
    expect(result.title).toBe('Catálogo 2026');
  });
});

describe('UpdateMaterialUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando o material não existe', async () => {
    const repo = makeMaterialRepository();
    await expect(new UpdateMaterialUseCase(repo).execute({ id: 999, approved: true })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO PRINCIPAL: aprova o material', async () => {
    const repo = makeMaterialRepository({
      findMaterialById: jest.fn(async () => ({ id: 1, title: 'Catálogo 2026', approved: false })),
    });

    const result = await new UpdateMaterialUseCase(repo).execute({ id: 1, approved: true });

    expect(repo.updateMaterial).toHaveBeenCalledWith(1, { approved: true });
    expect(result.approved).toBe(true);
  });
});

describe('GetMaterialByIdUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando o material não existe', async () => {
    const repo = makeMaterialRepository();
    await expect(new GetMaterialByIdUseCase(repo).execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('UploadMaterialFileUseCase', () => {
  beforeEach(() => {
    (uploadFile as jest.Mock).mockReset();
    (deleteFile as jest.Mock).mockReset();
  });

  it('FLUXO DE EXCECAO: rejeita quando nenhum arquivo é enviado', async () => {
    const repo = makeMaterialRepository();
    await expect(
      new UploadMaterialFileUseCase().execute({ materialRepository: repo, id: 1, file: undefined }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO DE EXCECAO: lança NotFoundError quando o material não existe', async () => {
    const repo = makeMaterialRepository();
    const file = { originalname: 'catalogo.pdf', mimetype: 'application/pdf', size: 1024, buffer: Buffer.from('%PDF-1.4') };

    await expect(
      new UploadMaterialFileUseCase().execute({ materialRepository: repo, id: 999, file }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO PRINCIPAL: envia o arquivo, persiste file_path e remove o arquivo antigo', async () => {
    (uploadFile as jest.Mock).mockResolvedValue({
      success: true, filename: 'novo.pdf', path: 'uploads/marketing-materials/novo.pdf', size: 1024, mime: 'application/pdf',
    });

    const repo = makeMaterialRepository({
      findMaterialById: jest.fn(async () => ({ id: 1, title: 'Catálogo', file_path: 'uploads/marketing-materials/antigo.pdf' })),
    });
    const file = { originalname: 'catalogo.pdf', mimetype: 'application/pdf', size: 1024, buffer: Buffer.from('%PDF-1.4') };

    await new UploadMaterialFileUseCase().execute({ materialRepository: repo, id: 1, file });

    expect(repo.updateMaterial).toHaveBeenCalledWith(1, { file_path: 'uploads/marketing-materials/novo.pdf' });
    expect(deleteFile).toHaveBeenCalledWith('uploads/marketing-materials/antigo.pdf');
  });
});
