/**
 * Test: ChangeSaleStatusUseCase — status 'partially_invoiced' (gap 3/3 do
 * módulo `sales`)
 *
 * Cobre: bloqueio de definição manual via PUT /:id/status, transição
 * automática permitida partially_invoiced -> canceled (com restauração de
 * estoque), e bloqueio de partially_invoiced -> shipped (embarque exige
 * venda totalmente invoiced).
 *
 * @group unit
 */

jest.mock('../../src/services/inventoryService', () => ({
  consume: jest.fn(async () => ({})),
  receive: jest.fn(async () => ({})),
  reserve: jest.fn(async () => ({ quantityAffected: 0 })),
  releaseReservation: jest.fn(async () => ({ quantityAffected: 0 })),
  releaseAllReservationsForSale: jest.fn(async () => []),
}));

jest.mock('../../src/services/warehouseStockService', () => ({
  getWarehouseByCode: jest.fn(async (code: string) => ({ id: code === 'ACABADOS' ? 2 : 1, code })),
  addToWarehouse: jest.fn(async () => ({})),
  removeFromWarehouse: jest.fn(async () => ({})),
}));

import ChangeSaleStatusUseCase = require('../../src/modules/sales/application/use-cases/ChangeSaleStatusUseCase');

const InventoryService = require('../../src/services/inventoryService');

function buildRepository(sale: any) {
  return {
    findSaleWithItemsForUpdate: jest.fn(async () => sale),
    cancelPendingReceivables: jest.fn(async () => {}),
    createAccountReceivable: jest.fn(async () => ({})),
  };
}

function buildSale(status: string) {
  return {
    id: 700,
    status,
    nfe_status: 'authorized',
    total_amount: '100.00',
    installments: 1,
    payment_method: 'pix',
    items: [{ product_id: 10, quantity: 4, invoiced_quantity: 2 }],
    save: jest.fn(async function (this: any) { return this; }),
  };
}

describe("ChangeSaleStatusUseCase - status 'partially_invoiced'", () => {
  beforeEach(() => jest.clearAllMocks());

  it('bloqueia setar partially_invoiced manualmente via PUT /:id/status', async () => {
    const sale = buildSale('confirmed');
    const repo = buildRepository(sale);
    const useCase = new ChangeSaleStatusUseCase(repo);

    await expect(useCase.execute({ id: sale.id, status: 'partially_invoiced', userId: 1, transaction: {} as any })).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it('permite cancelar uma venda partially_invoiced, liberando reserva e devolvendo so o que foi faturado', async () => {
    const sale = buildSale('partially_invoiced');
    const repo = buildRepository(sale);
    const useCase = new ChangeSaleStatusUseCase(repo);

    const { sale: updated } = await useCase.execute({ id: sale.id, status: 'canceled', userId: 1, transaction: {} as any });

    expect(updated.status).toBe('canceled');
    expect(repo.cancelPendingReceivables).toHaveBeenCalledWith(sale.id, {});

    // G9: o item tem quantity 4 e invoiced_quantity 2. Só as 2 faturadas
    // saíram do estoque (baixa na NF-e) e voltam; as outras 2 estavam
    // apenas reservadas e são liberadas, sem entrar em products.quantity.
    expect(InventoryService.releaseAllReservationsForSale).toHaveBeenCalledWith(
      sale.id, 1, expect.anything(), expect.any(Object)
    );
    expect(InventoryService.receive).toHaveBeenCalledTimes(1);
    expect(InventoryService.receive).toHaveBeenCalledWith(10, 2, 1, expect.anything(), expect.any(Object));
  });

  it('bloqueia partially_invoiced -> shipped (embarque exige venda totalmente invoiced)', async () => {
    const sale = buildSale('partially_invoiced');
    const repo = buildRepository(sale);
    const useCase = new ChangeSaleStatusUseCase(repo);

    await expect(useCase.execute({ id: sale.id, status: 'shipped', userId: 1, transaction: {} as any })).rejects.toMatchObject({
      statusCode: 422,
    });
  });
});
