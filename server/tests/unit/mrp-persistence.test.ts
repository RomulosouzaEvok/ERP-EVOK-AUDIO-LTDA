jest.mock('../../src/models/index', () => ({
  sequelize: {
    transaction: jest.fn(async (callback: any) => callback({ id: 'tx-1' })),
  },
}));

import GenerateMrpPlanUseCase = require('../../src/modules/mrp/application/use-cases/GenerateMrpPlanUseCase');

describe('Persistencia MRP', () => {
  it('gera e persiste ordens planejadas respeitando estoque e lead time', async () => {
    const mrpRepository = {
      listActiveEdges: jest.fn(async () => [
        { item_pai_id: 'PA-1', item_componente_id: 'MP-1', quantidade: 3, perda_percentual: 0, ativo: true },
      ]),
      upsertPlannedOrders: jest.fn(async (orders: any[]) => orders),
      listPlannedOrders: jest.fn(),
    };
    const itemRepository = {
      listMrpInventoryPositions: jest.fn(async () => [
        { id: 'MP-1', estoque_atual: 4, estoque_reservado: 0, estoque_seguranca: 0, lote_minimo: 10, lead_time_dias: 7 },
      ]),
    };

    const useCase = new GenerateMrpPlanUseCase(mrpRepository as any, itemRepository as any);
    const result = await useCase.execute({
      demands: [{
        item_id: 'PA-1',
        quantidade: 2,
        data_necessidade: '2026-08-20',
        origem: 'PEDIDO_VENDA',
        origem_id: 'SO-1',
      }],
    });

    expect(mrpRepository.upsertPlannedOrders).toHaveBeenCalledTimes(1);
    expect(result[0]).toMatchObject({
      item_id: 'MP-1',
      origem: 'PEDIDO_VENDA',
      origem_id: 'SO-1',
      necessidade_bruta: 6,
      estoque_disponivel: 4,
      necessidade_liquida: 2,
      quantidade_planejada: 10,
      data_necessidade: '2026-08-20',
      data_liberacao: '2026-08-13',
      status: 'RASCUNHO',
    });
  });
});
