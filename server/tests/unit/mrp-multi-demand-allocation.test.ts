/**
 * Test: netagem CONJUNTA de multiplas demandas + rateio por origem
 * (`GenerateMrpPlanUseCase` × `allocatePlanByOrigin`).
 *
 * Defeito CRITICO 1 da auditoria de 2026-08-11: o use case rodava o motor uma
 * vez POR demanda, sempre com o estoque integro, e cada demanda abatia o
 * saldo inteiro. Duas demandas de 100 contra 100 em estoque davam necessidade
 * liquida ZERO nas duas — o plano voltava vazio e **a fabrica comprava a
 * menos**.
 *
 * A prova de fogo do defeito e o teste de integracao
 * (`tests/integration/mrp-multi-demand-netting.test.ts`, contra PostgreSQL).
 * Esta suite unitaria cobre o que o banco nao cobre bem: a ARITMETICA do
 * rateio — resto de arredondamento, participacoes desiguais, origem repetida
 * e o caso de uma demanda so (que nao pode ter mudado de comportamento).
 */

jest.mock('../../src/models/index', () => ({
  sequelize: {
    transaction: jest.fn(async (callback: any) => callback({ id: 'tx-1' })),
  },
}));

import GenerateMrpPlanUseCase = require('../../src/modules/mrp/application/use-cases/GenerateMrpPlanUseCase');

/**
 * Monta os dublês com uma BOM 1:1 (PA-1 -> MP-1) e uma posicao de estoque.
 *
 * @param estoque - Saldo fisico de MP-1.
 * @returns Repositorios dublê e o espiao de persistencia.
 */
function buildDeps(estoque: number) {
  const mrpRepository = {
    listActiveEdges: jest.fn(async () => [
      { item_pai_id: 'PA-1', item_componente_id: 'MP-1', quantidade: 1, perda_percentual: 0, ativo: true },
    ]),
    upsertPlannedOrders: jest.fn(async (orders: any[]) => orders),
    listPlannedOrders: jest.fn(),
    updatePlannedOrdersStatus: jest.fn(async () => undefined),
  };

  const itemRepository = {
    listMrpInventoryPositions: jest.fn(async () => [
      { id: 'MP-1', estoque_atual: estoque, estoque_reservado: 0, estoque_seguranca: 0, lote_minimo: 0, lead_time_dias: 0 },
    ]),
    listAutoConvertItemIds: jest.fn(async () => new Set()),
  };

  return { mrpRepository, itemRepository };
}

/**
 * Demanda no formato do endpoint `POST /api/mrp/plan`.
 *
 * @param quantidade - Quantidade demandada de PA-1.
 * @param origemId - Documento de origem.
 * @returns Demanda pronta para o use case.
 */
function demanda(quantidade: number, origemId: string | null) {
  return {
    item_id: 'PA-1',
    quantidade,
    data_necessidade: '2026-08-20',
    origem: 'PEDIDO_VENDA',
    origem_id: origemId,
  };
}

/**
 * Soma um campo das linhas do plano.
 *
 * @param linhas - Linhas do plano.
 * @param campo - Campo numerico.
 * @returns Total.
 */
function soma(linhas: any[], campo: string): number {
  return linhas.reduce((total: number, linha: any) => total + Number(linha[campo]), 0);
}

describe('GenerateMrpPlanUseCase — netagem conjunta e rateio por origem', () => {
  it('duas demandas de 100 contra 100 em estoque geram 100 de necessidade liquida (nao 0, nao 200)', async () => {
    const deps = buildDeps(100);
    const useCase = new GenerateMrpPlanUseCase(deps.mrpRepository as any, deps.itemRepository as any);

    const linhas = await useCase.execute({
      demands: [demanda(100, 'SO-1'), demanda(100, 'SO-2')],
    });

    // O estoque e UM so: 200 brutos - 100 disponiveis = 100 a comprar.
    expect(soma(linhas, 'necessidade_bruta')).toBeCloseTo(200, 6);
    expect(soma(linhas, 'estoque_disponivel')).toBeCloseTo(100, 6);
    expect(soma(linhas, 'necessidade_liquida')).toBeCloseTo(100, 6);
    expect(soma(linhas, 'quantidade_planejada')).toBeCloseTo(100, 6);

    // Rastreabilidade preservada: uma linha por origem, meio a meio.
    expect(linhas).toHaveLength(2);
    expect(new Set(linhas.map((linha: any) => linha.origem_id))).toEqual(new Set(['SO-1', 'SO-2']));
    for (const linha of linhas) {
      expect(Number(linha.necessidade_liquida)).toBeCloseTo(50, 6);
      expect(Number(linha.estoque_disponivel)).toBeCloseTo(50, 6);
      // A linha fecha sozinha: bruta - disponivel = liquida.
      expect(Number(linha.necessidade_bruta) - Number(linha.estoque_disponivel))
        .toBeCloseTo(Number(linha.necessidade_liquida), 6);
    }
  });

  it('rateia participacoes desiguais e a soma fecha EXATAMENTE, sem residuo de arredondamento', async () => {
    const deps = buildDeps(100);
    const useCase = new GenerateMrpPlanUseCase(deps.mrpRepository as any, deps.itemRepository as any);

    // 100 + 50 = 150 brutos, 100 disponiveis, 50 liquidos — divisao que nao
    // fecha em decimal (2/3 e 1/3). E aqui que um rateio ingenuo perde ou
    // inventa fracao de peca a cada rodada do MRP.
    const linhas = await useCase.execute({
      demands: [demanda(100, 'SO-1'), demanda(50, 'SO-2')],
    });

    expect(linhas).toHaveLength(2);
    expect(soma(linhas, 'necessidade_bruta')).toBe(150);
    expect(soma(linhas, 'estoque_disponivel')).toBe(100);
    expect(soma(linhas, 'necessidade_liquida')).toBe(50);
    expect(soma(linhas, 'quantidade_planejada')).toBe(50);

    const maior = linhas.find((linha: any) => linha.origem_id === 'SO-1');
    const menor = linhas.find((linha: any) => linha.origem_id === 'SO-2');
    expect(Number(maior.necessidade_liquida)).toBeCloseTo(33.333333, 6);
    expect(Number(menor.necessidade_liquida)).toBeCloseTo(16.666667, 6);
  });

  it('propaga estoque fisico e estoque retido por qualidade no mesmo rateio da linha', async () => {
    const deps = buildDeps(40);
    deps.itemRepository.listMrpInventoryPositions = jest.fn(async () => [
      {
        id: 'MP-1',
        estoque_atual: 40,
        estoque_fisico: 100,
        estoque_retido_qualidade: 60,
        estoque_reservado: 0,
        estoque_seguranca: 0,
        lote_minimo: 0,
        lead_time_dias: 0,
      },
    ]);
    deps.mrpRepository.upsertPlannedOrders = jest.fn(async (orders: any[]) => orders.map((order) => ({ ...order })));
    const useCase = new GenerateMrpPlanUseCase(deps.mrpRepository as any, deps.itemRepository as any);

    const linhas = await useCase.execute({
      demands: [demanda(100, 'SO-1'), demanda(100, 'SO-2')],
    });

    expect(linhas).toHaveLength(2);
    expect(soma(linhas, 'estoque_fisico')).toBeCloseTo(100, 6);
    expect(soma(linhas, 'estoque_retido_qualidade')).toBeCloseTo(60, 6);
    for (const linha of linhas) {
      expect(Number(linha.estoque_fisico)).toBeCloseTo(50, 6);
      expect(Number(linha.estoque_retido_qualidade)).toBeCloseTo(30, 6);
      expect(Number(linha.estoque_disponivel)).toBeCloseTo(20, 6);
    }

    const [persistedPayload] = deps.mrpRepository.upsertPlannedOrders.mock.calls[0];
    expect(persistedPayload[0]).not.toHaveProperty('estoque_fisico');
    expect(persistedPayload[0]).not.toHaveProperty('estoque_retido_qualidade');
  });

  it('demandas da MESMA origem viram uma linha so (a chave de rastreabilidade nao se multiplica)', async () => {
    const deps = buildDeps(0);
    const useCase = new GenerateMrpPlanUseCase(deps.mrpRepository as any, deps.itemRepository as any);

    const linhas = await useCase.execute({
      demands: [demanda(10, 'SO-1'), demanda(15, 'SO-1')],
    });

    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ item_id: 'MP-1', origem: 'PEDIDO_VENDA', origem_id: 'SO-1' });
    expect(Number(linhas[0].necessidade_liquida)).toBeCloseTo(25, 6);
  });

  it('demanda unica continua produzindo exatamente o mesmo plano de antes (sem regressao)', async () => {
    const deps = buildDeps(4);
    const useCase = new GenerateMrpPlanUseCase(deps.mrpRepository as any, deps.itemRepository as any);

    const linhas = await useCase.execute({
      demands: [{ ...demanda(10, 'SO-1'), origem: 'PREVISAO' }],
    });

    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      item_id: 'MP-1',
      origem: 'PREVISAO',
      origem_id: 'SO-1',
      necessidade_bruta: 10,
      estoque_disponivel: 4,
      necessidade_liquida: 6,
      quantidade_planejada: 6,
      data_necessidade: '2026-08-20',
      status: 'RASCUNHO',
    });
  });

  it('demanda sem documento de origem (origem_id nulo) nao quebra o rateio', async () => {
    const deps = buildDeps(10);
    const useCase = new GenerateMrpPlanUseCase(deps.mrpRepository as any, deps.itemRepository as any);

    const linhas = await useCase.execute({
      demands: [
        { item_id: 'PA-1', quantidade: 30, data_necessidade: '2026-08-20', origem: 'MANUAL' },
        demanda(30, 'SO-9'),
      ],
    });

    expect(soma(linhas, 'necessidade_liquida')).toBe(50);
    expect(linhas).toHaveLength(2);
    expect(linhas.some((linha: any) => linha.origem === 'MANUAL' && linha.origem_id === null)).toBe(true);
  });
});
