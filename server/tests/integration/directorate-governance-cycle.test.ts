import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/**
 * Módulo Diretoria — ciclo real contra PostgreSQL (Organograma Executivo,
 * Planejamento Estratégico, Atas de Reunião, Riscos Corporativos).
 *
 * ## O que esta suíte prova
 *
 * | # | Pergunta | Onde |
 * |---|---|---|
 * | 1 | prover um gerente numa diretoria reflete no organograma lido em seguida? | etapa 1 |
 * | 2 | criar um objetivo estratégico e atualizar o realizado funciona ponta a ponta? | etapa 2 |
 * | 3 | criar uma ata funciona, e o módulo REALMENTE não expõe rota de update/delete de conteúdo? | etapa 3 |
 * | 4 | criar um risco corporativo calcula `risk_score` no SERVIDOR, contra o banco real? | etapa 4 |
 * | 5 | pelo menos uma escrita do módulo deixa rastro em `audit_logs`? | etapa 1 |
 *
 * @module tests/integration/directorate-governance-cycle
 */
describeIntegration('Módulo Diretoria — ciclo de governança contra PostgreSQL real', () => {
  const P = 'DIRGOV';
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

  /** Mesmo algoritmo de dígito verificador usado nas demais suítes de RH. */
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

  async function auditRowsFor(entityType: string, entityId: number): Promise<any[]> {
    const response = await api()
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${token()}`)
      .query({ entity_type: entityType, entity_id: entityId, limit: 50 });
    expectStatus(response, 200, `audit:${entityType}:${entityId}`);
    return response.body.data;
  }

  it('etapa 1: prover gerente numa diretoria reflete no organograma + audita', async () => {
    const orgChartBefore = await api().get('/api/directorate/org-chart').set('Authorization', `Bearer ${token()}`);
    expectStatus(orgChartBefore, 200, 'org-chart:before');

    const sup = orgChartBefore.body.data.directorates.find((d: any) => d.code === 'SUP');
    expect(sup).toBeDefined();

    const departmentsResponse = await api().get('/api/departments').set('Authorization', `Bearer ${token()}`).query({ limit: 1 });
    expectStatus(departmentsResponse, 200, 'departments:list');
    const departmentId = departmentsResponse.body.data[0].id;

    const cpf = buildValidCpf(`${SUFFIX}1`);
    const employeeResponse = await api()
      .post('/api/employees')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `Funcionario ${P} ${SUFFIX}`,
        cpf,
        salary: 9000,
        salary_type: 'mensal',
        hire_date: '2020-01-01',
        department_id: departmentId,
      });
    expectStatus(employeeResponse, 201, 'employee:create');
    const employeeId = employeeResponse.body.data.id;

    const assign = await api()
      .patch(`/api/directorate/directorates/${sup.id}/manager`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ manager_id: employeeId });
    expectStatus(assign, 200, 'directorate:assign-manager');
    expect(assign.body.data.manager_id).toBe(employeeId);

    const orgChartAfter = await api().get('/api/directorate/org-chart').set('Authorization', `Bearer ${token()}`);
    expectStatus(orgChartAfter, 200, 'org-chart:after');
    const supAfter = orgChartAfter.body.data.directorates.find((d: any) => d.code === 'SUP');
    expect(supAfter.vacant).toBe(false);
    expect(supAfter.manager?.id).toBe(employeeId);

    const audits = await auditRowsFor('Directorate', sup.id);
    expect(audits.length).toBeGreaterThan(0);

    // Devolve o estado original (SUP nasce vago por decisão do dono, ver
    // `docs/administrativo/05-ORGANOGRAMA_EXECUTIVO.md`) para não vazar
    // efeito colateral desta suíte para outras.
    await api()
      .patch(`/api/directorate/directorates/${sup.id}/manager`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ manager_id: null });
  });

  it('etapa 2: cria objetivo estratégico e atualiza o realizado', async () => {
    const created = await api()
      .post('/api/directorate/strategic-plannings')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        year: 2026,
        objective: `Objetivo de teste ${P} ${SUFFIX}`,
        kpi: 'Faturamento',
        target_value: 1000,
        status: 'in_progress',
      });
    expectStatus(created, 201, 'strategic-planning:create');
    expect(created.body.data.actual_value).toBeNull();

    const planningId = created.body.data.id;

    const updated = await api()
      .patch(`/api/directorate/strategic-plannings/${planningId}/actual`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ actual_value: 1200 });
    expectStatus(updated, 200, 'strategic-planning:update-actual');
    expect(Number(updated.body.data.actual_value)).toBe(1200);
    expect(updated.body.data.status).toBe('achieved');

    const fetched = await api()
      .get(`/api/directorate/strategic-plannings/${planningId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(fetched, 200, 'strategic-planning:get');
    expect(Number(fetched.body.data.actual_value)).toBe(1200);
  });

  it('etapa 3: cria ata de reunião e confirma que não há rota de update/delete de conteúdo', async () => {
    const created = await api()
      .post('/api/directorate/meeting-minutes')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        meeting_date: '2026-08-01',
        meeting_type: 'directors',
        title: `Ata de teste ${P} ${SUFFIX}`,
        decisions: ['Aprovar orçamento 2027'],
        action_items: ['Diretor Financeiro: enviar planilha até 15/08'],
      });
    expectStatus(created, 201, 'meeting-minute:create');
    const minuteId = created.body.data.id;

    const fetched = await api()
      .get(`/api/directorate/meeting-minutes/${minuteId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(fetched, 200, 'meeting-minute:get');
    expect(fetched.body.data.decisions).toEqual(['Aprovar orçamento 2027']);

    // Nenhum verbo de escrita além de POST é aceito para atas: o registro é
    // imutável após criação (`docs/administrativo/01-DIRETORIA.md`).
    const putAttempt = await api()
      .put(`/api/directorate/meeting-minutes/${minuteId}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ title: 'Tentativa de alterar' });
    expect([404, 405]).toContain(putAttempt.status);

    const deleteAttempt = await api()
      .delete(`/api/directorate/meeting-minutes/${minuteId}`)
      .set('Authorization', `Bearer ${token()}`);
    expect([404, 405]).toContain(deleteAttempt.status);
  });

  it('etapa 4: cria risco corporativo com risk_score calculado no servidor (payload não aceita o campo)', async () => {
    // O schema Zod é `.strict()`: enviar `risk_score` no corpo é REJEITADO
    // (400), não silenciosamente ignorado — primeira barreira contra o
    // cliente HTTP "decidir" a própria severidade.
    const rejected = await api()
      .post('/api/directorate/business-risks')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        risk_category: 'supply',
        description: `Risco rejeitado ${P} ${SUFFIX}`,
        probability: 'high',
        impact: 'critical',
        risk_score: 1,
      });
    expect(rejected.status).toBe(400);

    const created = await api()
      .post('/api/directorate/business-risks')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        risk_category: 'supply',
        description: `Risco de teste ${P} ${SUFFIX}`,
        probability: 'high',
        impact: 'critical',
      });
    expectStatus(created, 201, 'business-risk:create');
    expect(created.body.data.risk_score).toBe(12);

    const riskId = created.body.data.id;

    const updated = await api()
      .put(`/api/directorate/business-risks/${riskId}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ probability: 'low' });
    expectStatus(updated, 200, 'business-risk:update');
    expect(updated.body.data.risk_score).toBe(4);
  });
});
