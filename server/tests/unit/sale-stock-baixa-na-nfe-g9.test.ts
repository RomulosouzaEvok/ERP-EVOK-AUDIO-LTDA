/**
 * Gap G9 — a baixa de estoque da venda sai da CONFIRMACAO do pedido e passa
 * para a AUTORIZACAO DA NF-e.
 *
 * Base normativa (decisao D-A do dono, `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4;
 * pesquisa em `docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`):
 * Ajuste SINIEF 07/05, clausula 1a §1o e clausula 9a §1o — a NF-e e
 * autorizada antes do fato gerador e a mercadoria so transita depois da
 * autorizacao de uso. Baixar na confirmacao registrava saida de mercadoria
 * que ainda estava fisicamente na empresa.
 *
 * Diferente de `issue-sale-nfe-partial.test.ts` (que dubla o servico de
 * estoque para isolar o use case fiscal), este arquivo exercita o CAMINHO
 * REAL: `ChangeSaleStatusUseCase` -> `services/inventoryService` ->
 * `services/saleStockService`, contra um duble em memoria dos models que
 * implementa a semantica que o Postgres implementa (filtro por `where`,
 * leitura/escrita de linha, agregacao). O duble e deliberadamente burro
 * para que o teste falhe pela REGRA, e nao pelo mock.
 *
 * O que este teste NAO cobre (risco residual declarado no handoff): o
 * comportamento transacional real (`SELECT ... FOR UPDATE`), o CHECK de
 * exatamente-um-dono e os indices unicos parciais da migration
 * `20260810-000030`. Isso so cai em teste de integracao contra o Postgres.
 *
 * @group unit
 * @ticket G9-Onda3
 */

interface FakeProductRow {
  id: number;
  name: string;
  quantity: number;
  reserved_quantity: number;
}

interface FakeReservationRow {
  id: number;
  production_order_id: number | null;
  sale_id: number | null;
  product_id: number;
  quantity: number;
  quantity_released: number;
  status: 'active' | 'released';
  released_at: Date | null;
  created_by: number | null;
  notes: string | null;
}

const db: {
  products: FakeProductRow[];
  reservations: FakeReservationRow[];
  movements: any[];
  nextReservationId: number;
  nextMovementId: number;
} = { products: [], reservations: [], movements: [], nextReservationId: 1, nextMovementId: 1 };

/** Aplica um `where` simples (igualdade em todas as chaves) a uma linha. */
function matchesWhere(row: any, where: Record<string, any> = {}): boolean {
  return Object.entries(where).every(([key, value]) => row[key] === value);
}

/** Envelopa uma linha crua com a API minima de instancia do Sequelize. */
function asInstance<T extends Record<string, any>>(row: T): any {
  return Object.assign(row, {
    update: async (values: any) => {
      Object.assign(row, values);
      return row;
    },
    reload: async () => row,
    increment: async (field: string, options: any) => {
      (row as any)[field] = Number((row as any)[field]) + Number(options.by);
      return row;
    },
    decrement: async (field: string, options: any) => {
      (row as any)[field] = Number((row as any)[field]) - Number(options.by);
      return row;
    },
  });
}

jest.mock('../../src/models/index', () => ({
  Product: {
    findByPk: jest.fn(async (id: number) => {
      const row = db.products.find((p) => p.id === Number(id));
      return row ? asInstance(row) : null;
    }),
    update: jest.fn(async (values: any, options: any) => {
      const row = db.products.find((p) => p.id === Number(options?.where?.id));
      if (row) Object.assign(row, values);
      return [row ? 1 : 0];
    }),
  },
  ProductionOrderReservation: {
    findAll: jest.fn(async (options: any = {}) => {
      const rows = db.reservations.filter((r) => matchesWhere(r, options.where));
      rows.sort((a, b) => a.product_id - b.product_id);
      return rows.map(asInstance);
    }),
    findOne: jest.fn(async (options: any = {}) => {
      const row = db.reservations.find((r) => matchesWhere(r, options.where));
      return row ? asInstance(row) : null;
    }),
    create: jest.fn(async (data: any) => {
      const row: FakeReservationRow = {
        id: db.nextReservationId++,
        production_order_id: data.production_order_id ?? null,
        sale_id: data.sale_id ?? null,
        product_id: Number(data.product_id),
        quantity: Number(data.quantity),
        quantity_released: Number(data.quantity_released ?? 0),
        status: data.status ?? 'active',
        released_at: data.released_at ?? null,
        created_by: data.created_by ?? null,
        notes: data.notes ?? null,
      };
      db.reservations.push(row);
      return asInstance(row);
    }),
    count: jest.fn(async (options: any = {}) => db.reservations.filter((r) => matchesWhere(r, options.where)).length),
  },
  InventoryMovement: {
    create: jest.fn(async (data: any) => {
      const row = { id: db.nextMovementId++, ...data };
      db.movements.push(row);
      return row;
    }),
  },
  // O gate de lote (D-L, `services/saleLotService`) entrou no caminho da baixa
  // em 2026-08-10. Esta suite exercita, de proposito, o produto SEM lote
  // nenhum — estoque legado, que e o cenario que ela sempre testou: com
  // `LotControl.findAll` vazio, `evaluateLotGate` devolve `governed: false` e
  // nao ha expedicao por lote a gravar. A governanca de lote tem suite propria.
  LotControl: {
    findAll: jest.fn(async () => []),
    findByPk: jest.fn(async () => null),
  },
  SaleLotShipment: {
    findAll: jest.fn(async () => []),
    create: jest.fn(async (data: any) => asInstance({ id: 1, ...data })),
  },
}));

// O saldo por deposito vive em outro model (`ProductWarehouseStock`) e tem
// teste proprio; aqui interessa apenas provar que o dual-write acompanha a
// baixa (e SO a baixa, nunca a reserva).
jest.mock('../../src/services/warehouseStockService', () => ({
  getWarehouseByCode: jest.fn(async (code: string) => ({ id: code === 'ACABADOS' ? 2 : 1, code })),
  addToWarehouse: jest.fn(async () => ({})),
  removeFromWarehouse: jest.fn(async () => ({})),
}));

const InventoryService = require('../../src/services/inventoryService');
const SaleStockService = require('../../src/services/saleStockService');
const WarehouseStockService = require('../../src/services/warehouseStockService');
import ChangeSaleStatusUseCase = require('../../src/modules/sales/application/use-cases/ChangeSaleStatusUseCase');

/**
 * Valores aceitos por `inventory_movements.reference_type` no ENUM real do
 * PostgreSQL (`enum_inventory_movements_reference_type`), conferidos no
 * banco em 2026-08-10. Literal fora desta lista passa por typecheck e pela
 * suite inteira e so explode como 500 do Postgres — foi exatamente o que
 * aconteceu com `'reservation'`/`'reservation_release'` gravados pelo G3.
 */
const VALID_REFERENCE_TYPES = ['sale', 'purchase', 'production', 'adjustment', 'transfer', 'sst_epi_delivery', 'import'];

/** Transacao falsa — o duble ignora, mas a assinatura exige. */
const tx: any = { id: 'tx-g9', LOCK: { UPDATE: 'UPDATE' } };

const PRODUTO = 25;
const VENDA = 7;
const OUTRA_VENDA = 8;
const OP = 7; // MESMO id numerico da venda, de proposito (ver teste de isolamento)

function seedProduct(quantity: number): void {
  db.products = [{ id: PRODUTO, name: 'Alto-falante 12pol', quantity, reserved_quantity: 0 }];
  db.reservations = [];
  db.movements = [];
  db.nextReservationId = 1;
  db.nextMovementId = 1;
}

const produto = (): FakeProductRow => db.products.find((p) => p.id === PRODUTO)!;

/** Venda `quote` com 1 item, pronta para ser confirmada pelo use case. */
function buildQuote(quantity: number, invoicedQuantity = 0) {
  return {
    id: VENDA,
    status: 'quote',
    nfe_status: 'pending',
    total_amount: '1000.00',
    installments: 1,
    payment_method: 'boleto',
    items: [{ id: 1, product_id: PRODUTO, quantity, invoiced_quantity: invoicedQuantity }],
    save: jest.fn(async function (this: any) { return this; }),
  };
}

function buildSaleRepository(sale: any) {
  return {
    findSaleWithItemsForUpdate: jest.fn(async () => sale),
    cancelPendingReceivables: jest.fn(async () => {}),
    createAccountReceivable: jest.fn(async () => ({})),
  };
}

describe('G9 — baixa de estoque na NF-e, reserva na confirmacao do pedido', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    seedProduct(100);
  });

  describe('confirmacao do pedido', () => {
    it('RESERVA o produto acabado e NAO baixa o estoque', async () => {
      const sale = buildQuote(10);
      const useCase = new ChangeSaleStatusUseCase(buildSaleRepository(sale));

      await useCase.execute({ id: sale.id, status: 'confirmed', userId: 3, transaction: tx });

      // O saldo fisico continua o mesmo: a mercadoria ainda esta no galpao.
      expect(produto().quantity).toBe(100);
      // Mas esta comprometida com este pedido.
      expect(produto().reserved_quantity).toBe(10);
      expect(db.reservations).toHaveLength(1);
      expect(db.reservations[0]).toMatchObject({
        sale_id: VENDA,
        production_order_id: null,
        product_id: PRODUTO,
        quantity: 10,
        status: 'active',
        created_by: 3,
      });
    });

    it('nao gera movimentacao de estoque (reserva nao move quantidade)', async () => {
      const sale = buildQuote(10);
      const useCase = new ChangeSaleStatusUseCase(buildSaleRepository(sale));

      await useCase.execute({ id: sale.id, status: 'confirmed', userId: 3, transaction: tx });

      // Guarda contra a regressao do G3: gravar movimento de reserva com
      // reference_type 'reservation' (valor inexistente no ENUM) fazia toda
      // confirmacao de pedido morrer em 500 no Postgres real.
      expect(db.movements).toHaveLength(0);
    });

    it('nao movimenta saldo de deposito na confirmacao', async () => {
      const sale = buildQuote(10);
      const useCase = new ChangeSaleStatusUseCase(buildSaleRepository(sale));

      await useCase.execute({ id: sale.id, status: 'confirmed', userId: 3, transaction: tx });

      expect(WarehouseStockService.removeFromWarehouse).not.toHaveBeenCalled();
      expect(WarehouseStockService.addToWarehouse).not.toHaveBeenCalled();
    });

    it('bloqueia confirmar pedido sem estoque disponivel, citando a regra', async () => {
      seedProduct(4);
      const sale = buildQuote(10);
      const useCase = new ChangeSaleStatusUseCase(buildSaleRepository(sale));

      await expect(
        useCase.execute({ id: sale.id, status: 'confirmed', userId: 3, transaction: tx })
      ).rejects.toMatchObject({ statusCode: 422 });

      expect(db.reservations).toHaveLength(0);
      expect(produto().quantity).toBe(4);
    });
  });

  describe('faturamento (autorizacao da NF-e)', () => {
    /** Confirma o pedido de `quantity` unidades e devolve a venda. */
    async function confirmar(quantity: number) {
      const sale = buildQuote(quantity);
      await new ChangeSaleStatusUseCase(buildSaleRepository(sale)).execute({
        id: sale.id, status: 'confirmed', userId: 3, transaction: tx,
      });
      return sale;
    }

    it('baixa exatamente a quantidade faturada, consumindo a reserva do pedido', async () => {
      await confirmar(10);

      await SaleStockService.commitInvoicedStock(VENDA, [{ productId: PRODUTO, quantity: 4 }], 3, tx);

      // 4 unidades sairam de fato do estoque...
      expect(produto().quantity).toBe(96);
      // ...e as outras 6 continuam reservadas para este mesmo pedido.
      expect(produto().reserved_quantity).toBe(6);
      expect(db.reservations[0]).toMatchObject({ sale_id: VENDA, quantity_released: 4, status: 'active' });
    });

    it('a segunda emissao baixa SO o restante e encerra a reserva', async () => {
      await confirmar(10);

      await SaleStockService.commitInvoicedStock(VENDA, [{ productId: PRODUTO, quantity: 4 }], 3, tx);
      await SaleStockService.commitInvoicedStock(VENDA, [{ productId: PRODUTO, quantity: 6 }], 3, tx);

      expect(produto().quantity).toBe(90);
      expect(produto().reserved_quantity).toBe(0);
      expect(db.reservations[0]).toMatchObject({ sale_id: VENDA, quantity_released: 10, status: 'released' });
      expect(db.reservations[0].released_at).toBeInstanceOf(Date);
    });

    it('a soma das baixas parciais nunca ultrapassa o pedido (nao baixa o pedido inteiro em cada emissao)', async () => {
      await confirmar(10);

      await SaleStockService.commitInvoicedStock(VENDA, [{ productId: PRODUTO, quantity: 3 }], 3, tx);
      await SaleStockService.commitInvoicedStock(VENDA, [{ productId: PRODUTO, quantity: 3 }], 3, tx);
      await SaleStockService.commitInvoicedStock(VENDA, [{ productId: PRODUTO, quantity: 4 }], 3, tx);

      // 100 - (3 + 3 + 4) = 90. Se cada emissao baixasse o pedido inteiro,
      // o saldo teria caido para 70.
      expect(produto().quantity).toBe(90);
      expect(produto().reserved_quantity).toBe(0);
    });

    it('gera movimentacao de saida com reference_type valido no ENUM do Postgres', async () => {
      await confirmar(10);
      await SaleStockService.commitInvoicedStock(VENDA, [{ productId: PRODUTO, quantity: 4 }], 3, tx);

      expect(db.movements).toHaveLength(1);
      expect(db.movements[0]).toMatchObject({
        product_id: PRODUTO,
        type: 'out',
        quantity: 4,
        reference_type: 'sale',
        reference_id: VENDA,
        user_id: 3,
      });
      expect(VALID_REFERENCE_TYPES).toContain(db.movements[0].reference_type);
    });

    it('debita o deposito ACABADOS junto da baixa (dual-write)', async () => {
      await confirmar(10);
      await SaleStockService.commitInvoicedStock(VENDA, [{ productId: PRODUTO, quantity: 4 }], 3, tx);

      expect(WarehouseStockService.removeFromWarehouse).toHaveBeenCalledWith(PRODUTO, 2, 4, tx);
    });

    it('venda legada sem reserva (anterior a migration) ainda consegue faturar', async () => {
      // Nenhuma confirmacao: nao ha linha de reserva para esta venda.
      await SaleStockService.commitInvoicedStock(VENDA, [{ productId: PRODUTO, quantity: 4 }], 3, tx);

      expect(produto().quantity).toBe(96);
      expect(db.reservations).toHaveLength(0);
    });
  });

  describe('isolamento entre donos de reserva', () => {
    it('uma venda nao consegue liberar/consumir a reserva de outra venda', async () => {
      const sale = buildQuote(60);
      await new ChangeSaleStatusUseCase(buildSaleRepository(sale)).execute({
        id: sale.id, status: 'confirmed', userId: 3, transaction: tx,
      });

      // A outra venda tenta faturar 60 do mesmo produto: a liberacao e no-op
      // (a reserva nao e dela) e o consumo esbarra na disponibilidade
      // (100 - 60 reservados = 40 livres).
      await expect(
        SaleStockService.commitInvoicedStock(OUTRA_VENDA, [{ productId: PRODUTO, quantity: 60 }], 4, tx)
      ).rejects.toMatchObject({ statusCode: 422 });

      expect(produto().quantity).toBe(100);
      expect(produto().reserved_quantity).toBe(60);
    });

    it('uma OP nao libera a reserva de uma venda com o MESMO id numerico', async () => {
      const sale = buildQuote(30);
      await new ChangeSaleStatusUseCase(buildSaleRepository(sale)).execute({
        id: sale.id, status: 'confirmed', userId: 3, transaction: tx,
      });

      const result = await InventoryService.releaseReservation(PRODUTO, 30, 9, tx, { productionOrderId: OP });

      expect(result.quantityAffected).toBe(0);
      expect(produto().reserved_quantity).toBe(30);
      expect(db.reservations[0]).toMatchObject({ sale_id: VENDA, quantity_released: 0, status: 'active' });
    });

    it('liberar tudo de uma venda nao encosta na reserva de uma OP', async () => {
      const sale = buildQuote(30);
      await new ChangeSaleStatusUseCase(buildSaleRepository(sale)).execute({
        id: sale.id, status: 'confirmed', userId: 3, transaction: tx,
      });
      await InventoryService.reserve(PRODUTO, 25, 9, tx, { productionOrderId: 999 });
      expect(produto().reserved_quantity).toBe(55);

      await InventoryService.releaseAllReservationsForSale(VENDA, 3, tx, {});

      expect(produto().reserved_quantity).toBe(25);
      expect(db.reservations.find((r) => r.production_order_id === 999)).toMatchObject({ status: 'active' });
    });
  });

  describe('dono da reserva (exatamente um)', () => {
    it('recusa reserva sem dono, com details.rule explicito', async () => {
      await expect(InventoryService.reserve(PRODUTO, 10, 3, tx, {})).rejects.toMatchObject({
        statusCode: 400,
        details: { rule: 'reservation_requires_owner' },
      });
      expect(db.reservations).toHaveLength(0);
    });

    it('recusa reserva com DOIS donos, com details.rule explicito', async () => {
      await expect(
        InventoryService.reserve(PRODUTO, 10, 3, tx, { saleId: VENDA, productionOrderId: 999 })
      ).rejects.toMatchObject({
        statusCode: 400,
        details: { rule: 'reservation_requires_exactly_one_owner' },
      });
      expect(db.reservations).toHaveLength(0);
    });

    it('recusa quantidade de reserva nao positiva, com details.rule explicito', async () => {
      await expect(InventoryService.reserve(PRODUTO, 0, 3, tx, { saleId: VENDA })).rejects.toMatchObject({
        statusCode: 400,
        details: { rule: 'reservation_quantity_must_be_positive' },
      });
    });
  });

  describe('cancelamento da venda', () => {
    it('cancelar pedido confirmado (nada faturado) libera a reserva sem inflar o estoque', async () => {
      const sale = buildQuote(10);
      const repository = buildSaleRepository(sale);
      await new ChangeSaleStatusUseCase(repository).execute({
        id: sale.id, status: 'confirmed', userId: 3, transaction: tx,
      });

      await new ChangeSaleStatusUseCase(repository).execute({
        id: sale.id, status: 'canceled', userId: 3, transaction: tx,
      });

      expect(produto().quantity).toBe(100); // nada entrou: nada tinha saido
      expect(produto().reserved_quantity).toBe(0);
      expect(db.reservations[0]).toMatchObject({ status: 'released', quantity_released: 10 });
      expect(db.movements).toHaveLength(0);
    });

    it('cancelar pedido parcialmente faturado devolve SO o que foi faturado', async () => {
      const sale = buildQuote(10);
      const repository = buildSaleRepository(sale);
      await new ChangeSaleStatusUseCase(repository).execute({
        id: sale.id, status: 'confirmed', userId: 3, transaction: tx,
      });

      // Fatura 4 (baixa real) e espelha em invoiced_quantity, como faz o
      // caminho fiscal na mesma transacao.
      await SaleStockService.commitInvoicedStock(VENDA, [{ productId: PRODUTO, quantity: 4 }], 3, tx);
      sale.items[0].invoiced_quantity = 4;
      sale.status = 'partially_invoiced';
      expect(produto().quantity).toBe(96);

      await new ChangeSaleStatusUseCase(repository).execute({
        id: sale.id, status: 'canceled', userId: 3, transaction: tx,
      });

      // As 4 faturadas voltam; as 6 restantes so saem da reserva.
      expect(produto().quantity).toBe(100);
      expect(produto().reserved_quantity).toBe(0);
      expect(WarehouseStockService.addToWarehouse).toHaveBeenCalledWith(PRODUTO, 2, 4, tx);
    });

    it('cancelar orcamento (quote) nao movimenta estoque nenhum', async () => {
      const sale = buildQuote(10);
      const repository = buildSaleRepository(sale);

      await new ChangeSaleStatusUseCase(repository).execute({
        id: sale.id, status: 'canceled', userId: 3, transaction: tx,
      });

      // Antes do G9 este caminho fazia `receive(item.quantity)` e criava
      // estoque fantasma ao cancelar um orcamento que nunca debitou nada.
      expect(produto().quantity).toBe(100);
      expect(produto().reserved_quantity).toBe(0);
      expect(db.movements).toHaveLength(0);
    });
  });
});
