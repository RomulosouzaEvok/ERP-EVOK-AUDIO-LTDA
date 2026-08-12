/**
 * MRP — reexecucao do plano NAO pode ressuscitar ordem ja convertida.
 *
 * ## O defeito que esta suite tranca (auditoria de 2026-08-11, CRITICO 2)
 *
 * Rodar o MRP e uma acao rotineira: o planejador roda de novo a cada pedido
 * novo, a cada ajuste de estoque, varias vezes por dia. Duas falhas somadas
 * transformavam essa rotina em compra duplicada:
 *
 * 1. **O upsert reescrevia o `status`.** O plano e sempre montado com
 *    `status: 'RASCUNHO'`, e `SequelizeMrpRepository.upsertPlannedOrders`
 *    aplicava o payload inteiro sobre a linha existente. Uma ordem ja
 *    convertida (`EM_EXECUCAO`) voltava para `RASCUNHO` — ou seja, voltava a
 *    ser elegivel para conversao automatica.
 * 2. **A criacao da requisicao nao tinha idempotencia nenhuma.**
 *    `createRequisitionFromPlannedOrders` criava cabecalho e itens novos a
 *    cada chamada, sem olhar se aquela ordem planejada ja tinha virado
 *    requisicao.
 *
 * Resultado: item com `conversao_automatica = true` gerava **uma requisicao
 * de compra nova a cada rodada do MRP**. Ninguem percebe pelo plano (a tela
 * mostra a mesma linha); percebe-se no recebimento, com material duplicado.
 *
 * ## O que a suite prova (contra PostgreSQL real, nao dublê)
 *
 * 1. a 1a rodada converte: ordem `EM_EXECUCAO` + exatamente 1 requisicao;
 * 2. a 2a rodada, com a MESMA demanda, **nao** cria requisicao nova;
 * 3. a 2a rodada **nao** rebaixa o status da ordem convertida (a maquina de
 *    estados nao e dado recalculado pelo planejamento);
 * 4. o numero da requisicao segue o padrao `RQ-YYYY-NNNN` do resto do ERP
 *    (achado BAIXO 15 da mesma auditoria — antes era `RQ-<timestamp>`).
 *
 * @module tests/integration/mrp-rerun-idempotency
 */
import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/** Prefixo de todo registro criado por esta suite. */
const P = 'MRPIDEM';
const SUFFIX = String(Date.now()).slice(-8);

/** Quantidade demandada do produto acabado (estoque do componente = 0). */
const QTD_DEMANDA = 7;
/**
 * Lote minimo do componente. NAO e escolha do teste: `products` nasce com
 * `min_quantity = 5` (`CreateProductUseCase`: `input.min_quantity || 5`) e
 * `SequelizeItemRepository.listMrpInventoryPositions` usa esse numero como
 * lote minimo do MRP.
 */
const LOTE_MINIMO = 5;
/** 7 arredondado para cima no multiplo de 5. */
const QTD_PLANEJADA_ESPERADA = 10;

describeIntegration('MRP — reexecucao do plano e idempotente contra PostgreSQL', () => {
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
   * Cadastra o par produto + item com o MESMO codigo (crosswalk do G1).
   *
   * @param key - Chave logica (entra no codigo).
   * @param productType - Tipo em `products`.
   * @param itemTipo - Tipo em `items`.
   * @param autoConvert - Liga o opt-in `items.conversao_automatica`.
   * @returns Ids do produto (INTEGER) e do item (UUID) e o codigo usado.
   */
  async function createPair(
    key: string,
    productType: 'finished' | 'raw_material',
    itemTipo: 'PRODUTO_ACABADO' | 'MATERIA_PRIMA',
    autoConvert = false,
  ): Promise<{ productId: number; itemId: string; code: string }> {
    const code = `${P}-${key}-${SUFFIX}`;

    const product = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} ${key} ${SUFFIX}`,
        code,
        description: `Validacao da idempotencia de reexecucao do MRP (${key})`,
        price: 100,
        cost_price: 40,
        quantity: 0,
        min_quantity: LOTE_MINIMO,
        product_type: productType,
        status: 'active',
        ncm: '85182100',
        cest: '2106400',
        weight: 1,
        unit: 'un',
        lead_time: 0,
        location: P,
        revision: '00',
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
        lote_minimo: 0,
        lead_time_dias: 0,
        custo_padrao: 40,
        conversao_automatica: autoConvert,
      });
    expectStatus(item, 201, `item:${key}`);

    return { productId: product.body.data.id, itemId: String(item.body.data.id), code };
  }

  /**
   * Roda o plano MRP com a MESMA demanda (a rotina do planejador).
   *
   * @returns Linhas do plano referentes ao componente desta suite.
   */
  async function runPlan(): Promise<any[]> {
    const plan = await api()
      .post('/api/mrp/plan')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        demands: [{
          item_id: ctx.acabado.itemId,
          quantidade: QTD_DEMANDA,
          data_necessidade: ctx.dataNecessidade,
          origem: 'MANUAL',
        }],
      });
    expectStatus(plan, 201, 'mrp:plan');

    return (plan.body.data ?? []).filter((order: any) => String(order.item_id) === ctx.componente.itemId);
  }

  /**
   * Requisicoes de origem `mrp_auto` que contem o componente desta suite.
   *
   * Filtrar pelo codigo do item (e nao so pela origem) e o que torna a
   * contagem confiavel: o banco de teste acumula requisicoes de outras
   * suites/rodadas.
   *
   * @returns Requisicoes que citam o componente desta suite.
   */
  async function autoRequisitionsForComponent(): Promise<any[]> {
    const lista = await api()
      .get('/api/purchase-requisitions')
      .set('Authorization', `Bearer ${token()}`)
      .query({ origin: 'mrp_auto', limit: 100 });
    expectStatus(lista, 200, 'requisicoes:lista');

    return (lista.body.data ?? []).filter((requisition: any) => (requisition.items ?? []).some(
      (item: any) => String(item.item?.codigo ?? '') === ctx.componente.code,
    ));
  }

  /**
   * Le, do banco, as ordens planejadas do componente desta suite.
   *
   * @returns Ordens planejadas persistidas.
   */
  async function plannedOrdersForComponent(): Promise<any[]> {
    const lista = await api()
      .get('/api/mrp/planned-orders')
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(lista, 200, 'mrp:plannedOrders');

    return (lista.body.data ?? []).filter((order: any) => String(order.item_id) === ctx.componente.itemId);
  }

  // ====================================================================
  // ETAPA 1 — Cadastro com o opt-in de conversao automatica ligado
  // ====================================================================
  it('etapa 1: cadastra o produto, o componente com conversao_automatica e a BOM ativa', async () => {
    ctx.acabado = await createPair('PAI', 'finished', 'PRODUTO_ACABADO');
    ctx.componente = await createPair('COMP', 'raw_material', 'MATERIA_PRIMA', true);
    ctx.dataNecessidade = futureDate(25);

    const bom = await api()
      .post('/api/engineering/bom')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: ctx.acabado.productId,
        revision: P,
        notes: 'Estrutura 1:1 minima para a prova de idempotencia do MRP',
        items: [
          {
            component_product_id: ctx.componente.productId,
            quantity: 1,
            unit: 'un',
            component_type: 'raw_material',
            is_critical: false,
          },
        ],
      });
    expectStatus(bom, 201, 'bom');
  });

  // ====================================================================
  // ETAPA 2 — 1a rodada: converte e cria UMA requisicao
  // ====================================================================
  it('etapa 2: a primeira rodada converte a ordem e cria exatamente uma requisicao', async () => {
    const linhas = await runPlan();

    expect(linhas.length).toBe(1);
    expect(Number(linhas[0].necessidade_liquida)).toBeCloseTo(QTD_DEMANDA, 4);
    expect(Number(linhas[0].quantidade_planejada)).toBeCloseTo(QTD_PLANEJADA_ESPERADA, 4);
    // O opt-in do item fecha o ciclo sozinho: a ordem ja nasce convertida.
    expect(String(linhas[0].status)).toBe('EM_EXECUCAO');
    ctx.ordemId = String(linhas[0].id);

    const requisicoes = await autoRequisitionsForComponent();
    expect(requisicoes.length).toBe(1);
    ctx.requisitionId = requisicoes[0].id;

    // Achado BAIXO 15 da mesma auditoria: numeracao no padrao do ERP
    // (`RQ-YYYY-NNNN`), nao `RQ-<timestamp>`.
    expect(String(requisicoes[0].requisition_number)).toMatch(/^RQ-\d{4}-\d{4,}$/);
    expect(String(requisicoes[0].status)).toBe('pending');
  });

  // ====================================================================
  // ETAPA 3 — A prova: rodar de novo nao duplica nada
  // ====================================================================
  it('etapa 3: a segunda rodada nao cria requisicao nova nem rebaixa o status da ordem convertida', async () => {
    const linhas = await runPlan();

    expect(linhas.length).toBe(1);
    expect(String(linhas[0].id)).toBe(ctx.ordemId);
    // Este e o coracao do defeito 2: o upsert reescrevia `status` de volta
    // para RASCUNHO e a ordem virava candidata a conversao outra vez.
    expect(String(linhas[0].status)).toBe('EM_EXECUCAO');

    const persistidas = await plannedOrdersForComponent();
    expect(persistidas.length).toBe(1);
    expect(String(persistidas[0].status)).toBe('EM_EXECUCAO');

    const requisicoes = await autoRequisitionsForComponent();
    expect(requisicoes.length).toBe(1);
    expect(requisicoes[0].id).toBe(ctx.requisitionId);

    // Nem itens duplicados dentro da mesma requisicao.
    const itensDoComponente = (requisicoes[0].items ?? []).filter(
      (item: any) => String(item.item?.codigo ?? '') === ctx.componente.code,
    );
    expect(itensDoComponente.length).toBe(1);
  });

  // ====================================================================
  // ETAPA 4 — Terceira rodada, para nao provar so o caso "duas vezes"
  // ====================================================================
  it('etapa 4: a terceira rodada mantem o cenario estavel (uma ordem, uma requisicao)', async () => {
    await runPlan();

    const persistidas = await plannedOrdersForComponent();
    expect(persistidas.length).toBe(1);
    expect(String(persistidas[0].status)).toBe('EM_EXECUCAO');

    const requisicoes = await autoRequisitionsForComponent();
    expect(requisicoes.length).toBe(1);
  });
});
