/**
 * G6 — o gate de partida deixa de aceitar linha de apontamento VAZIA.
 *
 * ## A brecha (auditoria de 2026-08-11)
 *
 * `assertOrderCanStart` contava linhas: `steps.length === 0` reprovava, e
 * qualquer coisa acima disso passava. Só que
 * `POST /api/production-orders/:id/tracking` aceita
 * `production_route_step_id: null` — o apontamento manual, que existe para o
 * chão de fábrica registrar o que o roteiro não previu.
 *
 * Somando os dois: um operador criava **uma linha manual sem etapa nenhuma** e
 * a OP entrava em produção sem roteiro. O gate do G6 continuava verde, e o
 * defeito de processo que ele nasceu para impedir (produto sem roteiro sendo
 * montado e só recusado na conclusão, com material consumido) voltava inteiro
 * — agora com um passo a mais de digitação.
 *
 * ## O que esta suíte prova
 *
 * | # | Pergunta | Etapa |
 * |---|---|---|
 * | 1 | linha manual sem `production_route_step_id` destrava a partida? | 2 (deve dar 422) |
 * | 2 | o erro diz o que cadastrar, com código próprio? | 2 |
 * | 3 | cadastrar o roteiro ativo destrava (sem apagar a linha manual)? | 3 |
 * | 4 | apontamento manual DEPOIS da partida continua permitido? | 4 |
 *
 * O item 4 é a fronteira da correção: o gate é de PARTIDA. Depois que a ordem
 * está rodando, registrar uma etapa não prevista é fluxo legítimo e nenhuma
 * regra nova pode barrá-lo.
 *
 * @module tests/integration/production-start-manual-tracking-bypass
 */
import { randomUUID } from 'crypto';
import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/** Prefixo de todo registro criado por esta suite. */
const P = 'G6MAN';
const SUFFIX = String(Date.now()).slice(-8);

describeIntegration('G6 — apontamento manual sem etapa nao destrava a partida', () => {
  const ctx: Record<string, any> = {};

  /** @returns Token do administrador da suite. */
  function token(): string {
    return authToken();
  }

  /**
   * Afirma o status HTTP mostrando o CORPO quando falha.
   *
   * @param response - Resposta Supertest.
   * @param expected - Status esperado.
   * @param label - Descricao curta da chamada.
   * @returns A propria resposta, para encadear.
   */
  function expectStatus<T extends { status: number; body: any }>(response: T, expected: number, label: string): T {
    if (response.status !== expected) {
      throw new Error(
        `[${label}] esperado HTTP ${expected}, recebido ${response.status}. Corpo: ${JSON.stringify(response.body)}`,
      );
    }
    return response;
  }

  /**
   * Data futura em `YYYY-MM-DD`.
   *
   * @param days - Dias a somar a hoje.
   * @returns Data ISO curta.
   */
  function futureDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  // ====================================================================
  // ETAPA 1 — Produto fabricavel, com BOM ativa e SEM roteiro
  // ====================================================================
  it('etapa 1: cadastra produto acabado com BOM ativa e sem roteiro nenhum', async () => {
    const componente = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} Componente ${SUFFIX}`,
        code: `${P}-COMP-${SUFFIX}`,
        description: 'Componente da validacao do apontamento manual',
        price: 10,
        cost_price: 5,
        quantity: 0,
        product_type: 'raw_material',
        status: 'active',
        ncm: '85182100',
        unit: 'un',
        lead_time: 1,
        revision: '00',
      });
    expectStatus(componente, 201, 'componente');
    ctx.componenteId = componente.body.data.id;

    const entrada = await api()
      .post('/api/inventory/movements')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: ctx.componenteId,
        operation_id: randomUUID(),
        type: 'in',
        quantity: 500,
        description: 'Saldo do componente (validacao do apontamento manual)',
      });
    expectStatus(entrada, 201, 'movimento');

    const acabado = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} Acabado ${SUFFIX}`,
        code: `${P}-ACAB-${SUFFIX}`,
        description: 'Produto acabado da validacao do apontamento manual',
        price: 300,
        cost_price: 100,
        quantity: 0,
        product_type: 'finished',
        status: 'active',
        ncm: '85182100',
        unit: 'un',
        lead_time: 1,
        revision: '00',
      });
    expectStatus(acabado, 201, 'acabado');
    ctx.acabadoId = acabado.body.data.id;

    const bom = await api()
      .post('/api/engineering/bom')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: ctx.acabadoId,
        revision: `${P}`,
        notes: 'Estrutura minima da validacao do apontamento manual',
        items: [{ component_product_id: ctx.componenteId, quantity: 1, unit: 'un', component_type: 'raw_material' }],
      });
    expectStatus(bom, 201, 'bom');

    const created = await api()
      .post('/api/production-orders')
      .set('Authorization', `Bearer ${token()}`)
      .send({ product_id: ctx.acabadoId, quantity: 2, due_date: futureDate(15), notes: `${P} bypass de apontamento` });
    expectStatus(created, 201, 'op:create');
    ctx.orderId = created.body.data.id;

    const released = await api()
      .put(`/api/production-orders/${ctx.orderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'released' });
    expectStatus(released, 200, 'op:released');

    // Sem roteiro ativo, a liberacao NAO materializa etapa nenhuma (G4).
    const tracking = await api()
      .get(`/api/production-orders/${ctx.orderId}/tracking`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(tracking, 200, 'op:tracking:vazio');
    expect(tracking.body.data ?? []).toHaveLength(0);
  });

  // ====================================================================
  // ETAPA 2 — A prova principal: linha manual vazia NAO destrava a partida
  // ====================================================================
  it('etapa 2: linha manual sem production_route_step_id nao destrava a partida', async () => {
    const manual = await api()
      .post(`/api/production-orders/${ctx.orderId}/tracking`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ sequence: 1, notes: `${P} apontamento manual sem etapa de roteiro` });
    expectStatus(manual, 201, 'tracking:manual');
    // A linha existe e nao aponta para etapa nenhuma — e exatamente este
    // par (existe + vazia) que enganava o gate.
    expect(manual.body.data.production_route_step_id ?? null).toBeNull();
    ctx.manualTrackingId = manual.body.data.id;

    const started = await api()
      .put(`/api/production-orders/${ctx.orderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'in_progress' });
    expectStatus(started, 422, 'op:start:linhaVazia');
    expect(started.body.error.details.rule).toBe('G6-START-NO-ROUTE-STEP');
    expect(started.body.error.message).toContain('Roteiros de Fabricacao');

    // Nada foi corrompido: a OP continua liberada e sem data de inicio.
    const consulta = await api()
      .get(`/api/production-orders/${ctx.orderId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(consulta, 200, 'op:consulta');
    expect(consulta.body.data.status).toBe('released');
    expect(consulta.body.data.start_date ?? null).toBeNull();
  });

  // ====================================================================
  // ETAPA 3 — Cadastrar o roteiro ATIVO destrava (a saida que a mensagem indica)
  // ====================================================================
  it('etapa 3: com roteiro ativo cadastrado, a mesma OP parte', async () => {
    const workCenter = await api()
      .post('/api/work-centers')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        code: `${P}-WC-${SUFFIX}`.slice(0, 30),
        name: `Montagem ${P} ${SUFFIX}`,
        machines_count: 1,
        capacity_hours_per_day: 8,
        efficiency_factor: 1,
        cost_per_hour: 55,
      });
    expectStatus(workCenter, 201, 'workCenter');
    ctx.workCenterId = workCenter.body.data.id;

    const route = await api()
      .post('/api/production/routes')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: ctx.acabadoId,
        route_code: `${P}-ROT-${SUFFIX}`.slice(0, 50),
        revision: '00',
        description: 'Roteiro da validacao do apontamento manual',
      });
    expectStatus(route, 201, 'route');
    ctx.routeId = route.body.data.id;

    const steps = await api()
      .put(`/api/production/routes/${ctx.routeId}/steps`)
      .set('Authorization', `Bearer ${token()}`)
      .send({
        steps: [
          {
            step_code: 'OP10',
            name: 'Montagem',
            sequence: 1,
            work_center_id: ctx.workCenterId,
            setup_time_minutes: 5,
            standard_time_minutes: 10,
          },
        ],
      });
    expectStatus(steps, 200, 'route:steps');

    const activated = await api()
      .patch(`/api/production/routes/${ctx.routeId}/activate`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(activated, 200, 'route:activate');

    // A linha manual continua la (nada e apagado); o que mudou e que agora
    // EXISTE roteiro ativo contra o qual apontar.
    const started = await api()
      .put(`/api/production-orders/${ctx.orderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'in_progress' });
    expectStatus(started, 200, 'op:start:comRoteiro');

    const consulta = await api()
      .get(`/api/production-orders/${ctx.orderId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(consulta, 200, 'op:consulta:iniciada');
    expect(consulta.body.data.status).toBe('in_progress');
    expect(consulta.body.data.start_date).toBeTruthy();
  });

  // ====================================================================
  // ETAPA 4 — A fronteira: apontamento manual DEPOIS da partida continua livre
  // ====================================================================
  it('etapa 4: apontamento manual depois da partida continua permitido', async () => {
    const manualDepois = await api()
      .post(`/api/production-orders/${ctx.orderId}/tracking`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ sequence: 99, notes: `${P} retrabalho nao previsto no roteiro` });
    expectStatus(manualDepois, 201, 'tracking:manual:depois');
    expect(manualDepois.body.data.production_route_step_id ?? null).toBeNull();
  });
});
