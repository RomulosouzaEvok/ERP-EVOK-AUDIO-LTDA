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
  let SequelizeInventoryRepository: any;
  let repository: any;
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
    SequelizeInventoryRepository = require('../../src/modules/inventory/infrastructure/sequelize/SequelizeInventoryRepository');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    CreateWarehouseTransferUseCase = require('../../src/modules/inventory/application/use-cases/CreateWarehouseTransferUseCase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ApproveWarehouseTransferUseCase = require('../../src/modules/inventory/application/use-cases/ApproveWarehouseTransferUseCase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    RejectWarehouseTransferUseCase = require('../../src/modules/inventory/application/use-cases/RejectWarehouseTransferUseCase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ ValidationError, NotFoundError, BusinessRuleError } = require('../../src/errors'));

    repository = new SequelizeInventoryRepository();
  });

  it('cria transferencia pending sem alterar nenhum saldo', async () => {
    const useCase = new CreateWarehouseTransferUseCase(repository);
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
    const useCase = new CreateWarehouseTransferUseCase(repository);

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
    const useCase = new CreateWarehouseTransferUseCase(repository);

    await expect(
      useCase.execute({ product_id: 10, from_warehouse_code: 'INSUMOS', to_warehouse_code: 'ACABADOS', quantity: 0, reason: 'x', userId: 3 })
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      useCase.execute({ product_id: 10, from_warehouse_code: 'INSUMOS', to_warehouse_code: 'ACABADOS', quantity: 5, reason: '   ', userId: 3 })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('aprova transferencia: debita origem, credita destino, gera 2 movimentos e nao altera products.quantity', async () => {
    const useCase = new ApproveWarehouseTransferUseCase(repository);
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

    const useCase = new ApproveWarehouseTransferUseCase(repository);
    await expect(useCase.execute({ id: 55, approverId: 9, transaction })).rejects.toBeInstanceOf(BusinessRuleError);

    // Nao deve ter creditado o destino nem persistido approved caso a origem falhe.
    expect(WarehouseStockService.addToWarehouse).not.toHaveBeenCalled();
    expect(WarehouseTransfer.__row.update).not.toHaveBeenCalled();
  });

  it('rejeita aprovar transferencia que nao esta pending', async () => {
    WarehouseTransfer.__row.status = 'approved';
    const useCase = new ApproveWarehouseTransferUseCase(repository);

    await expect(useCase.execute({ id: 55, approverId: 9, transaction })).rejects.toBeInstanceOf(BusinessRuleError);
    expect(WarehouseStockService.removeFromWarehouse).not.toHaveBeenCalled();
  });

  it('aprovacao de transferencia inexistente lanca NotFoundError', async () => {
    WarehouseTransfer.findByPk.mockResolvedValueOnce(null);
    const useCase = new ApproveWarehouseTransferUseCase(repository);

    await expect(useCase.execute({ id: 999, approverId: 9, transaction })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita transferencia pending sem alterar nenhum saldo', async () => {
    const useCase = new RejectWarehouseTransferUseCase(repository);
    const transfer = await useCase.execute({ id: 55, approverId: 9, reason: 'Sem disponibilidade real' });

    expect(transfer.status).toBe('rejected');
    expect(transfer.approved_by).toBe(9);
    expect(WarehouseStockService.addToWarehouse).not.toHaveBeenCalled();
    expect(WarehouseStockService.removeFromWarehouse).not.toHaveBeenCalled();
  });

  it('rejeita rejeicao sem motivo (reason obrigatorio)', async () => {
    const useCase = new RejectWarehouseTransferUseCase(repository);

    await expect(
      useCase.execute({ id: 55, approverId: 9, reason: '' })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita rejeitar transferencia que nao esta pending', async () => {
    WarehouseTransfer.__row.status = 'rejected';
    const useCase = new RejectWarehouseTransferUseCase(repository);

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
      createPurchaseReceipt: jest.fn(async () => ({ id: 1 })),
      // G13: a conta a pagar nasce no recebimento (CPC 00 (R2) 4.58).
      findLegacyPayableByPurchaseId: jest.fn(async () => null),
      findAccountPayableByPurchaseAndInvoice: jest.fn(async () => null),
      createAccountPayable: jest.fn(async (data: any) => ({ id: 1, ...data })),
      findLotForReceipt: jest.fn(async () => null),
      createLot: jest.fn(async () => ({ id: 1 })),
    };

    const useCase = new ReceivePurchaseItemsUseCase(purchaseRepository);
    await useCase.execute({ id: 8, items: [{ item_id: 81, quantity: 5 }], invoiceNumber: 'NF-1', userId: 4, transaction });

    expect(WarehouseStockService.getWarehouseByCode).toHaveBeenCalledWith('INSUMOS', transaction);
    expect(WarehouseStockService.addToWarehouse).toHaveBeenCalledWith(10, 1, 5, transaction);
  });

  it('ReceivePurchaseItemsUseCase rejeita recebimento sem invoice_number (details estruturado)', async () => {
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ValidationError: ReceiveValidationError } = require('../../src/errors');
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
      createPurchaseReceipt: jest.fn(async () => ({ id: 1 })),
      // G13: a conta a pagar nasce no recebimento (CPC 00 (R2) 4.58).
      findLegacyPayableByPurchaseId: jest.fn(async () => null),
      findAccountPayableByPurchaseAndInvoice: jest.fn(async () => null),
      createAccountPayable: jest.fn(async (data: any) => ({ id: 1, ...data })),
      findLotForReceipt: jest.fn(async () => null),
      createLot: jest.fn(async () => ({ id: 1 })),
    };

    const useCase = new ReceivePurchaseItemsUseCase(purchaseRepository);

    await expect(
      useCase.execute({ id: 8, items: [{ item_id: 81, quantity: 5 }], invoiceNumber: '', userId: 4, transaction })
    ).rejects.toMatchObject({
      constructor: ReceiveValidationError,
      details: { purchase_id: 8, order_number: 'PO-008', field: 'invoice_number' },
    });
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
      createPurchaseReceipt: jest.fn(async () => ({ id: 1 })),
      // G13: a conta a pagar nasce no recebimento (CPC 00 (R2) 4.58).
      findLegacyPayableByPurchaseId: jest.fn(async () => null),
      findAccountPayableByPurchaseAndInvoice: jest.fn(async () => null),
      createAccountPayable: jest.fn(async (data: any) => ({ id: 1, ...data })),
      findLotForReceipt: jest.fn(async () => null),
      createLot: jest.fn(async () => ({ id: 1 })),
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
      // G3 (2026-08-09): a conclusao/cancelamento da OP libera a reserva
      // vinculada a ela por aqui. Sem esta funcao no mock o teste falha em
      // `completeOrder` antes de exercitar o dual-write que ele testa.
      releaseAllReservationsForOrder: jest.fn(async () => []),
      listOrderReservations: jest.fn(async () => []),
      recalculateReservedCache: jest.fn(async () => 0),
    }));
    const WarehouseStockService = {
      getWarehouseByCode: jest.fn(async (code: string) => ({ id: code === 'ACABADOS' ? 2 : 1, code })),
      addToWarehouse: jest.fn(async () => ({})),
      removeFromWarehouse: jest.fn(async () => ({})),
    };
    jest.doMock('../../src/services/warehouseStockService', () => WarehouseStockService);
    jest.doMock('../../src/services/costingService', () => ({
      registerWeightedAverageCost: jest.fn(async () => ({ ledger: { id: 1 }, previousCost: 0, newCost: 10, totalCost: 100 })),
      registerAdditionalProductionCost: jest.fn(async () => ({ ledger: { id: 2 }, previousCost: 10, newCost: 10, totalCost: 0 })),
    }));
    jest.doMock('../../src/models/index', () => ({
      LotControl: {
        create: jest.fn(async () => ({ id: 1, lot_number: 'LOT-001', status: 'available', quantity_available: 10 })),
        findOne: jest.fn(async () => ({ id: 1, lot_number: 'LOT-2026-001', status: 'available', expires_at: null, quantity_available: 10, update: jest.fn(async () => ({})) })),
        findAll: jest.fn(),
      },
      ProductionLotConsumption: { create: jest.fn(async () => ({ id: 1 })) },
      SerialNumber: { create: jest.fn(async () => ({ id: 1 })) },
      ProductionCostSettings: {
        findByPk: jest.fn(async () => ({
          overhead_calculation_basis: 'material_labor',
          overhead_rate_percent: 0,
          default_labor_rate_per_hour: 0,
          get: function () { return this; },
        })),
      },
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ChangeProductionOrderStatusUseCase = require('../../src/modules/production/application/use-cases/ChangeProductionOrderStatusUseCase');

    // G4 (2026-08-10): concluir OP sem apontamento agora e
    // `G4-TRACKING-REQUIRED`. Este teste mede o DUAL-WRITE DE DEPOSITO, entao
    // precisa de um apontamento suficiente para atravessar o gate — senao
    // falharia por uma regra que nao e a dele. Cada campo cobre uma regra:
    // `completed`, `quantity_good` (>= produzido), tempo apontado e taxa horaria.
    const tracking = [{
      id: 10,
      sequence: 1,
      status: 'completed',
      quantity_good: 10,
      started_at: new Date('2026-08-19T08:00:00Z'),
      finished_at: new Date('2026-08-19T10:00:00Z'),
      routeStep: { id: 100, work_center_id: 5, workCenter: { id: 5, cost_per_hour: 50 } },
    }];

    const productionOrderRepository = {
      listTrackingByOrderForUpdate: jest.fn(async () => tracking),
      listTrackingWithRouteStepByOrder: jest.fn(async () => tracking),
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

/**
 * ATUALIZADO PELO G9 (2026-08-10): o dual-write de deposito da venda saiu da
 * confirmacao do pedido e foi para a autorizacao da NF-e
 * (`services/saleStockService`). A confirmacao agora so RESERVA — e reserva
 * nao movimenta saldo de deposito.
 */
describe('Integracao dual-write: venda -> ACABADOS (confirmacao reserva, NF-e baixa — G9)', () => {
  let InventoryService: any;
  let WarehouseStockService: any;
  let SaleStockService: any;
  let ChangeSaleStatusUseCase: any;

  beforeEach(() => {
    jest.resetModules();

    InventoryService = {
      consume: jest.fn(async () => ({ product: { id: 10, quantity: 8 } })),
      receive: jest.fn(async () => ({ product: { id: 10, quantity: 10 } })),
      reserve: jest.fn(async () => ({ quantityAffected: 3 })),
      releaseReservation: jest.fn(async () => ({ quantityAffected: 3 })),
      releaseAllReservationsForSale: jest.fn(async () => []),
    };
    jest.doMock('../../src/services/inventoryService', () => InventoryService);

    WarehouseStockService = {
      getWarehouseByCode: jest.fn(async (code: string) => ({ id: code === 'ACABADOS' ? 2 : 1, code })),
      addToWarehouse: jest.fn(async () => ({})),
      removeFromWarehouse: jest.fn(async () => ({})),
    };
    jest.doMock('../../src/services/warehouseStockService', () => WarehouseStockService);

    // D-L/D-M (2026-08-10): faturar e cancelar passaram por
    // `services/saleLotService` (expedicao e devolucao por lote). Este bloco
    // mede DEPOSITO, nao lote: produto sem lote nenhum cai no caminho legado
    // (`governed: false`) e sem saida por lote registrada a devolucao e no-op.
    jest.doMock('../../src/models/index', () => ({
      LotControl: { findAll: jest.fn(async () => []), findByPk: jest.fn(async () => null) },
      SaleLotShipment: { findAll: jest.fn(async () => []), create: jest.fn(async (data: any) => ({ id: 1, ...data })) },
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    SaleStockService = require('../../src/services/saleStockService');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ChangeSaleStatusUseCase = require('../../src/modules/sales/application/use-cases/ChangeSaleStatusUseCase');
  });

  function buildSaleRepository(sale: any) {
    return {
      findSaleWithItemsForUpdate: jest.fn(async () => sale),
      cancelPendingReceivables: jest.fn(async () => {}),
      createAccountReceivable: jest.fn(async (data: any) => ({ id: 1, ...data })),
    };
  }

  it('confirmar orcamento (quote -> confirmed) NAO movimenta deposito: apenas reserva cada item', async () => {
    const transaction: any = { LOCK: { UPDATE: 'UPDATE' } };
    const sale = {
      id: 1,
      status: 'quote',
      total_amount: '100.00',
      installments: 1,
      customer_id: 5,
      payment_method: 'pix',
      items: [
        { product_id: 10, quantity: 3, invoiced_quantity: 0 },
        { product_id: 11, quantity: 2, invoiced_quantity: 0 },
      ],
      save: jest.fn(async () => ({})),
    };
    const saleRepository = buildSaleRepository(sale);
    const useCase = new ChangeSaleStatusUseCase(saleRepository);

    await useCase.execute({ id: 1, status: 'confirmed', userId: 7, transaction });

    expect(InventoryService.reserve).toHaveBeenCalledTimes(2);
    expect(InventoryService.reserve).toHaveBeenNthCalledWith(1, 10, 3, 7, transaction, expect.objectContaining({ saleId: 1 }));
    expect(InventoryService.reserve).toHaveBeenNthCalledWith(2, 11, 2, 7, transaction, expect.objectContaining({ saleId: 1 }));
    expect(InventoryService.consume).not.toHaveBeenCalled();
    expect(WarehouseStockService.removeFromWarehouse).not.toHaveBeenCalled();
    expect(WarehouseStockService.addToWarehouse).not.toHaveBeenCalled();
  });

  it('faturar (autorizacao da NF-e) debita o deposito ACABADOS de cada item, na mesma transacao', async () => {
    const transaction: any = { LOCK: { UPDATE: 'UPDATE' } };

    await SaleStockService.commitInvoicedStock(
      1,
      [{ productId: 10, quantity: 3 }, { productId: 11, quantity: 2 }],
      7,
      transaction
    );

    expect(WarehouseStockService.getWarehouseByCode).toHaveBeenCalledWith('ACABADOS', transaction);
    expect(InventoryService.consume).toHaveBeenCalledTimes(2);
    expect(WarehouseStockService.removeFromWarehouse).toHaveBeenCalledTimes(2);
    expect(WarehouseStockService.removeFromWarehouse).toHaveBeenNthCalledWith(1, 10, 2, 3, transaction);
    expect(WarehouseStockService.removeFromWarehouse).toHaveBeenNthCalledWith(2, 11, 2, 2, transaction);
    expect(WarehouseStockService.addToWarehouse).not.toHaveBeenCalled();
  });

  it('cancelar venda credita de volta o deposito ACABADOS SO do que ja tinha sido faturado', async () => {
    const transaction: any = { LOCK: { UPDATE: 'UPDATE' } };
    const sale = {
      id: 2,
      status: 'partially_invoiced',
      nfe_status: 'authorized',
      items: [{ product_id: 10, quantity: 6, invoiced_quantity: 4 }],
      save: jest.fn(async () => ({})),
    };
    const saleRepository = buildSaleRepository(sale);
    const useCase = new ChangeSaleStatusUseCase(saleRepository);

    await useCase.execute({ id: 2, status: 'canceled', userId: 7, transaction });

    expect(InventoryService.releaseAllReservationsForSale).toHaveBeenCalledWith(2, 7, transaction, expect.any(Object));
    expect(WarehouseStockService.getWarehouseByCode).toHaveBeenCalledWith('ACABADOS', transaction);
    expect(InventoryService.receive).toHaveBeenCalledTimes(1);
    expect(WarehouseStockService.addToWarehouse).toHaveBeenCalledTimes(1);
    expect(WarehouseStockService.addToWarehouse).toHaveBeenCalledWith(10, 2, 4, transaction);
    expect(WarehouseStockService.removeFromWarehouse).not.toHaveBeenCalled();
  });

  it('cancelar venda sem nada faturado nao movimenta deposito nenhum', async () => {
    const transaction: any = { LOCK: { UPDATE: 'UPDATE' } };
    const sale = {
      id: 4,
      status: 'confirmed',
      items: [{ product_id: 10, quantity: 4, invoiced_quantity: 0 }],
      save: jest.fn(async () => ({})),
    };
    const useCase = new ChangeSaleStatusUseCase(buildSaleRepository(sale));

    await useCase.execute({ id: 4, status: 'canceled', userId: 7, transaction });

    expect(InventoryService.releaseAllReservationsForSale).toHaveBeenCalledTimes(1);
    expect(InventoryService.receive).not.toHaveBeenCalled();
    expect(WarehouseStockService.addToWarehouse).not.toHaveBeenCalled();
    expect(WarehouseStockService.getWarehouseByCode).not.toHaveBeenCalled();
  });

  it('saldo insuficiente em ACABADOS no faturamento propaga 422 didatico (BusinessRuleError)', async () => {
    const { BusinessRuleError } = require('../../src/errors');
    WarehouseStockService.removeFromWarehouse.mockRejectedValueOnce(
      new BusinessRuleError('Saldo insuficiente do produto "Produto 10" (#10) no depósito "Deposito ACABADOS" (ACABADOS). Saldo atual: 1, solicitado: 3.', {
        product_id: 10, warehouse_id: 2, available_quantity: 1, requested_quantity: 3,
      })
    );

    const transaction: any = { LOCK: { UPDATE: 'UPDATE' } };

    await expect(
      SaleStockService.commitInvoicedStock(3, [{ productId: 10, quantity: 3 }], 7, transaction)
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

describe('Integracao dual-write: CreateAcousticTestUseCase (teste destrutivo -> LABORATORIO, UC-42-E)', () => {
  let WarehouseStockService: any;
  let CreateAcousticTestUseCase: any;
  let AcousticTestResult: any;

  const transaction: any = { id: 'tx-lab-1', LOCK: { UPDATE: 'UPDATE' } };

  function mockDatabase() {
    jest.doMock('../../src/config/database', () => ({
      sequelize: {
        transaction: jest.fn(async (callback?: any) => {
          if (callback) return callback(transaction);
          return transaction;
        }),
      },
    }));
  }

  beforeEach(() => {
    jest.resetModules();
    mockDatabase();

    AcousticTestResult = {
      create: jest.fn(async (data: any) => ({ id: 501, ...data })),
      findByPk: jest.fn(async (id: number) => ({ id, update: jest.fn() })),
    };
    jest.doMock('../../src/models/index', () => ({ AcousticTestResult, Product: {}, User: {} }));

    WarehouseStockService = {
      getWarehouseByCode: jest.fn(async (code: string) => ({ id: code === 'LABORATORIO' ? 3 : 1, code })),
      addToWarehouse: jest.fn(async () => ({})),
      removeFromWarehouse: jest.fn(async () => ({})),
    };
    jest.doMock('../../src/services/warehouseStockService', () => WarehouseStockService);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    CreateAcousticTestUseCase = require('../../src/modules/laboratory/application/use-cases/CreateAcousticTestUseCase');
  });

  function buildLaboratoryRepository() {
    return {
      createTest: jest.fn(async (data: any, tx: any) => AcousticTestResult.create(data, tx ? { transaction: tx } : undefined)),
      updateTest: jest.fn(async () => ({})),
    };
  }

  it('teste destrutivo com consumed_quantity debita o Laboratorio na mesma transacao do registro do teste', async () => {
    const laboratoryRepository = buildLaboratoryRepository();
    const useCase = new CreateAcousticTestUseCase(laboratoryRepository);

    const test = await useCase.execute({
      product_id: 20,
      test_type: 'life',
      result: 10,
      specification_min: 5,
      consumed_quantity: 2,
      testerId: 9,
    });

    expect(test.id).toBe(501);
    expect(laboratoryRepository.createTest).toHaveBeenCalledWith(
      expect.objectContaining({ product_id: 20, consumed_quantity: 2 }),
      transaction
    );
    expect(WarehouseStockService.getWarehouseByCode).toHaveBeenCalledWith('LABORATORIO', transaction);
    expect(WarehouseStockService.removeFromWarehouse).toHaveBeenCalledWith(20, 3, 2, transaction);
  });

  it('teste sem consumo (consumed_quantity ausente/0) nao debita nada do Laboratorio', async () => {
    const laboratoryRepository = buildLaboratoryRepository();
    const useCase = new CreateAcousticTestUseCase(laboratoryRepository);

    await useCase.execute({
      product_id: 20,
      test_type: 'impedance',
      result: 8,
      specification_min: 5,
      specification_max: 10,
      testerId: 9,
    });

    expect(WarehouseStockService.removeFromWarehouse).not.toHaveBeenCalled();
    expect(laboratoryRepository.createTest).toHaveBeenCalledWith(
      expect.objectContaining({ consumed_quantity: null }),
      transaction
    );

    await useCase.execute({
      product_id: 20,
      test_type: 'impedance',
      result: 8,
      specification_min: 5,
      specification_max: 10,
      consumed_quantity: 0,
      testerId: 9,
    });

    expect(WarehouseStockService.removeFromWarehouse).not.toHaveBeenCalled();
  });

  it('saldo insuficiente no Laboratorio propaga 422 didatico (BusinessRuleError)', async () => {
    const { BusinessRuleError } = require('../../src/errors');
    WarehouseStockService.removeFromWarehouse.mockRejectedValueOnce(
      new BusinessRuleError('Saldo insuficiente do produto "Produto 20" (#20) no depósito "Deposito LABORATORIO" (LABORATORIO). Saldo atual: 1, solicitado: 5.', {
        product_id: 20, warehouse_id: 3, available_quantity: 1, requested_quantity: 5,
      })
    );

    const laboratoryRepository = buildLaboratoryRepository();
    const useCase = new CreateAcousticTestUseCase(laboratoryRepository);

    await expect(
      useCase.execute({
        product_id: 20,
        test_type: 'life',
        result: 10,
        specification_min: 5,
        consumed_quantity: 5,
        testerId: 9,
      })
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

/**
 * ATUALIZADO PELO G9 (2026-08-10): venda criada ja `confirmed` reserva em
 * vez de baixar, e portanto tambem nao movimenta deposito na criacao.
 */
describe('Integracao dual-write: CreateSaleUseCase (venda confirmada na criacao — G9: reserva, nao baixa)', () => {
  let InventoryService: any;
  let WarehouseStockService: any;
  let CreateSaleUseCase: any;

  beforeEach(() => {
    jest.resetModules();

    InventoryService = {
      consume: jest.fn(async () => ({ product: { id: 10, quantity: 8 } })),
      reserve: jest.fn(async () => ({ quantityAffected: 3 })),
    };
    jest.doMock('../../src/services/inventoryService', () => InventoryService);

    WarehouseStockService = {
      getWarehouseByCode: jest.fn(async (code: string) => ({ id: code === 'ACABADOS' ? 2 : 1, code })),
      addToWarehouse: jest.fn(async () => ({})),
      removeFromWarehouse: jest.fn(async () => ({})),
    };
    jest.doMock('../../src/services/warehouseStockService', () => WarehouseStockService);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    CreateSaleUseCase = require('../../src/modules/sales/application/use-cases/CreateSaleUseCase');
  });

  function buildSaleRepository() {
    return {
      findProductById: jest.fn(async (id: number) => ({ id, name: `Produto ${id}`, status: 'active', quantity: 100 })),
      createSale: jest.fn(async (data: any) => ({ id: 1, ...data })),
      createSaleItem: jest.fn(async () => ({})),
      createAccountReceivable: jest.fn(async (data: any) => ({ id: 1, ...data })),
    };
  }

  const transaction: any = { LOCK: { UPDATE: 'UPDATE' } };

  it("venda criada com status 'confirmed' (padrao) RESERVA cada item e nao movimenta deposito", async () => {
    const saleRepository = buildSaleRepository();
    const useCase = new CreateSaleUseCase(saleRepository);

    await useCase.execute({
      customer_id: 5,
      items: [
        { product_id: 10, quantity: 3, unit_price: 10 },
        { product_id: 11, quantity: 2, unit_price: 20 },
      ],
      payment_method: 'pix',
      installments: 1,
      userId: 7,
      transaction,
    });

    expect(InventoryService.reserve).toHaveBeenCalledTimes(2);
    expect(InventoryService.reserve).toHaveBeenNthCalledWith(1, 10, 3, 7, transaction, expect.objectContaining({ saleId: 1 }));
    expect(InventoryService.reserve).toHaveBeenNthCalledWith(2, 11, 2, 7, transaction, expect.objectContaining({ saleId: 1 }));
    expect(InventoryService.consume).not.toHaveBeenCalled();
    expect(WarehouseStockService.getWarehouseByCode).not.toHaveBeenCalled();
    expect(WarehouseStockService.removeFromWarehouse).not.toHaveBeenCalled();
    expect(WarehouseStockService.addToWarehouse).not.toHaveBeenCalled();
  });

  it("venda criada sem 'status' explicito (default 'confirmed') tambem apenas reserva", async () => {
    const saleRepository = buildSaleRepository();
    const useCase = new CreateSaleUseCase(saleRepository);

    await useCase.execute({
      customer_id: 5,
      items: [{ product_id: 10, quantity: 1, unit_price: 10 }],
      payment_method: 'pix',
      userId: 7,
      transaction,
    });

    expect(InventoryService.reserve).toHaveBeenCalledWith(10, 1, 7, transaction, expect.objectContaining({ saleId: 1 }));
    expect(WarehouseStockService.removeFromWarehouse).not.toHaveBeenCalled();
  });

  it("venda criada com status: 'quote' (orcamento) nao reserva, nao debita e nao gera parcela", async () => {
    const saleRepository = buildSaleRepository();
    const useCase = new CreateSaleUseCase(saleRepository);

    await useCase.execute({
      customer_id: 5,
      items: [{ product_id: 10, quantity: 3, unit_price: 10 }],
      payment_method: 'pix',
      status: 'quote',
      userId: 7,
      transaction,
    });

    expect(WarehouseStockService.getWarehouseByCode).not.toHaveBeenCalled();
    expect(InventoryService.consume).not.toHaveBeenCalled();
    expect(InventoryService.reserve).not.toHaveBeenCalled();
    expect(WarehouseStockService.removeFromWarehouse).not.toHaveBeenCalled();
    expect(saleRepository.createAccountReceivable).not.toHaveBeenCalled();
  });

  it('estoque disponivel insuficiente na criacao da venda confirmada propaga 422 didatico (BusinessRuleError)', async () => {
    const { BusinessRuleError } = require('../../src/errors');
    InventoryService.reserve.mockRejectedValueOnce(
      new BusinessRuleError('Estoque insuficiente para "Produto 10". Disponível: 1, Solicitado: 3', {
        product_id: 10, available_quantity: 1, requested_quantity: 3,
      })
    );

    const saleRepository = buildSaleRepository();
    const useCase = new CreateSaleUseCase(saleRepository);

    await expect(
      useCase.execute({
        customer_id: 5,
        items: [{ product_id: 10, quantity: 3, unit_price: 10 }],
        payment_method: 'pix',
        userId: 7,
        transaction,
      })
    ).rejects.toBeInstanceOf(BusinessRuleError);

    // Nao deve ter gerado parcela se a reserva falhar no meio do loop.
    expect(saleRepository.createAccountReceivable).not.toHaveBeenCalled();
  });
});

describe('GetProductStockByWarehouseUseCase (GET /api/products/:id/stock-by-warehouse)', () => {
  let GetProductStockByWarehouseUseCase: any;
  let NotFoundError: any;

  const activeWarehouseSummary = [
    { warehouse_id: 1, warehouse_code: 'INSUMOS', warehouse_name: 'Deposito INSUMOS', quantity: 0 },
    { warehouse_id: 2, warehouse_code: 'ACABADOS', warehouse_name: 'Deposito ACABADOS', quantity: 0 },
    { warehouse_id: 3, warehouse_code: 'LABORATORIO', warehouse_name: 'Deposito LABORATORIO', quantity: 0 },
  ];

  beforeEach(() => {
    jest.resetModules();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    GetProductStockByWarehouseUseCase = require('../../src/modules/products/application/use-cases/GetProductStockByWarehouseUseCase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ NotFoundError } = require('../../src/errors'));
  });

  function buildProductRepository(product: any, warehouseStockSummary: any[]) {
    return {
      findById: jest.fn(async (id: number, opts: any) => {
        expect(opts).toEqual({ withCategory: false });
        return id === product.id ? product : null;
      }),
      getWarehouseStockSummary: jest.fn(async (productId: number) => {
        expect(productId).toBe(product.id);
        return warehouseStockSummary;
      }),
    };
  }

  it('retorna o saldo do produto em todos os depositos ativos quando ha saldo em multiplos depositos', async () => {
    const product = { id: 10, code: 'PROD-10', name: 'Produto 10', quantity: 17 };
    const warehouseStockSummary = [
      { warehouse_id: 1, warehouse_code: 'INSUMOS', warehouse_name: 'Deposito INSUMOS', quantity: 12 },
      { warehouse_id: 2, warehouse_code: 'ACABADOS', warehouse_name: 'Deposito ACABADOS', quantity: 5 },
      { warehouse_id: 3, warehouse_code: 'LABORATORIO', warehouse_name: 'Deposito LABORATORIO', quantity: 0 },
    ];

    const productRepository = buildProductRepository(product, warehouseStockSummary);
    const useCase = new GetProductStockByWarehouseUseCase(productRepository);

    const result = await useCase.execute({ id: 10 });

    expect(result.product).toEqual({ id: 10, code: 'PROD-10', name: 'Produto 10', quantity: 17 });
    expect(result.warehouses).toEqual(warehouseStockSummary);
  });

  it('retorna todos os depositos ativos com quantity: 0 quando o produto nao tem saldo em nenhum deles', async () => {
    const product = { id: 20, code: 'PROD-20', name: 'Produto 20', quantity: 0 };

    const productRepository = buildProductRepository(product, activeWarehouseSummary);
    const useCase = new GetProductStockByWarehouseUseCase(productRepository);

    const result = await useCase.execute({ id: 20 });

    expect(result.warehouses).toHaveLength(3);
    expect(result.warehouses.every((w: any) => w.quantity === 0)).toBe(true);
    expect(result.warehouses.map((w: any) => w.warehouse_code)).toEqual(['INSUMOS', 'ACABADOS', 'LABORATORIO']);
  });

  it('lanca NotFoundError (404) quando o produto nao existe', async () => {
    const productRepository = {
      findById: jest.fn(async () => null),
      getWarehouseStockSummary: jest.fn(),
    };
    const useCase = new GetProductStockByWarehouseUseCase(productRepository);

    await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
    expect(productRepository.getWarehouseStockSummary).not.toHaveBeenCalled();
  });
});
