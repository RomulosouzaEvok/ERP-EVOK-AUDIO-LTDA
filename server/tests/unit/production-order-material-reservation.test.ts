/**
 * Gap G3 — reserva de material VINCULADA a ordem de producao.
 *
 * Antes de 2026-08-09 a reserva era so um contador global
 * (`products.reserved_quantity`), sem dono. A liberacao fazia
 * `MIN(reservado_total, desejado)`, entao qualquer OP conseguia liberar — e
 * em seguida consumir — o material reservado por outra (canibalizacao).
 *
 * Este arquivo exercita `services/inventoryService` contra um duble em
 * memoria dos models (`Product`, `ProductionOrderReservation`,
 * `InventoryMovement`) que implementa a semantica que o Postgres implementa:
 * filtro por `where`, leitura/escrita de linha e agregacao. O duble e
 * deliberadamente burro (nada de SQL) para que o teste falhe pela REGRA, e
 * nao pelo mock.
 *
 * O que este teste NAO cobre (risco residual declarado no handoff): o
 * comportamento transacional real (`SELECT ... FOR UPDATE`), o indice unico
 * parcial e os CHECKs da migration. Isso so cai em teste de integracao
 * contra o Postgres.
 *
 * @group unit
 * @ticket G3-Onda2
 */

interface FakeProductRow {
  id: number;
  name: string;
  quantity: number;
  reserved_quantity: number;
}

interface FakeReservationRow {
  id: number;
  production_order_id: number;
  product_id: number;
  quantity: number;
  quantity_released: number;
  status: 'active' | 'released';
  released_at: Date | null;
  created_by: number | null;
  notes: string | null;
}

/** Estado do "banco" em memoria, recriado a cada teste. */
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
function asInstance<T extends Record<string, any>>(row: T): T & { update: (values: any) => Promise<any>; reload: () => Promise<any> } {
  return Object.assign(row, {
    update: async (values: any) => {
      Object.assign(row, values);
      return row;
    },
    reload: async () => row,
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
        production_order_id: Number(data.production_order_id),
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
}));

const InventoryService = require('../../src/services/inventoryService');
const { ProductionOrderReservation } = require('../../src/models/index');
import RemoveProductionOrderUseCase = require('../../src/modules/production/application/use-cases/RemoveProductionOrderUseCase');
import { BusinessRuleError } from '../../src/errors';

/** Transacao falsa — o duble ignora, mas a assinatura exige. */
const tx: any = { id: 'tx-1', LOCK: { UPDATE: 'UPDATE' } };

const OP_A = 3001;
const OP_B = 3002;
const COMPONENT = 101;

/** Reinicia o banco em memoria com um unico componente em estoque. */
function seedProduct(quantity: number): void {
  db.products = [{ id: COMPONENT, name: 'Ima de Ferrite 12"', quantity, reserved_quantity: 0 }];
  db.reservations = [];
  db.movements = [];
  db.nextReservationId = 1;
  db.nextMovementId = 1;
}

/** Saldo reservado (cache) do componente. */
const cachedReserved = (): number => db.products.find((p) => p.id === COMPONENT)!.reserved_quantity;

/** Somatorio das reservas vivas do componente — a fonte da verdade. */
const reservationsSum = (): number =>
  db.reservations
    .filter((r) => r.product_id === COMPONENT && r.status === 'active')
    .reduce((sum, r) => sum + (r.quantity - r.quantity_released), 0);

describe('G3 — reserva de material vinculada a ordem de producao', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    seedProduct(100);
  });

  describe('criacao da reserva', () => {
    it('persiste a reserva vinculada a OP que reservou', async () => {
      await InventoryService.reserve(COMPONENT, 30, 7, tx, { productionOrderId: OP_A });

      expect(db.reservations).toHaveLength(1);
      expect(db.reservations[0]).toMatchObject({
        production_order_id: OP_A,
        product_id: COMPONENT,
        quantity: 30,
        quantity_released: 0,
        status: 'active',
        created_by: 7,
      });
    });

    it('recusa reserva anonima (sem OP dona) — era exatamente o gap G3', async () => {
      await expect(
        InventoryService.reserve(COMPONENT, 30, 7, tx, { description: 'reserva sem dono' })
      ).rejects.toMatchObject({ statusCode: 400 });

      expect(db.reservations).toHaveLength(0);
      expect(cachedReserved()).toBe(0);
    });

    it('reforca a reserva existente em vez de criar uma segunda linha viva para a mesma OP x produto', async () => {
      await InventoryService.reserve(COMPONENT, 30, 7, tx, { productionOrderId: OP_A });
      await InventoryService.reserve(COMPONENT, 20, 7, tx, { productionOrderId: OP_A });

      expect(db.reservations.filter((r) => r.status === 'active')).toHaveLength(1);
      expect(db.reservations[0].quantity).toBe(50);
      expect(cachedReserved()).toBe(50);
    });

    it('bloqueia reserva acima do estoque disponivel (o reservado por outra OP nao conta como disponivel)', async () => {
      seedProduct(50);
      await InventoryService.reserve(COMPONENT, 40, 7, tx, { productionOrderId: OP_A });

      // Sobram 10 livres: a OP B nao pode reservar 20.
      await expect(
        InventoryService.reserve(COMPONENT, 20, 8, tx, { productionOrderId: OP_B })
      ).rejects.toMatchObject({ statusCode: 422 });

      expect(reservationsSum()).toBe(40);
      expect(cachedReserved()).toBe(40);
    });
  });

  describe('isolamento entre ordens (nucleo do G3)', () => {
    it('a OP B nao consegue liberar o material reservado pela OP A', async () => {
      await InventoryService.reserve(COMPONENT, 40, 7, tx, { productionOrderId: OP_A });

      const result = await InventoryService.releaseReservation(COMPONENT, 40, 8, tx, { productionOrderId: OP_B });

      expect(result.quantityAffected).toBe(0);
      // A reserva da OP A segue intacta e viva.
      expect(db.reservations).toHaveLength(1);
      expect(db.reservations[0]).toMatchObject({ production_order_id: OP_A, quantity_released: 0, status: 'active' });
      expect(cachedReserved()).toBe(40);
    });

    it('a OP B nao consegue consumir o estoque reservado pela OP A (canibalizacao)', async () => {
      seedProduct(50);
      await InventoryService.reserve(COMPONENT, 40, 7, tx, { productionOrderId: OP_A });

      // Tentativa da OP B de liberar e consumir: a liberacao vira no-op e o
      // consumo esbarra na disponibilidade (50 - 40 = 10 livres).
      await InventoryService.releaseReservation(COMPONENT, 40, 8, tx, { productionOrderId: OP_B });
      await expect(
        InventoryService.consume(COMPONENT, 40, 8, tx, { description: 'Consumo OP B' })
      ).rejects.toMatchObject({ statusCode: 422 });

      expect(db.products[0].quantity).toBe(50);
      expect(cachedReserved()).toBe(40);
    });

    it('liberar tudo da OP A nao encosta na reserva da OP B', async () => {
      await InventoryService.reserve(COMPONENT, 30, 7, tx, { productionOrderId: OP_A });
      await InventoryService.reserve(COMPONENT, 25, 8, tx, { productionOrderId: OP_B });
      expect(cachedReserved()).toBe(55);

      await InventoryService.releaseAllReservationsForOrder(OP_A, 7, tx, { description: 'Cancelamento da OP A' });

      const reservationA = db.reservations.find((r) => r.production_order_id === OP_A)!;
      const reservationB = db.reservations.find((r) => r.production_order_id === OP_B)!;
      expect(reservationA).toMatchObject({ status: 'released', quantity_released: 30 });
      expect(reservationB).toMatchObject({ status: 'active', quantity_released: 0 });
      expect(cachedReserved()).toBe(25);
    });

    it('liberar mais do que a propria OP reservou nao rouba saldo de terceiros', async () => {
      await InventoryService.reserve(COMPONENT, 10, 7, tx, { productionOrderId: OP_A });
      await InventoryService.reserve(COMPONENT, 60, 8, tx, { productionOrderId: OP_B });

      // A OP A pede a liberacao de 70 (o total do produto) — deve sair com 10.
      const result = await InventoryService.releaseReservation(COMPONENT, 70, 7, tx, { productionOrderId: OP_A });

      expect(result.quantityAffected).toBe(10);
      expect(cachedReserved()).toBe(60);
      expect(db.reservations.find((r) => r.production_order_id === OP_B)).toMatchObject({ quantity_released: 0, status: 'active' });
    });

    it('libera parcialmente mantendo o saldo remanescente da propria OP', async () => {
      await InventoryService.reserve(COMPONENT, 40, 7, tx, { productionOrderId: OP_A });

      const result = await InventoryService.releaseReservation(COMPONENT, 15, 7, tx, { productionOrderId: OP_A });

      expect(result.quantityAffected).toBe(15);
      expect(db.reservations[0]).toMatchObject({ quantity_released: 15, status: 'active' });
      expect(cachedReserved()).toBe(25);
    });

    it('liberacao de OP sem reserva (dado legado, anterior a migration) e no-op, nao erro', async () => {
      const result = await InventoryService.releaseReservation(COMPONENT, 10, 7, tx, { productionOrderId: OP_A });

      expect(result.success).toBe(true);
      expect(result.quantityAffected).toBe(0);
      expect(cachedReserved()).toBe(0);
    });
  });

  describe('cache products.reserved_quantity', () => {
    it('permanece igual a soma das reservas vivas em toda a sequencia reservar/liberar', async () => {
      const assertCoherent = () => expect(cachedReserved()).toBeCloseTo(reservationsSum(), 6);

      await InventoryService.reserve(COMPONENT, 12.5, 7, tx, { productionOrderId: OP_A });
      assertCoherent();

      await InventoryService.reserve(COMPONENT, 7.25, 8, tx, { productionOrderId: OP_B });
      assertCoherent();

      await InventoryService.releaseReservation(COMPONENT, 5, 7, tx, { productionOrderId: OP_A });
      assertCoherent();

      await InventoryService.releaseAllReservationsForOrder(OP_A, 7, tx, {});
      assertCoherent();
      expect(cachedReserved()).toBeCloseTo(7.25, 6);

      await InventoryService.releaseAllReservationsForOrder(OP_B, 8, tx, {});
      assertCoherent();
      expect(cachedReserved()).toBe(0);
    });

    it('se auto-corrige a partir da fonte da verdade quando o cache esta divergente', async () => {
      // Dado herdado: contador global inflado sem nenhuma reserva por tras —
      // exatamente o que a migration vai encontrar num banco com dado real, e
      // o motivo de o backfill existir. Na primeira operacao de reserva
      // daquele produto o cache converge para a soma das reservas vivas.
      db.products[0].reserved_quantity = 40;

      await InventoryService.reserve(COMPONENT, 10, 7, tx, { productionOrderId: OP_A });

      expect(cachedReserved()).toBe(10);
      expect(cachedReserved()).toBe(reservationsSum());
    });

    it('cache inflado sem reserva por tras bloqueia reserva nova ate ser corrigido (por que o backfill importa)', async () => {
      seedProduct(50);
      // 50 em estoque, cache dizendo que 45 estao reservados, mas sem
      // nenhuma linha de reserva: so 5 aparecem como disponiveis.
      db.products[0].reserved_quantity = 45;

      await expect(
        InventoryService.reserve(COMPONENT, 20, 7, tx, { productionOrderId: OP_A })
      ).rejects.toMatchObject({ statusCode: 422 });
    });

    it('liberacao total zera o cache e marca a reserva como historico', async () => {
      await InventoryService.reserve(COMPONENT, 40, 7, tx, { productionOrderId: OP_A });
      await InventoryService.releaseAllReservationsForOrder(OP_A, 7, tx, {});

      expect(cachedReserved()).toBe(0);
      expect(db.reservations[0].status).toBe('released');
      expect(db.reservations[0].quantity_released).toBe(40);
      expect(db.reservations[0].released_at).toBeInstanceOf(Date);
    });
  });

  describe('consulta "quanto esta reservado para a OP X?"', () => {
    it('lista apenas as reservas vivas da ordem consultada', async () => {
      await InventoryService.reserve(COMPONENT, 30, 7, tx, { productionOrderId: OP_A });
      await InventoryService.reserve(COMPONENT, 25, 8, tx, { productionOrderId: OP_B });

      const reservationsOfA = await InventoryService.listOrderReservations(OP_A, tx);

      expect(reservationsOfA).toHaveLength(1);
      expect(reservationsOfA[0]).toMatchObject({ production_order_id: OP_A, quantity: 30 });
    });
  });

  describe('RemoveProductionOrderUseCase — OP nao pode sumir segurando material', () => {
    it('bloqueia a remocao de OP com reserva ativa e orienta a cancelar antes', async () => {
      await InventoryService.reserve(COMPONENT, 30, 7, tx, { productionOrderId: OP_A });

      const repository = {
        findRawById: jest.fn(async () => ({ id: OP_A, order_number: 'OP-2026-0001', status: 'released' })),
        countActiveMaterialReservations: jest.fn(async (id: number) =>
          ProductionOrderReservation.count({ where: { production_order_id: id, status: 'active' } })
        ),
        destroy: jest.fn(),
      };

      await expect(new RemoveProductionOrderUseCase(repository).execute({ id: OP_A })).rejects.toBeInstanceOf(BusinessRuleError);
      expect(repository.destroy).not.toHaveBeenCalled();
    });

    it('permite a remocao depois que o material foi devolvido (OP cancelada)', async () => {
      await InventoryService.reserve(COMPONENT, 30, 7, tx, { productionOrderId: OP_A });
      await InventoryService.releaseAllReservationsForOrder(OP_A, 7, tx, {});

      const repository = {
        findRawById: jest.fn(async () => ({ id: OP_A, order_number: 'OP-2026-0001', status: 'canceled' })),
        countActiveMaterialReservations: jest.fn(async (id: number) =>
          ProductionOrderReservation.count({ where: { production_order_id: id, status: 'active' } })
        ),
        destroy: jest.fn(async () => 1),
      };

      await new RemoveProductionOrderUseCase(repository).execute({ id: OP_A });
      expect(repository.destroy).toHaveBeenCalledWith(OP_A);
    });
  });
});
