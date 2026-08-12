/**
 * Integração real (Postgres) das 3 sub-áreas novas do módulo RH implantadas
 * nesta rodada: Afastamentos, Benefícios e Treinamentos
 * (`docs/business/BLOCO_6_RH_API.md` §9/§10/§11).
 *
 * Cada bloco cobre 1 fluxo ponta a ponta e confere que `audit_logs` ganhou
 * linha (CLAUDE.md — "toda operação de escrita registra auditoria").
 *
 * @module tests/integration/rh-block6-extension
 */
import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

const P = 'RHB6';
const SUFFIX = String(Date.now()).slice(-8);

describeIntegration('Bloco 6 RH — Afastamentos, Beneficios, Treinamentos (integracao real)', () => {
  function token(): string {
    return authToken();
  }

  function expectStatus<T extends { status: number; body: any }>(response: T, expected: number, label: string): T {
    if (response.status !== expected) {
      throw new Error(`[${label}] esperado HTTP ${expected}, recebido ${response.status}. Corpo: ${JSON.stringify(response.body)}`);
    }
    return response;
  }

  /**
   * Gera um CPF com dígitos verificadores válidos (mesmo algoritmo de
   * `src/utils/validators.ts#isValidCPF`), a partir de uma base de 9 dígitos
   * — necessário porque `CreateEmployeeUseCase` valida o CPF de verdade.
   */
  function buildValidCpf(base9: string): string {
    const digits = base9.padStart(9, '0').slice(-9).split('').map(Number);
    const calcDigit = (nums: number[], factorStart: number): number => {
      const sum = nums.reduce((acc, n, i) => acc + n * (factorStart - i), 0);
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };
    const d1 = calcDigit(digits, 10);
    const d2 = calcDigit([...digits, d1], 11);
    return [...digits, d1, d2].join('');
  }

/** `employees.department_id` é NOT NULL no banco (o campo é opcional só no tipo do use case). */
  let departmentId: number;

  /** Cria um funcionario minimo (name+cpf+department_id), sem vinculo com admissao formal — suficiente para exercitar os 3 fluxos deste bloco. */
  async function createEmployee(cpfSuffix: string): Promise<number> {
    if (!departmentId) {
      const departments = await api().get('/api/departments').set('Authorization', `Bearer ${token()}`).query({ limit: 1 });
      expectStatus(departments, 200, 'departments:list');
      departmentId = departments.body.data[0].id;
    }
    const cpf = buildValidCpf(`${SUFFIX}${cpfSuffix}`.padStart(9, '0'));
    const created = await api()
      .post('/api/employees')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `Funcionario ${P} ${cpfSuffix}`,
        cpf,
        salary: 3000,
        salary_type: 'mensal',
        hire_date: '2020-01-01',
        department_id: departmentId,
      });
    expectStatus(created, 201, `employee:create:${cpfSuffix}`);
    return created.body.data.id;
  }

  async function auditRowsFor(entityType: string, entityId: number): Promise<any[]> {
    const response = await api()
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${token()}`)
      .query({ entity_type: entityType, entity_id: entityId, limit: 50 });
    expectStatus(response, 200, `audit:${entityType}:${entityId}`);
    return response.body.data;
  }

  // ====================================================================
  // Afastamentos — criar (status -> license) e retornar (status -> active)
  // ====================================================================
  it('afastamento: cria (employees.status=license), retorna (<=30 dias, sem ASO) e audita as duas escritas', async () => {
    const employeeId = await createEmployee('1');

    const created = await api()
      .post('/api/rh/absences')
      .set('Authorization', `Bearer ${token()}`)
      .send({ employee_id: employeeId, type: 'doenca_ate_15d', start_date: '2026-08-01', expected_end_date: '2026-08-10', cid: 'M54.5' });
    expectStatus(created, 201, 'absence:create');
    const absenceId = created.body.data.id;
    expect(created.body.data.cid).toBe('M54.5'); // admin ve CID (interseção rh+sst OU role admin)

    const employeeAfterCreate = await api()
      .get(`/api/employees/${employeeId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(employeeAfterCreate, 200, 'employee:get:afterAbsence');
    expect(employeeAfterCreate.body.data.status).toBe('license');

    const returned = await api()
      .patch(`/api/rh/absences/${absenceId}/return`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ actual_end_date: '2026-08-10' });
    expectStatus(returned, 200, 'absence:return');
    expect(returned.body.data.actual_end_date).toBe('2026-08-10');

    const employeeAfterReturn = await api()
      .get(`/api/employees/${employeeId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(employeeAfterReturn, 200, 'employee:get:afterReturn');
    expect(employeeAfterReturn.body.data.status).toBe('active');

    const auditRows = await auditRowsFor('HrAbsence', absenceId);
    expect(auditRows.length).toBeGreaterThanOrEqual(2); // create + return
    expect(auditRows.some((row: any) => row.action === 'create')).toBe(true);
    expect(auditRows.some((row: any) => row.action === 'update')).toBe(true);
  });

  it('afastamento: recusa segundo afastamento em aberto para o mesmo funcionario (409)', async () => {
    const employeeId = await createEmployee('2');

    const first = await api()
      .post('/api/rh/absences')
      .set('Authorization', `Bearer ${token()}`)
      .send({ employee_id: employeeId, type: 'doenca_ate_15d', start_date: '2026-08-01', expected_end_date: '2026-08-05' });
    expectStatus(first, 201, 'absence:create:1');

    const second = await api()
      .post('/api/rh/absences')
      .set('Authorization', `Bearer ${token()}`)
      .send({ employee_id: employeeId, type: 'doenca_ate_15d', start_date: '2026-08-06' });
    expectStatus(second, 409, 'absence:create:2:conflict');
  });

  it('afastamento: RF-RH-047-A suspende VT no create e reativa (suspended_days volta a 0) no return', async () => {
    const employeeId = await createEmployee('9');

    const benefitType = await api()
      .post('/api/rh/benefit-types')
      .set('Authorization', `Bearer ${token()}`)
      .send({ name: `VT-Reativacao ${P} ${SUFFIX}`, category: 'vt', funding_rule: 'percentual' });
    expectStatus(benefitType, 201, 'benefitType:create');

    const enrollment = await api()
      .post('/api/rh/employee-benefits')
      .set('Authorization', `Bearer ${token()}`)
      .send({ employee_id: employeeId, benefit_type_id: benefitType.body.data.id, discount_value: 150, company_cost_value: 300 });
    expectStatus(enrollment, 201, 'employeeBenefit:create');
    const enrollmentId = enrollment.body.data.id;

    const created = await api()
      .post('/api/rh/absences')
      .set('Authorization', `Bearer ${token()}`)
      .send({ employee_id: employeeId, type: 'doenca_ate_15d', start_date: '2026-08-01', expected_end_date: '2026-08-10' });
    expectStatus(created, 201, 'absence:create');
    const absenceId = created.body.data.id;

    const afterSuspend = await api()
      .get('/api/rh/employee-benefits')
      .set('Authorization', `Bearer ${token()}`)
      .query({ employee_id: employeeId });
    expectStatus(afterSuspend, 200, 'employeeBenefits:list:afterSuspend');
    const suspendedBenefit = afterSuspend.body.data.find((row: any) => row.id === enrollmentId);
    expect(suspendedBenefit.suspended_days).toBe(10); // 2026-08-01..2026-08-10 inclusive

    const returned = await api()
      .patch(`/api/rh/absences/${absenceId}/return`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ actual_end_date: '2026-08-10' });
    expectStatus(returned, 200, 'absence:return');
    expect(returned.body.data.reactivated_benefits).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: enrollmentId, category: 'vt', suspended_days: 0 })]),
    );

    const afterReturn = await api()
      .get('/api/rh/employee-benefits')
      .set('Authorization', `Bearer ${token()}`)
      .query({ employee_id: employeeId });
    expectStatus(afterReturn, 200, 'employeeBenefits:list:afterReturn');
    const reactivatedBenefit = afterReturn.body.data.find((row: any) => row.id === enrollmentId);
    expect(reactivatedBenefit.suspended_days).toBe(0);
    expect(reactivatedBenefit.enrollment_status).toBe('ativo');
  });

  // ====================================================================
  // Beneficios — aderir (opt-in) e cancelar (opt-out, nunca DELETE fisico)
  // ====================================================================
  it('beneficio: adere (dentro do limite de 6% VT) e cancela, e audita as duas escritas', async () => {
    const employeeId = await createEmployee('3');

    const benefitType = await api()
      .post('/api/rh/benefit-types')
      .set('Authorization', `Bearer ${token()}`)
      .send({ name: `VT ${P} ${SUFFIX}`, category: 'vt', funding_rule: 'percentual' });
    expectStatus(benefitType, 201, 'benefitType:create');
    const benefitTypeId = benefitType.body.data.id;

    // 6% de 3000 = 180 — dentro do limite.
    const enrollment = await api()
      .post('/api/rh/employee-benefits')
      .set('Authorization', `Bearer ${token()}`)
      .send({ employee_id: employeeId, benefit_type_id: benefitTypeId, discount_value: 150, company_cost_value: 300 });
    expectStatus(enrollment, 201, 'employeeBenefit:create');
    const enrollmentId = enrollment.body.data.id;
    expect(enrollment.body.data.enrollment_status).toBe('ativo');

    // Acima de 6% (200 > 180) deve ser recusado — segunda tentativa, tipo diferente para não colidir com a duplicidade.
    const benefitType2 = await api()
      .post('/api/rh/benefit-types')
      .set('Authorization', `Bearer ${token()}`)
      .send({ name: `VT2 ${P} ${SUFFIX}`, category: 'vt', funding_rule: 'percentual' });
    expectStatus(benefitType2, 201, 'benefitType2:create');
    const overLimit = await api()
      .post('/api/rh/employee-benefits')
      .set('Authorization', `Bearer ${token()}`)
      .send({ employee_id: employeeId, benefit_type_id: benefitType2.body.data.id, discount_value: 200 });
    expectStatus(overLimit, 422, 'employeeBenefit:vtLimit');
    expect(overLimit.body.error.details.code).toBe('VT_DISCOUNT_LIMIT_EXCEEDED');

    const duplicate = await api()
      .post('/api/rh/employee-benefits')
      .set('Authorization', `Bearer ${token()}`)
      .send({ employee_id: employeeId, benefit_type_id: benefitTypeId, discount_value: 100 });
    expectStatus(duplicate, 409, 'employeeBenefit:duplicate');

    const cancel = await api()
      .post(`/api/rh/employee-benefits/${enrollmentId}/cancel`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(cancel, 200, 'employeeBenefit:cancel');
    expect(cancel.body.data.enrollment_status).toBe('cancelado');

    const auditRows = await auditRowsFor('HrEmployeeBenefit', enrollmentId);
    expect(auditRows.length).toBeGreaterThanOrEqual(2); // create + cancel
    expect(auditRows.some((row: any) => row.action === 'create')).toBe(true);
    expect(auditRows.some((row: any) => row.action === 'update')).toBe(true);
  });

  // ====================================================================
  // Treinamentos — criar curso e registrar conclusao (valid_until calculado)
  // ====================================================================
  it('treinamento: cria curso e registra conclusao com valid_until calculado, e audita as duas escritas', async () => {
    const employeeId = await createEmployee('4');

    const course = await api()
      .post('/api/rh/training-courses')
      .set('Authorization', `Bearer ${token()}`)
      .send({ name: `NR-12 ${P} ${SUFFIX}`, is_normative: false, validity_months: 24, workload_hours: 8 });
    expectStatus(course, 201, 'trainingCourse:create');
    const courseId = course.body.data.id;

    const completion = await api()
      .post('/api/rh/employee-trainings')
      .set('Authorization', `Bearer ${token()}`)
      .send({ employee_id: employeeId, training_course_id: courseId, completed_at: '2026-08-01', instructor_or_provider: 'SENAI' });
    expectStatus(completion, 201, 'employeeTraining:create');
    expect(completion.body.data.valid_until).toBe('2028-08-01');

    const auditRows = await auditRowsFor('HrEmployeeTraining', completion.body.data.id);
    expect(auditRows.length).toBeGreaterThanOrEqual(1);
    expect(auditRows.some((row: any) => row.action === 'create')).toBe(true);

    const auditCourseRows = await auditRowsFor('HrTrainingCourse', courseId);
    expect(auditCourseRows.some((row: any) => row.action === 'create')).toBe(true);
  });

  it('treinamento: RF-INT-RH-SST-01 curso normativo com NR na matriz SST usa a validade da matriz, ignorando o payload', async () => {
    // Matriz SST — cadastra NR-11 com periodicidade de 12 meses para uma função exclusiva deste teste.
    const matrixEntry = await api()
      .post('/api/sst/training-matrix')
      .set('Authorization', `Bearer ${token()}`)
      .send({ position: `Operador Empilhadeira ${P} ${SUFFIX}`, norma: 'NR-11', periodicidade_meses: 12 });
    expectStatus(matrixEntry, 201, 'sstTrainingMatrix:create');

    // RH tenta gravar validade manual de 60 meses — a matriz (12) deve prevalecer.
    const course = await api()
      .post('/api/rh/training-courses')
      .set('Authorization', `Bearer ${token()}`)
      .send({ name: `NR-11 ${P} ${SUFFIX}`, is_normative: true, nr_code: 'NR-11', validity_months: 60, workload_hours: 16 });
    expectStatus(course, 201, 'trainingCourse:create:normative-in-matrix');
    expect(course.body.data.validity_months).toBe(12);
    expect(course.body.data.validity_source).toBe('sst_matrix');
    expect(course.body.data.warning).toBeUndefined();

    // Update também sobrescreve — muda a carga horária, mantém nr_code, validity_months do payload continua sendo ignorado.
    const updated = await api()
      .put(`/api/rh/training-courses/${course.body.data.id}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ validity_months: 99, workload_hours: 20 });
    expectStatus(updated, 200, 'trainingCourse:update:normative-in-matrix');
    expect(updated.body.data.validity_months).toBe(12);
    expect(updated.body.data.validity_source).toBe('sst_matrix');
  });

  it('treinamento: curso normativo com NR fora da matriz SST mantem fluxo manual + warning (RF-RH-059)', async () => {
    const course = await api()
      .post('/api/rh/training-courses')
      .set('Authorization', `Bearer ${token()}`)
      .send({ name: `Norma-fora-da-matriz ${P} ${SUFFIX}`, is_normative: true, nr_code: 'NR-999-inexistente', validity_months: 36, workload_hours: 4 });
    expectStatus(course, 201, 'trainingCourse:create:normative-not-in-matrix');
    expect(course.body.data.validity_months).toBe(36);
    expect(course.body.data.validity_source).toBe('manual');
    expect(course.body.data.warning).toBeTruthy();
  });

  it('treinamento: relatorio cannot-operate-report responde 200 mesmo sem cargo/matriz cadastrados', async () => {
    const response = await api()
      .get('/api/rh/employee-trainings/cannot-operate-report')
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(response, 200, 'trainingReport:cannotOperate');
    expect(Array.isArray(response.body.data.items)).toBe(true);
  });
});
