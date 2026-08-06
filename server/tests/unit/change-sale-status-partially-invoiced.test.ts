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
}));

jest.mock('../../src/services/warehouseStockService', () => ({
  getWarehouseByCode: jest.fn(async (code: string) => ({ id: code === 'ACABADOS' ? 2 : 1, code })),
  addToWarehouse: jest.fn(async () => ({})),
  removeFromWarehouse: jest.fn(async () => ({})),
}));

import ChangeSaleStatusUseCase = require('../../src/modules/sales/application/use-cases/ChangeSaleStatusUseCase');

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
  it('bloqueia setar partially_invoiced manualmente via PUT /:id/status', async () => {
    const sale = buildSale('confirmed');
    const repo = buildRepository(sale);
    const useCase = new ChangeSaleStatusUseCase(repo);

    await expect(useCase.execute({ id: sale.id, status: 'partially_invoiced', userId: 1, transaction: {} as any })).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it('permite cancelar uma venda partially_invoiced, restaurando estoque total', async () => {
    const sale = buildSale('partially_invoiced');
    const repo = buildRepository(sale);
    const useCase = new ChangeSaleStatusUseCase(repo);

    const { sale: updated } = await useCase.execute({ id: sale.id, status: 'canceled', userId: 1, transaction: {} as any });

    expect(updated.status).toBe('canceled');
    expect(repo.cancelPendingReceivables).toHaveBeenCalledWith(sale.id, {});
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
