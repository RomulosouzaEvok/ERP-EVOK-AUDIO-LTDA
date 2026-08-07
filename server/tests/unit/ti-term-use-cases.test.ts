/**
 * Testes: cluster Termo de Responsabilidade de Equipamento (UC-50).
 *
 * Cobre o fluxo principal (entrega → devolução) e os fluxos de exceção:
 * segunda entrega ativa do mesmo asset (E1/BR-TI-010), asset de tipo
 * diferente de "it" (BR-TI-008), aceite físico sem upload (E3).
 *
 * @group unit
 */

jest.mock('../../src/config/database', () => ({
  sequelize: { transaction: jest.fn(async () => ({ commit: jest.fn(), rollback: jest.fn() })) },
}));

const CreateResponsibilityTermUseCase = require('../../src/modules/ti/application/use-cases/term/CreateResponsibilityTermUseCase');
const ListPendingTermsForOffboardingUseCase = require('../../src/modules/ti/application/use-cases/term/ListPendingTermsForOffboardingUseCase');
const { ValidationError, NotFoundError, ConflictError, BusinessRuleError } = require('../../src/errors');

function makeTermRepository(overrides: Partial<any> = {}) {
  return {
    findActiveByAsset: jest.fn(async () => null),
    findActiveByEmployee: jest.fn(async () => []),
    countAll: jest.fn(async () => 0),
    create: jest.fn(async (data: any) => ({ id: 300, ...data })),
    findById: jest.fn(async () => ({ id: 300, term_number: 'TERM-2026-0001', status: 'active' })),
    update: jest.fn(async (id: any, data: any) => ({ id, ...data })),
    ...overrides,
  };
}

function makeAssetLookupService(overrides: Partial<any> = {}) {
  return {
    findById: jest.fn(async () => ({ id: 118, asset_type: 'it', name: 'Notebook Dell' })),
    updateResponsible: jest.fn(async () => undefined),
    ...overrides,
  };
}

describe('CreateResponsibilityTermUseCase', () => {
  it('registra entrega (fluxo principal) e atualiza o responsavel do asset', async () => {
    const termRepo = makeTermRepository();
    const assetLookup = makeAssetLookupService();

    await new CreateResponsibilityTermUseCase(termRepo, assetLookup).execute({
      asset_id: 118, employee_id: 501, acceptance_type: 'digital_ack', deliveredBy: 12,
    });

    expect(termRepo.create).toHaveBeenCalledWith(expect.objectContaining({ asset_id: 118, employee_id: 501, status: 'active' }), expect.anything());
    expect(assetLookup.updateResponsible).toHaveBeenCalledWith(118, { responsible_id: 501 }, expect.anything());
  });

  it('FLUXO DE EXCECAO E1 (BR-TI-010): BLOQUEIA segunda entrega ativa do mesmo asset', async () => {
    const termRepo = makeTermRepository({
      findActiveByAsset: jest.fn(async () => ({ id: 299, employee_id: 400, delivered_at: new Date('2026-01-10') })),
    });
    const assetLookup = makeAssetLookupService();

    await expect(
      new CreateResponsibilityTermUseCase(termRepo, assetLookup).execute({ asset_id: 118, employee_id: 501, acceptance_type: 'digital_ack', deliveredBy: 12 }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(termRepo.create).not.toHaveBeenCalled();
  });

  it('FLUXO DE EXCECAO (BR-TI-008): rejeita asset que nao e asset_type=it', async () => {
    const termRepo = makeTermRepository();
    const assetLookup = makeAssetLookupService({ findById: jest.fn(async () => ({ id: 205, asset_type: 'license', name: 'AutoCAD' })) });

    await expect(
      new CreateResponsibilityTermUseCase(termRepo, assetLookup).execute({ asset_id: 205, employee_id: 501, acceptance_type: 'digital_ack', deliveredBy: 12 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO DE EXCECAO E3 (UC-50): rejeita acceptance_type=physical_signature sem signed_document_path', async () => {
    const termRepo = makeTermRepository();
    const assetLookup = makeAssetLookupService();

    await expect(
      new CreateResponsibilityTermUseCase(termRepo, assetLookup).execute({ asset_id: 118, employee_id: 501, acceptance_type: 'physical_signature', deliveredBy: 12 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(termRepo.create).not.toHaveBeenCalled();
  });

  it('lanca NotFoundError se o asset nao existir', async () => {
    const termRepo = makeTermRepository();
    const assetLookup = makeAssetLookupService({ findById: jest.fn(async () => null) });
    await expect(
      new CreateResponsibilityTermUseCase(termRepo, assetLookup).execute({ asset_id: 999, employee_id: 501, acceptance_type: 'digital_ack', deliveredBy: 12 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ListPendingTermsForOffboardingUseCase (consumida por CheckOffboardingBlockersUseCase)', () => {
  it('reporta has_pending_terms=false quando nao ha termo ativo', async () => {
    const termRepo = makeTermRepository({ findActiveByEmployee: jest.fn(async () => []) });
    const result = await new ListPendingTermsForOffboardingUseCase(termRepo).execute({ employeeId: 501 });
    expect(result.has_pending_terms).toBe(false);
    expect(result.terms).toHaveLength(0);
  });

  it('reporta has_pending_terms=true com a lista de termos ativos', async () => {
    const termRepo = makeTermRepository({
      findActiveByEmployee: jest.fn(async () => [{ id: 300, asset: { id: 118, tag: 'TI-0042', name: 'Notebook Dell' }, delivered_at: '2026-01-10', status: 'active' }]),
    });
    const result = await new ListPendingTermsForOffboardingUseCase(termRepo).execute({ employeeId: 501 });
    expect(result.has_pending_terms).toBe(true);
    expect(result.terms[0].asset.tag).toBe('TI-0042');
  });
});
