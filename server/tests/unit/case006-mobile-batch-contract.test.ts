describe('CASE-006 - contrato batch mobile com deposito raiz', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('aceita warehouse_code no payload raiz do batch e repassa para o ajuste controlado', async () => {
    const adjustWithWarehouse = jest.fn(async () => ({ movementId: 123, quantityAfter: 15 }));
    jest.doMock('../../src/services/manualStockAdjustmentService', () => ({ adjustWithWarehouse }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const BatchScanUseCase = require('../../src/modules/mobileInventory/application/use-cases/BatchScanUseCase');
    const repository = {
      findProductByCode: jest.fn(async () => ({ id: 77, name: 'Driver', code: 'DRV-BATCH', quantity: 10 })),
    };

    const useCase = new BatchScanUseCase(repository);
    const result = await useCase.execute({
      warehouse_code: 'INSUMOS',
      userId: 42,
      transaction: {},
      items: [{ product_code: 'DRV-BATCH', quantity: 5, type: 'in' }],
    });

    expect(result.items_processed).toBe(1);
    expect(adjustWithWarehouse).toHaveBeenCalledWith(expect.objectContaining({
      productId: 77,
      type: 'in',
      quantity: 5,
      warehouseCode: 'INSUMOS',
    }));
  });
});
