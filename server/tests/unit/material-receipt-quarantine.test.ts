/**
 * Gap G14 — caminho UNICO de entrada de material comprado.
 *
 * Antes de 2026-08-09 a importacao (COMEX) tinha um caminho proprio,
 * degradado: dava entrada em `products.quantity` e no custo medio, mas **sem
 * criar lote, sem quarentena e sem dual-write de deposito**. O recebimento de
 * compra nacional fazia as tres coisas. Resultado: insumo importado entrava
 * sem rastreabilidade por lote e sem gate de qualidade, podendo ser consumido
 * pela producao sem nunca ter sido liberado.
 *
 * Este arquivo cobre o servico extraido (`materialReceiptService`), que os
 * dois caminhos passaram a chamar, e o **guarda de regressao** do lado de
 * compras: a extracao nao pode ter afrouxado a quarentena que ja existia la.
 *
 * @group unit
 * @ticket G14
 */

const MaterialReceiptService = require('../../src/services/materialReceiptService');

// F3 (2026-08-12): o recebimento cria ativo patrimonial via servico proprio;
// aqui vira duble para o teste nao tocar PostgreSQL. Comportamento real em
// tests/integration/item-product-mirror.test.ts.
jest.mock('../../src/services/fixedAssetReceiptService', () => ({
  createAssetsForReceivedLines: jest.fn(async () => []),
}));

jest.mock('../../src/services/inventoryService', () => ({ receive: jest.fn() }));
jest.mock('../../src/services/warehouseStockService', () => ({
  getWarehouseByCode: jest.fn(),
  addToWarehouse: jest.fn(),
}));
jest.mock('../../src/services/costingService', () => ({ registerWeightedAverageCost: jest.fn() }));

const InventoryService = require('../../src/services/inventoryService');
const WarehouseStockService = require('../../src/services/warehouseStockService');
const CostingService = require('../../src/services/costingService');

const transaction: any = { id: 'tx-g14', LOCK: { UPDATE: 'UPDATE' } };

/** Entrada minima valida para o servico compartilhado. */
function baseInput(overrides: Record<string, any> = {}) {
  return {
    productId: 10,
    quantity: 6,
    unitCost: 25,
    userId: 4,
    warehouseId: 1,
    lotNumber: 'DOC-1-ITEM7-R001',
    lotLookup: { product_id: 10, lot_number: 'DOC-1-ITEM7-R001' },
    lotOwnership: { supplier_id: 2, purchase_id: null },
    lotDates: { receivedAt: '2026-08-01' },
    defaultLotNotes: 'Entrada de teste',
    movement: { description: 'Entrada de teste', referenceId: 99, referenceType: 'import' },
    costing: { sourceType: 'import', sourceId: 99, notes: 'Custo de teste' },
    lotGateway: {
      findLotForReceipt: jest.fn(async () => null),
      createLot: jest.fn(async (data: any) => ({ id: 500, ...data })),
    },
    transaction,
    ...overrides,
  };
}

describe('materialReceiptService.receiveMaterialIntoQuarantine', () => {
  beforeEach(() => {
    (InventoryService.receive as jest.Mock).mockResolvedValue({ product: { id: 10, quantity: 6 } });
    (WarehouseStockService.addToWarehouse as jest.Mock).mockResolvedValue({});
    (CostingService.registerWeightedAverageCost as jest.Mock).mockResolvedValue({});
  });

  it('executa os 4 passos (estoque, deposito, lote em quarentena, custo) na MESMA transacao', async () => {
    const input = baseInput();

    const { lot } = await MaterialReceiptService.receiveMaterialIntoQuarantine(input);

    expect(InventoryService.receive).toHaveBeenCalledWith(
      10, 6, 4, transaction,
      expect.objectContaining({ referenceType: 'import', referenceId: 99, warehouseId: 1 }),
    );
    expect(WarehouseStockService.addToWarehouse).toHaveBeenCalledWith(10, 1, 6, transaction);
    expect(CostingService.registerWeightedAverageCost).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 6, unitCost: 25, sourceType: 'import', sourceId: 99 }),
      transaction,
    );
    expect(lot.status).toBe('quarantine');
    expect(input.lotGateway.createLot).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'quarantine', warehouse_id: 1, quantity_initial: 6, quantity_available: 6 }),
      transaction,
    );
  });

  it('devolve um lote existente ao estado `quarantine` ao somar uma nova entrada', async () => {
    // Cenario real: lote ja liberado pela inspecao recebe uma segunda remessa.
    // A remessa nova nunca foi inspecionada, entao o lote inteiro volta a
    // ficar retido — nao existe "meio lote liberado".
    const existingLot = {
      id: 500,
      status: 'available',
      quantity_initial: '4.0000',
      quantity_available: '1.0000',
      manufactured_at: null,
      expires_at: null,
      notes: null,
      update: jest.fn(async () => undefined),
    };
    const input = baseInput({
      lotGateway: {
        findLotForReceipt: jest.fn(async () => existingLot),
        createLot: jest.fn(),
      },
    });

    await MaterialReceiptService.receiveMaterialIntoQuarantine(input);

    expect(input.lotGateway.createLot).not.toHaveBeenCalled();
    const [payload, options] = existingLot.update.mock.calls[0];
    expect(payload).toMatchObject({
      status: 'quarantine',
      quantity_initial: 10, // 4 + 6
      quantity_available: 7, // 1 + 6
      notes: 'Entrada de teste',
    });
    expect(options).toEqual({ transaction });
  });

  it('gera numero de lote deterministico no formato <documento>-ITEM<id>-R<seq>', () => {
    expect(MaterialReceiptService.buildGeneratedLotNumber('PO-2026-0007', 81, 1)).toBe('PO-2026-0007-ITEM81-R001');
    expect(MaterialReceiptService.buildGeneratedLotNumber('IMP-2026-0001', 10, 12)).toBe('IMP-2026-0001-ITEM10-R012');
  });
});

describe('G14 — guarda de regressao: o recebimento de compra continua criando lote em quarentena', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('ReceivePurchaseItemsUseCase cria o lote com status quarantine e vinculo ao pedido', async () => {
    jest.doMock('../../src/services/inventoryService', () => ({
      receive: jest.fn(async () => ({ product: { id: 10, quantity: 20 } })),
    }));
    jest.doMock('../../src/services/warehouseStockService', () => ({
      getWarehouseByCode: jest.fn(async (code: string) => ({ id: 1, code: code || 'INSUMOS' })),
      addToWarehouse: jest.fn(async () => ({})),
      removeFromWarehouse: jest.fn(async () => ({})),
    }));
    jest.doMock('../../src/services/costingService', () => ({ registerWeightedAverageCost: jest.fn(async () => ({})) }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ReceivePurchaseItemsUseCase = require('../../src/modules/purchases/application/use-cases/ReceivePurchaseItemsUseCase');

    const tx: any = { LOCK: { UPDATE: 'UPDATE' } };
    const purchase = {
      id: 8, status: 'sent', order_number: 'PO-008', supplier_id: 2, requisition_id: null,
      delivery_date: '2026-08-03',
      items: [{ id: 81, product_id: 10, quantity: 5, received_quantity: 0, unit_price: 12.5 }],
      save: jest.fn(async () => ({})),
    };
    const repository = {
      findPurchaseWithItemsForUpdate: jest.fn(async () => purchase),
      updatePurchaseItem: jest.fn(async () => ({})),
      findPurchaseItemsForUpdate: jest.fn(async () => ([{ id: 81, status: 'received' }])),
      createPurchaseReceipt: jest.fn(async () => ({ id: 1 })),
      // G13: a conta a pagar nasce no recebimento (CPC 00 (R2) 4.58).
      findLegacyPayableByPurchaseId: jest.fn(async () => null),
      findAccountPayableByPurchaseAndInvoice: jest.fn(async () => null),
      createAccountPayable: jest.fn(async (data: any) => ({ id: 1, ...data })),
      findLotForReceipt: jest.fn(async () => null),
      createLot: jest.fn(async (data: any) => ({ id: 1, ...data })),
    };

    const useCase = new ReceivePurchaseItemsUseCase(repository);
    await useCase.execute({ id: 8, items: [{ item_id: 81, quantity: 5 }], invoiceNumber: 'NF-1', userId: 4, transaction: tx });

    const [lotPayload] = repository.createLot.mock.calls[0];
    expect(lotPayload).toMatchObject({
      product_id: 10,
      supplier_id: 2,
      purchase_id: 8,
      status: 'quarantine',
      warehouse_id: 1,
      quantity_initial: 5,
      quantity_available: 5,
      received_at: '2026-08-03',
    });
    expect(lotPayload.lot_number).toBe('PO-008-ITEM81-R001');
  });
});
