/**
 * Testes: cluster Solicitações de Acesso — Onboarding/Change/Offboarding
 * (UC-51).
 *
 * Cobre o fluxo principal (grant executado com sucesso) e o fluxo de
 * exceção mais crítico do bloco: `revoke` bloqueado por
 * `ItResponsibilityTerm` `active` sem tratamento (E1/RF-TI-037/BR-TI-011),
 * além da elegibilidade de aprovador (§4.1 — `ti:approve` OU gestor do
 * departamento).
 *
 * @group unit
 */

const ExecuteAccessRequestUseCase = require('../../src/modules/ti/application/use-cases/accessRequest/ExecuteAccessRequestUseCase');
const CheckOffboardingBlockersUseCase = require('../../src/modules/ti/application/use-cases/accessRequest/CheckOffboardingBlockersUseCase');
const ApproveAccessRequestUseCase = require('../../src/modules/ti/application/use-cases/accessRequest/ApproveAccessRequestUseCase');
const RejectAccessRequestUseCase = require('../../src/modules/ti/application/use-cases/accessRequest/RejectAccessRequestUseCase');
const { ValidationError, NotFoundError, BusinessRuleError, ForbiddenError } = require('../../src/errors');

jest.mock('../../src/modules/ti/domain/services/approverEligibilityService', () => ({
  isEligibleApprover: jest.fn(),
}));
const { isEligibleApprover } = require('../../src/modules/ti/domain/services/approverEligibilityService');

beforeEach(() => {
  jest.clearAllMocks();
});

function makeAccessRequestRepository(overrides: Partial<any> = {}) {
  let state = overrides.initialRequest ?? { id: 900, type: 'revoke', status: 'pending', employee_id: 350, department_id: 4, checklist: {} };
  return {
    findById: jest.fn(async () => state),
    update: jest.fn(async (id: any, data: any) => { state = { ...state, ...data, id }; return state; }),
    ...overrides,
  };
}

function makeListPendingTermsUseCase(pendingTerms: any[] = []) {
  return { execute: jest.fn(async () => ({ employee_id: 350, has_pending_terms: pendingTerms.length > 0, terms: pendingTerms })) };
}

function makeAccessProfileExecutionService(overrides: Partial<any> = {}) {
  return {
    deactivateUser: jest.fn(async () => ({ userId: 77 })),
    provisionAccess: jest.fn(async () => ({ userId: 77 })),
    ...overrides,
  };
}

describe('ExecuteAccessRequestUseCase — revoke (offboarding)', () => {
  it('FLUXO PRINCIPAL: desativa o usuario e conclui quando nao ha termo ativo pendente', async () => {
    const repo = makeAccessRequestRepository();
    const listPendingTerms = makeListPendingTermsUseCase([]);
    const checkBlockers = new CheckOffboardingBlockersUseCase(listPendingTerms);
    const accessProfileService = makeAccessProfileExecutionService();

    const result = await new ExecuteAccessRequestUseCase(repo, accessProfileService, checkBlockers).execute({ id: 900, executedBy: 12, req: {} as any });

    expect(accessProfileService.deactivateUser).toHaveBeenCalledWith({ employeeId: 350, req: {} });
    expect(result.status).toBe('done');
  });

  it('FLUXO DE EXCECAO E1 (RF-TI-037/BR-TI-011): BLOQUEIA execucao quando ha termo ativo sem tratamento', async () => {
    const repo = makeAccessRequestRepository();
    const listPendingTerms = makeListPendingTermsUseCase([{ id: 300, asset: { id: 118, tag: 'TI-0042', name: 'Notebook Dell' } }]);
    const checkBlockers = new CheckOffboardingBlockersUseCase(listPendingTerms);
    const accessProfileService = makeAccessProfileExecutionService();

    const error = await new ExecuteAccessRequestUseCase(repo, accessProfileService, checkBlockers)
      .execute({ id: 900, executedBy: 12, req: {} as any })
      .catch((e: any) => e);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details.pending_terms).toHaveLength(1);
    expect(accessProfileService.deactivateUser).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('lanca NotFoundError se a solicitacao nao existir', async () => {
    const repo = makeAccessRequestRepository({ findById: jest.fn(async () => null) });
    const checkBlockers = new CheckOffboardingBlockersUseCase(makeListPendingTermsUseCase());
    await expect(
      new ExecuteAccessRequestUseCase(repo, makeAccessProfileExecutionService(), checkBlockers).execute({ id: 999, executedBy: 12, req: {} as any }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita executar solicitacao ja done', async () => {
    const repo = makeAccessRequestRepository({ initialRequest: { id: 900, type: 'revoke', status: 'done', employee_id: 350, department_id: 4, checklist: {} } });
    const checkBlockers = new CheckOffboardingBlockersUseCase(makeListPendingTermsUseCase());
    await expect(
      new ExecuteAccessRequestUseCase(repo, makeAccessProfileExecutionService(), checkBlockers).execute({ id: 900, executedBy: 12, req: {} as any }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('RejectAccessRequestUseCase (CASE-013/FIND-ERP-009)', () => {
  it('rejeita quando usuario elegivel e diferente do solicitante', async () => {
    (isEligibleApprover as jest.Mock).mockResolvedValue(true);
    const repo = makeAccessRequestRepository({ initialRequest: { id: 904, type: 'grant', status: 'pending', department_id: 4, requested_by: 44 } });

    const result = await new RejectAccessRequestUseCase(repo).execute({
      id: 904,
      rejection_reason: 'Perfil incorreto',
      approverUserId: 55,
      approverRole: 'operator',
      approverHasTiApprove: true,
    });

    expect(result.status).toBe('rejected');
  });

  it('bloqueia autorejeicao mesmo quando o usuario e elegivel', async () => {
    (isEligibleApprover as jest.Mock).mockResolvedValue(true);
    const repo = makeAccessRequestRepository({ initialRequest: { id: 904, type: 'grant', status: 'pending', department_id: 4, requested_by: 55 } });

    const error = await new RejectAccessRequestUseCase(repo)
      .execute({
        id: 904,
        rejection_reason: 'Perfil incorreto',
        approverUserId: 55,
        approverRole: 'admin',
        approverHasTiApprove: true,
      })
      .catch((e: any) => e);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details.rule).toBe('CASE-013-TI-ACCESS-REJECT');
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('ExecuteAccessRequestUseCase — grant (onboarding)', () => {
  it('provisiona acesso quando a solicitacao ja esta approved', async () => {
    const repo = makeAccessRequestRepository({ initialRequest: { id: 901, type: 'grant', status: 'approved', employee_id: 620, department_id: 4, requested_profile_id: 7, corporate_email: 'x@evokaudio.com' } });
    const checkBlockers = new CheckOffboardingBlockersUseCase(makeListPendingTermsUseCase());
    const accessProfileService = makeAccessProfileExecutionService();

    const result = await new ExecuteAccessRequestUseCase(repo, accessProfileService, checkBlockers).execute({ id: 901, executedBy: 12, req: {} as any });

    expect(accessProfileService.provisionAccess).toHaveBeenCalledWith({ employeeId: 620, profileId: 7, corporateEmail: 'x@evokaudio.com', req: {} });
    expect(result.status).toBe('done');
  });

  it('rejeita executar grant ainda pending (sem aprovacao)', async () => {
    const repo = makeAccessRequestRepository({ initialRequest: { id: 901, type: 'grant', status: 'pending', employee_id: 620, department_id: 4, requested_profile_id: 7 } });
    const checkBlockers = new CheckOffboardingBlockersUseCase(makeListPendingTermsUseCase());
    await expect(
      new ExecuteAccessRequestUseCase(repo, makeAccessProfileExecutionService(), checkBlockers).execute({ id: 901, executedBy: 12, req: {} as any }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('ApproveAccessRequestUseCase (§4.1 — elegibilidade de aprovador)', () => {
  it('aprova quando o use case resolve elegibilidade (ti:approve ou gestor)', async () => {
    (isEligibleApprover as jest.Mock).mockResolvedValue(true);
    const repo = makeAccessRequestRepository({ initialRequest: { id: 902, type: 'grant', status: 'pending', department_id: 4, requested_by: 44 } });

    const result = await new ApproveAccessRequestUseCase(repo).execute({ id: 902, approverUserId: 55, approverRole: 'operator', approverHasTiApprove: false });
    expect(result.status).toBe('approved');
  });

  it('CASE-013/FIND-ERP-009: bloqueia autoaprovacao mesmo quando o usuario e elegivel', async () => {
    (isEligibleApprover as jest.Mock).mockResolvedValue(true);
    const repo = makeAccessRequestRepository({ initialRequest: { id: 902, type: 'grant', status: 'pending', department_id: 4, requested_by: 55 } });

    const error = await new ApproveAccessRequestUseCase(repo)
      .execute({ id: 902, approverUserId: 55, approverRole: 'admin', approverHasTiApprove: true })
      .catch((e: any) => e);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details.rule).toBe('CASE-013-TI-ACCESS-APPROVE');
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('FLUXO DE EXCECAO: BLOQUEIA aprovador nao elegivel (nem ti:approve, nem gestor)', async () => {
    (isEligibleApprover as jest.Mock).mockResolvedValue(false);
    const repo = makeAccessRequestRepository({ initialRequest: { id: 902, type: 'grant', status: 'pending', department_id: 4 } });

    await expect(
      new ApproveAccessRequestUseCase(repo).execute({ id: 902, approverUserId: 55, approverRole: 'operator', approverHasTiApprove: false }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('rejeita aprovar solicitacao do tipo revoke (nao passa por approve)', async () => {
    const repo = makeAccessRequestRepository({ initialRequest: { id: 903, type: 'revoke', status: 'pending', department_id: 4 } });
    await expect(
      new ApproveAccessRequestUseCase(repo).execute({ id: 903, approverUserId: 55, approverRole: 'admin', approverHasTiApprove: false }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
