import CreatePurchaseRequisitionUseCase = require('../../src/modules/purchaseRequisitions/application/use-cases/CreatePurchaseRequisitionUseCase');

describe('CreatePurchaseRequisitionUseCase', () => {
  it('cria requisicao e itens validando a existencia do item', async () => {
    const requisitionRepository = {
      createRequisition: jest.fn(async (data: any) => ({ id: 7, requisition_number: data.requisition_number, status: data.status, origin: data.origin })),
      createRequisitionItem: jest.fn(async (data: any) => data),
      findRequisitionById: jest.fn(async (id: number) => ({ id, requisition_number: 'RQ-123', items: [{ item_id: 'item-1' }] })),
      findEngineeringProjectById: jest.fn(async () => null),
      findEmployeeByUserId: jest.fn(async () => null),
    };

    const itemRepository = {
      findById: jest.fn(async (id: string) => (id === 'item-1' ? { id } : null)),
    };

    const useCase = new CreatePurchaseRequisitionUseCase(requisitionRepository as any, itemRepository as any);
    const result = await useCase.execute({
      requester_id: 1,
      origin: 'manual',
      items: [{ item_id: 'item-1', quantity: 3, required_date: '2026-08-10' }],
    });

    expect(requisitionRepository.createRequisition).toHaveBeenCalledTimes(1);
    expect(requisitionRepository.createRequisitionItem).toHaveBeenCalledTimes(1);
    expect(itemRepository.findById).toHaveBeenCalledWith('item-1');
    expect(result).toMatchObject({ id: 7, requisition_number: 'RQ-123' });
  });
});

