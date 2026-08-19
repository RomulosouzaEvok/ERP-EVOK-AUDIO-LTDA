/**
 * MRP — netagem de MULTIPLAS demandas contra UM saldo de estoque.
 *
 * ## O defeito que esta suite tranca (auditoria de 2026-08-11, CRITICO 1)
 *
 * `GenerateMrpPlanUseCase` rodava o motor uma vez **por demanda**, sempre com
 * a mesma posicao de estoque integra. Cada demanda abatia o estoque inteiro,
 * como se fosse a unica da fabrica.
 *
 * Cenario minimo em que isso custa dinheiro (o desta suite):
 *
 * | | bruta | estoque considerado | liquida |
 * |---|---|---|---|
 * | demanda A | 100 | 100 (integro) | 0 |
 * | demanda B | 100 | 100 (**de novo**) | 0 |
 * | **realidade** | **200** | **100** | **100** |
 *
 * Com liquida 0 nas duas, o filtro `plannedQuantity > 0` do motor descartava
 * as duas linhas: **nenhuma ordem planejada, nenhuma requisicao, e uma falta
 * de 100 pecas que so aparece no chao de fabrica.** Comprar a menos e o pior
 * erro possivel de um MRP — comprar a mais custa capital de giro, comprar a
 * menos para a linha.
 *
 * ## O que a suite prova (contra PostgreSQL real, nao dublê)
 *
 * 1. duas demandas do mesmo item disputam **um** saldo: a necessidade liquida
 *    agregada e exatamente 100 (nao 0, nao 200);
 * 2. a rastreabilidade por origem sobrevive ao rateio — as duas origens
 *    continuam existindo como linhas separadas, cada uma com sua parte;
 * 3. a linha continua legivel para o planejador: `bruta - disponivel =
 *    liquida` dentro de cada linha (o rateio distribui tambem o estoque, em
 *    vez de repetir o saldo inteiro em toda linha).
 *
 * @module tests/integration/mrp-multi-demand-netting
 */
import { randomUUID } from 'crypto';

import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/** Prefixo de todo registro criado por esta suite. */
const P = 'MRPNET';
const SUFFIX = String(Date.now()).slice(-8);

/**
 * Estoque de seguranca do componente. NAO e escolha do teste: `products`
 * nasce com `min_quantity = 5` (`CreateProductUseCase` faz
 * `input.min_quantity || 5`, entao nem enviar 0 zera), e
 * `SequelizeItemRepository.listMrpInventoryPositions` usa esse mesmo numero
 * como estoque de seguranca E como lote minimo.
 */
const ESTOQUE_SEGURANCA = 5;
/** Saldo FISICO lancado no componente. */
const ESTOQUE_COMPONENTE = 105;
/** Saldo DISPONIVEL para o MRP (fisico - reservado - seguranca) = 100. */
const ESTOQUE_DISPONIVEL = ESTOQUE_COMPONENTE - ESTOQUE_SEGURANCA;
/** Quantidade de CADA uma das duas demandas independentes. */
const QTD_DEMANDA = 100;
/** Consumo do componente por unidade do produto acabado (BOM 1:1). */
const QTD_POR_UNIDADE = 1;
/** Necessidade liquida correta do cenario: 200 brutos - 100 disponiveis. */
const LIQUIDA_ESPERADA = (2 * QTD_DEMANDA * QTD_POR_UNIDADE) - ESTOQUE_DISPONIVEL;

describeIntegration('MRP — netagem multi-demanda contra PostgreSQL', () => {
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
   * Cadastra o par produto + item com o MESMO codigo — o crosswalk
   * `products.code = items.codigo` que o G1 exige para o MRP enxergar a BOM.
   *
   * @param key - Chave logica (entra no codigo).
   * @param productType - Tipo em `products`.
   * @param itemTipo - Tipo em `items`.
   * @returns Ids do produto (INTEGER) e do item (UUID).
   */
  async function createPair(
    key: string,
    productType: 'finished' | 'raw_material',
    itemTipo: 'PRODUTO_ACABADO' | 'MATERIA_PRIMA',
  ): Promise<{ productId: number; itemId: string }> {
    const code = `${P}-${key}-${SUFFIX}`;

    const product = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} ${key} ${SUFFIX}`,
        code,
        description: `Validacao da netagem multi-demanda do MRP (${key})`,
        price: 100,
        cost_price: 40,
        quantity: 0,
        // `min_quantity` alimenta, em
        // `SequelizeItemRepository.listMrpInventoryPositions`, TANTO
        // `estoque_seguranca` QUANTO `lote_minimo`. Nao da para zerar
        // (`CreateProductUseCase`: `input.min_quantity || 5`), entao o
        // cenario absorve o valor padrao em vez de fingir que ele nao existe.
        min_quantity: ESTOQUE_SEGURANCA,
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
        estoque_seguranca: 0,
        lote_minimo: 0,
        lead_time_dias: 0,
        custo_padrao: 40,
      });
    expectStatus(item, 201, `item:${key}`);

    return { productId: product.body.data.id, itemId: String(item.body.data.id) };
  }

  // ====================================================================
  // ETAPA 1 — Cadastro: um produto, um componente, um saldo de 100
  // ====================================================================
  it('etapa 1: cadastra produto acabado, componente com 100 disponiveis e BOM ativa 1:1', async () => {
    const acabado = await createPair('PAI', 'finished', 'PRODUTO_ACABADO');
    const componente = await createPair('COMP', 'raw_material', 'MATERIA_PRIMA');
    ctx.acabado = acabado;
    ctx.componente = componente;

    const entrada = await api()
      .post('/api/inventory/movements')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: componente.productId,
        type: 'in',
        quantity: ESTOQUE_COMPONENTE,
        description: 'Saldo unico que as duas demandas vao disputar (validacao da netagem multi-demanda)',
      });
    expectStatus(entrada, 201, 'movimento:componente');

    const bom = await api()
      .post('/api/engineering/bom')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: acabado.productId,
        revision: P,
        notes: 'Estrutura 1:1 minima para a prova de netagem multi-demanda',
        items: [
          {
            component_product_id: componente.productId,
            quantity: QTD_POR_UNIDADE,
            unit: 'un',
            component_type: 'raw_material',
            is_critical: true,
          },
        ],
      });
    expectStatus(bom, 201, 'bom');
  });

  // ====================================================================
  // ETAPA 2 — A prova: 100 + 100 contra 100 tem que dar 100
  // ====================================================================
  it('etapa 2: duas demandas de 100 contra um saldo de 100 geram necessidade liquida de exatamente 100', async () => {
    ctx.origemA = randomUUID();
    ctx.origemB = randomUUID();
    ctx.dataNecessidade = futureDate(20);

    const plan = await api()
      .post('/api/mrp/plan')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        demands: [
          {
            item_id: ctx.acabado.itemId,
            quantidade: QTD_DEMANDA,
            data_necessidade: ctx.dataNecessidade,
            origem: 'PEDIDO_VENDA',
            origem_id: ctx.origemA,
          },
          {
            item_id: ctx.acabado.itemId,
            quantidade: QTD_DEMANDA,
            data_necessidade: ctx.dataNecessidade,
            origem: 'PEDIDO_VENDA',
            origem_id: ctx.origemB,
          },
        ],
      });
    expectStatus(plan, 201, 'mrp:plan');

    const linhas = (plan.body.data ?? []).filter(
      (order: any) => String(order.item_id) === ctx.componente.itemId,
    );

    // Antes da correcao esta linha e o ponto de morte: cada demanda netava
    // contra o estoque INTEIRO, as duas davam liquida 0, o motor filtrava
    // `plannedQuantity > 0` e o plano voltava VAZIO — falta de 100 pecas
    // sem nenhum sinal no sistema.
    expect(linhas.length).toBeGreaterThan(0);

    const soma = (campo: string): number => linhas.reduce(
      (total: number, linha: any) => total + Number(linha[campo]),
      0,
    );

    // 2 x 100 pecas x 1 componente por peca.
    expect(soma('necessidade_bruta')).toBeCloseTo(2 * QTD_DEMANDA * QTD_POR_UNIDADE, 4);
    // O saldo e UM so, e ele so pode ser abatido UMA vez.
    expect(soma('estoque_disponivel')).toBeCloseTo(ESTOQUE_DISPONIVEL, 4);
    // 200 - 100 = 100. Este e o numero que a fabrica precisa comprar.
    expect(soma('necessidade_liquida')).toBeCloseTo(LIQUIDA_ESPERADA, 4);
    // 100 e multiplo do lote minimo (5), entao planejado = liquida.
    expect(soma('quantidade_planejada')).toBeCloseTo(LIQUIDA_ESPERADA, 4);

    // Rastreabilidade: o rateio nao pode apagar de QUAL pedido veio a
    // necessidade — foi por isso que o laco defeituoso existia.
    const origens = new Set(linhas.map((linha: any) => String(linha.origem_id)));
    expect(origens).toEqual(new Set([ctx.origemA, ctx.origemB]));

    for (const linha of linhas) {
      expect(String(linha.origem)).toBe('PEDIDO_VENDA');
      expect(String(linha.status)).toBe('RASCUNHO');
      // A linha tem que fechar sozinha na tela do planejador: se o estoque
      // fosse repetido inteiro em cada linha, o operador leria
      // "bruta 100 - disponivel 100 = liquida 50" e nao confiaria no plano.
      expect(Number(linha.necessidade_bruta) - Number(linha.estoque_disponivel))
        .toBeCloseTo(Number(linha.necessidade_liquida), 4);
      expect(Number(linha.quantidade_planejada)).toBeGreaterThan(0);
    }
  });

  // ====================================================================
  // ETAPA 3 — O que foi devolvido pela API esta mesmo no banco
  // ====================================================================
  it('etapa 3: as ordens planejadas persistidas no banco somam a mesma necessidade liquida', async () => {
    const lista = await api()
      .get('/api/mrp/planned-orders')
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(lista, 200, 'mrp:plannedOrders');

    const persistidas = (lista.body.data ?? []).filter(
      (order: any) => String(order.item_id) === ctx.componente.itemId,
    );

    expect(persistidas.length).toBe(2);
    const liquidaTotal = persistidas.reduce(
      (total: number, linha: any) => total + Number(linha.necessidade_liquida),
      0,
    );
    expect(liquidaTotal).toBeCloseTo(LIQUIDA_ESPERADA, 4);
  });
});
