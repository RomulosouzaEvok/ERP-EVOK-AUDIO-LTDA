/**
 * G17 — Plano Mestre de Produção (MPS), ciclo completo contra PostgreSQL real.
 *
 * ## O que faltava provar
 *
 * O MPS foi entregue com 40 casos unitários — todos com repositório dublê,
 * nenhum tocando o banco. A parte que **nunca rodou contra o Postgres** é
 * justamente a que escreve: a consolidação da demanda (agregações SQL sobre
 * carteira, estoque, quarentena e OPs abertas) e a **liberação, que cria
 * Ordens de Produção de verdade**. Pelo critério de aceite do projeto
 * (`docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`),
 * é isso — e não o typecheck — que decide se o módulo funciona.
 *
 * ## O que esta suite prova
 *
 * | # | Pergunta | Onde |
 * |---|---|---|
 * | 1 | a consolidação enxerga o estoque mínimo como demanda? | etapa 2 |
 * | 2 | a linha nasce SEM quantidade planejada, mesmo com sugestão positiva? | etapa 2 |
 * | 3 | firmar sem nenhuma decisão é recusado? | etapa 2 |
 * | 4 | a decisão do planejador é gravada e separada da sugestão? | etapa 3 |
 * | 5 | liberar um plano que não foi firmado é recusado? | etapa 3 |
 * | 6 | firmar congela: a linha não aceita mais decisão? | etapa 4 |
 * | 7 | liberar cria Ordem de Produção REAL, com rastro na linha? | etapa 5 |
 * | 8 | descartar uma linha impede que ela vire OP? | etapas 3 e 5 |
 *
 * O ponto 2 é a decisão D-F do dono em forma de teste: **venda não vira ordem
 * de produção sozinha**. Se um dia a linha nascer com `planned_quantity`
 * preenchida, a ponte volta a ser automática e a decisão humana desaparece do
 * registro — este teste falha antes disso chegar em produção.
 *
 * @module tests/integration/master-production-plan-cycle
 */
import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/** Prefixo de todo registro criado por esta suite. */
const P = 'MPS';
const SUFFIX = String(Date.now()).slice(-8);

/** Estoque mínimo do produto acabado — é ele que vira demanda de planejamento. */
const ESTOQUE_MINIMO = 12;
/** Quantidade decidida pelo planejador (menor que a sugestão, de propósito). */
const QTD_PLANEJADA = 5;
/** Saldo do componente, folgado para a checagem de disponibilidade da OP. */
const SALDO_COMPONENTE = 500;

describeIntegration('G17 — ciclo do Plano Mestre de Producao (MPS) contra PostgreSQL', () => {
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
   * Cadastra produto + item com o mesmo codigo (o par que o MRP/G1 exige).
   *
   * @param key - Chave logica.
   * @param productType - Tipo em `products`.
   * @param itemTipo - Tipo em `items`.
   * @param extra - Campos adicionais do produto (ex.: `min_quantity`).
   * @returns Id do produto criado.
   */
  async function createProduct(
    key: string,
    productType: 'finished' | 'raw_material',
    itemTipo: 'PRODUTO_ACABADO' | 'MATERIA_PRIMA',
    extra: Record<string, unknown> = {},
  ): Promise<number> {
    const code = `${P}-${key}-${SUFFIX}`;

    const product = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} ${key} ${SUFFIX}`,
        code,
        description: `Validacao do ciclo do plano mestre (${key})`,
        price: 500,
        cost_price: 100,
        quantity: 0,
        product_type: productType,
        status: 'active',
        ncm: '85182100',
        cest: '2106400',
        weight: 1,
        unit: 'un',
        lead_time: 1,
        location: 'MPS',
        revision: '00',
        ...extra,
      });
    expectStatus(product, 201, `product:${key}`);

    const item = await api()
      .post('/api/items')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        codigo: code,
        descricao: `${P} ${key} ${SUFFIX}`,
        tipo: itemTipo,
        unidade: 'un',
        status: 'ATIVO',
        estoque_atual: 0,
        estoque_seguranca: 0,
        lote_minimo: 1,
        lead_time_dias: 1,
        custo_padrao: 100,
      });
    expectStatus(item, 201, `item:${key}`);

    return product.body.data.id;
  }

  /**
   * Localiza, dentro do plano, a linha do produto desta suite.
   *
   * O plano consolida a demanda da fabrica INTEIRA, entao ele traz linhas de
   * outros produtos — procurar pela linha certa e parte do teste.
   *
   * @param plan - Plano com linhas.
   * @returns A linha do produto acabado desta suite.
   */
  function lineOf(plan: any): any {
    const line = (plan.lines ?? []).find((row: any) => Number(row.product_id) === ctx.acabadoId);
    if (!line) {
      throw new Error(
        `A linha do produto #${ctx.acabadoId} nao esta no plano. Linhas: ${JSON.stringify(
          (plan.lines ?? []).map((row: any) => row.product_id),
        )}`,
      );
    }
    return line;
  }

  /**
   * Le o plano com suas linhas.
   *
   * @returns Corpo de `GET /api/production/master-plans/:id`.
   */
  async function loadPlan(): Promise<any> {
    const response = await api()
      .get(`/api/production/master-plans/${ctx.planId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(response, 200, 'getPlan');
    return response.body.data;
  }

  // ====================================================================
  // ETAPA 1 — Cadastro: produto com estoque minimo e estrutura ativa
  // ====================================================================
  it('etapa 1: cadastra o produto acabado com estoque minimo, o componente e a BOM ativa', async () => {
    // `min_quantity` e o que faz o produto entrar na consolidacao: estoque
    // minimo e tratado como demanda de planejamento (antes do G17 ele so
    // alimentava alerta de dashboard).
    ctx.acabadoId = await createProduct('ACABADO', 'finished', 'PRODUTO_ACABADO', { min_quantity: ESTOQUE_MINIMO });
    ctx.componenteId = await createProduct('COMPONENTE', 'raw_material', 'MATERIA_PRIMA');

    const entrada = await api()
      .post('/api/inventory/movements')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: ctx.componenteId,
        type: 'in',
        quantity: SALDO_COMPONENTE,
        description: 'Saldo do componente para a checagem de disponibilidade da OP (validacao G17)',
      });
    expectStatus(entrada, 201, 'movimento:componente');

    // G2: sem BOM ativa a OP nem nasce — a liberacao do plano repete
    // exatamente as validacoes dos outros caminhos de criacao de OP.
    const bom = await api()
      .post('/api/engineering/bom')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: ctx.acabadoId,
        revision: 'MPS',
        notes: 'Estrutura minima para validar a liberacao do plano mestre',
        items: [
          { component_product_id: ctx.componenteId, quantity: 2, unit: 'un', component_type: 'raw_material', is_critical: true },
        ],
      });
    expectStatus(bom, 201, 'bom');
  });

  // ====================================================================
  // ETAPA 2 — Consolidacao: a demanda vira linha, mas nao vira decisao
  // ====================================================================
  it('etapa 2: consolida o horizonte — a linha nasce com sugestao positiva e ZERO planejado', async () => {
    const created = await api()
      .post('/api/production/master-plans')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        horizon_start: futureDate(0),
        horizon_end: futureDate(30),
        notes: `${P} plano de validacao ${SUFFIX}`,
      });
    expectStatus(created, 201, 'createPlan');

    ctx.planId = created.body.data.plan.id;
    expect(created.body.data.plan.status).toBe('draft');
    expect(String(created.body.data.plan.plan_number)).toMatch(/^MPS-\d{4}-\d+$/);

    const plan = await loadPlan();
    const line = lineOf(plan);
    ctx.lineId = line.id;

    // A demanda veio do estoque minimo, e o produto nao tem saldo nenhum:
    // a necessidade liquida e o proprio minimo.
    expect(Number(line.demand_safety_stock)).toBeCloseTo(ESTOQUE_MINIMO, 4);
    expect(Number(line.suggested_quantity)).toBeCloseTo(ESTOQUE_MINIMO, 4);

    // **Decisao D-F em forma de teste:** a sugestao e positiva e mesmo assim
    // a linha nasce sem quantidade planejada. Venda nao vira producao sozinha.
    expect(Number(line.planned_quantity)).toBe(0);
    expect(line.status).toBe('pending');
    expect(line.production_order_id).toBeNull();

    // Firmar um plano em que ninguem decidiu nada e recusado — senao o plano
    // "firme" seria uma decisao que nunca foi tomada.
    const firmVazio = await api()
      .post(`/api/production/master-plans/${ctx.planId}/firm`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(firmVazio, 422, 'firm:semDecisao');
  });

  // ====================================================================
  // ETAPA 3 — A decisao humana, gravada e separada da sugestao
  // ====================================================================
  it('etapa 3: o planejador decide a linha, e liberar antes de firmar e recusado', async () => {
    const decided = await api()
      .patch(`/api/production/master-plans/${ctx.planId}/lines/${ctx.lineId}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ planned_quantity: QTD_PLANEJADA, due_date: futureDate(20), notes: 'Metade agora, resto no proximo ciclo' });
    expectStatus(decided, 200, 'decideLine');

    const plan = await loadPlan();
    const line = lineOf(plan);

    expect(line.status).toBe('planned');
    expect(Number(line.planned_quantity)).toBeCloseTo(QTD_PLANEJADA, 4);
    // A sugestao do sistema NAO e sobrescrita pela decisao: e a divergencia
    // entre as duas que uma auditoria de PCP procura.
    expect(Number(line.suggested_quantity)).toBeCloseTo(ESTOQUE_MINIMO, 4);
    expect(line.decided_by).not.toBeNull();
    expect(line.decided_at).not.toBeNull();

    // Plano em rascunho nao gera OP: a decisao precisa ser congelada antes.
    const releaseDraft = await api()
      .post(`/api/production/master-plans/${ctx.planId}/release`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(releaseDraft, 422, 'release:draft');

    const ordensAntes = await api()
      .get('/api/production-orders')
      .set('Authorization', `Bearer ${token()}`)
      .query({ product_id: ctx.acabadoId, limit: 50 });
    expectStatus(ordensAntes, 200, 'ordens:antes');
    expect((ordensAntes.body.data ?? []).length).toBe(0);
  });

  // ====================================================================
  // ETAPA 4 — Firmar congela
  // ====================================================================
  it('etapa 4: firmar congela o plano — a linha nao aceita mais decisao', async () => {
    const firmed = await api()
      .post(`/api/production/master-plans/${ctx.planId}/firm`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(firmed, 200, 'firm');
    expect(firmed.body.data.status).toBe('firm');
    expect(firmed.body.data.firmed_by).not.toBeNull();

    const alteracao = await api()
      .patch(`/api/production/master-plans/${ctx.planId}/lines/${ctx.lineId}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ planned_quantity: QTD_PLANEJADA + 3 });
    expectStatus(alteracao, 422, 'decide:aposFirmar');

    const plan = await loadPlan();
    expect(Number(lineOf(plan).planned_quantity)).toBeCloseTo(QTD_PLANEJADA, 4);
  });

  // ====================================================================
  // ETAPA 5 — A prova principal: a liberacao cria OP de verdade
  // ====================================================================
  it('etapa 5: liberar cria a Ordem de Producao real e deixa o rastro na linha', async () => {
    const released = await api()
      .post(`/api/production/master-plans/${ctx.planId}/release`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(released, 201, 'release');
    expect(released.body.data.plan.status).toBe('released');

    const ordens = released.body.data.production_orders ?? [];
    const minha = ordens.find((ordem: any) => Number(ordem.product_id) === ctx.acabadoId);
    expect(minha).toBeDefined();
    expect(Number(minha.quantity)).toBeCloseTo(QTD_PLANEJADA, 4);

    // A OP existe no modulo de producao — nao apenas no payload da resposta.
    const consulta = await api()
      .get(`/api/production-orders/${minha.id}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(consulta, 200, 'ordem:consulta');
    expect(Number(consulta.body.data.product_id)).toBe(ctx.acabadoId);
    expect(Number(consulta.body.data.quantity)).toBeCloseTo(QTD_PLANEJADA, 4);
    // A OP nasce planejada: liberar o PLANO nao libera a ORDEM (liberar a
    // ordem e que reserva material, e isso continua sendo ato da producao).
    expect(['planned', 'released']).toContain(consulta.body.data.status);

    // Rastro de origem: a linha aponta para a OP que ela gerou.
    const plan = await loadPlan();
    const line = lineOf(plan);
    expect(line.status).toBe('released');
    expect(Number(line.production_order_id)).toBe(Number(minha.id));

    // Plano ja liberado nao libera de novo — senao cada clique geraria uma OP.
    const reliberar = await api()
      .post(`/api/production/master-plans/${ctx.planId}/release`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(reliberar, 422, 'release:duplicado');
  });

  // ====================================================================
  // ETAPA 6 — Descartar e uma decisao, e ela impede a OP
  // ====================================================================
  it('etapa 6: descartar NAO e decidir produzir — a linha descartada nao vira OP, e sozinha nem firma o plano', async () => {
    // Segundo produto, para que o plano tenha uma decisao de PRODUZIR alem do
    // descarte — firmar exige `planned_quantity` em ao menos uma linha, e
    // descarte nao conta: um plano em que se decidiu nao produzir nada nao e
    // um plano de producao.
    ctx.acabado2Id = await createProduct('ACABADO2', 'finished', 'PRODUTO_ACABADO', { min_quantity: ESTOQUE_MINIMO });
    const bom2 = await api()
      .post('/api/engineering/bom')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: ctx.acabado2Id,
        revision: 'MPS',
        notes: 'Estrutura do segundo acabado (validacao G17)',
        items: [
          { component_product_id: ctx.componenteId, quantity: 1, unit: 'un', component_type: 'raw_material' },
        ],
      });
    expectStatus(bom2, 201, 'bom:acabado2');

    const criado = await api()
      .post('/api/production/master-plans')
      .set('Authorization', `Bearer ${token()}`)
      .send({ horizon_start: futureDate(31), horizon_end: futureDate(60), notes: `${P} plano de descarte ${SUFFIX}` });
    expectStatus(criado, 201, 'createPlan:descarte');
    const planId = criado.body.data.plan.id;

    const detalhe = await api()
      .get(`/api/production/master-plans/${planId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(detalhe, 200, 'getPlan:descarte');
    const linhas = detalhe.body.data.lines ?? [];
    const linhaDescartada = linhas.find((row: any) => Number(row.product_id) === ctx.acabadoId);
    const linhaProduzida = linhas.find((row: any) => Number(row.product_id) === ctx.acabado2Id);
    expect(linhaDescartada).toBeDefined();
    expect(linhaProduzida).toBeDefined();

    const descartada = await api()
      .patch(`/api/production/master-plans/${planId}/lines/${linhaDescartada.id}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ dismiss: true });
    expectStatus(descartada, 200, 'dismiss');
    expect(descartada.body.data.status).toBe('dismissed');

    // So com o descarte, firmar e recusado — descarte nao e decisao de produzir.
    const firmSoDescarte = await api()
      .post(`/api/production/master-plans/${planId}/firm`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(firmSoDescarte, 422, 'firm:soDescarte');

    const planejada = await api()
      .patch(`/api/production/master-plans/${planId}/lines/${linhaProduzida.id}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ planned_quantity: 3 });
    expectStatus(planejada, 200, 'decide:acabado2');

    const firmado = await api()
      .post(`/api/production/master-plans/${planId}/firm`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(firmado, 200, 'firm:descarte');

    const ordensAntes = await api()
      .get('/api/production-orders')
      .set('Authorization', `Bearer ${token()}`)
      .query({ product_id: ctx.acabadoId, limit: 50 });
    expectStatus(ordensAntes, 200, 'ordens:antesDescarte');
    const totalAntes = (ordensAntes.body.data ?? []).length;

    const liberado = await api()
      .post(`/api/production/master-plans/${planId}/release`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(liberado, 201, 'release:descarte');

    // O produto planejado virou OP...
    const ordens = liberado.body.data.production_orders ?? [];
    expect(ordens.some((ordem: any) => Number(ordem.product_id) === ctx.acabado2Id)).toBe(true);
    // ...e o descartado NAO ganhou nenhuma OP nova.
    expect(ordens.some((ordem: any) => Number(ordem.product_id) === ctx.acabadoId)).toBe(false);

    const ordensDepois = await api()
      .get('/api/production-orders')
      .set('Authorization', `Bearer ${token()}`)
      .query({ product_id: ctx.acabadoId, limit: 50 });
    expectStatus(ordensDepois, 200, 'ordens:depoisDescarte');
    expect((ordensDepois.body.data ?? []).length).toBe(totalAntes);
  });
});
