/**
 * CASE-006 regression (AUD-INTEG-03 / T32-SUP-F03).
 *
 * Baseline defect: `ScanItemUseCase` accepted mobile stock writes without
 * warehouse and wrote `InventoryMovement.warehouse_id = null`; for `out`, it
 * also validated only `products.quantity`, allowing material in
 * quarantine/blocked lots to be consumed by a lot-blind path.
 *
 * Fixed invariant: mobile writes require a warehouse, dual-write the selected
 * warehouse balance, and reject lot-blind exits while withheld balance exists.
 */

describe('CASE-006 - scan mobile respeita deposito e bloqueio de qualidade', () => {
  const PRODUCT_ID = 501;
  const PRODUCT_CODE = 'WOOFER-8-RETIDO';
  const WAREHOUSE_ID = 10;
  const WAREHOUSE_CODE = 'INSUMOS';

  let ScanItemUseCase: any;
  let InventoryMovement: any;
  let LotControl: any;
  let stockRow: any;
  let productRow: { id: number; name: string; code: string; quantity: number; reserved_quantity: number };

  beforeEach(() => {
    jest.resetModules();

    productRow = { id: PRODUCT_ID, name: 'Woofer 8 retido', code: PRODUCT_CODE, quantity: 50, reserved_quantity: 0 };
    stockRow = {
      product_id: PRODUCT_ID,
      warehouse_id: WAREHOUSE_ID,
      quantity: 50,
      increment: jest.fn(async (_field: string, opts: { by: number }) => {
        stockRow.quantity = Number(stockRow.quantity) + Number(opts.by);
      }),
      decrement: jest.fn(async (_field: string, opts: { by: number }) => {
        stockRow.quantity = Number(stockRow.quantity) - Number(opts.by);
      }),
      reload: jest.fn(async () => stockRow),
    };

    const Product = {
      findByPk: jest.fn(async (id: number) => {
        if (id !== productRow.id) return null;
        return {
          id: productRow.id,
          name: productRow.name,
          code: productRow.code,
          get quantity() { return productRow.quantity; },
          reserved_quantity: productRow.reserved_quantity,
          increment: jest.fn(async (_field: string, opts: { by: number }) => {
            productRow.quantity = Number(productRow.quantity) + Number(opts.by);
          }),
          decrement: jest.fn(async (_field: string, opts: { by: number }) => {
            productRow.quantity = Number(productRow.quantity) - Number(opts.by);
          }),
        };
      }),
    };

    const Warehouse = {
      findOne: jest.fn(async ({ where }: any) =>
        where.code === WAREHOUSE_CODE && where.active ? { id: WAREHOUSE_ID, code: WAREHOUSE_CODE, name: 'Insumos' } : null
      ),
      findByPk: jest.fn(async (id: number) =>
        id === WAREHOUSE_ID ? { id: WAREHOUSE_ID, code: WAREHOUSE_CODE, name: 'Insumos' } : null
      ),
    };

    const ProductWarehouseStock = {
      findOne: jest.fn(async () => stockRow),
      create: jest.fn(async (data: any) => ({ ...stockRow, ...data })),
    };

    InventoryMovement = {
      create: jest.fn(async (data: any) => ({ id: 777, ...data })),
    };

    LotControl = {
      findAll: jest.fn(async () => [{ product_id: PRODUCT_ID, withheld_quantity: '50' }]),
    };

    jest.doMock('../../src/models/index', () => ({
      Product,
      Warehouse,
      ProductWarehouseStock,
      InventoryMovement,
      LotControl,
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ScanItemUseCase = require('../../src/modules/mobileInventory/application/use-cases/ScanItemUseCase');
  });

  function buildMobileRepository() {
    return {
      findProductByCode: jest.fn(async (code: string) =>
        code === PRODUCT_CODE
          ? { id: productRow.id, name: productRow.name, code: PRODUCT_CODE, quantity: productRow.quantity }
          : null
      ),
    };
  }

  it('rejeita scan sem warehouse_code antes de consultar produto ou gravar movimento', async () => {
    const repository = buildMobileRepository();
    const useCase = new ScanItemUseCase(repository);

    await expect(
      useCase.execute({ product_code: PRODUCT_CODE, quantity: 5, type: 'in', userId: 42, transaction: {} })
    ).rejects.toThrow(/deposito/i);

    expect(repository.findProductByCode).not.toHaveBeenCalled();
    expect(InventoryMovement.create).not.toHaveBeenCalled();
  });

  it('bloqueia saida mobile lot-blind quando existe saldo em quarentena/bloqueado', async () => {
    const repository = buildMobileRepository();
    const useCase = new ScanItemUseCase(repository);

    await expect(
      useCase.execute({
        product_code: PRODUCT_CODE,
        quantity: 20,
        type: 'out',
        warehouse_code: WAREHOUSE_CODE,
        userId: 42,
        transaction: {},
      })
    ).rejects.toThrow(/quarentena|bloqueado/i);

    expect(productRow.quantity).toBe(50);
    expect(stockRow.quantity).toBe(50);
    expect(InventoryMovement.create).not.toHaveBeenCalled();
  });

  it('registra entrada mobile com warehouse_id e credita o deposito selecionado', async () => {
    LotControl.findAll.mockResolvedValue([]);
    stockRow.quantity = 0;
    const repository = buildMobileRepository();
    const useCase = new ScanItemUseCase(repository);

    const result = await useCase.execute({
      product_code: PRODUCT_CODE,
      quantity: 12.5,
      type: 'in',
      warehouse_code: WAREHOUSE_CODE,
      userId: 42,
      transaction: {},
    });

    expect(result.new_quantity).toBe(62.5);
    expect(productRow.quantity).toBe(62.5);
    expect(stockRow.quantity).toBe(12.5);
    expect(InventoryMovement.create).toHaveBeenCalledTimes(1);
    expect(InventoryMovement.create.mock.calls[0][0].warehouse_id).toBe(WAREHOUSE_ID);
  });
});
