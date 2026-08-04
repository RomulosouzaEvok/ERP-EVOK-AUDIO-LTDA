/**
 * Test: Multiplos Depositos — Saldo por Deposito (Bloco 4, UC-42)
 *
 * Cobre `warehouseStockService` (dual-write, invariante de soma),
 * `CreateWarehouseTransferUseCase`/`ApproveWarehouseTransferUseCase`/
 * `RejectWarehouseTransferUseCase` (transferencia entre depositos com
 * aprovacao de gestor) e a integracao dual-write em
 * `ReceivePurchaseItemsUseCase`/`ChangeProductionOrderStatusUseCase`.
 *
 * @group unit
 * @ticket Bloco-4-UC-42
 */

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (callback?: any) => {
      const transaction = { id: 'tx-wh-1', LOCK: { UPDATE: 'UPDATE' }, commit: jest.fn(), rollback: jest.fn(), finished: undefined };
      if (callback) {
        return callback(transaction);
      }
      return transaction;
    }),
  },
}));

describe('warehouseStockService (dual-write, invariante de soma)', () => {
  let Product: any;
  let Warehouse: any;
  let ProductWarehouseStock: any;
  let warehouseStockService: any;

  const transaction: any = { LOCK: { UPDATE: 'UPDATE' } };

  beforeEach(() => {
    jest.resetModules();

    // Simula uma tabela in-memory de ProductWarehouseStock para validar a
    // invariante de soma entre operacoes reais de add/remove.
    const stockRows: Record<string, { id: number; product_id: number; warehouse_id: number; quantity: number }> = {};
    let nextId = 1;

    const key = (productId: number, warehouseId: number) => `${productId}:${warehouseId}`;

    function buildStockInstance(row: { id: number; product_id: number; warehouse_id: number; quantity: number }) {
      return {
        id: row.id,
        product_id: row.product_id,
        warehouse_id: row.warehouse_id,
        get quantity() { return row.quantity; },
        increment: jest.fn(async (_field: string, opts: { by: number }) => {
          row.quantity = Number(row.quantity) + Number(opts.by);
          return buildStockInstance(row);
        }),
        decrement: jest.fn(async (_field: string, opts: { by: number }) => {
          row.quantity = Number(row.quantity) - Number(opts.by);
          return buildStockInstance(row);
        }),
        reload: jest.fn(async () => buildStockInstance(row)),
      };
    }

    ProductWarehouseStock = {
      findOne: jest.fn(async ({ where }: any) => {
        const row = stockRows[key(where.product_id, where.warehouse_id)];
        return row ? buildStockInstance(row) : null;
      }),
      create: jest.fn(async ({ product_id, warehouse_id, quantity }: any) => {
        const row = { id: nextId++, product_id, warehouse_id, quantity: Number(quantity || 0) };
        stockRows[key(product_id, warehouse_id)] = row;
        return buildStockInstance(row);
      }),
      __rows: stockRows,
    };

    Product = {
      findByPk: jest.fn(async (id: number) => ({ id, name: `Produto ${id}` })),
    };

    const warehousesById: Record<number, { id: number; code: string; name: string; active: boolean }> = {
      1: { id: 1, code: 'INSUMOS', name: 'Deposito INSUMOS', active: true },
      2: { id: 2, code: 'ACABADOS', name: 'Deposito ACABADOS', active: true },
      3: { id: 3, code: 'LABORATORIO', name: 'Deposito LABORATORIO', active: true },
    };

    Warehouse = {
      findOne: jest.fn(async ({ where }: any) => {
        const found = Object.values(warehousesById).find((w) => w.code === where.code);
        return found || null;
      }),
      findByPk: jest.fn(async (id: number) => warehousesById[id] || null),
    };

    jest.doMock('../../src/models/index', () => ({ Product, Warehouse, ProductWarehouseStock }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    warehouseStockService = require('../../src/services/warehouseStockService');
  });

  it('addToWarehouse cria a linha de saldo com saldo zero e credita a quantidade (soma invariante)', async () => {
    const result = await warehouseStockService.addToWarehouse(10, 1, 5, transaction);

    expect(result.quantityBefore).toBe(0);
    expect(result.quantityAfter).toBe(5);
    expect(ProductWarehouseStock.create).toHaveBeenCalledWith(
      { product_id: 10, warehouse_id: 1, quantity: 0 },
      { transaction }
    );
  });

  it('soma dos saldos por deposito de um produto reflete corretamente apos varias operacoes (invariante §12 item 3)', async () => {
    await warehouseStockService.addToWarehouse(10, 1, 20, transaction); // INSUMOS: 20
    await warehouseStockService.removeFromWarehouse(10, 1, 8, transaction); // INSUMOS: 12
    await warehouseStockService.addToWarehouse(10, 2, 5, transaction); // ACABADOS: 5

    const insumos = await ProductWarehouseStock.findOne({ where: { product_id: 10, warehouse_id: 1 } });
    const acabados = await ProductWarehouseStock.findOne({ where: { product_id: 10, warehouse_id: 2 } });

    const total = Number(insumos.quantity) + Number(acabados.quantity);
    expect(total).toBe(17); // 12 + 5, soma_total(produto) = soma dos depositos
  });

  it('removeFromWarehouse lanca 422 didatico (produto, deposito, saldo atual) quando saldo do deposito e insuficiente', async () => {
    await warehouseStockService.addToWarehouse(10, 1, 3, transaction); // saldo atual: 3

    await expect(
      warehouseStockService.removeFromWarehouse(10, 1, 10, transaction)
    ).rejects.toMatchObject({
      statusCode: 422,
      code: 'BUSINESS_RULE_VIOLATION',
      details: expect.objectContaining({
        product_id: 10,
        warehouse_id: 1,
        warehouse_code: 'INSUMOS',
        available_quantity: 3,
        requested_quantity: 10,
      }),
    });

    // Mensagem cita produto, deposito e saldo atual (padrao didatico §13).
    await expect(
      warehouseStockService.removeFromWarehouse(10, 1, 10, transaction)
    ).rejects.toThrow(/Produto 10.*Deposito INSUMOS.*Saldo atual: 3/s);
  });

  it('removeFromWarehouse nunca deixa o saldo do deposito negativo', async () => {
    await warehouseStockService.addToWarehouse(10, 1, 5, transaction);

    await expect(
      warehouseStockService.removeFromWarehouse(10, 1, 5.000001, transaction)
    ).rejects.toMatchObject({ statusCode: 422 });

    const insumos = await ProductWarehouseStock.findOne({ where: { product_id: 10, warehouse_id: 1 } });
    expect(Number(insumos.quantity)).toBe(5); // saldo nao foi alterado pela tentativa que falhou
  });

  it('getWarehouseByCode resolve o deposito pelo codigo (case-insensitive)', async () => {
    const warehouse = await warehouseStockService.getWarehouseByCode('insumos', transaction);
    expect(warehouse.id).toBe(1);
    expect(warehouse.code).toBe('INSUMOS');
  });

  it('getWarehouseByCode lanca 404 para codigo inexistente/inativo', async () => {
    await expect(
      warehouseStockService.getWarehouseByCode('GALPAO_2', transaction)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('CreateWarehouseTransferUseCase / ApproveWarehouseTransferUseCase / RejectWarehouseTransferUseCase', () => {
  let WarehouseTransfer: any;
  let InventoryMovement: any;
  let Product: any;
  let WarehouseStockService: any;
  let CreateWarehouseTransferUseCase: any;
  let ApproveWarehouseTransferUseCase: any;
  let RejectWarehouseTransferUseCase: any;
  let ValidationError: any;
  let NotFoundError: any;
  let BusinessRuleError: any;

  const transaction: any = { LOCK: { UPDATE: 'UPDATE' } };

  beforeEach(() => {
    jest.resetModules();

    const transferRow: any = {
      id: 55,
      product_id: 10,
      from_warehouse_id: 1,
      to_warehouse_id: 2,
      quantity: 7,
      reason: 'Cessao ao laboratorio',
      user_id: 3,
      approved_by: null,
      status: 'pending',
      update: jest.fn(async function (this: any, values: any) { Object.assign(this, values); return this; }),
    };

    WarehouseTransfer = {
      create: jest.fn(async (data: any) => ({ ...data, id: 55 })),
      findByPk: jest.fn(async () => transferRow),
      __row: transferRow,
    };

    InventoryMovement = {
      create: jest.fn(async (data: any) => ({ id: Math.random(), ...data })),
    };

    Product = {
      findByPk: jest.fn(async (id: number) => ({ id, name: `Produto ${id}` })),
    };

    WarehouseStockService = {
      getWarehouseByCode: jest.fn(async (code: string) => {
        const codes: Record<string, number> = { INSUMOS: 1, ACABADOS: 2, LABORATORIO: 3 };
        const normalized = String(code).trim().toUpperCase();
        if (!(normalized in codes)) {
          const err: any = new Error(`Depósito "${code}" não encontrado ou inativo.`);
          err.statusCode = 404;
          throw err;
        }
        return { id: codes[normalized], code: normalized };
      }),
      addToWarehouse: jest.fn(async () => ({})),
      removeFromWarehouse: jest.fn(async () => ({})),
    };

    jest.doMock('../../src/models/index', () => ({ WarehouseTransfer, InventoryMovement, Product }));
    jest.doMock('../../src/services/warehouseStockService', () => WarehouseStockService);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    CreateWarehouseTransferUseCase = require('../../src/modules/inventory/application/use-cases/CreateWarehouseTransferUseCase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ApproveWarehouseTransferUseCase = require('../../src/modules/inventory/application/use-cases/ApproveWarehouseTransferUseCase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    RejectWarehouseTransferUseCase = require('../../src/modules/inventory/application/use-cases/RejectWarehouseTransferUseCase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ ValidationError, NotFoundError, BusinessRuleError } = require('../../src/errors'));
  });

  it('cria transferencia pending sem alterar nenhum saldo', async () => {
    const useCase = new CreateWarehouseTransferUseCase();
    const transfer = await useCase.execute({
      product_id: 10,
      from_warehouse_code: 'INSUMOS',
      to_warehouse_code: 'LABORATORIO',
      quantity: 7,
      reason: 'Cessao para teste destrutivo',
      userId: 3,
    });

    expect(transfer.status).toBe('pending');
    expect(WarehouseTransfer.create).toHaveBeenCalledWith(expect.objectContaining({
      product_id: 10,
      from_warehouse_id: 1,
      to_warehouse_id: 3,
      quantity: 7,
      status: 'pending',
    }));
    expect(WarehouseStockService.addToWarehouse).not.toHaveBeenCalled();
    expect(WarehouseStockService.removeFromWarehouse).not.toHaveBeenCalled();
  });

  it('rejeita from_warehouse_code igual a to_warehouse_code (from=to invalido)', async () => {
    const useCase = new CreateWarehouseTransferUseCase();

    await expect(
      useCase.execute({
        product_id: 10,
        from_warehouse_code: 'INSUMOS',
        to_warehouse_code: 'insumos',
        quantity: 5,
        reason: 'Motivo qualquer',
        userId: 3,
      })
    ).rejects.toBeInstanceOf(ValidationError);

    expect(WarehouseTransfer.create).not.toHaveBeenCalled();
  });

  it('rejeita quantity <= 0 e reason vazio', async () => {
    const useCase = new CreateWarehouseTransferUseCase();

    await expect(
      useCase.execute({ product_id: 10, from_warehouse_code: 'INSUMOS', to_warehouse_code: 'ACABADOS', quantity: 0, reason: 'x', userId: 3 })
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      useCase.execute({ product_id: 10, from_warehouse_code: 'INSUMOS', to_warehouse_code: 'ACABADOS', quantity: 5, reason: '   ', userId: 3 })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('aprova transferencia: debita origem, credita destino, gera 2 movimentos e nao altera products.quantity', async () => {
    const useCase = new ApproveWarehouseTransferUseCase();
    const transfer = await useCase.execute({ id: 55, approverId: 9, transaction });

    expect(WarehouseStockService.removeFromWarehouse).toHaveBeenCalledWith(10, 1, 7, transaction);
    expect(WarehouseStockService.addToWarehouse).toHaveBeenCalledWith(10, 2, 7, transaction);
    expect(InventoryMovement.create).toHaveBeenCalledTimes(2);
    expect(InventoryMovement.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      type: 'transfer', warehouse_id: 1, reference_type: 'transfer', reference_id: 55,
    }), { transaction });
    expect(InventoryMovement.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      type: 'transfer', warehouse_id: 2, reference_type: 'transfer', reference_id: 55,
    }), { transaction });
    expect(transfer.status).toBe('approved');
    expect(transfer.approved_by).toBe(9);

    // InventoryService.receive/consume (que alteram products.quantity) NAO
    // sao chamados por uma transferencia — apenas o saldo por deposito muda.
    expect(Product.findByPk).not.toHaveBeenCalled();
  });

  it('aprovacao propaga 422 didatico quando saldo de origem e insuficiente NO MOMENTO da aprovacao', async () => {
    WarehouseStockService.removeFromWarehouse.mockRejectedValueOnce(
      new BusinessRuleError('Saldo insuficiente do produto "Produto 10" (#10) no depósito "Deposito INSUMOS" (INSUMOS). Saldo atual: 2, solicitado: 7.', {
        product_id: 10, warehouse_id: 1, available_quantity: 2, requested_quantity: 7,
      })
    );

    const useCase = new ApproveWarehouseTransferUseCase();
    await expect(useCase.execute({ id: 55, approverId: 9, transaction })).rejects.toBeInstanceOf(BusinessRuleError);

    // Nao deve ter creditado o destino nem persistido approved caso a origem falhe.
    expect(WarehouseStockService.addToWarehouse).not.toHaveBeenCalled();
    expect(WarehouseTransfer.__row.update).not.toHaveBeenCalled();
  });

  it('rejeita aprovar transferencia que nao esta pending', async () => {
    WarehouseTransfer.__row.status = 'approved';
    const useCase = new ApproveWarehouseTransferUseCase();

    await expect(useCase.execute({ id: 55, approverId: 9, transaction })).rejects.toBeInstanceOf(BusinessRuleError);
    expect(WarehouseStockService.removeFromWarehouse).not.toHaveBeenCalled();
  });

  it('aprovacao de transferencia inexistente lanca NotFoundError', async () => {
    WarehouseTransfer.findByPk.mockResolvedValueOnce(null);
    const useCase = new ApproveWarehouseTransferUseCase();

    await expect(useCase.execute({ id: 999, approverId: 9, transaction })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita transferencia pending sem alterar nenhum saldo', async () => {
    const useCase = new RejectWarehouseTransferUseCase();
    const transfer = await useCase.execute({ id: 55, approverId: 9, reason: 'Sem disponibilidade real' });

    expect(transfer.status).toBe('rejected');
    expect(transfer.approved_by).toBe(9);
    expect(WarehouseStockService.addToWarehouse).not.toHaveBeenCalled();
    expect(WarehouseStockService.removeFromWarehouse).not.toHaveBeenCalled();
  });

  it('rejeita rejeicao sem motivo (reason obrigatorio)', async () => {
    const useCase = new RejectWarehouseTransferUseCase();

    await expect(
      useCase.execute({ id: 55, approverId: 9, reason: '' })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita rejeitar transferencia que nao esta pending', async () => {
    WarehouseTransfer.__row.status = 'rejected';
    const useCase = new RejectWarehouseTransferUseCase();

    await expect(
      useCase.execute({ id: 55, approverId: 9, reason: 'Motivo' })
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

describe('Integracao dual-write: ReceivePurchaseItemsUseCase e ChangeProductionOrderStatusUseCase', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('ReceivePurchaseItemsUseCase credita o deposito INSUMOS por padrao (sem warehouse_code)', async () => {
    jest.doMock('../../src/services/inventoryService', () => ({
      receive: jest.fn(async () => ({ product: { id: 10, quantity: 20 } })),
    }));
    const WarehouseStockService = {
      getWarehouseByCode: jest.fn(async (code: string) => ({ id: code === 'LABORATORIO' ? 3 : 1, code: code || 'INSUMOS' })),
      addToWarehouse: jest.fn(async () => ({})),
      removeFromWarehouse: jest.fn(async () => ({})),
    };
    jest.doMock('../../src/services/warehouseStockService', () => WarehouseStockService);
    jest.doMock('../../src/services/costingService', () => ({ registerWeightedAverageCost: jest.fn(async () => ({})) }));
    jest.doMock('../../src/models/index', () => ({
      LotControl: { findOne: jest.fn(async () => null), create: jest.fn(async () => ({ id: 1 })) },
      PurchaseReceipt: { create: jest.fn(async () => ({ id: 1 })) },
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ReceivePurchaseItemsUseCase = require('../../src/modules/purchases/application/use-cases/ReceivePurchaseItemsUseCase');
    const transaction: any = { LOCK: { UPDATE: 'UPDATE' } };
    const purchase = {
      id: 8, status: 'sent', order_number: 'PO-008', supplier_id: 2,
      items: [{ id: 81, product_id: 10, quantity: 5, received_quantity: 0, unit_price: 12.5 }],
      save: jest.fn(async () => ({})),
    };
    const purchaseRepository = {
      findPurchaseWithItemsForUpdate: jest.fn(async () => purchase),
      updatePurchaseItem: jest.fn(async () => ({})),
      findPurchaseItemsForUpdate: jest.fn(async () => ([{ id: 81, status: 'received' }])),
    };

    const useCase = new ReceivePurchaseItemsUseCase(purchaseRepository);
    await useCase.execute({ id: 8, items: [{ item_id: 81, quantity: 5 }], invoiceNumber: 'NF-1', userId: 4, transaction });

    expect(WarehouseStockService.getWarehouseByCode).toHaveBeenCalledWith('INSUMOS', transaction);
    expect(WarehouseStockService.addToWarehouse).toHaveBeenCalledWith(10, 1, 5, transaction);
  });

  it('ReceivePurchaseItemsUseCase credita o deposito LABORATORIO quando warehouse_code informado (amostra de engenharia)', async () => {
    jest.doMock('../../src/services/inventoryService', () => ({
      receive: jest.fn(async () => ({ product: { id: 10, quantity: 20 } })),
    }));
    const WarehouseStockService = {
      getWarehouseByCode: jest.fn(async (code: string) => ({ id: code === 'LABORATORIO' ? 3 : 1, code })),
      addToWarehouse: jest.fn(async () => ({})),
      removeFromWarehouse: jest.fn(async () => ({})),
    };
    jest.doMock('../../src/services/warehouseStockService', () => WarehouseStockService);
    jest.doMock('../../src/services/costingService', () => ({ registerWeightedAverageCost: jest.fn(async () => ({})) }));
    jest.doMock('../../src/models/index', () => ({
      LotControl: { findOne: jest.fn(async () => null), create: jest.fn(async () => ({ id: 1 })) },
      PurchaseReceipt: { create: jest.fn(async () => ({ id: 1 })) },
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ReceivePurchaseItemsUseCase = require('../../src/modules/purchases/application/use-cases/ReceivePurchaseItemsUseCase');
    const transaction: any = { LOCK: { UPDATE: 'UPDATE' } };
    const purchase = {
      id: 9, status: 'sent', order_number: 'PO-009', supplier_id: 2,
      items: [{ id: 91, product_id: 10, quantity: 2, received_quantity: 0, unit_price: 12.5 }],
      save: jest.fn(async () => ({})),
    };
    const purchaseRepository = {
      findPurchaseWithItemsForUpdate: jest.fn(async () => purchase),
      updatePurchaseItem: jest.fn(async () => ({})),
      findPurchaseItemsForUpdate: jest.fn(async () => ([{ id: 91, status: 'received' }])),
    };

    const useCase = new ReceivePurchaseItemsUseCase(purchaseRepository);
    await useCase.execute({
      id: 9, items: [{ item_id: 91, quantity: 2 }], invoiceNumber: 'NF-2', warehouseCode: 'LABORATORIO', userId: 4, transaction
    });

    expect(WarehouseStockService.getWarehouseByCode).toHaveBeenCalledWith('LABORATORIO', transaction);
    expect(WarehouseStockService.addToWarehouse).toHaveBeenCalledWith(10, 3, 2, transaction);
  });

  it('ChangeProductionOrderStatusUseCase debita componentes de INSUMOS e credita produto acabado em ACABADOS', async () => {
    // '../../src/config/database' ja mockado no topo do arquivo (mesmo
    // formato: transaction(callback) => callback(tx)) — reaproveitado aqui.
    jest.doMock('../../src/services/bomService', () => ({
      checkAvailability: jest.fn(),
      explodeBOM: jest.fn(async () => ({ components: [{ component_id: 101, quantity: 5 }], total_cost: 100 })),
    }));
    jest.doMock('../../src/services/inventoryService', () => ({
      reserve: jest.fn(async () => ({})),
      consume: jest.fn(async () => ({})),
      receive: jest.fn(async () => ({ product: { id: 1, name: 'Produto Acabado', quantity: 10 } })),
      releaseReservation: jest.fn(async () => ({})),
    }));
    const WarehouseStockService = {
      getWarehouseByCode: jest.fn(async (code: string) => ({ id: code === 'ACABADOS' ? 2 : 1, code })),
      addToWarehouse: jest.fn(async () => ({})),
      removeFromWarehouse: jest.fn(async () => ({})),
    };
    jest.doMock('../../src/services/warehouseStockService', () => WarehouseStockService);
    jest.doMock('../../src/services/costingService', () => ({
      registerWeightedAverageCost: jest.fn(async () => ({ ledger: { id: 1 }, previousCost: 0, newCost: 10, totalCost: 100 })),
    }));
    jest.doMock('../../src/models/index', () => ({
      LotControl: {
        create: jest.fn(async () => ({ id: 1, lot_number: 'LOT-001', status: 'available', quantity_available: 10 })),
        findOne: jest.fn(async () => ({ id: 1, lot_number: 'LOT-2026-001', status: 'available', expires_at: null, quantity_available: 10, update: jest.fn(async () => ({})) })),
        findAll: jest.fn(),
      },
      ProductionLotConsumption: { create: jest.fn(async () => ({ id: 1 })) },
      SerialNumber: { create: jest.fn(async () => ({ id: 1 })) },
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ChangeProductionOrderStatusUseCase = require('../../src/modules/production/application/use-cases/ChangeProductionOrderStatusUseCase');
    const productionOrderRepository = {
      listTrackingByOrderForUpdate: jest.fn(async () => []),
      findByIdForUpdate: jest.fn(async () => ({
        id: 1, status: 'in_progress', order_number: 'OP-2026-0001', product_id: 1, quantity: 10,
        due_date: new Date('2026-08-20'), get: function () { return this; },
      })),
      update: jest.fn(),
      findByIdWithProductSummary: jest.fn(async () => ({ id: 1, status: 'completed' })),
      findProductById: jest.fn(async () => ({ id: 101, reserved_quantity: 5 })),
    };

    const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);
    await useCase.execute({
      id: 1, status: 'completed', quantity_produced: 10, user_id: 1,
      lot_consumptions: [{ product_id: 101, lot_control_id: 1, quantity: 5 }],
      finished_lot_number: 'LOT-FINISHED-001',
    });

    expect(WarehouseStockService.removeFromWarehouse).toHaveBeenCalledWith(101, 1, 5, expect.anything());
    expect(WarehouseStockService.addToWarehouse).toHaveBeenCalledWith(1, 2, 10, expect.anything());
  });
});
