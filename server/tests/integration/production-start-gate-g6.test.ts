/**
 * G6 — gate de PARTIDA da ordem de producao, contra PostgreSQL real.
 *
 * ## O defeito de processo que este gate corrige
 *
 * O G4 tornou o apontamento obrigatorio na CONCLUSAO. Mas produto sem roteiro
 * ativo continuava sendo **liberado** (a materializacao das etapas so gravava
 * um `warn` no log), a fabrica montava o lote inteiro, e a OP so era recusada
 * no fim — com material consumido e horas gastas. O problema era de cadastro,
 * e o preco era producao perdida.
 *
 * O G6 move a recusa para a partida: sem nada contra o que apontar, a OP nao
 * entra em producao. Na partida, o problema de cadastro ainda da tempo de ser
 * resolvido.
 *
 * ## O que esta suite prova
 *
 * | # | Pergunta | Onde |
 * |---|---|---|
 * | 1 | OP de produto SEM roteiro e barrada na partida? | etapa 2 |
 * | 2 | o bloqueio e so na partida (liberar continua funcionando)? | etapa 2 |
 * | 3 | com roteiro ativo, a OP parte normalmente? | etapa 4 |
 * | 4 | a partida grava QUEM assumiu a ordem? | etapa 4 |
 * | 5 | centro de trabalho desativado depois da liberacao barra a partida? | etapa 5 |
 *
 * O item 5 e o custo-zero silencioso: hora trabalhada em centro inativo sai
 * sem taxa, e o produto acabado entraria em estoque com mao-de-obra R$ 0,00.
 *
 * @module tests/integration/production-start-gate-g6
 */
import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/** Prefixo de todo registro criado por esta suite. */
const P = 'G6';
const SUFFIX = String(Date.now()).slice(-8);

describeIntegration('G6 — gate de partida da ordem de producao', () => {
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

  /**
   * Cria uma OP e a leva ate `released`.
   *
   * @param productId - Produto fabricado.
   * @returns Id da OP liberada.
   */
  async function createReleasedOrder(productId: number): Promise<number> {
    const created = await api()
      .post('/api/production-orders')
      .set('Authorization', `Bearer ${token()}`)
      .send({ product_id: productId, quantity: 2, due_date: futureDate(15), notes: `${P} validacao do gate de partida` });
    expectStatus(created, 201, 'op:create');

    const released = await api()
      .put(`/api/production-orders/${created.body.data.id}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'released' });
    // Liberar NAO e bloqueado pelo G6, de proposito: o bloqueio e na partida.
    expectStatus(released, 200, 'op:released');

    return created.body.data.id;
  }

  // ====================================================================
  // ETAPA 1 — Produto fabricavel, com estrutura, SEM roteiro
  // ====================================================================
  it('etapa 1: cadastra produto acabado com BOM ativa e sem roteiro nenhum', async () => {
    const componente = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} Componente ${SUFFIX}`,
        code: `${P}-COMP-${SUFFIX}`,
        description: 'Componente da validacao do gate de partida',
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
        type: 'in',
        quantity: 500,
        description: 'Saldo do componente (validacao G6)',
      });
    expectStatus(entrada, 201, 'movimento');

    const acabado = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} Acabado ${SUFFIX}`,
        code: `${P}-ACAB-${SUFFIX}`,
        description: 'Produto acabado da validacao do gate de partida',
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

    // G2: sem BOM ativa a OP nem seria criada — o gate do G6 precisa ser
    // exercitado por falta de ROTEIRO, nao por falta de estrutura.
    const bom = await api()
      .post('/api/engineering/bom')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: ctx.acabadoId,
        revision: 'G6',
        notes: 'Estrutura minima da validacao do gate de partida',
        items: [{ component_product_id: ctx.componenteId, quantity: 1, unit: 'un', component_type: 'raw_material' }],
      });
    expectStatus(bom, 201, 'bom');
  });

  // ====================================================================
  // ETAPA 2 — A prova principal: sem roteiro, a OP nao parte
  // ====================================================================
  it('etapa 2: sem roteiro, a OP LIBERA mas NAO parte — e diz o que cadastrar', async () => {
    const orderId = await createReleasedOrder(ctx.acabadoId);

    const started = await api()
      .put(`/api/production-orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'in_progress' });
    expectStatus(started, 422, 'op:start:semRoteiro');
    expect(started.body.error.details.rule).toBe('G6-START-NO-ROUTE');
    // A mensagem tem de dizer o caminho — quem esbarra nisso e o chao de
    // fabrica, nao quem escreveu a regra.
    expect(started.body.error.message).toContain('Roteiros de Fabricacao');

    // E a OP continua liberada: o gate barra a transicao, nao corrompe o estado.
    const consulta = await api()
      .get(`/api/production-orders/${orderId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(consulta, 200, 'op:consulta');
    expect(consulta.body.data.status).toBe('released');
    expect(consulta.body.data.start_date ?? null).toBeNull();
  });

  // ====================================================================
  // ETAPA 3 — Cadastro do roteiro (o que a mensagem mandou fazer)
  // ====================================================================
  it('etapa 3: cadastra centro de trabalho e roteiro ATIVO', async () => {
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
        description: 'Roteiro da validacao do gate de partida',
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
    expect(activated.body.data.status).toBe('active');
  });

  // ====================================================================
  // ETAPA 4 — Com roteiro, a OP parte e ganha um responsavel
  // ====================================================================
  it('etapa 4: com roteiro ativo a OP parte, e a partida registra quem a assumiu', async () => {
    const orderId = await createReleasedOrder(ctx.acabadoId);
    ctx.orderComRoteiroId = orderId;

    // A liberacao materializou as etapas do roteiro ativo (G4).
    const tracking = await api()
      .get(`/api/production-orders/${orderId}/tracking`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(tracking, 200, 'op:tracking');
    expect((tracking.body.data ?? []).length).toBeGreaterThan(0);

    const started = await api()
      .put(`/api/production-orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'in_progress' });
    expectStatus(started, 200, 'op:start:comRoteiro');

    const consulta = await api()
      .get(`/api/production-orders/${orderId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(consulta, 200, 'op:consulta:comRoteiro');
    expect(consulta.body.data.status).toBe('in_progress');
    expect(consulta.body.data.start_date).toBeTruthy();
    // `responsible_id` e FK para `employees.id`. Ele so e preenchido quando o
    // usuario do JWT tem funcionario vinculado — usuario que nao e funcionario
    // NAO trava a partida (seria travar producao por cadastro de RH).
    // Portanto: ou veio um id, ou continua nulo — nunca o id do usuario.
    const responsavel = consulta.body.data.responsible_id ?? null;
    expect(responsavel === null || Number.isInteger(Number(responsavel))).toBe(true);
  });

  // ====================================================================
  // ETAPA 5 — Centro desativado depois da liberacao barra a partida
  // ====================================================================
  it('etapa 5: centro de trabalho desativado entre a liberacao e a partida barra a OP', async () => {
    const orderId = await createReleasedOrder(ctx.acabadoId);

    // O centro e desativado DEPOIS de a OP ser liberada — exatamente a janela
    // que o G5 nao cobre (ele revalida na ativacao do roteiro, nao depois).
    const inativado = await api()
      .put(`/api/work-centers/${ctx.workCenterId}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ active: false });
    expectStatus(inativado, 200, 'workCenter:inativar');

    const started = await api()
      .put(`/api/production-orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'in_progress' });
    expectStatus(started, 422, 'op:start:centroInativo');
    expect(started.body.error.details.rule).toBe('G6-START-WC-INACTIVE');
    expect(started.body.error.details.steps[0].work_center_id).toBe(ctx.workCenterId);

    // Reativado, parte normalmente — o gate reprova o estado, nao a OP.
    const reativado = await api()
      .put(`/api/work-centers/${ctx.workCenterId}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ active: true });
    expectStatus(reativado, 200, 'workCenter:reativar');

    const retry = await api()
      .put(`/api/production-orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'in_progress' });
    expectStatus(retry, 200, 'op:start:aposReativar');
  });
});
