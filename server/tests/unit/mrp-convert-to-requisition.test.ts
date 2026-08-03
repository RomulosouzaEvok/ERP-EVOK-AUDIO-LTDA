/**
 * Test: Conversao de ordens planejadas do MRP em Requisicao de Compra.
 *
 * Valida ConvertPlannedOrdersToRequisitionUseCase: fechamento do ciclo
 * MRP -> Requisicao de Compra, sugestao de fornecedor preferencial,
 * bloqueio de status invalido e atualizacao das ordens para EM_EXECUCAO.
 */

jest.mock('../../src/models/index', () => ({
  sequelize: {
    transaction: jest.fn(async (callback: any) => callback({ id: 'tx-1' })),
  },
}));

import ConvertPlannedOrdersToRequisitionUseCase = require('../../src/modules/mrp/application/use-cases/ConvertPlannedOrdersToRequisitionUseCase');
import { BusinessRuleError, NotFoundError } from '../../src/errors';

describe('ConvertPlannedOrdersToRequisitionUseCase', () => {
  it('converte ordens planejadas em uma requisicao de compra com fornecedor preferencial sugerido', async () => {
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

    const requisitionRepository = {
      createRequisition: jest.fn(async (data: any) => ({ id: 99, ...data })),
      createRequisitionItem: jest.fn(async (data: any) => ({ id: Math.random(), ...data })),
      findRequisitionById: jest.fn(async (id: number) => ({
        id,
        requisition_number: 'RQ-123',
        status: 'pending',
        origin: 'mrp',
        items: [],
      })),
    };

    const itemSupplierRepository = {
      findPreferredByItem: jest.fn(async (itemId: string) => {
        if (itemId === 'item-1') {
          return { supplier_id: 7, unit_price: 12.5 };
        }
        return null;
      }),
    };

    const useCase = new ConvertPlannedOrdersToRequisitionUseCase(
      mrpRepository as any,
      requisitionRepository as any,
      itemSupplierRepository as any,
    );

    const result = await useCase.execute({
      planned_order_ids: ['order-1', 'order-2'],
      requester_id: 5,
    });

    expect(mrpRepository.findPlannedOrdersByIdsForUpdate).toHaveBeenCalledWith(['order-1', 'order-2'], { id: 'tx-1' });
    expect(requisitionRepository.createRequisition).toHaveBeenCalledTimes(1);
    const [requisitionPayload] = requisitionRepository.createRequisition.mock.calls[0];
    expect(requisitionPayload).toMatchObject({
      requester_id: 5,
      origin: 'mrp',
      priority: 'normal',
      status: 'pending',
      notes: 'Gerada automaticamente do plano MRP',
    });

    expect(requisitionRepository.createRequisitionItem).toHaveBeenCalledTimes(2);
    const [firstItemPayload] = requisitionRepository.createRequisitionItem.mock.calls[0];
    expect(firstItemPayload).toMatchObject({
      requisition_id: 99,
      item_id: 'item-1',
      quantity: '10.000000',
      required_date: '2026-08-20',
      suggested_supplier_id: 7,
      unit_price_estimated: 12.5,
    });

    const [secondItemPayload] = requisitionRepository.createRequisitionItem.mock.calls[1];
    expect(secondItemPayload).toMatchObject({
      requisition_id: 99,
      item_id: 'item-2',
      suggested_supplier_id: null,
      unit_price_estimated: null,
    });

    expect(mrpRepository.updatePlannedOrdersStatus).toHaveBeenCalledWith(
      ['order-1', 'order-2'],
      'EM_EXECUCAO',
      { id: 'tx-1' },
    );

    expect(result).toMatchObject({
      converted_ids: ['order-1', 'order-2'],
      requisition: { id: 99, requisition_number: 'RQ-123' },
    });
  });

  it('usa notas customizadas quando informadas', async () => {
    const mrpRepository = {
      findPlannedOrdersByIdsForUpdate: jest.fn(async () => [
        { id: 'order-1', item_id: 'item-1', status: 'RASCUNHO', quantidade_planejada: '1', data_necessidade: '2026-08-20' },
      ]),
      updatePlannedOrdersStatus: jest.fn(async () => undefined),
    };
    const requisitionRepository = {
      createRequisition: jest.fn(async (data: any) => ({ id: 1, ...data })),
      createRequisitionItem: jest.fn(async () => ({})),
      findRequisitionById: jest.fn(async (id: number) => ({ id })),
    };
    const itemSupplierRepository = {
      findPreferredByItem: jest.fn(async () => null),
    };

    const useCase = new ConvertPlannedOrdersToRequisitionUseCase(
      mrpRepository as any,
      requisitionRepository as any,
      itemSupplierRepository as any,
    );

    await useCase.execute({ planned_order_ids: ['order-1'], notes: 'Urgente cliente XPTO', requester_id: 1 });

    const [requisitionPayload] = requisitionRepository.createRequisition.mock.calls[0];
    expect(requisitionPayload.notes).toBe('Urgente cliente XPTO');
  });

  it('rejeita ordens planejadas com status invalido com BusinessRuleError (422)', async () => {
    const mrpRepository = {
      findPlannedOrdersByIdsForUpdate: jest.fn(async () => [
        { id: 'order-1', item_id: 'item-1', status: 'CONCLUIDA', quantidade_planejada: '1', data_necessidade: '2026-08-20' },
        { id: 'order-2', item_id: 'item-2', status: 'RASCUNHO', quantidade_planejada: '1', data_necessidade: '2026-08-20' },
      ]),
      updatePlannedOrdersStatus: jest.fn(),
    };
    const requisitionRepository = {
      createRequisition: jest.fn(),
      createRequisitionItem: jest.fn(),
      findRequisitionById: jest.fn(),
    };
    const itemSupplierRepository = { findPreferredByItem: jest.fn() };

    const useCase = new ConvertPlannedOrdersToRequisitionUseCase(
      mrpRepository as any,
      requisitionRepository as any,
      itemSupplierRepository as any,
    );

    await expect(
      useCase.execute({ planned_order_ids: ['order-1', 'order-2'], requester_id: 1 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(requisitionRepository.createRequisition).not.toHaveBeenCalled();
    expect(mrpRepository.updatePlannedOrdersStatus).not.toHaveBeenCalled();
  });

  it('lanca NotFoundError (404) se alguma ordem planejada nao existir', async () => {
    const mrpRepository = {
      findPlannedOrdersByIdsForUpdate: jest.fn(async () => [
        { id: 'order-1', item_id: 'item-1', status: 'RASCUNHO', quantidade_planejada: '1', data_necessidade: '2026-08-20' },
      ]),
      updatePlannedOrdersStatus: jest.fn(),
    };
    const requisitionRepository = {
      createRequisition: jest.fn(),
      createRequisitionItem: jest.fn(),
      findRequisitionById: jest.fn(),
    };
    const itemSupplierRepository = { findPreferredByItem: jest.fn() };

    const useCase = new ConvertPlannedOrdersToRequisitionUseCase(
      mrpRepository as any,
      requisitionRepository as any,
      itemSupplierRepository as any,
    );

    await expect(
      useCase.execute({ planned_order_ids: ['order-1', 'order-missing'], requester_id: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(requisitionRepository.createRequisition).not.toHaveBeenCalled();
  });
});
