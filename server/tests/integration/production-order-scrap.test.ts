import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/**
 * Cria, inicia e conclui um apontamento de etapa da OP.
 *
 * Desde o gap G4 (2026-08-10) nenhuma OP conclui sem apontamento
 * (`G4-TRACKING-REQUIRED`) — este helper e o que mantem os testes de refugo
 * medindo REFUGO, e nao o gate novo.
 *
 * A etapa e criada a mao (sem `production_route_step_id`), portanto o custeio
 * cai no fallback global `production_cost_settings.default_labor_rate_per_hour`.
 * Se ele estiver zerado, a conclusao falha com `G4-LABOR-RATE-MISSING` — ver
 * `docs/producao/04-ROTEIROS.md` §7 e `docs/governance/TODO.md`.
 *
 * @param token - JWT do usuario de teste.
 * @param orderId - Id da OP.
 * @param quantityGood - Quantidade boa apontada na etapa.
 * @returns Promise resolvida com a etapa concluida.
 */
async function apontarEtapa(token: string, orderId: number, quantityGood: number): Promise<void> {
  const steps = await garantirEtapa(token, orderId);

  for (const step of steps) {
    if (step.status === 'completed' || step.status === 'skipped') continue;

    const started = await api()
      .post(`/api/production-orders/tracking/${step.id}/start`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(started.status).toBe(200);

    const finished = await api()
      .post(`/api/production-orders/tracking/${step.id}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity_good: quantityGood, quantity_scrapped: 0 });
    expect(finished.status).toBe(200);
  }
}

/**
 * Garante que a OP tenha ao menos uma etapa de apontamento, e devolve as
 * etapas existentes.
 *
 * Precisa rodar **antes** de `in_progress` desde o gap G6 (2026-08-10): a OP
 * so entra em producao se houver algo contra o que apontar
 * (`G6-START-NO-ROUTE`). Isso e a regra funcionando, nao um contratempo do
 * teste — produto sem roteiro era liberado, montado e so recusado na
 * conclusao, com material ja consumido.
 *
 * A liberacao da OP ja materializa as etapas quando o produto tem roteiro
 * ATIVO. Reaproveitar o que existe evita colidir com o indice unico
 * `(production_order_id, sequence)` — que viraria 500 em vez de falha legivel
 * — e mantem o teste valido nos dois cenarios.
 *
 * @param token - JWT do usuario de teste.
 * @param orderId - Id da OP.
 * @returns Etapas da OP (as que existiam, ou a recem-criada).
 */
async function garantirEtapa(token: string, orderId: number): Promise<any[]> {
  const existing = await api()
    .get(`/api/production-orders/${orderId}/tracking`)
    .set('Authorization', `Bearer ${token}`);
  expect(existing.status).toBe(200);

  const steps: any[] = existing.body.data ?? [];
  if (steps.length === 0) {
    const created = await api()
      .post(`/api/production-orders/${orderId}/tracking`)
      .set('Authorization', `Bearer ${token}`)
      .send({ sequence: 1, notes: 'Apontamento do teste de refugo' });
    expect(created.status).toBe(201);
    steps.push(created.body.data);
  }

  return steps;
}

describeIntegration('Registro de refugo na conclusao de ordem de producao', () => {
  /**
   * Conclui uma OP informando quantity_scrapped/scrap_reason e confirma,
   * via GET, que os valores foram persistidos e que a quantidade recebida
   * em estoque corresponde apenas a producao boa (nao inclui o refugo).
   *
   * @returns Promise resolvida apos validar a persistencia via GET.
   */
  it('persiste quantity_scrapped e scrap_reason ao concluir a OP', async () => {
    const token = authToken();
    const productId = Number(process.env.TEST_BOM_LINKED_PRODUCT_ID);
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const created = await api()
      .post('/api/production-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: productId, quantity: 10, due_date: dueDate });
    expect(created.status).toBe(201);
    const orderId = created.body.data.id;

    const released = await api()
      .put(`/api/production-orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'released' });
    expect(released.status).toBe(200);

    // G6: a OP so parte se houver etapa contra a qual apontar.
    await garantirEtapa(token, orderId);

    const started = await api()
      .put(`/api/production-orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in_progress' });
    expect(started.status).toBe(200);

    // G4: sem apontamento concluido a OP nao fecha. A etapa aponta 7 boas, a
    // mesma quantidade produzida declarada abaixo.
    await apontarEtapa(token, orderId, 7);

    const completed = await api()
      .put(`/api/production-orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'completed',
        quantity_produced: 7,
        quantity_scrapped: 3,
        scrap_reason: 'Falha de solda identificada na inspecao final',
      });
    expect(completed.status).toBe(200);
    expect(String(completed.body.data.quantity_scrapped)).toBe('3.000000');

    const fetched = await api()
      .get(`/api/production-orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(fetched.status).toBe(200);
    expect(String(fetched.body.data.quantity_produced)).toBe('7.000000');
    expect(String(fetched.body.data.quantity_scrapped)).toBe('3.000000');
    expect(fetched.body.data.scrap_reason).toBe('Falha de solda identificada na inspecao final');
  });

  /**
   * Garante que produced + scrapped acima do planejado, sem
   * allow_overproduction, e rejeitado com erro de validacao.
   *
   * @returns Promise resolvida apos validar o status HTTP de erro.
   */
  it('rejeita conclusao quando produced + scrapped excede o planejado sem allow_overproduction', async () => {
    const token = authToken();
    const productId = Number(process.env.TEST_BOM_LINKED_PRODUCT_ID);
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const created = await api()
      .post('/api/production-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: productId, quantity: 5, due_date: dueDate });
    expect(created.status).toBe(201);
    const orderId = created.body.data.id;

    await api()
      .put(`/api/production-orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'released' })
      .expect(200);

    // G6: a OP so parte se houver etapa contra a qual apontar.
    await garantirEtapa(token, orderId);

    await api()
      .put(`/api/production-orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in_progress' })
      .expect(200);

    const completed = await api()
      .put(`/api/production-orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed', quantity_produced: 4, quantity_scrapped: 3 });

    expect([400, 409, 422]).toContain(completed.status);
  });
});
