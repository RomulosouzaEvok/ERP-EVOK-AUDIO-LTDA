/**
 * Test: Conversao de ordens planejadas do MRP em Ordens de Producao (OP).
 *
 * Valida ConvertPlannedOrdersToProductionOrderUseCase: fechamento do ciclo
 * MRP -> OP para itens de fabricacao propria (SUBCONJUNTO/PRODUTO_ACABADO),
 * rejeicao de itens de compra (MATERIA_PRIMA), rejeicao de produto legado
 * ausente/inativo/nao produzivel, bloqueio de status invalido e atualizacao
 * das ordens planejadas para EM_EXECUCAO.
 */

jest.mock('../../src/models/index', () => ({
  sequelize: {
    transaction: jest.fn(async (callback: any) => callback({ id: 'tx-1' })),
  },
}));

import ConvertPlannedOrdersToProductionOrderUseCase = require('../../src/modules/mrp/application/use-cases/ConvertPlannedOrdersToProductionOrderUseCase');
import { BusinessRuleError, NotFoundError } from '../../src/errors';

describe('ConvertPlannedOrdersToProductionOrderUseCase', () => {
  it('converte ordens planejadas de itens de fabricacao propria em uma OP por ordem', async () => {
    const plannedOrders = [
      {
        id: 'order-1',
        item_id: 'item-1',
        status: 'RASCUNHO',
        quantidade_planejada: '10.000000',
        data_necessidade: '2026-08-20',
      },
      {
        id: 'order-2',
        item_id: 'item-2',
        status: 'APROVADA',
        quantidade_planejada: '5.000000',
        data_necessidade: '2026-08-22',
      },
    ];

    const mrpRepository = {
      findPlannedOrdersByIdsForUpdate: jest.fn(async () => plannedOrders),
      updatePlannedOrdersStatus: jest.fn(async () => undefined),
    };

    const itemRepository = {
      findById: jest.fn(async (id: string) => {
        if (id === 'item-1') return { id, codigo: 'ALTO-FALANTE-12', tipo: 'PRODUTO_ACABADO' };
        return { id, codigo: 'SUBCONJUNTO-BOBINA', tipo: 'SUBCONJUNTO' };
      }),
      findLegacyProductByItemId: jest.fn(async (itemId: string) => {
        if (itemId === 'item-1') {
          return { id: 501, code: 'ALTO-FALANTE-12', name: 'Alto-falante 12"', status: 'active', product_type: 'finished' };
        }
        return { id: 502, code: 'SUBCONJUNTO-BOBINA', name: 'Subconjunto Bobina', status: 'active', product_type: 'semi_finished' };
      }),
    };

    const productionOrderRepository = {
      countByOrderNumberPrefix: jest.fn(async () => 3),
      create: jest.fn(async (data: any) => ({ id: Math.random(), ...data })),
    };

    const useCase = new ConvertPlannedOrdersToProductionOrderUseCase(
      mrpRepository as any,
      itemRepository as any,
      productionOrderRepository as any,
    );

    const result = await useCase.execute({
      planned_order_ids: ['order-1', 'order-2'],
      requester_id: 5,
    });

    expect(mrpRepository.findPlannedOrdersByIdsForUpdate).toHaveBeenCalledWith(['order-1', 'order-2'], { id: 'tx-1' });
    expect(productionOrderRepository.create).toHaveBeenCalledTimes(2);

    const [firstOrderPayload] = productionOrderRepository.create.mock.calls[0];
    expect(firstOrderPayload).toMatchObject({
      order_number: 'OP-' + new Date().getFullYear() + '-0004',
      product_id: 501,
      item_id: 'item-1',
      quantity: '10.000000',
      status: 'planned',
      due_date: '2026-08-20',
      created_by: 5,
    });

    const [secondOrderPayload] = productionOrderRepository.create.mock.calls[1];
    expect(secondOrderPayload).toMatchObject({
      product_id: 502,
      item_id: 'item-2',
      quantity: '5.000000',
    });

    expect(mrpRepository.updatePlannedOrdersStatus).toHaveBeenCalledWith(
      ['order-1', 'order-2'],
      'EM_EXECUCAO',
      { id: 'tx-1' },
    );

    expect(result.converted_ids).toEqual(['order-1', 'order-2']);
    expect(result.production_orders).toHaveLength(2);
  });

  it('usa notas customizadas quando informadas', async () => {
    const mrpRepository = {
      findPlannedOrdersByIdsForUpdate: jest.fn(async () => [
        { id: 'order-1', item_id: 'item-1', status: 'RASCUNHO', quantidade_planejada: '1', data_necessidade: '2026-08-20' },
      ]),
      updatePlannedOrdersStatus: jest.fn(async () => undefined),
    };
    const itemRepository = {
      findById: jest.fn(async () => ({ id: 'item-1', codigo: 'X', tipo: 'PRODUTO_ACABADO' })),
      findLegacyProductByItemId: jest.fn(async () => ({ id: 1, code: 'X', name: 'Produto X', status: 'active', product_type: 'finished' })),
    };
    const productionOrderRepository = {
      countByOrderNumberPrefix: jest.fn(async () => 0),
      create: jest.fn(async (data: any) => ({ id: 1, ...data })),
    };

    const useCase = new ConvertPlannedOrdersToProductionOrderUseCase(
      mrpRepository as any,
      itemRepository as any,
      productionOrderRepository as any,
    );

    await useCase.execute({ planned_order_ids: ['order-1'], notes: 'Urgente cliente XPTO', requester_id: 1 });

    const [orderPayload] = productionOrderRepository.create.mock.calls[0];
    expect(orderPayload.notes).toBe('Urgente cliente XPTO');
  });

  it('rejeita ordens planejadas com status invalido com BusinessRuleError (422)', async () => {
    const mrpRepository = {
      findPlannedOrdersByIdsForUpdate: jest.fn(async () => [
        { id: 'order-1', item_id: 'item-1', status: 'CONCLUIDA', quantidade_planejada: '1', data_necessidade: '2026-08-20' },
        { id: 'order-2', item_id: 'item-2', status: 'RASCUNHO', quantidade_planejada: '1', data_necessidade: '2026-08-20' },
      ]),
      updatePlannedOrdersStatus: jest.fn(),
    };
    const itemRepository = { findById: jest.fn(), findLegacyProductByItemId: jest.fn() };
    const productionOrderRepository = { countByOrderNumberPrefix: jest.fn(), create: jest.fn() };

    const useCase = new ConvertPlannedOrdersToProductionOrderUseCase(
      mrpRepository as any,
      itemRepository as any,
      productionOrderRepository as any,
    );

    await expect(
      useCase.execute({ planned_order_ids: ['order-1', 'order-2'], requester_id: 1 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(productionOrderRepository.create).not.toHaveBeenCalled();
    expect(mrpRepository.updatePlannedOrdersStatus).not.toHaveBeenCalled();
  });

  it('lanca NotFoundError (404) se alguma ordem planejada nao existir', async () => {
    const mrpRepository = {
      findPlannedOrdersByIdsForUpdate: jest.fn(async () => [
        { id: 'order-1', item_id: 'item-1', status: 'RASCUNHO', quantidade_planejada: '1', data_necessidade: '2026-08-20' },
      ]),
      updatePlannedOrdersStatus: jest.fn(),
    };
    const itemRepository = { findById: jest.fn(), findLegacyProductByItemId: jest.fn() };
    const productionOrderRepository = { countByOrderNumberPrefix: jest.fn(), create: jest.fn() };

    const useCase = new ConvertPlannedOrdersToProductionOrderUseCase(
      mrpRepository as any,
      itemRepository as any,
      productionOrderRepository as any,
    );

    await expect(
      useCase.execute({ planned_order_ids: ['order-1', 'order-missing'], requester_id: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(productionOrderRepository.create).not.toHaveBeenCalled();
  });

  it('rejeita item MATERIA_PRIMA (compra) com BusinessRuleError, orientando o uso da conversao para requisicao', async () => {
    const mrpRepository = {
      findPlannedOrdersByIdsForUpdate: jest.fn(async () => [
        { id: 'order-1', item_id: 'item-mp', status: 'RASCUNHO', quantidade_planejada: '1', data_necessidade: '2026-08-20' },
      ]),
      updatePlannedOrdersStatus: jest.fn(),
    };
    const itemRepository = {
      findById: jest.fn(async () => ({ id: 'item-mp', codigo: 'PARAFUSO-M6', tipo: 'MATERIA_PRIMA' })),
      findLegacyProductByItemId: jest.fn(),
    };
    const productionOrderRepository = { countByOrderNumberPrefix: jest.fn(), create: jest.fn() };

    const useCase = new ConvertPlannedOrdersToProductionOrderUseCase(
      mrpRepository as any,
      itemRepository as any,
      productionOrderRepository as any,
    );

    await expect(
      useCase.execute({ planned_order_ids: ['order-1'], requester_id: 1 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(itemRepository.findLegacyProductByItemId).not.toHaveBeenCalled();
    expect(productionOrderRepository.create).not.toHaveBeenCalled();
  });

  it('rejeita item sem produto legado correspondente (crosswalk por codigo ausente)', async () => {
    const mrpRepository = {
      findPlannedOrdersByIdsForUpdate: jest.fn(async () => [
        { id: 'order-1', item_id: 'item-orfao', status: 'RASCUNHO', quantidade_planejada: '1', data_necessidade: '2026-08-20' },
      ]),
      updatePlannedOrdersStatus: jest.fn(),
    };
    const itemRepository = {
      findById: jest.fn(async () => ({ id: 'item-orfao', codigo: 'NOVO-SKU', tipo: 'PRODUTO_ACABADO' })),
      findLegacyProductByItemId: jest.fn(async () => null),
    };
    const productionOrderRepository = { countByOrderNumberPrefix: jest.fn(), create: jest.fn() };

    const useCase = new ConvertPlannedOrdersToProductionOrderUseCase(
      mrpRepository as any,
      itemRepository as any,
      productionOrderRepository as any,
    );

    await expect(
      useCase.execute({ planned_order_ids: ['order-1'], requester_id: 1 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(productionOrderRepository.create).not.toHaveBeenCalled();
  });

  it('rejeita produto legado inativo', async () => {
    const mrpRepository = {
      findPlannedOrdersByIdsForUpdate: jest.fn(async () => [
        { id: 'order-1', item_id: 'item-1', status: 'RASCUNHO', quantidade_planejada: '1', data_necessidade: '2026-08-20' },
      ]),
      updatePlannedOrdersStatus: jest.fn(),
    };
    const itemRepository = {
      findById: jest.fn(async () => ({ id: 'item-1', codigo: 'X', tipo: 'PRODUTO_ACABADO' })),
      findLegacyProductByItemId: jest.fn(async () => ({ id: 1, code: 'X', name: 'Produto X', status: 'inactive', product_type: 'finished' })),
    };
    const productionOrderRepository = { countByOrderNumberPrefix: jest.fn(), create: jest.fn() };

    const useCase = new ConvertPlannedOrdersToProductionOrderUseCase(
      mrpRepository as any,
      itemRepository as any,
      productionOrderRepository as any,
    );

    await expect(
      useCase.execute({ planned_order_ids: ['order-1'], requester_id: 1 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(productionOrderRepository.create).not.toHaveBeenCalled();
  });
});
