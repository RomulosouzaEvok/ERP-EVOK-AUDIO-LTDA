/**
 * Testes: cluster Licenças de Software (P3).
 *
 * Cobre: criação da extensão sobre asset de tipo errado (BR-TI-008),
 * bloqueio de assento excedente (RF-TI-026/BR-TI-015), mascaramento vs.
 * revelação de `license_key` (BR-TI-014/RNF-TI-01).
 *
 * @group unit
 */

const CreateLicenseDetailUseCase = require('../../src/modules/ti/application/use-cases/license/CreateLicenseDetailUseCase');
const AllocateSeatUseCase = require('../../src/modules/ti/application/use-cases/license/AllocateSeatUseCase');
const RevealLicenseKeyUseCase = require('../../src/modules/ti/application/use-cases/license/RevealLicenseKeyUseCase');
const { maskLicenseKey } = require('../../src/modules/ti/infrastructure/mappers/LicenseMapper');
const { ValidationError, NotFoundError, BusinessRuleError, ForbiddenError } = require('../../src/errors');

function makeLicenseRepository(overrides: Partial<any> = {}) {
  let created: any = null;
  return {
    findByAssetId: jest.fn(async () => created),
    createLicenseDetail: jest.fn(async (data: any) => { created = { id: 1, asset_id: data.asset_id, asset: { name: 'AutoCAD 2026' }, ...data }; return created; }),
    countActiveSeats: jest.fn(async () => 0),
    createSeat: jest.fn(async (data: any) => ({ id: 55, ...data })),
    ...overrides,
  };
}

function makeAssetLookupService(overrides: Partial<any> = {}) {
  return { findById: jest.fn(async () => ({ id: 205, asset_type: 'license', name: 'AutoCAD 2026' })), ...overrides };
}

describe('CreateLicenseDetailUseCase', () => {
  it('cria extensao de licenca (fluxo principal)', async () => {
    const repo = makeLicenseRepository();
    const assetLookup = makeAssetLookupService();
    await new CreateLicenseDetailUseCase(repo, assetLookup).execute({ asset_id: 205, license_type: 'subscription', seats: 5 });
    expect(repo.createLicenseDetail).toHaveBeenCalledWith(expect.objectContaining({ asset_id: 205, license_type: 'subscription', seats: 5 }));
  });

  it('FLUXO DE EXCECAO (BR-TI-008): rejeita asset que nao e asset_type=license', async () => {
    const repo = makeLicenseRepository();
    const assetLookup = makeAssetLookupService({ findById: jest.fn(async () => ({ id: 118, asset_type: 'it', name: 'Notebook' })) });
    await expect(
      new CreateLicenseDetailUseCase(repo, assetLookup).execute({ asset_id: 118, license_type: 'subscription' }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.createLicenseDetail).not.toHaveBeenCalled();
  });

  it('lanca NotFoundError se o asset nao existir', async () => {
    const repo = makeLicenseRepository();
    const assetLookup = makeAssetLookupService({ findById: jest.fn(async () => null) });
    await expect(new CreateLicenseDetailUseCase(repo, assetLookup).execute({ asset_id: 999, license_type: 'free' })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('AllocateSeatUseCase', () => {
  it('aloca assento quando ha vaga (fluxo principal)', async () => {
    const repo = makeLicenseRepository({ findByAssetId: jest.fn(async () => ({ id: 1, seats: 5 })), countActiveSeats: jest.fn(async () => 3) });
    const result = await new AllocateSeatUseCase(repo).execute({ assetId: 205, employee_id: 501 });
    expect(repo.createSeat).toHaveBeenCalledWith(expect.objectContaining({ license_detail_id: 1, employee_id: 501 }));
    expect(result.employee).toEqual({ id: 501 });
  });

  it('FLUXO DE EXCECAO (RF-TI-026/BR-TI-015): BLOQUEIA alocacao quando assentos ativos == seats contratado', async () => {
    const repo = makeLicenseRepository({ findByAssetId: jest.fn(async () => ({ id: 1, seats: 5 })), countActiveSeats: jest.fn(async () => 5) });
    await expect(new AllocateSeatUseCase(repo).execute({ assetId: 205, employee_id: 501 })).rejects.toBeInstanceOf(BusinessRuleError);
    expect(repo.createSeat).not.toHaveBeenCalled();
  });
});

describe('RevealLicenseKeyUseCase (BR-TI-014/RNF-TI-01)', () => {
  it('retorna a chave em claro para quem tem modulo ti', async () => {
    const repo = makeLicenseRepository({ findByAssetId: jest.fn(async () => ({ id: 1, license_key: 'XXXX-YYYY-ZZZZ' })) });
    const result = await new RevealLicenseKeyUseCase(repo).execute({ assetId: 205, requesterHasTiModule: true, requesterIsAdmin: false });
    expect(result.license_key).toBe('XXXX-YYYY-ZZZZ');
  });

  it('retorna a chave em claro para admin mesmo sem modulo ti', async () => {
    const repo = makeLicenseRepository({ findByAssetId: jest.fn(async () => ({ id: 1, license_key: 'XXXX-YYYY-ZZZZ' })) });
    const result = await new RevealLicenseKeyUseCase(repo).execute({ assetId: 205, requesterHasTiModule: false, requesterIsAdmin: true });
    expect(result.license_key).toBe('XXXX-YYYY-ZZZZ');
  });

  it('FLUXO DE EXCECAO (BR-TI-014): BLOQUEIA usuario sem modulo ti e sem role admin', async () => {
    const repo = makeLicenseRepository();
    await expect(new RevealLicenseKeyUseCase(repo).execute({ assetId: 205, requesterHasTiModule: false, requesterIsAdmin: false })).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('maskLicenseKey', () => {
  it('mascara mantendo apenas os 4 primeiros caracteres', () => {
    expect(maskLicenseKey('XXXX-YYYY-ZZZZ')).toBe('XXXX**********');
  });

  it('retorna null quando a chave e null', () => {
    expect(maskLicenseKey(null)).toBeNull();
  });
});
