/**
 * Testes dos use cases das 3 sub-áreas novas do Bloco 6 RH — Afastamentos,
 * Benefícios e Treinamentos. Repositórios e serviços são mockados
 * (repositório dublê); o que está sob teste é a REGRA de negócio orquestrada
 * pelo use case, não o Sequelize.
 *
 * @module tests/unit/rh-block6-extension-use-cases
 */

import CreateAbsenceUseCase from '../../src/modules/rh/application/use-cases/absence/CreateAbsenceUseCase';
import ReturnFromAbsenceUseCase from '../../src/modules/rh/application/use-cases/absence/ReturnFromAbsenceUseCase';
import ResetVacationAccrualPeriodUseCase from '../../src/modules/rh/application/use-cases/vacation/ResetVacationAccrualPeriodUseCase';
import OpenVacationAccrualPeriodUseCase from '../../src/modules/rh/application/use-cases/vacation/OpenVacationAccrualPeriodUseCase';
import CreateEmployeeBenefitUseCase from '../../src/modules/rh/application/use-cases/benefit/CreateEmployeeBenefitUseCase';
import CreateTrainingCourseUseCase from '../../src/modules/rh/application/use-cases/training/CreateTrainingCourseUseCase';
import UpdateTrainingCourseUseCase from '../../src/modules/rh/application/use-cases/training/UpdateTrainingCourseUseCase';
import CreateEmployeeTrainingUseCase from '../../src/modules/rh/application/use-cases/training/CreateEmployeeTrainingUseCase';
import GetCannotOperateReportUseCase from '../../src/modules/rh/application/use-cases/training/GetCannotOperateReportUseCase';

// ---------------------------------------------------------------------
// Afastamentos
// ---------------------------------------------------------------------
function buildAbsenceDeps(overrides: Record<string, any> = {}) {
  const absenceRepository: any = {
    findOpenByEmployeeId: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation(async (data: any) => ({ id: 501, toJSON: () => ({ id: 501, ...data }), ...data })),
    findById: jest.fn(),
    update: jest.fn().mockImplementation(async (id: any, data: any) => ({ id, ...data })),
    sumAccumulatedDaysByEmployee: jest.fn().mockResolvedValue(0),
    ...(overrides.absenceRepository ?? {}),
  };
  const employeeDocumentRepository: any = {
    findById: jest.fn().mockResolvedValue({ id: 1 }),
    findValidAso: jest.fn().mockResolvedValue(null),
    ...(overrides.employeeDocumentRepository ?? {}),
  };
  const employeeBenefitRepository: any = {
    listActiveByEmployee: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(null),
    ...(overrides.employeeBenefitRepository ?? {}),
  };
  const accrualRepository: any = {
    findOpenByEmployeeId: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    update: jest.fn(),
    create: jest.fn(),
    ...(overrides.accrualRepository ?? {}),
  };
  const employeeDirectoryService: any = {
    findById: jest.fn().mockResolvedValue({ id: 501, salary: 3000, department_id: 3 }),
    updateStatus: jest.fn().mockResolvedValue(undefined),
    ...(overrides.employeeDirectoryService ?? {}),
  };
  const openVacationAccrualPeriodUseCase = new (OpenVacationAccrualPeriodUseCase as any)(accrualRepository);
  const resetVacationAccrualPeriodUseCase = new (ResetVacationAccrualPeriodUseCase as any)(accrualRepository, openVacationAccrualPeriodUseCase);
  // Transação-passthrough determinística para teste (não usa Sequelize real).
  const runInTransaction = async (fn: (t: unknown) => Promise<any>) => fn({ fake: true });
  return { absenceRepository, employeeDocumentRepository, employeeBenefitRepository, accrualRepository, employeeDirectoryService, resetVacationAccrualPeriodUseCase, runInTransaction };
}

describe('CreateAbsenceUseCase — RF-RH-044/045/047/049', () => {
  it('cria afastamento, move employees.status para license e não suspende benefício sem VT/VR', async () => {
    const deps = buildAbsenceDeps();
    const useCase = new (CreateAbsenceUseCase as any)(
      deps.absenceRepository, deps.employeeDocumentRepository, deps.employeeBenefitRepository,
      deps.accrualRepository, deps.employeeDirectoryService, deps.resetVacationAccrualPeriodUseCase, deps.runInTransaction,
    );

    const result = await useCase.execute({ employee_id: 501, type: 'doenca_ate_15d', start_date: '2026-08-01', expected_end_date: '2026-08-10', cid: 'M54.5', createdBy: 1 });

    expect(deps.employeeDirectoryService.updateStatus).toHaveBeenCalledWith(501, 'license', { fake: true });
    expect(result.accrual_period_zeroed).toBe(false);
  });

  it('aplica default de 120 dias para maternidade quando expected_end_date ausente', async () => {
    const deps = buildAbsenceDeps();
    const useCase = new (CreateAbsenceUseCase as any)(
      deps.absenceRepository, deps.employeeDocumentRepository, deps.employeeBenefitRepository,
      deps.accrualRepository, deps.employeeDirectoryService, deps.resetVacationAccrualPeriodUseCase, deps.runInTransaction,
    );

    await useCase.execute({ employee_id: 501, type: 'maternidade', start_date: '2026-08-01', createdBy: 1 });

    const createCall = deps.absenceRepository.create.mock.calls[0][0];
    expect(createCall.expected_end_date).toBe('2026-11-29'); // 2026-08-01 + 120 dias
  });

  it('rejeita quando já existe afastamento em aberto para o funcionário (CONFLICT)', async () => {
    const deps = buildAbsenceDeps({ absenceRepository: { findOpenByEmployeeId: jest.fn().mockResolvedValue({ id: 1 }) } });
    const useCase = new (CreateAbsenceUseCase as any)(
      deps.absenceRepository, deps.employeeDocumentRepository, deps.employeeBenefitRepository,
      deps.accrualRepository, deps.employeeDirectoryService, deps.resetVacationAccrualPeriodUseCase, deps.runInTransaction,
    );

    await expect(useCase.execute({ employee_id: 501, type: 'doenca_ate_15d', start_date: '2026-08-01', createdBy: 1 }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('suspende suspended_days de benefícios VT/VR ativos, mas não de outras categorias', async () => {
    const updateMock = jest.fn().mockResolvedValue(null);
    const deps = buildAbsenceDeps({
      employeeBenefitRepository: {
        listActiveByEmployee: jest.fn().mockResolvedValue([
          { id: 10, suspended_days: 0, benefitType: { category: 'vt' } },
          { id: 11, suspended_days: 5, benefitType: { category: 'saude' } },
        ]),
        update: updateMock,
      },
    });
    const useCase = new (CreateAbsenceUseCase as any)(
      deps.absenceRepository, deps.employeeDocumentRepository, deps.employeeBenefitRepository,
      deps.accrualRepository, deps.employeeDirectoryService, deps.resetVacationAccrualPeriodUseCase, deps.runInTransaction,
    );

    await useCase.execute({ employee_id: 501, type: 'doenca_ate_15d', start_date: '2026-08-01', expected_end_date: '2026-08-10', createdBy: 1 });

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith(10, { suspended_days: 10 }, { fake: true });
  });

  it('zera o período aquisitivo quando acumulado previdenciário ultrapassa 6 meses (RF-RH-041/049)', async () => {
    const deps = buildAbsenceDeps({
      accrualRepository: {
        findOpenByEmployeeId: jest.fn().mockResolvedValue({ id: 88, employee_id: 501, period_start: '2026-01-01', status: 'em_curso' }),
        findById: jest.fn().mockResolvedValue({ id: 88, employee_id: 501, period_start: '2026-01-01' }),
        update: jest.fn().mockResolvedValue({ id: 88, status: 'zerado' }),
        create: jest.fn().mockResolvedValue({ id: 89, status: 'em_curso' }),
      },
      absenceRepository: {
        findOpenByEmployeeId: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async (data: any) => ({ id: 501, toJSON: () => ({ id: 501, ...data }), ...data })),
        sumAccumulatedDaysByEmployee: jest.fn().mockResolvedValue(190), // > 182
      },
    });
    const useCase = new (CreateAbsenceUseCase as any)(
      deps.absenceRepository, deps.employeeDocumentRepository, deps.employeeBenefitRepository,
      deps.accrualRepository, deps.employeeDirectoryService, deps.resetVacationAccrualPeriodUseCase, deps.runInTransaction,
    );

    const result = await useCase.execute({ employee_id: 501, type: 'auxilio_doenca_inss', start_date: '2026-07-01', expected_end_date: '2026-07-30', createdBy: 1 });

    expect(result.accrual_period_zeroed).toBe(true);
    expect(deps.accrualRepository.update).toHaveBeenCalledWith(88, expect.objectContaining({ status: 'zerado' }), { fake: true });
  });
});

describe('ReturnFromAbsenceUseCase — RF-RH-048 (gate de ASO de retorno)', () => {
  function buildReturnDeps(overrides: Record<string, any> = {}) {
    const absenceRepository: any = {
      findById: jest.fn().mockResolvedValue({ id: 1, employee_id: 501, start_date: '2026-08-01', actual_end_date: null, accrual_impact_days: 10 }),
      update: jest.fn().mockImplementation(async (id: any, data: any) => ({ id, ...data })),
      ...(overrides.absenceRepository ?? {}),
    };
    const employeeDocumentRepository: any = {
      findValidAso: jest.fn().mockResolvedValue(null),
      ...(overrides.employeeDocumentRepository ?? {}),
    };
    const employeeDirectoryService: any = {
      updateStatus: jest.fn().mockResolvedValue(undefined),
      ...(overrides.employeeDirectoryService ?? {}),
    };
    const employeeBenefitRepository: any = {
      listActiveByEmployee: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(null),
      ...(overrides.employeeBenefitRepository ?? {}),
    };
    // Transação-passthrough determinística para teste (não usa Sequelize real).
    const runInTransaction = async (fn: (t: unknown) => Promise<any>) => fn({ fake: true });
    return { absenceRepository, employeeDocumentRepository, employeeDirectoryService, employeeBenefitRepository, runInTransaction };
  }

  it('afastamento <= 30 dias não exige ASO e reverte status para active', async () => {
    const deps = buildReturnDeps();
    const useCase = new (ReturnFromAbsenceUseCase as any)(
      deps.absenceRepository, deps.employeeDocumentRepository, deps.employeeDirectoryService,
      deps.employeeBenefitRepository, deps.runInTransaction,
    );

    const result = await useCase.execute({ id: 1, actual_end_date: '2026-08-30' });

    expect(deps.employeeDocumentRepository.findValidAso).not.toHaveBeenCalled();
    expect(deps.employeeDirectoryService.updateStatus).toHaveBeenCalledWith(501, 'active', { fake: true });
    expect(result.reactivated_benefits).toEqual([]);
  });

  it('afastamento > 30 dias sem ASO de retorno válido rejeita com RETURN_ASO_REQUIRED', async () => {
    const deps = buildReturnDeps();
    const useCase = new (ReturnFromAbsenceUseCase as any)(
      deps.absenceRepository, deps.employeeDocumentRepository, deps.employeeDirectoryService,
      deps.employeeBenefitRepository, deps.runInTransaction,
    );

    await expect(useCase.execute({ id: 1, actual_end_date: '2026-08-31' }))
      .rejects.toMatchObject({ details: { code: 'RETURN_ASO_REQUIRED' } });
  });

  it('afastamento > 30 dias COM ASO de retorno válido é aceito', async () => {
    const deps = buildReturnDeps({ employeeDocumentRepository: { findValidAso: jest.fn().mockResolvedValue({ id: 5 }) } });
    const useCase = new (ReturnFromAbsenceUseCase as any)(
      deps.absenceRepository, deps.employeeDocumentRepository, deps.employeeDirectoryService,
      deps.employeeBenefitRepository, deps.runInTransaction,
    );

    const result = await useCase.execute({ id: 1, actual_end_date: '2026-08-31' });

    expect(result.actual_end_date).toBe('2026-08-31');
    expect(deps.employeeDirectoryService.updateStatus).toHaveBeenCalledWith(501, 'active', { fake: true });
  });

  it('rejeita retorno de afastamento já encerrado', async () => {
    const deps = buildReturnDeps({ absenceRepository: { findById: jest.fn().mockResolvedValue({ id: 1, employee_id: 501, start_date: '2026-08-01', actual_end_date: '2026-08-10' }) } });
    const useCase = new (ReturnFromAbsenceUseCase as any)(
      deps.absenceRepository, deps.employeeDocumentRepository, deps.employeeDirectoryService,
      deps.employeeBenefitRepository, deps.runInTransaction,
    );

    await expect(useCase.execute({ id: 1, actual_end_date: '2026-08-15' })).rejects.toMatchObject({ statusCode: 422 });
  });

  it('RF-RH-047-A: reativa benefícios VT/VR suspensos por este afastamento, decrementando suspended_days pelo mesmo total somado na suspensão', async () => {
    const updateMock = jest.fn().mockResolvedValue(null);
    const deps = buildReturnDeps({
      absenceRepository: { findById: jest.fn().mockResolvedValue({ id: 1, employee_id: 501, start_date: '2026-08-01', actual_end_date: null, accrual_impact_days: 10 }) },
      employeeBenefitRepository: {
        listActiveByEmployee: jest.fn().mockResolvedValue([
          { id: 10, benefit_type_id: 1, suspended_days: 10, benefitType: { category: 'vt' } },
          { id: 11, benefit_type_id: 2, suspended_days: 5, benefitType: { category: 'saude' } },
          { id: 12, benefit_type_id: 3, suspended_days: 0, benefitType: { category: 'vr' } },
        ]),
        update: updateMock,
      },
    });
    const useCase = new (ReturnFromAbsenceUseCase as any)(
      deps.absenceRepository, deps.employeeDocumentRepository, deps.employeeDirectoryService,
      deps.employeeBenefitRepository, deps.runInTransaction,
    );

    const result = await useCase.execute({ id: 1, actual_end_date: '2026-08-10' });

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith(10, { suspended_days: 0 }, { fake: true });
    expect(result.reactivated_benefits).toEqual([{ id: 10, benefit_type_id: 1, category: 'vt', suspended_days: 0 }]);
  });

  it('RF-RH-047-A: benefício cancelado durante o afastamento não volta (nem aparece em listActiveByEmployee)', async () => {
    const updateMock = jest.fn().mockResolvedValue(null);
    const deps = buildReturnDeps({
      employeeBenefitRepository: {
        listActiveByEmployee: jest.fn().mockResolvedValue([]), // cancelado já saiu da lista de ativos
        update: updateMock,
      },
    });
    const useCase = new (ReturnFromAbsenceUseCase as any)(
      deps.absenceRepository, deps.employeeDocumentRepository, deps.employeeDirectoryService,
      deps.employeeBenefitRepository, deps.runInTransaction,
    );

    const result = await useCase.execute({ id: 1, actual_end_date: '2026-08-10' });

    expect(updateMock).not.toHaveBeenCalled();
    expect(result.reactivated_benefits).toEqual([]);
  });
});

// ---------------------------------------------------------------------
// Benefícios
// ---------------------------------------------------------------------
describe('CreateEmployeeBenefitUseCase — RF-RH-051/052', () => {
  function buildBenefitDeps(overrides: Record<string, any> = {}) {
    const employeeBenefitRepository: any = {
      findActiveByEmployeeAndType: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (data: any) => ({ id: 1, ...data })),
      ...(overrides.employeeBenefitRepository ?? {}),
    };
    const benefitTypeRepository: any = {
      findById: jest.fn().mockResolvedValue({ id: 3, category: 'vt' }),
      ...(overrides.benefitTypeRepository ?? {}),
    };
    const employeeDirectoryService: any = {
      findById: jest.fn().mockResolvedValue({ id: 501, salary: 3000 }),
      ...(overrides.employeeDirectoryService ?? {}),
    };
    return { employeeBenefitRepository, benefitTypeRepository, employeeDirectoryService };
  }

  it('cria adesão de VT dentro do limite de 6% do salário', async () => {
    const deps = buildBenefitDeps();
    const useCase = new (CreateEmployeeBenefitUseCase as any)(deps.employeeBenefitRepository, deps.benefitTypeRepository, deps.employeeDirectoryService);

    const result = await useCase.execute({ employee_id: 501, benefit_type_id: 3, discount_value: 150, createdBy: 1 });

    expect(result.id).toBe(1);
  });

  it('rejeita VT acima de 6% do salário (salário lido do repositório, nunca do payload)', async () => {
    const deps = buildBenefitDeps();
    const useCase = new (CreateEmployeeBenefitUseCase as any)(deps.employeeBenefitRepository, deps.benefitTypeRepository, deps.employeeDirectoryService);

    await expect(useCase.execute({ employee_id: 501, benefit_type_id: 3, discount_value: 200, createdBy: 1 }))
      .rejects.toMatchObject({ details: { code: 'VT_DISCOUNT_LIMIT_EXCEEDED' } });
  });

  it('rejeita adesão duplicada ativa do mesmo tipo (CONFLICT)', async () => {
    const deps = buildBenefitDeps({ employeeBenefitRepository: { findActiveByEmployeeAndType: jest.fn().mockResolvedValue({ id: 99 }) } });
    const useCase = new (CreateEmployeeBenefitUseCase as any)(deps.employeeBenefitRepository, deps.benefitTypeRepository, deps.employeeDirectoryService);

    await expect(useCase.execute({ employee_id: 501, benefit_type_id: 3, discount_value: 100, createdBy: 1 }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('aceita dependents para categoria saúde', async () => {
    const deps = buildBenefitDeps({ benefitTypeRepository: { findById: jest.fn().mockResolvedValue({ id: 4, category: 'saude' }) } });
    const useCase = new (CreateEmployeeBenefitUseCase as any)(deps.employeeBenefitRepository, deps.benefitTypeRepository, deps.employeeDirectoryService);

    const result = await useCase.execute({ employee_id: 501, benefit_type_id: 4, dependents: [{ name: 'Filho' }], createdBy: 1 });
    expect(result.id).toBe(1);
  });

  it('rejeita dependents para categoria que não é saúde/odonto (400)', async () => {
    const deps = buildBenefitDeps();
    const useCase = new (CreateEmployeeBenefitUseCase as any)(deps.employeeBenefitRepository, deps.benefitTypeRepository, deps.employeeDirectoryService);

    await expect(useCase.execute({ employee_id: 501, benefit_type_id: 3, dependents: [{ name: 'Filho' }], createdBy: 1 }))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});

// ---------------------------------------------------------------------
// Treinamentos — integração RH↔SST (RF-INT-RH-SST-01)
// ---------------------------------------------------------------------
describe('CreateTrainingCourseUseCase / UpdateTrainingCourseUseCase — RF-INT-RH-SST-01', () => {
  function buildCourseDeps(overrides: Record<string, any> = {}) {
    const trainingCourseRepository: any = {
      create: jest.fn().mockImplementation(async (data: any) => ({ id: 7, toJSON: () => ({ id: 7, ...data }), ...data })),
      findById: jest.fn().mockResolvedValue({ id: 7, is_normative: true, nr_code: 'NR-12', validity_months: 24 }),
      update: jest.fn().mockImplementation(async (id: any, data: any) => ({ id, toJSON: () => ({ id, ...data }), ...data })),
      ...(overrides.trainingCourseRepository ?? {}),
    };
    const trainingMatrixService: any = {
      findValidityByNrCode: jest.fn().mockResolvedValue(null),
      ...(overrides.trainingMatrixService ?? {}),
    };
    return { trainingCourseRepository, trainingMatrixService };
  }

  it('CREATE: curso normativo com NR na matriz SST usa a validade da matriz, ignora o valor manual e não emite warning', async () => {
    const deps = buildCourseDeps({ trainingMatrixService: { findValidityByNrCode: jest.fn().mockResolvedValue({ periodicidade_meses: 12 }) } });
    const useCase = new (CreateTrainingCourseUseCase as any)(deps.trainingCourseRepository, deps.trainingMatrixService);

    const result = await useCase.execute({ name: 'NR-12', is_normative: true, nr_code: 'NR-12', validity_months: 60 });

    expect(deps.trainingMatrixService.findValidityByNrCode).toHaveBeenCalledWith('NR-12');
    expect(result.validity_months).toBe(12);
    expect(result.validity_source).toBe('sst_matrix');
    expect(result.warning).toBeUndefined();
  });

  it('CREATE: curso normativo com NR fora da matriz SST mantém o valor manual + warning (RF-RH-059)', async () => {
    const deps = buildCourseDeps();
    const useCase = new (CreateTrainingCourseUseCase as any)(deps.trainingCourseRepository, deps.trainingMatrixService);

    const result = await useCase.execute({ name: 'Norma inexistente', is_normative: true, nr_code: 'NR-999', validity_months: 36 });

    expect(result.validity_months).toBe(36);
    expect(result.validity_source).toBe('manual');
    expect(result.warning).toBeTruthy();
  });

  it('CREATE: curso não-normativo nunca consulta a matriz SST', async () => {
    const deps = buildCourseDeps();
    const useCase = new (CreateTrainingCourseUseCase as any)(deps.trainingCourseRepository, deps.trainingMatrixService);

    await useCase.execute({ name: 'Onboarding', is_normative: false, validity_months: 12 });

    expect(deps.trainingMatrixService.findValidityByNrCode).not.toHaveBeenCalled();
  });

  it('UPDATE: reaplica a validade da matriz SST mesmo quando só outro campo muda no payload', async () => {
    const deps = buildCourseDeps({ trainingMatrixService: { findValidityByNrCode: jest.fn().mockResolvedValue({ periodicidade_meses: 12 }) } });
    const useCase = new (UpdateTrainingCourseUseCase as any)(deps.trainingCourseRepository, deps.trainingMatrixService);

    const result = await useCase.execute({ id: 7, validity_months: 99, workload_hours: 20 });

    expect(deps.trainingMatrixService.findValidityByNrCode).toHaveBeenCalledWith('NR-12');
    expect(result.validity_months).toBe(12);
    expect(result.validity_source).toBe('sst_matrix');
  });
});

// ---------------------------------------------------------------------
// Treinamentos
// ---------------------------------------------------------------------
describe('CreateEmployeeTrainingUseCase — RF-RH-057/059', () => {
  function buildTrainingDeps(overrides: Record<string, any> = {}) {
    const employeeTrainingRepository: any = {
      create: jest.fn().mockImplementation(async (data: any) => ({ id: 1, toJSON: () => ({ id: 1, ...data }), ...data })),
      ...(overrides.employeeTrainingRepository ?? {}),
    };
    const trainingCourseRepository: any = {
      findById: jest.fn().mockResolvedValue({ id: 7, validity_months: 24, is_normative: false }),
      ...(overrides.trainingCourseRepository ?? {}),
    };
    const employeeDirectoryService: any = {
      findById: jest.fn().mockResolvedValue({ id: 501 }),
      ...(overrides.employeeDirectoryService ?? {}),
    };
    return { employeeTrainingRepository, trainingCourseRepository, employeeDirectoryService };
  }

  it('calcula valid_until a partir de completed_at + validity_months', async () => {
    const deps = buildTrainingDeps();
    const useCase = new (CreateEmployeeTrainingUseCase as any)(deps.employeeTrainingRepository, deps.trainingCourseRepository, deps.employeeDirectoryService);

    const result = await useCase.execute({ employee_id: 501, training_course_id: 7, completed_at: '2026-08-01', createdBy: 1 });

    expect(result.valid_until).toBe('2028-08-01');
    expect(result.warning).toBeUndefined();
  });

  it('inclui warning quando curso é normativo (RF-RH-059)', async () => {
    const deps = buildTrainingDeps({ trainingCourseRepository: { findById: jest.fn().mockResolvedValue({ id: 8, validity_months: 12, is_normative: true }) } });
    const useCase = new (CreateEmployeeTrainingUseCase as any)(deps.employeeTrainingRepository, deps.trainingCourseRepository, deps.employeeDirectoryService);

    const result = await useCase.execute({ employee_id: 501, training_course_id: 8, completed_at: '2026-08-01', createdBy: 1 });

    expect(result.warning).toMatch(/SST/);
  });

  it('rejeita quando funcionário não existe (404)', async () => {
    const deps = buildTrainingDeps({ employeeDirectoryService: { findById: jest.fn().mockResolvedValue(null) } });
    const useCase = new (CreateEmployeeTrainingUseCase as any)(deps.employeeTrainingRepository, deps.trainingCourseRepository, deps.employeeDirectoryService);

    await expect(useCase.execute({ employee_id: 999, training_course_id: 7, completed_at: '2026-08-01', createdBy: 1 }))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('GetCannotOperateReportUseCase — RF-RH-058', () => {
  it('reporta funcionário sem treinamento obrigatório registrado (ausente)', async () => {
    const trainingCourseRepository: any = {
      listRequiredByJobPosition: jest.fn().mockResolvedValue([{ trainingCourse: { id: 7, name: 'NR-12' } }]),
    };
    const employeeTrainingRepository: any = {
      findLatestByEmployeeAndCourse: jest.fn().mockResolvedValue(null),
    };
    const employeeDirectoryService: any = {
      listActiveWithJobPosition: jest.fn().mockResolvedValue([{ id: 501, name: 'João', department_id: 3, job_position_id: 12 }]),
    };
    const useCase = new (GetCannotOperateReportUseCase as any)(trainingCourseRepository, employeeTrainingRepository, employeeDirectoryService);

    const result = await useCase.execute({ today: '2026-08-12' });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({ employee_id: 501, training_course_id: 7, reason: 'ausente' });
  });

  it('reporta funcionário com treinamento vencido', async () => {
    const trainingCourseRepository: any = {
      listRequiredByJobPosition: jest.fn().mockResolvedValue([{ trainingCourse: { id: 7, name: 'NR-12' } }]),
    };
    const employeeTrainingRepository: any = {
      findLatestByEmployeeAndCourse: jest.fn().mockResolvedValue({ valid_until: '2026-01-01' }),
    };
    const employeeDirectoryService: any = {
      listActiveWithJobPosition: jest.fn().mockResolvedValue([{ id: 501, name: 'João', department_id: 3, job_position_id: 12 }]),
    };
    const useCase = new (GetCannotOperateReportUseCase as any)(trainingCourseRepository, employeeTrainingRepository, employeeDirectoryService);

    const result = await useCase.execute({ today: '2026-08-12' });

    expect(result.items[0]).toMatchObject({ reason: 'vencido', valid_until: '2026-01-01' });
  });

  it('não reporta funcionário com treinamento válido', async () => {
    const trainingCourseRepository: any = {
      listRequiredByJobPosition: jest.fn().mockResolvedValue([{ trainingCourse: { id: 7, name: 'NR-12' } }]),
    };
    const employeeTrainingRepository: any = {
      findLatestByEmployeeAndCourse: jest.fn().mockResolvedValue({ valid_until: '2027-01-01' }),
    };
    const employeeDirectoryService: any = {
      listActiveWithJobPosition: jest.fn().mockResolvedValue([{ id: 501, name: 'João', department_id: 3, job_position_id: 12 }]),
    };
    const useCase = new (GetCannotOperateReportUseCase as any)(trainingCourseRepository, employeeTrainingRepository, employeeDirectoryService);

    const result = await useCase.execute({ today: '2026-08-12' });

    expect(result.total).toBe(0);
  });

  it('ignora funcionário sem job_position_id', async () => {
    const trainingCourseRepository: any = { listRequiredByJobPosition: jest.fn() };
    const employeeTrainingRepository: any = { findLatestByEmployeeAndCourse: jest.fn() };
    const employeeDirectoryService: any = {
      listActiveWithJobPosition: jest.fn().mockResolvedValue([{ id: 501, name: 'João', department_id: 3, job_position_id: null }]),
    };
    const useCase = new (GetCannotOperateReportUseCase as any)(trainingCourseRepository, employeeTrainingRepository, employeeDirectoryService);

    const result = await useCase.execute({});

    expect(result.total).toBe(0);
    expect(trainingCourseRepository.listRequiredByJobPosition).not.toHaveBeenCalled();
  });
});
