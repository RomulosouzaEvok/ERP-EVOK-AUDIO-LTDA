/**
 * Testes: cluster Contencioso do módulo Jurídico — JurLegalCase/
 * JurLegalCaseProvision (UC-53, `docs/business/BLOCO_3_JUR_API.md` §3).
 *
 * Cobre: unicidade de `case_number_cnj` (Create), exclusividade da parte
 * contrária, avaliação de risco `probable` exigindo nível `approve` e
 * `provisioned_amount`/`rationale` (E1/UC-53, BR-JUR-015), e o lançamento
 * de custo/depósito judicial via `AccountPayableService` (RF-JUR-018).
 *
 * @group unit
 */

const CreateLegalCaseUseCase = require('../../src/modules/juridico/application/use-cases/legalCase/CreateLegalCaseUseCase');
const CreateLegalCaseProvisionUseCase = require('../../src/modules/juridico/application/use-cases/legalCase/CreateLegalCaseProvisionUseCase');
const RegisterCaseCostUseCase = require('../../src/modules/juridico/application/use-cases/legalCase/RegisterCaseCostUseCase');
const CloseLegalCaseUseCase = require('../../src/modules/juridico/application/use-cases/legalCase/CloseLegalCaseUseCase');
const { ValidationError, NotFoundError, ConflictError, BusinessRuleError, ForbiddenError } = require('../../src/errors');

function makeLegalCase(overrides: Partial<any> = {}) {
  return { id: 500, case_number: 'LC-2026-0031', status: 'active', claim_value: '80000.00', ...overrides };
}

function makeLegalCaseRepository(overrides: Partial<any> = {}) {
  let state = overrides.initialCase ?? makeLegalCase();
  return {
    findByCaseNumber: jest.fn(async () => null),
    create: jest.fn(async (data: any) => { state = { ...state, id: 500, ...data }; return state; }),
    findById: jest.fn(async () => state),
    update: jest.fn(async (id: any, data: any) => { state = { ...state, ...data, id }; return state; }),
    addProvision: jest.fn(async (data: any) => ({ id: 1, ...data })),
    ...overrides,
  };
}

function makeAccountPayableService(overrides: Partial<any> = {}) {
  return { create: jest.fn(async (data: any) => ({ id: 700, ...data })), ...overrides };
}

describe('CreateLegalCaseUseCase', () => {
  it('cadastra processo (fluxo principal)', async () => {
    const repo = makeLegalCaseRepository();
    const result = await new CreateLegalCaseUseCase(repo).execute({
      case_number_cnj: '0001234-56.2026.5.02.0001', type: 'labor', role: 'reu',
      internal_responsible_user_id: 12, createdBy: 1,
    });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ case_number: '0001234-56.2026.5.02.0001', case_role: 'defendant', status: 'active' }));
    expect(result.id).toBe(500);
  });

  it('rejeita campos obrigatorios ausentes', async () => {
    const repo = makeLegalCaseRepository();
    await expect(
      new CreateLegalCaseUseCase(repo).execute({ case_number_cnj: '', type: '', role: '' } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita numero CNJ ja cadastrado (409)', async () => {
    const repo = makeLegalCaseRepository({ findByCaseNumber: jest.fn(async () => makeLegalCase()) });
    await expect(
      new CreateLegalCaseUseCase(repo).execute({
        case_number_cnj: '0001234-56.2026.5.02.0001', type: 'labor', role: 'reu', internal_responsible_user_id: 12, createdBy: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('rejeita mais de uma FK de parte contraria preenchida', async () => {
    const repo = makeLegalCaseRepository();
    await expect(
      new CreateLegalCaseUseCase(repo).execute({
        case_number_cnj: '0001234-56.2026.5.02.0001', type: 'labor', role: 'reu', internal_responsible_user_id: 12, createdBy: 1,
        opposing_party_employee_id: 350, opposing_party_supplier_id: 8,
      } as any),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

describe('CreateLegalCaseProvisionUseCase', () => {
  it('registra avaliacao possible sem exigir approve (fluxo principal)', async () => {
    const repo = makeLegalCaseRepository();
    const result = await new CreateLegalCaseProvisionUseCase(repo).execute({
      legalCaseId: 500, risk_class: 'possible', claim_amount: '30000.00', assessedBy: 1, hasApprove: false,
    });
    expect(result.risk_class).toBe('possible');
  });

  it('rejeita probable sem nivel approve (403, RF-JUR-015)', async () => {
    const repo = makeLegalCaseRepository();
    await expect(
      new CreateLegalCaseProvisionUseCase(repo).execute({
        legalCaseId: 500, risk_class: 'probable', provisioned_amount: '45000.00', rationale: 'x', assessedBy: 1, hasApprove: false,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('rejeita probable sem provisioned_amount>0 ou rationale (422, E1/BR-JUR-015)', async () => {
    const repo = makeLegalCaseRepository();
    await expect(
      new CreateLegalCaseProvisionUseCase(repo).execute({
        legalCaseId: 500, risk_class: 'probable', provisioned_amount: '0', rationale: null, assessedBy: 1, hasApprove: true,
      } as any),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('aceita probable com approve + valor + rationale (fluxo principal)', async () => {
    const repo = makeLegalCaseRepository();
    const result = await new CreateLegalCaseProvisionUseCase(repo).execute({
      legalCaseId: 500, risk_class: 'probable', provisioned_amount: '45000.00', rationale: 'Alta probabilidade', assessedBy: 1, hasApprove: true,
    });
    expect(result.risk_class).toBe('probable');
  });

  it('lanca NotFoundError se o processo nao existir', async () => {
    const repo = makeLegalCaseRepository({ findById: jest.fn(async () => null) });
    await expect(
      new CreateLegalCaseProvisionUseCase(repo).execute({ legalCaseId: 999, risk_class: 'remote', assessedBy: 1, hasApprove: false }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('RegisterCaseCostUseCase', () => {
  it('lanca custo distinguindo deposito judicial de despesa (RF-JUR-018)', async () => {
    const repo = makeLegalCaseRepository();
    const apService = makeAccountPayableService();

    await new RegisterCaseCostUseCase(repo, apService).execute({
      legalCaseId: 500, entry_type: 'judicial_deposit', description: 'Depósito recursal', amount: '5000.00', due_date: '2026-09-30',
    });

    expect(apService.create).toHaveBeenCalledWith(expect.objectContaining({ legal_case_id: 500, legal_expense_type: 'judicial_deposit' }));
  });

  it('rejeita campos obrigatorios ausentes', async () => {
    const repo = makeLegalCaseRepository();
    const apService = makeAccountPayableService();
    await expect(
      new RegisterCaseCostUseCase(repo, apService).execute({ legalCaseId: 500 } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('CloseLegalCaseUseCase', () => {
  it('encerra settled e gera parcelas em AccountPayable (A2/UC-53)', async () => {
    const repo = makeLegalCaseRepository();
    const apService = makeAccountPayableService();

    const result = await new CloseLegalCaseUseCase(repo, apService).execute({
      id: 500, resolution: 'settled', settlement_amount: '60000.00', installments: 3, resolution_notes: 'Acordo homologado',
    });

    expect(result.status).toBe('settled');
    expect(apService.create).toHaveBeenCalledTimes(3);
  });

  it('encerra archived sem gerar nenhuma AP', async () => {
    const repo = makeLegalCaseRepository();
    const apService = makeAccountPayableService();
    await new CloseLegalCaseUseCase(repo, apService).execute({ id: 500, resolution: 'archived' });
    expect(apService.create).not.toHaveBeenCalled();
  });

  it('rejeita resolution invalido', async () => {
    const repo = makeLegalCaseRepository();
    const apService = makeAccountPayableService();
    await expect(
      new CloseLegalCaseUseCase(repo, apService).execute({ id: 500, resolution: 'invalid' } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
