/**
 * Testes de invariante pendentes do Bloco 4 (Multiplos Depositos, UC-42) —
 * `docs/governance/TODO.md`.
 *
 * Cobre os 4 itens que estavam marcados `[ ]` na secao "4.x Testes de
 * invariante" do Bloco 4:
 *
 * 1. Expedicao/venda so consome do deposito ACABADOS, mesmo que outro
 *    deposito tenha saldo do mesmo produto. ATUALIZADO PELO G9
 *    (2026-08-10): o momento da baixa deixou de ser a confirmacao do pedido
 *    (`ChangeSaleStatusUseCase`) e passou a ser a autorizacao da NF-e
 *    (`services/saleStockService`) — a invariante de deposito e a mesma, o
 *    gatilho e que mudou. A confirmacao agora so RESERVA e, por isso,
 *    nao pode tocar em deposito nenhum (ha teste explicito disso aqui).
 * 2. Quarentena/bloqueio/liberacao de lote (`BlockLotUseCase`/
 *    `ReleaseLotUseCase`) NUNCA move saldo entre depositos — so muda
 *    `LotControl.status`.
 * 3. (NAO IMPLEMENTADO NO CODIGO — ver nota abaixo) Contagem ciclica
 *    escopada a um unico deposito.
 * 4. Teste destrutivo com `consumed_quantity` debita LABORATORIO — JA
 *    COBERTO em `warehouse-stock.test.ts` e `laboratory-tests.test.ts`
 *    (ver nota abaixo). Nao duplicado aqui.
 *
 * @group unit
 * @ticket Bloco-4-UC-42
 */

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (callback?: any) => {
      const transaction = { id: 'tx-wh-inv-1', LOCK: { UPDATE: 'UPDATE' }, commit: jest.fn(), rollback: jest.fn(), finished: undefined };
      if (callback) {
        return callback(transaction);
      }
      return transaction;
    }),
  },
}));

describe('Invariante 1 — faturamento/expedicao (saleStockService) so le/consome o deposito ACABADOS', () => {
  let Product: any;
  let Warehouse: any;
  let ProductWarehouseStock: any;
  let warehouseStockService: any;
  let InventoryService: any;
  let SaleStockService: any;
  let ChangeSaleStatusUseCase: any;

  const transaction: any = { LOCK: { UPDATE: 'UPDATE' } };

  beforeEach(() => {
    jest.resetModules();

    // Mesmo padrao in-memory de warehouse-stock.test.ts: usa o
    // warehouseStockService REAL (nao mockado), para provar que o
    // saldo de INSUMOS nao e tocado nem consultado.
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

    InventoryService = {
      // InventoryService so mexe em products.quantity / na tabela de
      // reservas (dual-write legado); nao interessa a este teste, so
      // precisa resolver sem erro.
      consume: jest.fn(async () => ({ product: { id: 10, quantity: 8 } })),
      receive: jest.fn(async () => ({ product: { id: 10, quantity: 10 } })),
      reserve: jest.fn(async () => ({ quantityAffected: 3 })),
      releaseReservation: jest.fn(async () => ({ quantityAffected: 3 })),
      releaseAllReservationsForSale: jest.fn(async () => []),
    };
    jest.doMock('../../src/services/inventoryService', () => InventoryService);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    warehouseStockService = require('../../src/services/warehouseStockService');
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

  it('mesmo com saldo positivo do produto em INSUMOS, faturar consome de ACABADOS (nao de INSUMOS) e o saldo de INSUMOS permanece intacto', async () => {
    // Produto 10 tem bastante saldo em INSUMOS, mas nenhum em ACABADOS.
    await warehouseStockService.addToWarehouse(10, 1, 1000, transaction);

    // ACABADOS nao tem saldo -> deve falhar com 422 didatico, mesmo com
    // 1000 unidades disponiveis em INSUMOS (a expedicao NUNCA le outro
    // deposito alem de ACABADOS).
    await expect(
      SaleStockService.commitInvoicedStock(1, [{ productId: 10, quantity: 3 }], 7, transaction)
    ).rejects.toMatchObject({
      statusCode: 422,
      details: expect.objectContaining({ warehouse_id: 2, product_id: 10 }),
    });

    const insumos = await ProductWarehouseStock.findOne({ where: { product_id: 10, warehouse_id: 1 } });
    expect(Number(insumos.quantity)).toBe(1000); // saldo de INSUMOS intacto — nao foi lido nem debitado

    // removeFromWarehouse cria a linha de saldo (auto-vivify em 0) antes de
    // validar disponibilidade — mas o saldo permanece em 0, nunca foi
    // debitado nem lido de outro deposito.
    const acabados = await ProductWarehouseStock.findOne({ where: { product_id: 10, warehouse_id: 2 } });
    expect(Number(acabados.quantity)).toBe(0);
  });

  it('com saldo suficiente em ACABADOS, faturar debita ACABADOS e nao toca em INSUMOS mesmo que ambos tenham saldo', async () => {
    await warehouseStockService.addToWarehouse(10, 1, 500, transaction); // INSUMOS
    await warehouseStockService.addToWarehouse(10, 2, 5, transaction); // ACABADOS

    await SaleStockService.commitInvoicedStock(2, [{ productId: 10, quantity: 3 }], 7, transaction);

    const insumos = await ProductWarehouseStock.findOne({ where: { product_id: 10, warehouse_id: 1 } });
    const acabados = await ProductWarehouseStock.findOne({ where: { product_id: 10, warehouse_id: 2 } });

    expect(Number(insumos.quantity)).toBe(500); // INSUMOS intacto
    expect(Number(acabados.quantity)).toBe(2); // 5 - 3 = 2, so ACABADOS foi debitado
  });

  it('G9: confirmar o pedido nao toca em deposito nenhum (reserva nao movimenta saldo)', async () => {
    await warehouseStockService.addToWarehouse(10, 1, 500, transaction); // INSUMOS
    await warehouseStockService.addToWarehouse(10, 2, 5, transaction); // ACABADOS

    const sale = {
      id: 3,
      status: 'quote',
      total_amount: '30.00',
      installments: 1,
      customer_id: 5,
      payment_method: 'pix',
      items: [{ product_id: 10, quantity: 3, invoiced_quantity: 0 }],
      save: jest.fn(async () => ({})),
    };
    const useCase = new ChangeSaleStatusUseCase(buildSaleRepository(sale));

    await useCase.execute({ id: 3, status: 'confirmed', userId: 7, transaction });

    const insumos = await ProductWarehouseStock.findOne({ where: { product_id: 10, warehouse_id: 1 } });
    const acabados = await ProductWarehouseStock.findOne({ where: { product_id: 10, warehouse_id: 2 } });

    expect(Number(insumos.quantity)).toBe(500);
    expect(Number(acabados.quantity)).toBe(5); // intacto: a baixa so ocorre na NF-e
    expect(InventoryService.reserve).toHaveBeenCalledWith(10, 3, 7, transaction, expect.objectContaining({ saleId: 3 }));
    expect(InventoryService.consume).not.toHaveBeenCalled();
  });
});

/**
 * Gateway de inspecao (G7) devolvendo sempre inspecao APROVADA — usado pelos
 * testes de invariante de deposito, que nao sao sobre o gate de qualidade.
 *
 * @returns Gateway com `findLatestInspectionForLot` aprovado.
 */
function approvedQualityGateway() {
  return { findLatestInspectionForLot: jest.fn(async () => ({ id: 501, verdict: 'approved' })) };
}

describe('Invariante 2 — quarentena/bloqueio/liberacao de lote (BlockLotUseCase/ReleaseLotUseCase) nao move saldo de deposito', () => {
  let LotControl: any;
  let ProductWarehouseStock: any;
  let BlockLotUseCase: any;
  let ReleaseLotUseCase: any;
  let SequelizeInventoryRepository: any;
  let repository: any;

  beforeEach(() => {
    jest.resetModules();

    const lotRow: any = {
      id: 77,
      lot_number: 'LOT-2026-077',
      product_id: 10,
      warehouse_id: 2, // ACABADOS
      status: 'quarantine',
      notes: null,
      update: jest.fn(async function (this: any, values: any) { Object.assign(this, values); return this; }),
    };

    LotControl = {
      findByPk: jest.fn(async () => lotRow),
      __row: lotRow,
    };

    // ProductWarehouseStock nao deve ser tocado por bloqueio/liberacao de
    // lote — nenhum metodo dele deve ser chamado.
    ProductWarehouseStock = {
      findOne: jest.fn(),
      create: jest.fn(),
      increment: jest.fn(),
      decrement: jest.fn(),
    };

    jest.doMock('../../src/models/index', () => ({ LotControl, ProductWarehouseStock }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    SequelizeInventoryRepository = require('../../src/modules/inventory/infrastructure/sequelize/SequelizeInventoryRepository');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    BlockLotUseCase = require('../../src/modules/inventory/application/use-cases/BlockLotUseCase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ReleaseLotUseCase = require('../../src/modules/inventory/application/use-cases/ReleaseLotUseCase');

    repository = new SequelizeInventoryRepository();
  });

  it('BlockLotUseCase muda apenas LotControl.status/notes, sem tocar warehouse_id nem ProductWarehouseStock', async () => {
    const useCase = new BlockLotUseCase(repository);
    const warehouseIdBefore = LotControl.__row.warehouse_id;

    const updated = await useCase.execute({ id: 77, reason: 'Suspeita de nao conformidade' });

    expect(updated.status).toBe('blocked');
    expect(LotControl.__row.warehouse_id).toBe(warehouseIdBefore); // deposito do lote inalterado
    expect(LotControl.__row.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'blocked' })
    );
    // Nenhuma chamada `update` deve incluir warehouse_id.
    for (const call of LotControl.__row.update.mock.calls) {
      expect(call[0]).not.toHaveProperty('warehouse_id');
    }
    expect(ProductWarehouseStock.findOne).not.toHaveBeenCalled();
    expect(ProductWarehouseStock.create).not.toHaveBeenCalled();
    expect(ProductWarehouseStock.increment).not.toHaveBeenCalled();
    expect(ProductWarehouseStock.decrement).not.toHaveBeenCalled();
  });

  it('ReleaseLotUseCase (quarantine -> available) muda apenas status/notes, sem tocar warehouse_id nem ProductWarehouseStock', async () => {
    // G7 (2026-08-10): a liberacao passou a exigir inspecao aprovada
    // (ISO 9001 8.6). Este teste mede a INVARIANTE DE DEPOSITO, entao informa
    // uma inspecao aprovada para nao medir o gate por acidente — o gate tem
    // suite propria em `quality-inspection-release-gate.test.ts`.
    const useCase = new ReleaseLotUseCase(repository, approvedQualityGateway());
    const warehouseIdBefore = LotControl.__row.warehouse_id;

    const updated = await useCase.execute({ id: 77, notes: 'Inspecao aprovada', releasedBy: 9 });

    expect(updated.status).toBe('available');
    expect(LotControl.__row.warehouse_id).toBe(warehouseIdBefore);
    for (const call of LotControl.__row.update.mock.calls) {
      expect(call[0]).not.toHaveProperty('warehouse_id');
    }
    expect(ProductWarehouseStock.findOne).not.toHaveBeenCalled();
    expect(ProductWarehouseStock.create).not.toHaveBeenCalled();
    expect(ProductWarehouseStock.increment).not.toHaveBeenCalled();
    expect(ProductWarehouseStock.decrement).not.toHaveBeenCalled();
  });

  it('ReleaseLotUseCase (blocked -> available, pos-tratativa de RNC) tambem nao move o lote de deposito', async () => {
    LotControl.__row.status = 'blocked';
    const useCase = new ReleaseLotUseCase(repository, approvedQualityGateway());
    const warehouseIdBefore = LotControl.__row.warehouse_id;

    const updated = await useCase.execute({ id: 77, notes: 'RNC tratada', releasedBy: 9 });

    expect(updated.status).toBe('available');
    expect(LotControl.__row.warehouse_id).toBe(warehouseIdBefore);
    expect(ProductWarehouseStock.increment).not.toHaveBeenCalled();
    expect(ProductWarehouseStock.decrement).not.toHaveBeenCalled();
  });
});

describe('Invariante 3 — contagem ciclica (CreateInventoryCountUseCase/ApproveInventoryCountUseCase) escopada a um unico deposito (Bloco 4, migration 20260804-000006)', () => {
  let Product: any;
  let Warehouse: any;
  let ProductWarehouseStock: any;
  let InventoryMovement: any;
  let CreateInventoryCountUseCase: any;
  let ApproveInventoryCountUseCase: any;
  let InventoryCountEntity: any;

  beforeEach(() => {
    jest.resetModules();

    const stockRows: Record<string, { id: number; product_id: number; warehouse_id: number; quantity: number }> = {};
    let nextStockId = 1;
    const stockKey = (productId: number, warehouseId: number) => `${productId}:${warehouseId}`;

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
        const row = stockRows[stockKey(where.product_id, where.warehouse_id)];
        return row ? buildStockInstance(row) : null;
      }),
      create: jest.fn(async ({ product_id, warehouse_id, quantity }: any) => {
        const row = { id: nextStockId++, product_id, warehouse_id, quantity: Number(quantity || 0) };
        stockRows[stockKey(product_id, warehouse_id)] = row;
        return buildStockInstance(row);
      }),
      __rows: stockRows,
    };

    // Produto 30: soma inicial de depositos = 15 (INSUMOS=5, ACABADOS=10),
    // consistente com Product.quantity=15 (invariante ja em vigor).
    const productRow = { id: 30, name: 'Woofer 8"', quantity: 15, reserved_quantity: 0 };

    Product = {
      findByPk: jest.fn(async (id: number) => {
        if (id !== productRow.id) return null;
        return {
          id: productRow.id,
          name: productRow.name,
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
      __row: productRow,
    };

    const warehousesById: Record<number, { id: number; code: string; name: string; active: boolean }> = {
      1: { id: 1, code: 'INSUMOS', name: 'Deposito INSUMOS', active: true },
      2: { id: 2, code: 'ACABADOS', name: 'Deposito ACABADOS', active: true },
    };

    Warehouse = {
      findOne: jest.fn(async ({ where }: any) => {
        const found = Object.values(warehousesById).find((w) => w.code === where.code);
        return found || null;
      }),
      findByPk: jest.fn(async (id: number) => warehousesById[id] || null),
    };

    InventoryMovement = {
      create: jest.fn(async (data: any) => ({ id: 999, ...data })),
    };

    jest.doMock('../../src/models/index', () => ({ Product, Warehouse, ProductWarehouseStock, InventoryMovement }));

    // InventoryService mockado (mesmo padrao das demais suites unitarias —
    // ver production-order-lifecycle.test.ts) simulando o MESMO dual-write
    // legado que o modulo real faz em Product.quantity, para provar a
    // invariante Product.quantity = soma(ProductWarehouseStock) sem
    // depender do modulo TS real (que tem problemas de interop CJS/ESM
    // quando importado "cru" em teste, fora do bundle da app).
    jest.doMock('../../src/services/inventoryService', () => ({
      adjust: jest.fn(async (_productId: number, type: 'in' | 'out', quantity: number) => {
        const before = productRow.quantity;
        productRow.quantity = type === 'in' ? before + Number(quantity) : before - Number(quantity);
        return { success: true, productId: productRow.id, quantityBefore: before, quantityAfter: productRow.quantity };
      }),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const warehouseStockService = require('../../src/services/warehouseStockService');
    // Semeia o saldo inicial por deposito (fora de transacao real, so para preparar o cenario).
    stockRows[stockKey(30, 1)] = { id: nextStockId++, product_id: 30, warehouse_id: 1, quantity: 5 };
    stockRows[stockKey(30, 2)] = { id: nextStockId++, product_id: 30, warehouse_id: 2, quantity: 10 };
    void warehouseStockService; // apenas garante que o modulo foi carregado com o mock acima

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    CreateInventoryCountUseCase = require('../../src/modules/inventory/application/use-cases/CreateInventoryCountUseCase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ApproveInventoryCountUseCase = require('../../src/modules/inventory/application/use-cases/ApproveInventoryCountUseCase');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    InventoryCountEntity = require('../../src/modules/inventory/domain/entities/InventoryCountEntity');
  });

  function buildInventoryCountRepository() {
    return {
      create: jest.fn(async (data: any) => ({ id: 501, ...data })),
      countByCountNumberPrefix: jest.fn(async () => 0),
      bulkCreateItems: jest.fn(async (items: any[]) => items.map((it, idx) => ({ id: idx + 1, ...it }))),
      findProductById: jest.fn(async (id: number) => (id === 30 ? Product.__row : null)),
    };
  }

  it('CreateInventoryCountUseCase rejeita criacao sem warehouse_id (400/ValidationError)', async () => {
    const repository = buildInventoryCountRepository();
    const useCase = new CreateInventoryCountUseCase(repository);

    await expect(
      useCase.execute({ count_type: 'cycle', created_by: 7 })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('CreateInventoryCountUseCase aceita e persiste warehouse_id quando informado', async () => {
    const repository = buildInventoryCountRepository();
    const useCase = new CreateInventoryCountUseCase(repository);

    const { count } = await useCase.execute({ count_type: 'cycle', warehouse_id: 2, created_by: 7 });

    expect(count.warehouse_id).toBe(2);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ warehouse_id: 2 }),
      expect.anything()
    );
  });

  it('CreateInventoryCountUseCase resolve item_ids (dual-read) via crosswalk Item->Product em vez de 404 (bug real corrigido)', async () => {
    // Regressao: `findProductById` do repository de contagem sempre fazia
    // `Product.findByPk(id)` mesmo quando `id` era um UUID de `Item` (fluxo
    // "preferido" do dual-read) — nunca encontrava o Product legado (chave
    // INTEGER), entao toda contagem criada via `item_ids` falhava com 404.
    jest.doMock('../../src/modules/items/infrastructure/sequelize/SequelizeItemRepository', () => {
      return jest.fn().mockImplementation(() => ({
        findLegacyProductByItemId: jest.fn(async (itemId: string) =>
          itemId === 'item-uuid-30' ? { id: 30, code: 'WOOFER-8', quantity: 15 } : null
        ),
      }));
    });
    jest.resetModules();
    jest.doMock('../../src/models/index', () => ({ Product, Warehouse, ProductWarehouseStock, InventoryMovement }));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const CreateInventoryCountUseCaseWithItemIds = require('../../src/modules/inventory/application/use-cases/CreateInventoryCountUseCase');

    const repository = buildInventoryCountRepository();
    const useCase = new CreateInventoryCountUseCaseWithItemIds(repository);

    const { items } = await useCase.execute({
      count_type: 'cycle',
      warehouse_id: 2,
      item_ids: ['item-uuid-30'],
      created_by: 7
    });

    expect(repository.bulkCreateItems).toHaveBeenCalledWith(
      [expect.objectContaining({ item_id: 'item-uuid-30', product_id: null, system_quantity: 15 })],
      expect.anything()
    );
    expect(items).toHaveLength(1);
  });

  it('CreateInventoryCountUseCase rejeita item_id sem Product legado correspondente (404, sem side-effect)', async () => {
    jest.doMock('../../src/modules/items/infrastructure/sequelize/SequelizeItemRepository', () => {
      return jest.fn().mockImplementation(() => ({
        findLegacyProductByItemId: jest.fn(async () => null),
      }));
    });
    jest.resetModules();
    jest.doMock('../../src/models/index', () => ({ Product, Warehouse, ProductWarehouseStock, InventoryMovement }));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const CreateInventoryCountUseCaseWithItemIds = require('../../src/modules/inventory/application/use-cases/CreateInventoryCountUseCase');

    const repository = buildInventoryCountRepository();
    const useCase = new CreateInventoryCountUseCaseWithItemIds(repository);

    await expect(
      useCase.execute({ count_type: 'cycle', warehouse_id: 2, item_ids: ['item-uuid-orfao'], created_by: 7 })
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(repository.bulkCreateItems).not.toHaveBeenCalled();
  });

  it('InventoryCountEntity.validate lanca ValidationError explicita quando warehouse_id esta ausente', () => {
    expect(() => new InventoryCountEntity({ count_type: 'cycle', created_by: 7 })).toThrow(
      /Depósito \(warehouse_id\) é obrigatório/
    );
  });

  it('ApproveInventoryCountUseCase ajusta somente o deposito da contagem (ACABADOS), preserva INSUMOS intacto e mantem Product.quantity = soma dos depositos', async () => {
    const count = { id: 1, count_number: 'CC-2026-0001', status: 'pending_approval', warehouse_id: 2 };
    const items = [{ id: 10, product_id: 30, variance_quantity: -4 }]; // sistema=10 (ACABADOS), contado=6

    const inventoryCountRepository = {
      findRawByIdForUpdate: jest.fn(async () => count),
      listItems: jest.fn(async () => items),
      updateItem: jest.fn(async () => 1),
      updateIfStatus: jest.fn(async () => 1),
      findById: jest.fn(async () => ({ ...count, status: 'adjusted' })),
    };

    const useCase = new ApproveInventoryCountUseCase(inventoryCountRepository);
    const { adjustments } = await useCase.execute({ id: 1, approverId: 9 });

    expect(adjustments).toHaveLength(1);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const warehouseStockService = require('../../src/services/warehouseStockService');
    const t: any = { LOCK: { UPDATE: 'UPDATE' } };

    const acabados = await warehouseStockService.addToWarehouse(30, 2, 0, t); // le o saldo atual sem alterar (soma 0)
    const insumos = await warehouseStockService.addToWarehouse(30, 1, 0, t);

    expect(acabados.quantityAfter).toBe(6); // 10 - 4 = 6, so o deposito da contagem foi debitado
    expect(insumos.quantityAfter).toBe(5); // INSUMOS permanece intacto (nao fazia parte da contagem)

    // Product.quantity (dual-write legado via InventoryService.adjust) deve
    // refletir a MESMA baixa aplicada ao deposito, preservando a invariante
    // Product.quantity = soma(ProductWarehouseStock) por deposito.
    expect(Product.__row.quantity).toBe(11); // 15 - 4 = 11
    expect(Product.__row.quantity).toBe(acabados.quantityAfter + insumos.quantityAfter); // 6 + 5 = 11
  });

  it('ApproveInventoryCountUseCase rejeita aprovacao de contagem sem warehouse_id (dado legado inconsistente)', async () => {
    const count = { id: 2, count_number: 'CC-2026-0002', status: 'pending_approval', warehouse_id: null };
    const inventoryCountRepository = {
      findRawByIdForUpdate: jest.fn(async () => count),
      listItems: jest.fn(async () => []),
      updateItem: jest.fn(),
      updateIfStatus: jest.fn(),
      findById: jest.fn(),
    };

    const useCase = new ApproveInventoryCountUseCase(inventoryCountRepository);

    await expect(useCase.execute({ id: 2, approverId: 9 })).rejects.toMatchObject({ statusCode: 422 });
    expect(inventoryCountRepository.updateItem).not.toHaveBeenCalled();
    expect(inventoryCountRepository.updateIfStatus).not.toHaveBeenCalled();
  });
});

/*
 * NOTA — Item 4 do Bloco 4 (teste destrutivo com `consumed_quantity` debita
 * LABORATORIO): JA COBERTO, sem gap:
 *   - `server/tests/unit/warehouse-stock.test.ts`, describe "Integracao
 *     dual-write: CreateAcousticTestUseCase (teste destrutivo ->
 *     LABORATORIO, UC-42-E)" — testa debito com consumed_quantity > 0,
 *     ausencia/zero nao debita, e 422 didatico em saldo insuficiente.
 *   - `server/tests/unit/laboratory-tests.test.ts`, describe
 *     "CreateAcousticTestUseCase — consumo de teste destrutivo (UC-42-E)"
 *     — mesma cobertura, chamando o use case real (nao apenas mock
 *     integrado ao redor).
 * Nao duplicado aqui para evitar teste redundante nesta suite.
 */
