/**
 * Test: EditSaleItemsUseCase — alteração de pedido (gap 2/3 do módulo `sales`)
 *
 * Cobre: edição livre em `quote`, ajuste de RESERVA (delta) em `confirmed`,
 * bloqueio a partir de `partially_invoiced`/`invoiced`/`shipped`/`canceled`,
 * e recálculo do total respeitando o desconto já aplicado.
 *
 * ATUALIZADO PELO G9 (2026-08-10): em `confirmed` a edição ajustava
 * `products.quantity` (`consume`/`receive`), porque a confirmação já tinha
 * baixado o estoque. Como a confirmação passou a apenas reservar, a edição
 * ajusta a reserva (`reserve`/`releaseReservation`) e não toca mais no
 * saldo nem no depósito.
 *
 * @group unit
 * @ticket G9-Onda3
 */

jest.mock('../../src/services/inventoryService', () => ({
  consume: jest.fn(async () => ({})),
  receive: jest.fn(async () => ({})),
  reserve: jest.fn(async () => ({ quantityAffected: 0 })),
  releaseReservation: jest.fn(async () => ({ quantityAffected: 0 })),
}));

jest.mock('../../src/services/warehouseStockService', () => ({
  getWarehouseByCode: jest.fn(async (code: string) => ({ id: code === 'ACABADOS' ? 2 : 1, code })),
  addToWarehouse: jest.fn(async () => ({})),
  removeFromWarehouse: jest.fn(async () => ({})),
}));

import EditSaleItemsUseCase = require('../../src/modules/sales/application/use-cases/EditSaleItemsUseCase');

const InventoryService = require('../../src/services/inventoryService');

function buildSale(status: string, items: any[]) {
  return {
    id: 900,
    status,
    discount: 0,
    total_amount: items.reduce((sum, i) => sum + Number(i.total_price), 0),
    items,
    save: jest.fn(async function (this: any) { return this; }),
  };
}

function buildRepository(sale: any) {
  const updated: any[] = [];
  const created: any[] = [];
  const deleted: number[] = [];
  return {
    findSaleWithItemsForUpdate: jest.fn(async () => sale),
    findProductById: jest.fn(async (id: number) => ({ id, name: `Produto ${id}`, status: 'active' })),
    updateSaleItem: jest.fn(async (id: number, data: any) => { updated.push({ id, ...data }); return { id, ...data }; }),
    createSaleItem: jest.fn(async (data: any) => { created.push(data); return { id: 999, ...data }; }),
    deleteSaleItem: jest.fn(async (id: number) => { deleted.push(id); }),
    __updated: updated,
    __created: created,
    __deleted: deleted,
  };
}

describe('EditSaleItemsUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('edita itens livremente em quote, sem tocar no estoque', async () => {
    const sale = buildSale('quote', [
      { id: 1, product_id: 10, quantity: 2, unit_price: 50, total_price: 100, invoiced_quantity: 0 },
    ]);
    const repo = buildRepository(sale);
    const useCase = new EditSaleItemsUseCase(repo);

    const { sale: updatedSale } = await useCase.execute({
      id: sale.id,
      items: [{ sale_item_id: 1, product_id: 10, quantity: 3, unit_price: 50 }],
      userId: 7,
      transaction: {} as any,
    });

    expect(InventoryService.consume).not.toHaveBeenCalled();
    expect(InventoryService.receive).not.toHaveBeenCalled();
    expect(InventoryService.reserve).not.toHaveBeenCalled();
    expect(InventoryService.releaseReservation).not.toHaveBeenCalled();
    expect(updatedSale.total_amount).toBe(150);
    expect(repo.__updated[0]).toMatchObject({ id: 1, quantity: 3 });
  });

  it('em confirmed, aumenta a RESERVA no delta positivo (G9: nao baixa estoque)', async () => {
    const sale = buildSale('confirmed', [
      { id: 1, product_id: 10, quantity: 2, unit_price: 50, total_price: 100, invoiced_quantity: 0 },
    ]);
    const repo = buildRepository(sale);
    const useCase = new EditSaleItemsUseCase(repo);

    await useCase.execute({
      id: sale.id,
      items: [{ sale_item_id: 1, product_id: 10, quantity: 5, unit_price: 50 }],
      userId: 7,
      transaction: {} as any,
    });

    expect(InventoryService.reserve).toHaveBeenCalledWith(
      10, 3, 7, expect.anything(), expect.objectContaining({ saleId: 900 })
    );
    expect(InventoryService.consume).not.toHaveBeenCalled();
    expect(InventoryService.receive).not.toHaveBeenCalled();
    expect(InventoryService.releaseReservation).not.toHaveBeenCalled();
  });

  it('em confirmed, libera RESERVA no delta negativo (G9: nao devolve estoque)', async () => {
    const sale = buildSale('confirmed', [
      { id: 1, product_id: 10, quantity: 5, unit_price: 50, total_price: 250, invoiced_quantity: 0 },
    ]);
    const repo = buildRepository(sale);
    const useCase = new EditSaleItemsUseCase(repo);

    await useCase.execute({
      id: sale.id,
      items: [{ sale_item_id: 1, product_id: 10, quantity: 2, unit_price: 50 }],
      userId: 7,
      transaction: {} as any,
    });

    expect(InventoryService.releaseReservation).toHaveBeenCalledWith(
      10, 3, 7, expect.anything(), expect.objectContaining({ saleId: 900 })
    );
    expect(InventoryService.receive).not.toHaveBeenCalled();
  });

  it('remove item nao referenciado no payload, liberando a reserva inteira dele', async () => {
    const sale = buildSale('confirmed', [
      { id: 1, product_id: 10, quantity: 2, unit_price: 50, total_price: 100, invoiced_quantity: 0 },
      { id: 2, product_id: 20, quantity: 4, unit_price: 10, total_price: 40, invoiced_quantity: 0 },
    ]);
    const repo = buildRepository(sale);
    const useCase = new EditSaleItemsUseCase(repo);

    const { sale: updatedSale } = await useCase.execute({
      id: sale.id,
      items: [{ sale_item_id: 1, product_id: 10, quantity: 2, unit_price: 50 }],
      userId: 7,
      transaction: {} as any,
    });

    expect(repo.__deleted).toEqual([2]);
    expect(InventoryService.releaseReservation).toHaveBeenCalledWith(
      20, 4, 7, expect.anything(), expect.objectContaining({ saleId: 900 })
    );
    expect(updatedSale.total_amount).toBe(100);
  });

  it('adiciona item novo em confirmed, reservando estoque', async () => {
    const sale = buildSale('confirmed', [
      { id: 1, product_id: 10, quantity: 2, unit_price: 50, total_price: 100, invoiced_quantity: 0 },
    ]);
    const repo = buildRepository(sale);
    const useCase = new EditSaleItemsUseCase(repo);

    await useCase.execute({
      id: sale.id,
      items: [
        { sale_item_id: 1, product_id: 10, quantity: 2, unit_price: 50 },
        { product_id: 30, quantity: 1, unit_price: 20 },
      ],
      userId: 7,
      transaction: {} as any,
    });

    expect(InventoryService.reserve).toHaveBeenCalledWith(
      30, 1, 7, expect.anything(), expect.objectContaining({ saleId: 900 })
    );
    expect(repo.__created).toHaveLength(1);
  });

  it.each(['partially_invoiced', 'invoiced', 'shipped', 'canceled'])(
    'bloqueia edicao de itens quando status e %s',
    async (status) => {
      const sale = buildSale(status, [
        { id: 1, product_id: 10, quantity: 2, unit_price: 50, total_price: 100, invoiced_quantity: 0 },
      ]);
      const repo = buildRepository(sale);
      const useCase = new EditSaleItemsUseCase(repo);

      await expect(
        useCase.execute({
          id: sale.id,
          items: [{ sale_item_id: 1, product_id: 10, quantity: 3, unit_price: 50 }],
          userId: 7,
          transaction: {} as any,
        })
      ).rejects.toMatchObject({ statusCode: 422 });
    }
  );

  it('bloqueia remover/reduzir item que ja possui quantidade faturada', async () => {
    const sale = buildSale('confirmed', [
      { id: 1, product_id: 10, quantity: 5, unit_price: 50, total_price: 250, invoiced_quantity: 3 },
    ]);
    const repo = buildRepository(sale);
    const useCase = new EditSaleItemsUseCase(repo);

    await expect(
      useCase.execute({
        id: sale.id,
        items: [{ sale_item_id: 1, product_id: 10, quantity: 2, unit_price: 50 }],
        userId: 7,
        transaction: {} as any,
      })
    ).rejects.toThrow(/já possui/);
  });

  it('rejeita desconto maior que o novo total apos edicao', async () => {
    const sale = buildSale('quote', [
      { id: 1, product_id: 10, quantity: 5, unit_price: 50, total_price: 250, invoiced_quantity: 0 },
    ]);
    sale.discount = 240;
    const repo = buildRepository(sale);
    const useCase = new EditSaleItemsUseCase(repo);

    await expect(
      useCase.execute({
        id: sale.id,
        items: [{ sale_item_id: 1, product_id: 10, quantity: 1, unit_price: 50 }],
        userId: 7,
        transaction: {} as any,
      })
    ).rejects.toThrow(/Desconto/);
  });
});
