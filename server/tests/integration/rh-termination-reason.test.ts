/**
 * CASE-012 / FIND-ERP-007: prova HTTP real de persistencia e leitura do
 * motivo da rescisao. Executa somente com os prerequisitos de integracao e
 * exclusivamente contra `erp_evok_audio_test`.
 */
import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;
const SUFFIX = String(Date.now()).slice(-8);

function buildValidCpf(base9: string): string {
  const digits = base9.padStart(9, '0').slice(-9).split('').map(Number);
  const digit = (values: number[], factorStart: number): number => {
    const remainder = (values.reduce((sum, value, index) => sum + value * (factorStart - index), 0) * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  const first = digit(digits, 10);
  const second = digit([...digits, first], 11);
  return [...digits, first, second].join('');
}

describeIntegration('CASE-012 - termination_reason persistente via HTTP', () => {
  it('POST persiste e GET /termination-processes/:id recupera o motivo', async () => {
    const authorization = `Bearer ${authToken()}`;
    const departments = await api().get('/api/departments').set('Authorization', authorization).query({ limit: 1 });
    expect(departments.status).toBe(200);

    const employee = await api()
      .post('/api/employees')
      .set('Authorization', authorization)
      .send({
        name: `Funcionario CASE012 ${SUFFIX}`,
        cpf: buildValidCpf(`${SUFFIX}7`),
        salary: 3000,
        salary_type: 'mensal',
        hire_date: '2020-01-01',
        department_id: departments.body.data[0].id,
      });
    expect(employee.status).toBe(201);

    const reason = `Rescisao CASE-012 ${SUFFIX}`;
    const created = await api()
      .post('/api/rh/termination-processes')
      .set('Authorization', authorization)
      .send({
        employee_id: employee.body.data.id,
        termination_type: 'sem_justa_causa',
        notice_date: '2026-08-18',
        notice_modality: 'indenizado',
        termination_reason: reason,
        termination_date: '2026-08-18',
      });
    expect(created.status).toBe(201);
    expect(created.body.data.termination_reason).toBe(reason);

    const detail = await api()
      .get(`/api/rh/termination-processes/${created.body.data.id}`)
      .set('Authorization', authorization);
    expect(detail.status).toBe(200);
    expect(detail.body.data.termination_reason).toBe(reason);
  });
});
