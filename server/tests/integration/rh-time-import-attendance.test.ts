import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/**
 * Integração real (Postgres) do Grupo 10 RH — Frequência/Ponto (importação
 * AEJ, `docs/rh/04-FREQUENCIA.md`). Fluxo ponta a ponta: upload → relatório
 * de não-casados → confirmação → resumo mensal, com asserção de linha em
 * `audit_logs` (CLAUDE.md — "toda operação de escrita registra auditoria").
 *
 * @module tests/integration/rh-time-import-attendance
 */
describeIntegration('Grupo 10 RH — Importação de ponto (AEJ, integração real)', () => {
  const BASE = '/api/rh/time-imports';
  const P = 'RHTI';
  const SUFFIX = String(Date.now()).slice(-8);

  function token(): string {
    return authToken();
  }

  function expectStatus<T extends { status: number; body: any }>(response: T, expected: number, label: string): T {
    if (response.status !== expected) {
      throw new Error(`[${label}] esperado HTTP ${expected}, recebido ${response.status}. Corpo: ${JSON.stringify(response.body)}`);
    }
    return response;
  }

  /** Mesmo algoritmo de `rh-block6-extension.test.ts` — gera CPF com dígitos verificadores válidos. */
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

  let departmentId: number;

  async function createEmployee(cpfSuffix: string): Promise<{ id: number; cpf: string }> {
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
    return { id: created.body.data.id, cpf };
  }

  async function auditRowsFor(entityType: string, entityId: number): Promise<any[]> {
    const response = await api()
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${token()}`)
      .query({ entity_type: entityType, entity_id: entityId, limit: 50 });
    expectStatus(response, 200, `audit:${entityType}:${entityId}`);
    return response.body.data;
  }

  function buildAej(lines: string[]): Buffer {
    return Buffer.from(lines.join('\n'), 'utf8');
  }

  it('upload → relatório de não-casados → confirmação → resumo mensal, com auditoria', async () => {
    const employee = await createEmployee('1');
    const nonExistentCpf = buildValidCpf(`${SUFFIX}9`.padStart(9, '0'));

    const aej = buildAej([
      '1;12345678000199;2026-08-01;2026-08-31',
      `2;${employee.cpf};MAT-${SUFFIX}1;2026-08-03;08:00;01:00;00:00;00:00;N;`,
      `2;${employee.cpf};MAT-${SUFFIX}1;2026-08-04;08:00;00:00;00:00;01:00;N;`,
      `2;${nonExistentCpf};MAT-NAOCADASTRADO;2026-08-03;08:00;00:00;00:00;00:00;N;`,
      '2;malformada;campos-insuficientes',
      '5;registro-de-tipo-desconhecido',
      '9;3',
    ]);

    const created = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${token()}`)
      .field('competencia_inicio', '2026-08-01')
      .field('competencia_fim', '2026-08-31')
      .attach('file', aej, `aej-${P}-${SUFFIX}.txt`);

    expectStatus(created, 201, 'time-import:create');
    expect(created.body.data.batch.status).toBe('validated');
    expect(created.body.data.matched_count).toBe(2);
    expect(created.body.data.unmatched_count).toBe(1);
    expect(created.body.data.rejected_count).toBe(1);
    expect(created.body.data.unmatched).toHaveLength(1);
    expect(created.body.data.unmatched[0].cpf).toBe(nonExistentCpf);
    expect(created.body.data.unknown_record_types).toEqual({ '5': 1 });

    const batchId = created.body.data.batch.id;

    const auditCreate = await auditRowsFor('HrTimeImportBatch', batchId);
    expect(auditCreate.length).toBeGreaterThan(0);

    const detail = await api()
      .get(`${BASE}/${batchId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(detail, 200, 'time-import:getById');
    expect(detail.body.data.batch.items).toHaveLength(3);
    expect(detail.body.data.unmatched).toHaveLength(1);

    const confirmed = await api()
      .post(`${BASE}/${batchId}/confirm`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(confirmed, 200, 'time-import:confirm');
    expect(confirmed.body.data.status).toBe('confirmed');

    const auditConfirm = await auditRowsFor('HrTimeImportBatch', batchId);
    expect(auditConfirm.some((row: any) => row.action === 'status_change')).toBe(true);

    // Confirmar de novo deve recusar (422) — já confirmado.
    const reconfirm = await api()
      .post(`${BASE}/${batchId}/confirm`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expect(reconfirm.status).toBe(422);

    const summary = await api()
      .get('/api/rh/attendance/monthly-summary')
      .set('Authorization', `Bearer ${token()}`)
      .query({ competencia: '2026-08', employee_id: employee.id });
    expectStatus(summary, 200, 'attendance:monthly-summary');
    expect(summary.body.data).toHaveLength(1);
    expect(summary.body.data[0].employee_id).toBe(employee.id);
    expect(Number(summary.body.data[0].hours_worked)).toBe(16);
    expect(Number(summary.body.data[0].overtime_50)).toBe(1);
    expect(Number(summary.body.data[0].night_hours)).toBe(1);
  });

  it('lote sem nenhum registro de jornada reconhecido nasce rejected e recusa confirmação', async () => {
    const aej = buildAej([
      '1;12345678000199;2026-08-01;2026-08-31',
      '9;0',
    ]);

    const created = await api()
      .post(BASE)
      .set('Authorization', `Bearer ${token()}`)
      .field('competencia_inicio', '2026-08-01')
      .field('competencia_fim', '2026-08-31')
      .attach('file', aej, `aej-vazio-${P}-${SUFFIX}.txt`);

    expectStatus(created, 201, 'time-import:create-empty');
    expect(created.body.data.batch.status).toBe('rejected');
    expect(created.body.data.batch.rejection_reason).toMatch(/Nenhum registro/);

    const batchId = created.body.data.batch.id;
    const confirm = await api()
      .post(`${BASE}/${batchId}/confirm`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expect(confirm.status).toBe(422);
  });

  it('lista lotes filtrando por status e competência', async () => {
    const list = await api()
      .get(BASE)
      .set('Authorization', `Bearer ${token()}`)
      .query({ status: 'confirmed', competencia: '2026-08' });
    expectStatus(list, 200, 'time-import:list');
    expect(Array.isArray(list.body.data)).toBe(true);
  });
});
