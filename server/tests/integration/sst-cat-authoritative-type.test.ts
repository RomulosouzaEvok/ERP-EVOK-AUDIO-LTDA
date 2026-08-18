/**
 * CASE-011 / FIND-ERP-008: prova HTTP real da fonte autoritativa do tipo da
 * CAT e da ausência do texto livre `emitente` no contrato de resposta.
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

describeIntegration('CASE-011 - tipo da CAT derivado da gravidade', () => {
  it('POST sem tipo cria CAT de óbito e ignora emitente textual legado', async () => {
    const authorization = `Bearer ${authToken()}`;
    const departments = await api().get('/api/departments').set('Authorization', authorization).query({ limit: 1 });
    expect(departments.status).toBe(200);

    const employee = await api()
      .post('/api/employees')
      .set('Authorization', authorization)
      .send({
        name: `Funcionario CASE011 ${SUFFIX}`,
        cpf: buildValidCpf(`${SUFFIX}3`),
        salary: 3000,
        salary_type: 'mensal',
        hire_date: '2020-01-01',
        department_id: departments.body.data[0].id,
      });
    expect(employee.status).toBe(201);

    const accident = await api()
      .post('/api/sst/accidents')
      .set('Authorization', authorization)
      .send({
        employee_id: employee.body.data.id,
        data_hora: '2026-08-18T10:00:00.000Z',
        tipo: 'tipico',
        gravidade: 'obito',
        local_setor: 'CASE-011',
        descricao: 'Fixture de integração CASE-011',
      });
    expect(accident.status).toBe(201);

    const emitted = await api()
      .post(`/api/sst/accidents/${accident.body.data.id}/cat`)
      .set('Authorization', authorization)
      .send({ emitente: 'Texto legado que deve ser ignorado' });

    if (emitted.status !== 201) {
      throw new Error(`Emissão de CAT falhou com HTTP ${emitted.status}: ${JSON.stringify(emitted.body)}`);
    }
    expect(emitted.body.data.cat.tipo).toBe('obito');
    expect(emitted.body.data.cat).not.toHaveProperty('emitente');
  });
});
