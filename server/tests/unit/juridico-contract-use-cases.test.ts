/**
 * Testes: cluster Contratos do módulo Jurídico — JurContract (UC-52,
 * `docs/business/BLOCO_3_JUR_API.md` §2).
 *
 * Cobre: contraparte polimórfica mutuamente exclusiva (CreateContract),
 * bloqueio de ativação sem responsável/assinatura/checklist
 * (ActivateContract), e a regra "nenhuma rota reverte contrato encerrado
 * para active" (TerminateContract, BR-JUR-006).
 *
 * @group unit
 */

const CreateContractUseCase = require('../../src/modules/juridico/application/use-cases/contract/CreateContractUseCase');
const ActivateContractUseCase = require('../../src/modules/juridico/application/use-cases/contract/ActivateContractUseCase');
const ApproveContractUseCase = require('../../src/modules/juridico/application/use-cases/contract/ApproveContractUseCase');
const TerminateContractUseCase = require('../../src/modules/juridico/application/use-cases/contract/TerminateContractUseCase');
const CreateContractAddendumUseCase = require('../../src/modules/juridico/application/use-cases/contract/CreateContractAddendumUseCase');
const { ValidationError, NotFoundError, BusinessRuleError } = require('../../src/errors');

function makeContract(overrides: Partial<any> = {}) {
  return {
    id: 900,
    contract_number: 'CT-2026-0001',
    contract_type: 'commercial',
    status: 'draft',
    end_date: null,
    // Abaixo do threshold RF-JUR-003 (R$ 50.000) — não exige aprovação de
    // alçada extra nos testes que não testam explicitamente essa regra.
    value: '10000.00',
    alert_advance_days: 60,
    renewal_auto: false,
    notice_days: null,
    adjustment_index: 'none',
    adjustment_base_date: null,
    responsible_user_id: null,
    clause_checklist: null,
    signed_at: null,
    ...overrides,
  };
}

function makeContractRepository(overrides: Partial<any> = {}) {
  let state = overrides.initialContract ?? makeContract();
  return {
    countByYear: jest.fn(async () => 0),
    create: jest.fn(async (data: any) => { state = { ...state, id: 900, ...data }; return state; }),
    findById: jest.fn(async () => state),
    update: jest.fn(async (id: any, data: any) => { state = { ...state, ...data, id }; return state; }),
    countPartySignatories: jest.fn(async () => 2),
    hasSignedDocument: jest.fn(async () => true),
    countAddendums: jest.fn(async () => 0),
    addAddendum: jest.fn(async (data: any) => ({ id: 1, ...data })),
    ...overrides,
  };
}

function makeAlertRepository() {
  return { create: jest.fn(async (data: any) => ({ id: 1, ...data })) };
}

function makeApprovalRepository(overrides: Partial<any> = {}) {
  const approvals: any[] = overrides.initialApprovals ?? [];
  return {
    listByContract: jest.fn(async () => approvals),
    findByContractAndRole: jest.fn(async (_contractId: any, role: string) => approvals.find((a) => a.approver_role === role) ?? null),
    create: jest.fn(async (data: any) => { const approval = { id: approvals.length + 1, ...data }; approvals.push(approval); return approval; }),
    ...overrides,
  };
}

describe('CreateContractUseCase', () => {
  it('cria contrato com contraparte supplier (fluxo principal)', async () => {
    const repo = makeContractRepository();
    const { Supplier } = require('../../src/models/index');
    jest.spyOn(Supplier, 'findByPk').mockResolvedValueOnce({ id: 45 });

    const result = await new CreateContractUseCase(repo).execute({
      type: 'supplier', object: 'Fornecimento de componentes', counterparty_type: 'supplier', supplier_id: 45, createdBy: 1,
    });

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ contract_number: 'CT-2026-0001', status: 'draft', supplier_id: 45 }));
    expect(result.id).toBe(900);
  });

  it('rejeita campos obrigatorios ausentes', async () => {
    const repo = makeContractRepository();
    await expect(
      new CreateContractUseCase(repo).execute({ type: '', object: '', counterparty_type: '' } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita contraparte com mais de um grupo preenchido (BR-JUR-001)', async () => {
    const repo = makeContractRepository();
    await expect(
      new CreateContractUseCase(repo).execute({
        type: 'supplier', object: 'x', counterparty_type: 'supplier', supplier_id: 45, client_id: 10, createdBy: 1,
      } as any),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('rejeita counterparty_type=other sem nome/documento (BR-JUR-001)', async () => {
    const repo = makeContractRepository();
    await expect(
      new CreateContractUseCase(repo).execute({ type: 'nda', object: 'x', counterparty_type: 'other', createdBy: 1 } as any),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

describe('ActivateContractUseCase', () => {
  it('ativa contrato e gera alerta de vencimento quando end_date definida (fluxo principal)', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ responsible_user_id: 12, end_date: '2027-08-31' }) });
    const alertRepo = makeAlertRepository();

    const result = await new ActivateContractUseCase(repo, alertRepo).execute({ id: 900, approverHasApprove: false });

    expect(result.status).toBe('active');
    expect(alertRepo.create).toHaveBeenCalledWith(expect.objectContaining({ origin_type: 'contract', alert_subtype: 'expiration' }));
  });

  it('bloqueia ativacao sem responsible_user_id (E1/BR-JUR-001)', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ responsible_user_id: null }) });
    const alertRepo = makeAlertRepository();

    await expect(
      new ActivateContractUseCase(repo, alertRepo).execute({ id: 900, approverHasApprove: false }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('bloqueia ativacao com menos de 2 signatarios parte (E3/BR-JUR-004)', async () => {
    const repo = makeContractRepository({
      initialContract: makeContract({ responsible_user_id: 12 }),
      countPartySignatories: jest.fn(async () => 1),
    });
    const alertRepo = makeAlertRepository();

    await expect(
      new ActivateContractUseCase(repo, alertRepo).execute({ id: 900, approverHasApprove: false }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('bloqueia ativacao sem versao assinada anexada (E3/BR-JUR-004)', async () => {
    const repo = makeContractRepository({
      initialContract: makeContract({ responsible_user_id: 12 }),
      hasSignedDocument: jest.fn(async () => false),
    });
    const alertRepo = makeAlertRepository();

    await expect(
      new ActivateContractUseCase(repo, alertRepo).execute({ id: 900, approverHasApprove: false }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('bloqueia ativacao de contrato employment sem checklist respondido (RF-JUR-010)', async () => {
    const repo = makeContractRepository({
      initialContract: makeContract({ contract_type: 'employment', responsible_user_id: 12, clause_checklist: null }),
    });
    const alertRepo = makeAlertRepository();

    await expect(
      new ActivateContractUseCase(repo, alertRepo).execute({ id: 900, approverHasApprove: false }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('lanca NotFoundError se o contrato nao existir', async () => {
    const repo = makeContractRepository({ findById: jest.fn(async () => null) });
    const alertRepo = makeAlertRepository();
    await expect(
      new ActivateContractUseCase(repo, alertRepo).execute({ id: 999, approverHasApprove: false }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ActivateContractUseCase — RF-JUR-003 (alçada de aprovação por valor)', () => {
  it('ativa direto sem aprovação para valor <= R$ 50.000 (faixa 1, comportamento existente)', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ responsible_user_id: 12, value: '50000.00' }) });
    const alertRepo = makeAlertRepository();
    const approvalRepo = makeApprovalRepository();

    const result = await new ActivateContractUseCase(repo, alertRepo, approvalRepo).execute({ id: 900, approverHasApprove: false });

    expect(result.status).toBe('active');
    // Valor no limite exato (<=) não exige alçada — nem consulta os approvals.
    expect(approvalRepo.listByContract).not.toHaveBeenCalled();
  });

  it('bloqueia ativacao sem aprovacao de diretor para valor entre R$ 50.000 e R$ 300.000 (faixa 2)', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ responsible_user_id: 12, value: '150000.00' }) });
    const alertRepo = makeAlertRepository();
    const approvalRepo = makeApprovalRepository();

    await expect(
      new ActivateContractUseCase(repo, alertRepo, approvalRepo).execute({ id: 900, approverHasApprove: false }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('libera ativacao apos aprovacao de diretor para valor na faixa 2', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ responsible_user_id: 12, value: '150000.00' }) });
    const alertRepo = makeAlertRepository();
    const approvalRepo = makeApprovalRepository({ initialApprovals: [{ id: 1, contract_id: 900, approver_role: 'diretor', approver_user_id: 5 }] });

    const result = await new ActivateContractUseCase(repo, alertRepo, approvalRepo).execute({ id: 900, approverHasApprove: false });
    expect(result.status).toBe('active');
  });

  it('bloqueia ativacao para valor > R$ 300.000 com apenas 1 das 2 aprovacoes (faixa 3)', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ responsible_user_id: 12, value: '500000.00' }) });
    const alertRepo = makeAlertRepository();
    const approvalRepo = makeApprovalRepository({ initialApprovals: [{ id: 1, contract_id: 900, approver_role: 'diretor', approver_user_id: 5 }] });

    await expect(
      new ActivateContractUseCase(repo, alertRepo, approvalRepo).execute({ id: 900, approverHasApprove: false }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('libera ativacao para valor > R$ 300.000 com as 2 aprovacoes (diretor + financeiro, faixa 3)', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ responsible_user_id: 12, value: '500000.00' }) });
    const alertRepo = makeAlertRepository();
    const approvalRepo = makeApprovalRepository({
      initialApprovals: [
        { id: 1, contract_id: 900, approver_role: 'diretor', approver_user_id: 5 },
        { id: 2, contract_id: 900, approver_role: 'financeiro', approver_user_id: 6 },
      ],
    });

    const result = await new ActivateContractUseCase(repo, alertRepo, approvalRepo).execute({ id: 900, approverHasApprove: false });
    expect(result.status).toBe('active');
  });
});

describe('ApproveContractUseCase (RF-JUR-003)', () => {
  it('registra aprovacao de diretor (fluxo principal)', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ value: '150000.00' }) });
    const approvalRepo = makeApprovalRepository();

    const result = await new ApproveContractUseCase(repo, approvalRepo).execute({
      contractId: 900, approverUserId: 5, availableRoles: ['diretor'],
    });

    expect(result.approver_role).toBe('diretor');
    expect(result.approver_user_id).toBe(5); // anti-spoofing: sempre do JWT, nunca do body
    expect(approvalRepo.create).toHaveBeenCalledWith(expect.objectContaining({ contract_id: 900, approver_user_id: 5, approver_role: 'diretor' }));
  });

  it('exige desiredRole quando o usuario tem os dois papeis disponiveis', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ value: '500000.00' }) });
    const approvalRepo = makeApprovalRepository();

    await expect(
      new ApproveContractUseCase(repo, approvalRepo).execute({ contractId: 900, approverUserId: 5, availableRoles: ['diretor', 'financeiro'] }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita desiredRole que o usuario nao possui (anti-spoofing de papel)', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ value: '150000.00' }) });
    const approvalRepo = makeApprovalRepository();

    await expect(
      new ApproveContractUseCase(repo, approvalRepo).execute({ contractId: 900, approverUserId: 5, availableRoles: ['financeiro'], desiredRole: 'diretor' }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('rejeita aprovacao de papel nao exigido pelo valor do contrato (faixa 1, sem alçada)', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ value: '10000.00' }) });
    const approvalRepo = makeApprovalRepository();

    await expect(
      new ApproveContractUseCase(repo, approvalRepo).execute({ contractId: 900, approverUserId: 5, availableRoles: ['diretor'] }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('rejeita aprovacao duplicada do mesmo papel', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ value: '150000.00' }) });
    const approvalRepo = makeApprovalRepository({ initialApprovals: [{ id: 1, contract_id: 900, approver_role: 'diretor', approver_user_id: 5 }] });

    await expect(
      new ApproveContractUseCase(repo, approvalRepo).execute({ contractId: 900, approverUserId: 9, availableRoles: ['diretor'] }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('lanca NotFoundError se o contrato nao existir', async () => {
    const repo = makeContractRepository({ findById: jest.fn(async () => null) });
    const approvalRepo = makeApprovalRepository();

    await expect(
      new ApproveContractUseCase(repo, approvalRepo).execute({ contractId: 999, approverUserId: 5, availableRoles: ['diretor'] }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('TerminateContractUseCase', () => {
  it('encerra contrato terminated com motivo (fluxo principal)', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ status: 'active' }) });
    const result = await new TerminateContractUseCase(repo).execute({
      id: 900, resolution: 'terminated', termination_reason: 'Rescisão amigável', termination_date: '2026-10-15',
    });
    expect(result.status).toBe('terminated');
  });

  it('rejeita terminated sem termination_reason', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ status: 'active' }) });
    await expect(
      new TerminateContractUseCase(repo).execute({ id: 900, resolution: 'terminated' } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('bloqueia reversao de contrato ja encerrado (E2/BR-JUR-006)', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ status: 'terminated' }) });
    await expect(
      new TerminateContractUseCase(repo).execute({ id: 900, resolution: 'expired' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('CreateContractAddendumUseCase', () => {
  it('rejeita change_type=value sem new_value (BR-JUR-003)', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ status: 'active' }) });
    await expect(
      new CreateContractAddendumUseCase(repo).execute({
        contractId: 900, change_type: 'value', description: 'Reajuste', createdBy: 1,
      } as any),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('cria aditivo term e atualiza end_date do contrato (fluxo principal)', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ status: 'active', end_date: '2027-08-31' }) });
    const addendum = await new CreateContractAddendumUseCase(repo).execute({
      contractId: 900, change_type: 'term', new_end_date: '2028-08-31', description: 'Prorrogação', createdBy: 1,
    });
    expect(addendum.previous_end_date).toBe('2027-08-31');
    expect(repo.update).toHaveBeenCalledWith(900, expect.objectContaining({ end_date: '2028-08-31' }));
  });
});
