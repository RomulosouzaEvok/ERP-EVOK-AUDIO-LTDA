/**
 * Testes dos use cases de Férias (UC-67, RF-RH-031 a 043 — P0, maior risco
 * legal do Bloco 6). Repositórios e serviços são mockados; o que está sob
 * teste é a REGRA (limites da CLT), não o Sequelize.
 *
 * ⚠️ Disciplina adotada em todo este arquivo: quando o teste espera erro, a
 * asserção é sobre o `code`/mensagem específico da regra alvo — nunca
 * apenas "rejects". Um mock incompleto que fizesse a execução parar numa
 * validação ANTERIOR deixaria o teste verde pelo motivo errado.
 *
 * Artigos citados conferidos no texto oficial da CLT
 * (`planalto.gov.br/ccivil_03/decreto-lei/del5452.htm`) em 2026-08-09.
 *
 * @module tests/unit/rh-vacation-use-cases
 */

import CreateVacationScheduleUseCase from '../../src/modules/rh/application/use-cases/vacation/CreateVacationScheduleUseCase';
import ConfirmVacationTakenUseCase from '../../src/modules/rh/application/use-cases/vacation/ConfirmVacationTakenUseCase';
import ReviseVacationScheduleUseCase from '../../src/modules/rh/application/use-cases/vacation/ReviseVacationScheduleUseCase';
import ResetVacationAccrualPeriodUseCase from '../../src/modules/rh/application/use-cases/vacation/ResetVacationAccrualPeriodUseCase';
import OpenVacationAccrualPeriodUseCase from '../../src/modules/rh/application/use-cases/vacation/OpenVacationAccrualPeriodUseCase';
import GetVacationCalendarUseCase from '../../src/modules/rh/application/use-cases/vacation/GetVacationCalendarUseCase';

/** Período aquisitivo padrão dos testes: 30 dias de direito, aquisitivo terminando em 2027-01-09. */
function buildPeriod(overrides: Record<string, any> = {}) {
  return {
    id: 88,
    employee_id: 501,
    period_start: '2026-01-10',
    period_end: '2027-01-10',
    concessive_end: '2028-01-10',
    entitled_days: 30,
    days_taken: 0,
    status: 'em_curso',
    ...overrides,
  };
}

function buildDeps(overrides: Record<string, any> = {}) {
  const accrualRepository: any = {
    findById: jest.fn().mockResolvedValue(buildPeriod()),
    update: jest.fn().mockImplementation(async (_id: any, data: any) => ({ ...buildPeriod(), ...data })),
    create: jest.fn().mockImplementation(async (data: any) => ({ id: 99, ...data })),
    ...(overrides.accrualRepository ?? {}),
  };
  const scheduleRepository: any = {
    listActiveByAccrualPeriod: jest.fn().mockResolvedValue([]),
    listOverlappingByDepartment: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation(async (data: any) => ({ id: 7, ...data })),
    update: jest.fn().mockImplementation(async (id: any, data: any) => ({ id, ...data })),
    findById: jest.fn(),
    ...(overrides.scheduleRepository ?? {}),
  };
  const employeeDirectoryService: any = {
    findById: jest.fn().mockResolvedValue({ id: 501, department_id: 3 }),
    countActiveByDepartment: jest.fn().mockResolvedValue(100),
    ...(overrides.employeeDirectoryService ?? {}),
  };
  return { accrualRepository, scheduleRepository, employeeDirectoryService };
}

/** `2026-12-07` é uma segunda-feira — início válido pelo Art. 134 §3º (não é sexta/sábado). */
const VALID_MONDAY = '2026-12-07';

describe('CreateVacationScheduleUseCase — Art. 134 §1º, CLT (fracionamento)', () => {
  it('cria a primeira fração de 30 dias sem warning', async () => {
    const deps = buildDeps();
    const useCase = new (CreateVacationScheduleUseCase as any)(deps.accrualRepository, deps.scheduleRepository, deps.employeeDirectoryService);

    const result = await useCase.execute({ accrual_period_id: 88, start_date: VALID_MONDAY, days: 30, createdBy: 1 });

    expect(result.fraction_number).toBe(1);
    expect(result.status).toBe('planejado');
    expect(result.warning).toBeUndefined();
  });

  it('rejeita a 4ª fração com MAX_FRACTIONS_REACHED', async () => {
    const deps = buildDeps({
      scheduleRepository: { listActiveByAccrualPeriod: jest.fn().mockResolvedValue([{ days: 14 }, { days: 5 }, { days: 5 }]) },
    });
    const useCase = new (CreateVacationScheduleUseCase as any)(deps.accrualRepository, deps.scheduleRepository, deps.employeeDirectoryService);

    await expect(useCase.execute({ accrual_period_id: 88, start_date: VALID_MONDAY, days: 5, createdBy: 1 }))
      .rejects.toMatchObject({ statusCode: 422, details: expect.objectContaining({ code: 'MAX_FRACTIONS_REACHED' }) });
  });

  it('rejeita fração menor que 5 dias quando há mais de uma fração (INVALID_FRACTION_SIZE)', async () => {
    const deps = buildDeps({
      scheduleRepository: { listActiveByAccrualPeriod: jest.fn().mockResolvedValue([{ days: 20 }]) },
    });
    const useCase = new (CreateVacationScheduleUseCase as any)(deps.accrualRepository, deps.scheduleRepository, deps.employeeDirectoryService);

    await expect(useCase.execute({ accrual_period_id: 88, start_date: VALID_MONDAY, days: 4, createdBy: 1 }))
      .rejects.toMatchObject({ details: expect.objectContaining({ code: 'INVALID_FRACTION_SIZE' }) });
  });

  it('rejeita quando a soma das frações excede os dias de direito do período (EXCEEDS_ACCRUAL_DAYS)', async () => {
    const deps = buildDeps({
      accrualRepository: { findById: jest.fn().mockResolvedValue(buildPeriod({ entitled_days: 12 })) },
      scheduleRepository: { listActiveByAccrualPeriod: jest.fn().mockResolvedValue([{ days: 10 }]) },
    });
    const useCase = new (CreateVacationScheduleUseCase as any)(deps.accrualRepository, deps.scheduleRepository, deps.employeeDirectoryService);

    await expect(useCase.execute({ accrual_period_id: 88, start_date: VALID_MONDAY, days: 5, createdBy: 1 }))
      .rejects.toMatchObject({ details: expect.objectContaining({ code: 'EXCEEDS_ACCRUAL_DAYS' }) });
  });
});

describe('CreateVacationScheduleUseCase — Art. 134 §3º, CLT (vedação de início antes do DSR)', () => {
  it('rejeita início em sexta-feira (2 dias antes do domingo)', async () => {
    const deps = buildDeps();
    const useCase = new (CreateVacationScheduleUseCase as any)(deps.accrualRepository, deps.scheduleRepository, deps.employeeDirectoryService);

    // 2026-12-11 é uma sexta-feira.
    await expect(useCase.execute({ accrual_period_id: 88, start_date: '2026-12-11', days: 30, createdBy: 1 }))
      .rejects.toMatchObject({ details: expect.objectContaining({ code: 'VACATION_START_BEFORE_WEEKLY_REST' }) });
  });
});

describe('CreateVacationScheduleUseCase — Art. 143, CLT (abono pecuniário)', () => {
  it('rejeita abono acima de 1/3 dos dias do período (ABONO_LIMIT_EXCEEDED)', async () => {
    const deps = buildDeps();
    const useCase = new (CreateVacationScheduleUseCase as any)(deps.accrualRepository, deps.scheduleRepository, deps.employeeDirectoryService);

    await expect(useCase.execute({
      accrual_period_id: 88, start_date: VALID_MONDAY, days: 20, abono: true, abono_days: 11, createdBy: 1,
    })).rejects.toMatchObject({ details: expect.objectContaining({ code: 'ABONO_LIMIT_EXCEEDED' }) });
  });

  it('rejeita requerimento de abono a menos de 15 dias do fim do aquisitivo (ABONO_DEADLINE_EXPIRED)', async () => {
    const deps = buildDeps();
    const useCase = new (CreateVacationScheduleUseCase as any)(deps.accrualRepository, deps.scheduleRepository, deps.employeeDirectoryService);

    // period_end = 2027-01-10; requerimento em 2027-01-05 → 5 dias de antecedência.
    await expect(useCase.execute({
      accrual_period_id: 88, start_date: VALID_MONDAY, days: 20, abono: true, abono_days: 10,
      abono_requested_at: '2027-01-05', createdBy: 1,
    })).rejects.toMatchObject({ details: expect.objectContaining({ code: 'ABONO_DEADLINE_EXPIRED' }) });
  });

  it('aceita abono de exatamente 1/3 requerido com 15 dias de antecedência', async () => {
    const deps = buildDeps();
    const useCase = new (CreateVacationScheduleUseCase as any)(deps.accrualRepository, deps.scheduleRepository, deps.employeeDirectoryService);

    const result = await useCase.execute({
      accrual_period_id: 88, start_date: VALID_MONDAY, days: 20, abono: true, abono_days: 10,
      abono_requested_at: '2026-12-26', createdBy: 1,
    });
    expect(result.abono).toBe(true);
    expect(result.abono_days).toBe(10);
  });
});

describe('CreateVacationScheduleUseCase — Art. 135, CLT (aviso de 30 dias) e RF-RH-039 (limite de equipe)', () => {
  it('aceita aviso com menos de 30 dias, mas devolve warning citando o mínimo legal', async () => {
    const deps = buildDeps();
    const useCase = new (CreateVacationScheduleUseCase as any)(deps.accrualRepository, deps.scheduleRepository, deps.employeeDirectoryService);

    const result = await useCase.execute({
      accrual_period_id: 88, start_date: VALID_MONDAY, days: 30, aviso_em: '2026-12-01', createdBy: 1,
    });
    expect(result.warning).toMatch(/Art\. 135/);
    expect(deps.scheduleRepository.create).toHaveBeenCalled(); // não bloqueia (RF-RH-037)
  });

  it('não gera warning quando o aviso respeita os 30 dias', async () => {
    const deps = buildDeps();
    const useCase = new (CreateVacationScheduleUseCase as any)(deps.accrualRepository, deps.scheduleRepository, deps.employeeDirectoryService);

    const result = await useCase.execute({
      accrual_period_id: 88, start_date: VALID_MONDAY, days: 30, aviso_em: '2026-11-01', createdBy: 1,
    });
    expect(result.warning).toBeUndefined();
  });

  it('exige justificativa de override quando o limite de equipe do departamento é estourado', async () => {
    const deps = buildDeps({
      scheduleRepository: { listOverlappingByDepartment: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]) },
      employeeDirectoryService: { countActiveByDepartment: jest.fn().mockResolvedValue(10) }, // 4/10 = 40% > 30%
    });
    const useCase = new (CreateVacationScheduleUseCase as any)(deps.accrualRepository, deps.scheduleRepository, deps.employeeDirectoryService);

    await expect(useCase.execute({ accrual_period_id: 88, start_date: VALID_MONDAY, days: 30, createdBy: 1 }))
      .rejects.toMatchObject({ statusCode: 400, details: expect.objectContaining({ code: 'TEAM_LIMIT_EXCEEDED' }) });
  });

  it('persiste com warning quando a justificativa de override é informada', async () => {
    const deps = buildDeps({
      scheduleRepository: { listOverlappingByDepartment: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]) },
      employeeDirectoryService: { countActiveByDepartment: jest.fn().mockResolvedValue(10) },
    });
    const useCase = new (CreateVacationScheduleUseCase as any)(deps.accrualRepository, deps.scheduleRepository, deps.employeeDirectoryService);

    const result = await useCase.execute({
      accrual_period_id: 88, start_date: VALID_MONDAY, days: 30,
      override_team_limit_justification: 'Parada programada da linha 2.', createdBy: 1,
    });
    expect(result.warning).toBe('TEAM_LIMIT_EXCEEDED');
    expect(result.fractioning_justification).toBe('Parada programada da linha 2.');
  });
});

describe('ConfirmVacationTakenUseCase — Art. 137, caput, CLT (só sai do risco de dobra com gozo integral)', () => {
  it('gozo parcial mantém o período aberto (status inalterado)', async () => {
    const deps = buildDeps({
      scheduleRepository: { findById: jest.fn().mockResolvedValue({ id: 7, accrual_period_id: 88, days: 10, status: 'planejado' }) },
    });
    const useCase = new (ConfirmVacationTakenUseCase as any)(
      deps.scheduleRepository, deps.accrualRepository, async (fn: any) => fn(undefined),
    );

    const result = await useCase.execute({ id: 7 });
    expect(result.schedule.status).toBe('concluido');
    expect(deps.accrualRepository.update).toHaveBeenCalledWith(88, { days_taken: 10 }, undefined);
  });

  it('gozo integral fecha o período aquisitivo como gozado', async () => {
    const deps = buildDeps({
      scheduleRepository: { findById: jest.fn().mockResolvedValue({ id: 7, accrual_period_id: 88, days: 30, status: 'planejado' }) },
    });
    const useCase = new (ConfirmVacationTakenUseCase as any)(
      deps.scheduleRepository, deps.accrualRepository, async (fn: any) => fn(undefined),
    );

    await useCase.execute({ id: 7 });
    expect(deps.accrualRepository.update).toHaveBeenCalledWith(88, { days_taken: 30, status: 'gozado' }, undefined);
  });

  it('rejeita gozo acima dos dias de direito (EXCEEDS_ACCRUAL_DAYS)', async () => {
    const deps = buildDeps({
      accrualRepository: { findById: jest.fn().mockResolvedValue(buildPeriod({ entitled_days: 12, days_taken: 10 })) },
      scheduleRepository: { findById: jest.fn().mockResolvedValue({ id: 7, accrual_period_id: 88, days: 5, status: 'planejado' }) },
    });
    const useCase = new (ConfirmVacationTakenUseCase as any)(
      deps.scheduleRepository, deps.accrualRepository, async (fn: any) => fn(undefined),
    );

    await expect(useCase.execute({ id: 7 }))
      .rejects.toMatchObject({ details: expect.objectContaining({ code: 'EXCEEDS_ACCRUAL_DAYS' }) });
  });

  it('rejeita confirmação de fração já concluída', async () => {
    const deps = buildDeps({
      scheduleRepository: { findById: jest.fn().mockResolvedValue({ id: 7, accrual_period_id: 88, days: 30, status: 'concluido' }) },
    });
    const useCase = new (ConfirmVacationTakenUseCase as any)(
      deps.scheduleRepository, deps.accrualRepository, async (fn: any) => fn(undefined),
    );

    await expect(useCase.execute({ id: 7 })).rejects.toMatchObject({ statusCode: 422 });
    expect(deps.accrualRepository.update).not.toHaveBeenCalled();
  });
});

describe('ReviseVacationScheduleUseCase — RF-RH-040 (histórico preservado, nunca UPDATE destrutivo)', () => {
  it('cancela a versão anterior, cria a nova e encadeia superseded_by_id', async () => {
    const deps = buildDeps({
      scheduleRepository: { findById: jest.fn().mockResolvedValue({ id: 7, accrual_period_id: 88, days: 30, status: 'planejado' }) },
    });
    const createUseCase = new (CreateVacationScheduleUseCase as any)(deps.accrualRepository, deps.scheduleRepository, deps.employeeDirectoryService);
    const useCase = new (ReviseVacationScheduleUseCase as any)(deps.scheduleRepository, createUseCase);

    const result = await useCase.execute({
      id: 7, reason: 'Cliente antecipou entrega.', start_date: VALID_MONDAY, days: 20, createdBy: 1,
    });

    expect(deps.scheduleRepository.update).toHaveBeenNthCalledWith(1, 7, { status: 'cancelado', revision_reason: 'Cliente antecipou entrega.' });
    expect(deps.scheduleRepository.update).toHaveBeenNthCalledWith(2, 7, { superseded_by_id: result.schedule.id });
    expect(result.schedule.days).toBe(20);
  });

  it('rejeita revisão de fração já concluída (422), sem tocar no repositório', async () => {
    const deps = buildDeps({
      scheduleRepository: { findById: jest.fn().mockResolvedValue({ id: 7, accrual_period_id: 88, days: 30, status: 'concluido' }) },
    });
    const createUseCase = new (CreateVacationScheduleUseCase as any)(deps.accrualRepository, deps.scheduleRepository, deps.employeeDirectoryService);
    const useCase = new (ReviseVacationScheduleUseCase as any)(deps.scheduleRepository, createUseCase);

    await expect(useCase.execute({ id: 7, reason: 'x', start_date: VALID_MONDAY, days: 20, createdBy: 1 }))
      .rejects.toMatchObject({ statusCode: 422 });
    expect(deps.scheduleRepository.update).not.toHaveBeenCalled();
  });

  it('exige reason (400) — RF-RH-040', async () => {
    const deps = buildDeps();
    const createUseCase = new (CreateVacationScheduleUseCase as any)(deps.accrualRepository, deps.scheduleRepository, deps.employeeDirectoryService);
    const useCase = new (ReviseVacationScheduleUseCase as any)(deps.scheduleRepository, createUseCase);

    await expect(useCase.execute({ id: 7, reason: '   ', start_date: VALID_MONDAY, days: 20, createdBy: 1 }))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('ResetVacationAccrualPeriodUseCase — Art. 133, IV, CLT (zeramento por afastamento > 6 meses)', () => {
  it('zera o período e abre um novo a partir do retorno', async () => {
    const deps = buildDeps();
    const openUseCase = new (OpenVacationAccrualPeriodUseCase as any)(deps.accrualRepository);
    const useCase = new (ResetVacationAccrualPeriodUseCase as any)(deps.accrualRepository, openUseCase);

    const result = await useCase.execute({
      periodId: 88, accumulatedInssAbsenceDays: 200, returnDate: '2026-09-01', reason: 'Auxílio-doença > 6 meses',
    });

    expect(result.zeroedPeriod.status).toBe('zerado');
    expect(deps.accrualRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ period_start: '2026-09-01', period_end: '2027-09-01', zeroed_from_period_id: 88 }),
      undefined,
    );
  });

  it('recusa zerar com afastamento acumulado de 6 meses ou menos (422)', async () => {
    const deps = buildDeps();
    const openUseCase = new (OpenVacationAccrualPeriodUseCase as any)(deps.accrualRepository);
    const useCase = new (ResetVacationAccrualPeriodUseCase as any)(deps.accrualRepository, openUseCase);

    await expect(useCase.execute({ periodId: 88, accumulatedInssAbsenceDays: 150, returnDate: '2026-09-01', reason: 'x' }))
      .rejects.toMatchObject({ statusCode: 422 });
    expect(deps.accrualRepository.update).not.toHaveBeenCalled();
  });
});

describe('OpenVacationAccrualPeriodUseCase — Art. 130, caput, CLT (12 meses) com semântica de data do PostgreSQL', () => {
  it('satura 29/02 para 28/02 do ano seguinte, como o CHECK da migration exige', async () => {
    const deps = buildDeps();
    const useCase = new (OpenVacationAccrualPeriodUseCase as any)(deps.accrualRepository);

    await useCase.execute({ employeeId: 501, periodStart: '2028-02-29' });

    // `date '2028-02-29' + interval '1 year'` = 2029-02-28 no Postgres.
    expect(deps.accrualRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ period_start: '2028-02-29', period_end: '2029-02-28', concessive_end: '2030-02-28' }),
      undefined,
    );
  });
});

describe('GetVacationCalendarUseCase — RF-RH-039 (calendário por departamento)', () => {
  it('sinaliza estouro do limite de equipe do departamento', async () => {
    const deps = buildDeps({
      scheduleRepository: { listOverlappingByDepartment: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]) },
      employeeDirectoryService: { countActiveByDepartment: jest.fn().mockResolvedValue(10) },
    });
    const useCase = new (GetVacationCalendarUseCase as any)(deps.scheduleRepository, deps.employeeDirectoryService);

    const result = await useCase.execute({ department_id: 3, from: '2026-12-01', to: '2026-12-31' });
    expect(result.team_limit_exceeded).toBe(true);
    expect(result.schedules).toHaveLength(4);
  });

  it('sem department_id, consulta todos os departamentos e não calcula percentual', async () => {
    const deps = buildDeps();
    const useCase = new (GetVacationCalendarUseCase as any)(deps.scheduleRepository, deps.employeeDirectoryService);

    const result = await useCase.execute({ from: '2026-12-01', to: '2026-12-31' });
    expect(deps.scheduleRepository.listOverlappingByDepartment).toHaveBeenCalledWith(null, '2026-12-01', '2026-12-31');
    expect(result.simultaneous_percent).toBeNull();
    expect(deps.employeeDirectoryService.countActiveByDepartment).not.toHaveBeenCalled();
  });

  it('rejeita intervalo invertido (400)', async () => {
    const deps = buildDeps();
    const useCase = new (GetVacationCalendarUseCase as any)(deps.scheduleRepository, deps.employeeDirectoryService);

    await expect(useCase.execute({ from: '2026-12-31', to: '2026-12-01' })).rejects.toMatchObject({ statusCode: 400 });
  });
});
