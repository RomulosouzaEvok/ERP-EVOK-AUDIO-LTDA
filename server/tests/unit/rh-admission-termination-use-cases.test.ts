/**
 * Testes dos use cases transacionais de Admissão (UC-69, RF-RH-007 a 012) e
 * Demissão (UC-70, RF-RH-017 a 023).
 *
 * Estes dois use cases só se tornaram testáveis sem banco após a
 * introdução de `EmployeeDirectoryService` (passada 2) — antes eles faziam
 * `require('models/index')` internamente. `runInTransaction` é injetado
 * como um passthrough para exercitar o corpo da transação.
 *
 * Base legal conferida no texto oficial em 2026-08-09: Art. 477 §6º da CLT
 * (10 dias corridos após o término do contrato) e Lei 12.506/2011 (aviso
 * prévio proporcional: 30 + 3 por ano, máximo de 60 adicionais).
 *
 * @module tests/unit/rh-admission-termination-use-cases
 */

import ConcludeAdmissionProcessUseCase from '../../src/modules/rh/application/use-cases/admission/ConcludeAdmissionProcessUseCase';
import ConcludeTerminationProcessUseCase from '../../src/modules/rh/application/use-cases/termination/ConcludeTerminationProcessUseCase';
import CreateTerminationProcessUseCase from '../../src/modules/rh/application/use-cases/termination/CreateTerminationProcessUseCase';

/** CPF sintético válido pelo dígito verificador (usado por `Validators.isValidCPF`). */
const VALID_CPF = '52998224725';

const passthroughTransaction = async (fn: any) => fn('TX');

function buildAdmissionDeps(processOverrides: Record<string, any> = {}) {
  const process = {
    id: 10,
    status: 'aso_pendente',
    department_id: 3,
    job_position_id: null,
    aso_result: 'apto',
    aso_valid_until: '2027-01-01',
    ...processOverrides,
  };
  const admissionRepository: any = {
    findById: jest.fn().mockResolvedValue(process),
    update: jest.fn().mockImplementation(async (id: any, data: any) => ({ ...process, id, ...data })),
  };
  const contractRepository: any = { create: jest.fn().mockImplementation(async (data: any) => ({ id: 42, ...data })) };
  const jobHistoryRepository: any = { create: jest.fn().mockImplementation(async (data: any) => ({ id: 55, ...data })) };
  const employeeDirectoryService: any = {
    create: jest.fn().mockImplementation(async (data: any) => ({ id: 501, ...data })),
    findById: jest.fn(),
    countActiveByDepartment: jest.fn(),
    markAsTerminated: jest.fn(),
  };
  const openVacationAccrualPeriodUseCase: any = { execute: jest.fn().mockResolvedValue({ id: 88 }) };
  return { process, admissionRepository, contractRepository, jobHistoryRepository, employeeDirectoryService, openVacationAccrualPeriodUseCase };
}

describe('ConcludeAdmissionProcessUseCase — RF-RH-009 (transacional) e gate de ASO (UC-69 E1)', () => {
  it('cria funcionário + contrato + histórico + período aquisitivo na MESMA transação', async () => {
    const deps = buildAdmissionDeps();
    const useCase = new (ConcludeAdmissionProcessUseCase as any)(
      deps.admissionRepository, deps.contractRepository, deps.jobHistoryRepository,
      deps.employeeDirectoryService, deps.openVacationAccrualPeriodUseCase, passthroughTransaction,
    );

    const result = await useCase.execute({
      id: 10,
      employee: { name: 'João Pereira', cpf: VALID_CPF, hire_date: '2026-09-01', salary: 3500 },
      contract_type: 'experiencia',
      period_1_end_date: '2026-10-30',
      createdBy: 9,
    });

    expect(deps.employeeDirectoryService.create).toHaveBeenCalledWith(expect.objectContaining({ work_regime: 'clt', shift: 'commercial' }), 'TX');
    expect(deps.contractRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ employee_id: 501, type: 'experiencia', start_date: '2026-09-01', status: 'ativo' }), 'TX',
    );
    expect(deps.jobHistoryRepository.create).toHaveBeenCalledWith(expect.objectContaining({ reason: 'admissao' }), 'TX');
    expect(deps.openVacationAccrualPeriodUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 501, periodStart: '2026-09-01', transaction: 'TX' }),
    );
    expect(result.admission_process.status).toBe('concluida');
  });

  it('bloqueia a conclusão quando o ASO admissional ainda não foi confirmado — nenhuma escrita acontece', async () => {
    const deps = buildAdmissionDeps({ aso_result: null });
    const useCase = new (ConcludeAdmissionProcessUseCase as any)(
      deps.admissionRepository, deps.contractRepository, deps.jobHistoryRepository,
      deps.employeeDirectoryService, deps.openVacationAccrualPeriodUseCase, passthroughTransaction,
    );

    await expect(useCase.execute({
      id: 10, employee: { name: 'João', cpf: VALID_CPF, hire_date: '2026-09-01' }, contract_type: 'indeterminado', createdBy: 9,
    })).rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining('ASO admissional') });

    expect(deps.employeeDirectoryService.create).not.toHaveBeenCalled();
    expect(deps.contractRepository.create).not.toHaveBeenCalled();
  });

  it('bloqueia quando o ASO está INAPTO (UC-69 E1)', async () => {
    const deps = buildAdmissionDeps({ aso_result: 'inapto' });
    const useCase = new (ConcludeAdmissionProcessUseCase as any)(
      deps.admissionRepository, deps.contractRepository, deps.jobHistoryRepository,
      deps.employeeDirectoryService, deps.openVacationAccrualPeriodUseCase, passthroughTransaction,
    );

    await expect(useCase.execute({
      id: 10, employee: { name: 'João', cpf: VALID_CPF, hire_date: '2026-09-01' }, contract_type: 'indeterminado', createdBy: 9,
    })).rejects.toMatchObject({ statusCode: 422 });
  });

  it('aceita ASO "apto_com_restricao" (RF-RH-030 — restrição não impede a admissão)', async () => {
    const deps = buildAdmissionDeps({ aso_result: 'apto_com_restricao' });
    const useCase = new (ConcludeAdmissionProcessUseCase as any)(
      deps.admissionRepository, deps.contractRepository, deps.jobHistoryRepository,
      deps.employeeDirectoryService, deps.openVacationAccrualPeriodUseCase, passthroughTransaction,
    );

    await useCase.execute({
      id: 10, employee: { name: 'João', cpf: VALID_CPF, hire_date: '2026-09-01' }, contract_type: 'indeterminado', createdBy: 9,
    });
    expect(deps.employeeDirectoryService.create).toHaveBeenCalled();
  });

  it('bloqueia quando o ASO está vencido na data de admissão', async () => {
    const deps = buildAdmissionDeps({ aso_valid_until: '2026-08-01' });
    const useCase = new (ConcludeAdmissionProcessUseCase as any)(
      deps.admissionRepository, deps.contractRepository, deps.jobHistoryRepository,
      deps.employeeDirectoryService, deps.openVacationAccrualPeriodUseCase, passthroughTransaction,
    );

    await expect(useCase.execute({
      id: 10, employee: { name: 'João', cpf: VALID_CPF, hire_date: '2026-09-01' }, contract_type: 'indeterminado', createdBy: 9,
    })).rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining('vencido') });
  });

  it('bloqueia contrato de experiência acima de 90 dias (Art. 445 § único, CLT) antes de qualquer escrita', async () => {
    const deps = buildAdmissionDeps();
    const useCase = new (ConcludeAdmissionProcessUseCase as any)(
      deps.admissionRepository, deps.contractRepository, deps.jobHistoryRepository,
      deps.employeeDirectoryService, deps.openVacationAccrualPeriodUseCase, passthroughTransaction,
    );

    await expect(useCase.execute({
      id: 10, employee: { name: 'João', cpf: VALID_CPF, hire_date: '2026-09-01' },
      contract_type: 'experiencia', period_1_end_date: '2026-12-31', createdBy: 9,
    })).rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining('EXPERIENCE_CONTRACT_EXCEEDS_90_DAYS') });

    expect(deps.employeeDirectoryService.create).not.toHaveBeenCalled();
  });

  it('rejeita CPF inválido com 400 (mesma validação de CreateEmployeeUseCase, não duplicada)', async () => {
    const deps = buildAdmissionDeps();
    const useCase = new (ConcludeAdmissionProcessUseCase as any)(
      deps.admissionRepository, deps.contractRepository, deps.jobHistoryRepository,
      deps.employeeDirectoryService, deps.openVacationAccrualPeriodUseCase, passthroughTransaction,
    );

    await expect(useCase.execute({
      id: 10, employee: { name: 'João', cpf: '11111111111', hire_date: '2026-09-01' }, contract_type: 'indeterminado', createdBy: 9,
    })).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('CPF') });
  });

  it('converte violação de unicidade de CPF em 409 CONFLICT', async () => {
    const deps = buildAdmissionDeps();
    deps.employeeDirectoryService.create = jest.fn().mockRejectedValue({ name: 'SequelizeUniqueConstraintError' });
    const useCase = new (ConcludeAdmissionProcessUseCase as any)(
      deps.admissionRepository, deps.contractRepository, deps.jobHistoryRepository,
      deps.employeeDirectoryService, deps.openVacationAccrualPeriodUseCase, passthroughTransaction,
    );

    await expect(useCase.execute({
      id: 10, employee: { name: 'João', cpf: VALID_CPF, hire_date: '2026-09-01' }, contract_type: 'indeterminado', createdBy: 9,
    })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('422 quando o processo já está concluído/cancelado', async () => {
    const deps = buildAdmissionDeps({ status: 'concluida' });
    const useCase = new (ConcludeAdmissionProcessUseCase as any)(
      deps.admissionRepository, deps.contractRepository, deps.jobHistoryRepository,
      deps.employeeDirectoryService, deps.openVacationAccrualPeriodUseCase, passthroughTransaction,
    );

    await expect(useCase.execute({
      id: 10, employee: { name: 'João', cpf: VALID_CPF, hire_date: '2026-09-01' }, contract_type: 'indeterminado', createdBy: 9,
    })).rejects.toMatchObject({ statusCode: 422 });
  });
});

describe('CreateTerminationProcessUseCase — RF-RH-017/018/019', () => {
  function buildRepository(open: any = null) {
    return {
      findOpenByEmployeeId: jest.fn().mockResolvedValue(open),
      create: jest.fn().mockImplementation(async (data: any) => ({ id: 77, ...data })),
    } as any;
  }

  it('sugere o aviso prévio proporcional da Lei 12.506/2011 e o prazo do Art. 477 §6º da CLT', async () => {
    const repository = buildRepository();
    const useCase = new (CreateTerminationProcessUseCase as any)(repository);

    const result = await useCase.execute({
      employee_id: 501, termination_type: 'sem_justa_causa', notice_date: '2026-08-10',
      notice_modality: 'indenizado', termination_date: '2026-08-10', hireDate: '2016-08-10', createdBy: 9,
    });

    // 10 anos completos → 30 + 3×10 = 60 dias de aviso.
    expect(result.suggested_notice_days).toBe(60);
    // Art. 477 §6º — 10 dias corridos a partir do TÉRMINO do contrato.
    expect(result.suggested_payment_deadline).toBe('2026-08-20');
    expect(result.status).toBe('aberto');
  });

  it('limita o aviso prévio a 90 dias (60 adicionais) mesmo com 30 anos de casa', async () => {
    const repository = buildRepository();
    const useCase = new (CreateTerminationProcessUseCase as any)(repository);

    const result = await useCase.execute({
      employee_id: 501, termination_type: 'pedido', notice_date: '2026-08-10',
      notice_modality: 'trabalhado', hireDate: '1996-08-10', createdBy: 9,
    });
    expect(result.suggested_notice_days).toBe(90);
  });

  it('409 quando já existe processo de demissão em aberto para o funcionário', async () => {
    const repository = buildRepository({ id: 70, status: 'aberto' });
    const useCase = new (CreateTerminationProcessUseCase as any)(repository);

    await expect(useCase.execute({
      employee_id: 501, termination_type: 'pedido', notice_date: '2026-08-10', notice_modality: 'trabalhado', createdBy: 9,
    })).rejects.toMatchObject({ statusCode: 409 });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('400 quando termination_type está fora do enum da migration', async () => {
    const repository = buildRepository();
    const useCase = new (CreateTerminationProcessUseCase as any)(repository);

    await expect(useCase.execute({
      employee_id: 501, termination_type: 'demissao', notice_date: '2026-08-10', notice_modality: 'trabalhado', createdBy: 9,
    })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('ConcludeTerminationProcessUseCase — RF-RH-022/023 (UC-70 E2)', () => {
  function buildDeps(overrides: Record<string, any> = {}) {
    const process = { id: 77, employee_id: 501, status: 'aberto', termination_date: '2026-08-10', ...(overrides.process ?? {}) };
    const terminationRepository: any = {
      findById: jest.fn().mockResolvedValue(process),
      update: jest.fn().mockImplementation(async (id: any, data: any) => ({ ...process, id, ...data })),
    };
    const employeeDocumentRepository: any = {
      findValidAso: jest.fn().mockResolvedValue({ id: 5, doc_type: 'aso_demissional' }),
      ...(overrides.employeeDocumentRepository ?? {}),
    };
    const assetService: any = { listByResponsible: jest.fn().mockResolvedValue([]), ...(overrides.assetService ?? {}) };
    const userAccountService: any = { deactivate: jest.fn().mockResolvedValue(undefined) };
    const employeeDirectoryService: any = {
      findById: jest.fn().mockResolvedValue({ id: 501, user_id: 33 }),
      markAsTerminated: jest.fn().mockResolvedValue(undefined),
      ...(overrides.employeeDirectoryService ?? {}),
    };
    return { process, terminationRepository, employeeDocumentRepository, assetService, userAccountService, employeeDirectoryService };
  }

  function build(deps: any) {
    return new (ConcludeTerminationProcessUseCase as any)(
      deps.terminationRepository, deps.employeeDocumentRepository, deps.assetService,
      deps.userAccountService, deps.employeeDirectoryService, passthroughTransaction,
    );
  }

  it('desliga o funcionário e desativa o login no MESMO ato transacional', async () => {
    const deps = buildDeps();
    const result = await build(deps).execute({ id: 77, concludedBy: 9 });

    expect(deps.employeeDirectoryService.markAsTerminated).toHaveBeenCalledWith(501, '2026-08-10', 'TX');
    expect(deps.userAccountService.deactivate).toHaveBeenCalledWith(33, 'TX');
    expect(deps.terminationRepository.update).toHaveBeenCalledWith(
      77, expect.objectContaining({ status: 'concluido', checklist_assets_returned: true, concluded_by: 9 }), 'TX',
    );
    expect(result.termination_process.status).toBe('concluido');
  });

  it('bloqueia quando há ativo/EPI ainda vinculado ao funcionário (RF-RH-023, UC-70 E2)', async () => {
    const deps = buildDeps({ assetService: { listByResponsible: jest.fn().mockResolvedValue([{ id: 1, description: 'Notebook', returned: false }]) } });

    await expect(build(deps).execute({ id: 77, concludedBy: 9 }))
      .rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining('devolução de ativos') });
    expect(deps.employeeDirectoryService.markAsTerminated).not.toHaveBeenCalled();
  });

  it('bloqueia quando não há ASO demissional válido (RF-RH-020/030)', async () => {
    const deps = buildDeps({ employeeDocumentRepository: { findValidAso: jest.fn().mockResolvedValue(null) } });

    await expect(build(deps).execute({ id: 77, concludedBy: 9 }))
      .rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining('ASO demissional') });
    expect(deps.employeeDirectoryService.markAsTerminated).not.toHaveBeenCalled();
  });

  it('consulta o gate de ASO pelo doc_type correto (aso_demissional), não por outro subtipo', async () => {
    const deps = buildDeps();
    await build(deps).execute({ id: 77, concludedBy: 9 });

    expect(deps.employeeDocumentRepository.findValidAso).toHaveBeenCalledWith(501, 'aso_demissional', expect.any(String));
  });

  it('pula a desativação de login sem erro quando o funcionário nunca teve usuário', async () => {
    const deps = buildDeps({ employeeDirectoryService: { findById: jest.fn().mockResolvedValue({ id: 501, user_id: null }), markAsTerminated: jest.fn() } });

    await build(deps).execute({ id: 77, concludedBy: 9 });
    expect(deps.userAccountService.deactivate).not.toHaveBeenCalled();
  });

  it('422 quando o processo já está concluído', async () => {
    const deps = buildDeps({ process: { status: 'concluido' } });

    await expect(build(deps).execute({ id: 77, concludedBy: 9 })).rejects.toMatchObject({ statusCode: 422 });
    expect(deps.assetService.listByResponsible).not.toHaveBeenCalled();
  });
});
