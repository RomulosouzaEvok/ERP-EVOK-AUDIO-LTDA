/**
 * Testes: cluster Ato Societário do módulo Jurídico — JurCorporateAct
 * (RF-JUR-030, correção do dono do produto em 2026-08-08).
 *
 * Cobre: criação em `draft`, listagem, bloqueio de edição pós-registro e a
 * transição `draft → registered` quando `registration_protocol` +
 * `registered_at` são informados juntos.
 *
 * @group unit
 */

const CreateCorporateActUseCase = require('../../src/modules/juridico/application/use-cases/corporateAct/CreateCorporateActUseCase');
const ListCorporateActsUseCase = require('../../src/modules/juridico/application/use-cases/corporateAct/ListCorporateActsUseCase');
const GetCorporateActByIdUseCase = require('../../src/modules/juridico/application/use-cases/corporateAct/GetCorporateActByIdUseCase');
const UpdateCorporateActUseCase = require('../../src/modules/juridico/application/use-cases/corporateAct/UpdateCorporateActUseCase');
const { ValidationError, NotFoundError, BusinessRuleError } = require('../../src/errors');

function makeAct(overrides: Partial<any> = {}) {
  return {
    id: 1,
    act_type: 'partners_meeting',
    title: 'Reunião de sócios — aprovação de contas 2026',
    description: null,
    act_date: '2026-08-08',
    registration_protocol: null,
    registered_at: null,
    status: 'draft',
    document_file_path: null,
    created_by: 1,
    ...overrides,
  };
}

function makeRepository(overrides: Partial<any> = {}) {
  let state = overrides.initialAct ?? makeAct();
  return {
    findAndCount: jest.fn(async () => ({ count: 1, rows: [state] })),
    findById: jest.fn(async () => state),
    create: jest.fn(async (data: any) => { state = { id: 1, ...data }; return state; }),
    update: jest.fn(async (id: any, data: any) => { state = { ...state, ...data, id }; return state; }),
    ...overrides,
  };
}

describe('CreateCorporateActUseCase', () => {
  it('cria ato societário em draft (fluxo principal)', async () => {
    const repo = makeRepository();
    const result = await new CreateCorporateActUseCase(repo).execute({
      act_type: 'general_assembly', title: 'AGO 2026', act_date: '2026-08-08', createdBy: 1,
    });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ act_type: 'general_assembly', status: 'draft', created_by: 1 }));
    expect(result.status).toBe('draft');
  });

  it('rejeita campos obrigatorios ausentes', async () => {
    const repo = makeRepository();
    await expect(
      new CreateCorporateActUseCase(repo).execute({ act_type: '', title: '', act_date: '' } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('ListCorporateActsUseCase', () => {
  it('lista paginado', async () => {
    const repo = makeRepository();
    const result = await new ListCorporateActsUseCase(repo).execute({ filters: {}, page: 1, limit: 20 });
    expect(result.total).toBe(1);
    expect(result.rows).toHaveLength(1);
  });
});

describe('GetCorporateActByIdUseCase', () => {
  it('lanca NotFoundError se nao encontrado', async () => {
    const repo = makeRepository({ findById: jest.fn(async () => null) });
    await expect(new GetCorporateActByIdUseCase(repo).execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('UpdateCorporateActUseCase', () => {
  it('edita ato em draft (fluxo principal)', async () => {
    const repo = makeRepository();
    const result = await new UpdateCorporateActUseCase(repo).execute({ id: 1, title: 'AGO 2026 (revisado)' });
    expect(result.title).toBe('AGO 2026 (revisado)');
    expect(result.status).toBe('draft');
  });

  it('transiciona para registered quando protocolo + data de registro sao informados juntos', async () => {
    const repo = makeRepository();
    const result = await new UpdateCorporateActUseCase(repo).execute({
      id: 1, registration_protocol: 'JUCESP-2026-000123', registered_at: '2026-08-20',
    });
    expect(result.status).toBe('registered');
  });

  it('nao transiciona se apenas um dos dois campos (protocolo/data) for informado', async () => {
    const repo = makeRepository();
    const result = await new UpdateCorporateActUseCase(repo).execute({ id: 1, registration_protocol: 'JUCESP-2026-000123' });
    expect(result.status).toBe('draft');
  });

  it('bloqueia edicao apos registered (imutabilidade pos-registro)', async () => {
    const repo = makeRepository({ initialAct: makeAct({ status: 'registered', registration_protocol: 'JUCESP-2026-000123', registered_at: '2026-08-20' }) });
    await expect(
      new UpdateCorporateActUseCase(repo).execute({ id: 1, title: 'Tentativa de edição' }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('lanca NotFoundError se o ato nao existir', async () => {
    const repo = makeRepository({ findById: jest.fn(async () => null) });
    await expect(new UpdateCorporateActUseCase(repo).execute({ id: 999, title: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });
});
