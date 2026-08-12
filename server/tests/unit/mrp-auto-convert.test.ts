/**
 * Test: fechamento automatico do ciclo MRP (plano -> requisicao) para
 * itens com o opt-in `items.conversao_automatica = true`.
 *
 * Roadmap pos-Go-Live item 3 (docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md, sec. 3).
 * Cobre: (1) caso feliz — item com a flag gera requisicao automaticamente
 * sem intervencao do planejador; (2) caso padrao — item sem a flag
 * preserva o comportamento manual existente (nenhuma requisicao criada,
 * ordem continua RASCUNHO); (3) rastreabilidade — origin `mrp_auto`
 * distinto do `mrp` manual, `requester_id` do usuario que rodou o MRP.
 */

jest.mock('../../src/models/index', () => ({
  sequelize: {
    transaction: jest.fn(async (callback: any) => callback({ id: 'tx-1' })),
  },
}));

import GenerateMrpPlanUseCase = require('../../src/modules/mrp/application/use-cases/GenerateMrpPlanUseCase');

function buildDeps(overrides: Partial<{
  autoConvertItemIds: Set<string>;
}> = {}) {
  const mrpRepository = {
    listActiveEdges: jest.fn(async () => [
      { item_pai_id: 'PA-1', item_componente_id: 'MP-1', quantidade: 1, perda_percentual: 0, ativo: true },
    ]),
    upsertPlannedOrders: jest.fn(async (orders: any[]) => orders.map((order, index) => ({
      id: `order-${index + 1}`,
      ...order,
    }))),
    listPlannedOrders: jest.fn(),
    updatePlannedOrdersStatus: jest.fn(async () => undefined),
  };

  const itemRepository = {
    listMrpInventoryPositions: jest.fn(async () => [
      { id: 'MP-1', estoque_atual: 0, estoque_reservado: 0, estoque_seguranca: 0, lote_minimo: 0, lead_time_dias: 0 },
    ]),
    listAutoConvertItemIds: jest.fn(async () => overrides.autoConvertItemIds ?? new Set()),
  };

  const requisitionRepository = {
    // Numeracao `RQ-YYYY-NNNN` emitida pelo repositorio (advisory lock),
    // no lugar do antigo `RQ-${Date.now()}`.
    nextRequisitionNumberForYear: jest.fn(async (yearPrefix: string) => `${yearPrefix}-0001`),
    createRequisition: jest.fn(async (data: any) => ({ id: 501, ...data })),
    createRequisitionItem: jest.fn(async (data: any) => ({ id: Math.random(), ...data })),
    findRequisitionById: jest.fn(),
  };

  const itemSupplierRepository = {
    findPreferredByItem: jest.fn(async () => null),
  };

  return {
    mrpRepository, itemRepository, requisitionRepository, itemSupplierRepository,
  };
}

const demand = {
  item_id: 'PA-1',
  quantidade: 10,
  data_necessidade: '2026-08-20',
  origem: 'PEDIDO_VENDA',
  origem_id: 'SO-1',
};

describe('GenerateMrpPlanUseCase — fechamento automatico do ciclo MRP', () => {
  it('caso feliz: item com conversao_automatica=true gera requisicao automaticamente, sem intervencao do planejador', async () => {
    const deps = buildDeps({ autoConvertItemIds: new Set(['MP-1']) });
    const useCase = new GenerateMrpPlanUseCase(
      deps.mrpRepository as any,
      deps.itemRepository as any,
      deps.requisitionRepository as any,
      deps.itemSupplierRepository as any,
    );

    const result = await useCase.execute({ demands: [demand], requester_id: 42 });

    expect(deps.itemRepository.listAutoConvertItemIds).toHaveBeenCalledWith(['MP-1']);
    expect(deps.requisitionRepository.createRequisition).toHaveBeenCalledTimes(1);

    const [requisitionPayload] = deps.requisitionRepository.createRequisition.mock.calls[0];
    expect(requisitionPayload).toMatchObject({
      requester_id: 42,
      origin: 'mrp_auto',
      status: 'pending',
      priority: 'normal',
    });
    expect(requisitionPayload.notes).toMatch(/automatica/i);

    expect(deps.requisitionRepository.createRequisitionItem).toHaveBeenCalledTimes(1);
    const [itemPayload] = deps.requisitionRepository.createRequisitionItem.mock.calls[0];
    expect(itemPayload).toMatchObject({
      requisition_id: 501,
      item_id: 'MP-1',
    });

    expect(deps.mrpRepository.updatePlannedOrdersStatus).toHaveBeenCalledWith(
      ['order-1'],
      'EM_EXECUCAO',
      { id: 'tx-1' },
    );

    expect(result).toHaveLength(1);
  });

  it('caso padrao: item sem a flag preserva o comportamento manual (nenhuma requisicao criada, ordem fica RASCUNHO)', async () => {
    const deps = buildDeps({ autoConvertItemIds: new Set() });
    const useCase = new GenerateMrpPlanUseCase(
      deps.mrpRepository as any,
      deps.itemRepository as any,
      deps.requisitionRepository as any,
      deps.itemSupplierRepository as any,
    );

    const result = await useCase.execute({ demands: [demand], requester_id: 42 });

    expect(deps.requisitionRepository.createRequisition).not.toHaveBeenCalled();
    expect(deps.mrpRepository.updatePlannedOrdersStatus).not.toHaveBeenCalled();
    expect(result[0]).toMatchObject({ status: 'RASCUNHO' });
  });

  it('nao roda auto-conversao (no-op) quando os repositorios opcionais nao sao injetados — comportamento legado preservado', async () => {
    const deps = buildDeps({ autoConvertItemIds: new Set(['MP-1']) });
    const useCase = new GenerateMrpPlanUseCase(deps.mrpRepository as any, deps.itemRepository as any);

    await useCase.execute({ demands: [demand], requester_id: 42 });

    expect(deps.itemRepository.listAutoConvertItemIds).not.toHaveBeenCalled();
    expect(deps.requisitionRepository.createRequisition).not.toHaveBeenCalled();
    expect(deps.mrpRepository.updatePlannedOrdersStatus).not.toHaveBeenCalled();
  });

  it('nao converte de novo uma ordem que ja virou requisicao (idempotencia da reexecucao do plano)', async () => {
    const deps = buildDeps({ autoConvertItemIds: new Set(['MP-1']) });
    // Reexecucao do MRP: a linha ja existe no banco e ja foi convertida.
    // Antes da correcao de 2026-08-11 o upsert a rebaixava para RASCUNHO e
    // ela era convertida outra vez — uma requisicao de compra nova por
    // rodada do plano, para o mesmo material.
    deps.mrpRepository.upsertPlannedOrders = jest.fn(async (orders: any[]) => orders.map((order, index) => ({
      id: `order-${index + 1}`,
      ...order,
      status: 'EM_EXECUCAO',
    })));

    const useCase = new GenerateMrpPlanUseCase(
      deps.mrpRepository as any,
      deps.itemRepository as any,
      deps.requisitionRepository as any,
      deps.itemSupplierRepository as any,
    );

    const result = await useCase.execute({ demands: [demand], requester_id: 42 });

    expect(deps.requisitionRepository.createRequisition).not.toHaveBeenCalled();
    expect(deps.requisitionRepository.createRequisitionItem).not.toHaveBeenCalled();
    expect(deps.mrpRepository.updatePlannedOrdersStatus).not.toHaveBeenCalled();
    expect(result[0]).toMatchObject({ status: 'EM_EXECUCAO' });
  });

  it('nao converte automaticamente sem requester_id (evita violar NOT NULL de purchase_requisitions.requester_id)', async () => {
    const deps = buildDeps({ autoConvertItemIds: new Set(['MP-1']) });
    const useCase = new GenerateMrpPlanUseCase(
      deps.mrpRepository as any,
      deps.itemRepository as any,
      deps.requisitionRepository as any,
      deps.itemSupplierRepository as any,
    );

    await useCase.execute({ demands: [demand] });

    expect(deps.requisitionRepository.createRequisition).not.toHaveBeenCalled();
  });
});
