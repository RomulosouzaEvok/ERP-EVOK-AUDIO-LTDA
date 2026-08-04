/**
 * Test: Custeio real de mao-de-obra e overhead na conclusao da OP
 * (roadmap pos-Go-Live, item 7/9 do LEVANTAMENTO_ERP).
 *
 * Cobre `ChangeProductionOrderStatusUseCase.completeOrder()` +
 * `CostingService.registerAdditionalProductionCost()` com a implementacao
 * REAL de `costingService` (nao mockada) para validar a matematica do
 * custo ponderado incremental (`product.cost_price`) e os lancamentos
 * granulares em `product_cost_ledgers` (`source_type: 'production_labor'`
 * e `'production_overhead'`).
 *
 * @group unit
 */

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (callback?: any) => {
      const transaction = { id: 'tx-labor-1', LOCK: { UPDATE: 'UPDATE' }, commit: jest.fn(), rollback: jest.fn() };
      if (callback) return callback(transaction);
      return transaction;
    }),
  },
}));

jest.mock('../../src/services/bomService', () => ({
  checkAvailability: jest.fn(),
  explodeBOM: jest.fn(),
}));

jest.mock('../../src/services/inventoryService', () => ({
  reserve: jest.fn(async () => ({})),
  consume: jest.fn(async () => ({})),
  receive: jest.fn(),
  releaseReservation: jest.fn(async () => ({})),
}));

jest.mock('../../src/services/warehouseStockService', () => ({
  getWarehouseByCode: jest.fn(async (code: string) => ({ id: code === 'ACABADOS' ? 2 : 1, code })),
  addToWarehouse: jest.fn(async () => ({})),
  removeFromWarehouse: jest.fn(async () => ({})),
}));

// costingService NAO mockado: usa a implementacao real para validar a
// matematica do custo ponderado incremental.
jest.mock('../../src/models/ProductCostLedger', () => ({
  create: jest.fn(async (data: any) => ({ id: Math.floor(Math.random() * 100000), ...data })),
}));

jest.mock('../../src/models/index', () => ({
  LotControl: {
    create: jest.fn(async () => ({ id: 1, lot_number: 'LOT-001', status: 'available', quantity_available: 10 })),
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
  ProductionLotConsumption: { create: jest.fn(async () => ({ id: 1 })) },
  SerialNumber: { create: jest.fn(async () => ({ id: 1 })) },
  ProductionCostSettings: { findByPk: jest.fn() },
}));

import ChangeProductionOrderStatusUseCase = require('../../src/modules/production/application/use-cases/ChangeProductionOrderStatusUseCase');

const BomService = require('../../src/services/bomService');
const InventoryService = require('../../src/services/inventoryService');
const ProductCostLedger = require('../../src/models/ProductCostLedger');
const { ProductionCostSettings } = require('../../src/models/index');

/** Cria um stub de Product com `.update()` que reflete `cost_price` in-memory. */
function createProductStub(id: number, quantity: number, costPrice: number) {
  const product: any = { id, quantity, cost_price: costPrice };
  product.update = jest.fn(async (data: any) => {
    Object.assign(product, data);
    return product;
  });
  return product;
}

/** Cria uma configuracao de `production_cost_settings` mockada (com `.get()`). */
function mockSettings(overrides: Partial<{
  overhead_calculation_basis: string;
  overhead_rate_percent: number;
  default_labor_rate_per_hour: number;
}> = {}) {
  const settings = {
    overhead_calculation_basis: 'material_labor',
    overhead_rate_percent: 0,
    default_labor_rate_per_hour: 0,
    ...overrides,
  };
  return { ...settings, get: () => settings };
}

/** Cria um tracking `completed` com horas conhecidas e work center opcional. */
function makeTracking(startHour: number, endHour: number, costPerHour: number | null) {
  return {
    status: 'completed',
    started_at: new Date(2026, 0, 1, startHour, 0, 0),
    finished_at: new Date(2026, 0, 1, endHour, 0, 0),
    routeStep: costPerHour === null ? null : { workCenter: { cost_per_hour: costPerHour } },
  };
}

function baseRepository(overrides: any = {}) {
  return {
    listTrackingByOrderForUpdate: jest.fn(async () => []),
    listTrackingWithRouteStepByOrder: jest.fn(async () => []),
    findByIdForUpdate: jest.fn(async () => ({
      id: 1,
      status: 'in_progress',
      order_number: 'OP-2026-0099',
      product_id: 1,
      quantity: 10,
      due_date: new Date('2026-08-20'),
      get: function () { return this; },
    })),
    update: jest.fn(),
    findByIdWithProductSummary: jest.fn(async () => ({ id: 1, status: 'completed' })),
    findProductById: jest.fn(async () => ({ id: 1, reserved_quantity: 0 })),
    ...overrides,
  };
}

describe('Custeio real de mao-de-obra e overhead (item 7/9)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    BomService.explodeBOM.mockResolvedValue({ components: [], total_cost: 200 });
  });

  it('lanca production_labor e production_overhead com horas apontadas x cost_per_hour do centro de trabalho', async () => {
    const product = createProductStub(1, 10, 0);
    InventoryService.receive.mockResolvedValueOnce({ product });
    ProductionCostSettings.findByPk.mockResolvedValueOnce(
      mockSettings({ overhead_calculation_basis: 'material_labor', overhead_rate_percent: 10 })
    );

    const productionOrderRepository = baseRepository({
      listTrackingWithRouteStepByOrder: jest.fn(async () => [makeTracking(8, 10, 50)]), // 2h x 50/h = 100
    });

    const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);
    await useCase.execute({ id: 1, status: 'completed', quantity_produced: 10, user_id: 1 });

    const calls = (ProductCostLedger.create as jest.Mock).mock.calls.map((c) => c[0]);
    const materialEntry = calls.find((c) => c.source_type === 'production');
    const laborEntry = calls.find((c) => c.source_type === 'production_labor');
    const overheadEntry = calls.find((c) => c.source_type === 'production_overhead');

    expect(materialEntry).toMatchObject({ quantity: 10, unit_cost: 20, total_cost: 200 });
    // Mao-de-obra: 2h * 50/h = 100 total -> 10/unidade.
    expect(laborEntry).toMatchObject({ quantity: 10, unit_cost: 10, total_cost: 100 });
    // Overhead material_labor: (200 material + 100 labor) * 10% = 30 -> 3/unidade.
    expect(overheadEntry).toMatchObject({ quantity: 10, unit_cost: 3, total_cost: 30 });

    // custo final = material(20) + labor(10) + overhead(3) = 33/unidade.
    expect(product.cost_price).toBeCloseTo(33, 4);
  });

  it('usa production_cost_settings.default_labor_rate_per_hour quando a etapa nao tem work_center_id', async () => {
    const product = createProductStub(1, 10, 0);
    InventoryService.receive.mockResolvedValueOnce({ product });
    ProductionCostSettings.findByPk.mockResolvedValueOnce(
      mockSettings({ overhead_calculation_basis: 'material_only', overhead_rate_percent: 0, default_labor_rate_per_hour: 40 })
    );

    const productionOrderRepository = baseRepository({
      // Etapa sem work_center (routeStep null) -> usa fallback global (40/h).
      listTrackingWithRouteStepByOrder: jest.fn(async () => [makeTracking(8, 9, null)]), // 1h x 40/h = 40
    });

    const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);
    await useCase.execute({ id: 1, status: 'completed', quantity_produced: 10, user_id: 1 });

    const calls = (ProductCostLedger.create as jest.Mock).mock.calls.map((c) => c[0]);
    const laborEntry = calls.find((c) => c.source_type === 'production_labor');
    const overheadEntry = calls.find((c) => c.source_type === 'production_overhead');

    expect(laborEntry).toMatchObject({ quantity: 10, unit_cost: 4, total_cost: 40 });
    // overhead_rate_percent = 0 -> nenhum lancamento de overhead.
    expect(overheadEntry).toBeUndefined();
  });

  it('OP sem nenhum apontamento nao lanca custo de mao-de-obra (nem quebra a conclusao)', async () => {
    const product = createProductStub(1, 10, 0);
    InventoryService.receive.mockResolvedValueOnce({ product });
    ProductionCostSettings.findByPk.mockResolvedValueOnce(
      mockSettings({ overhead_calculation_basis: 'material_only', overhead_rate_percent: 5 })
    );

    const productionOrderRepository = baseRepository({
      listTrackingWithRouteStepByOrder: jest.fn(async () => []), // sem apontamento
    });

    const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);
    await expect(
      useCase.execute({ id: 1, status: 'completed', quantity_produced: 10, user_id: 1 })
    ).resolves.toBeDefined();

    const calls = (ProductCostLedger.create as jest.Mock).mock.calls.map((c) => c[0]);
    expect(calls.find((c) => c.source_type === 'production_labor')).toBeUndefined();
    // Overhead ainda e lancado sobre material (material_only, 5%: 200*0.05=10).
    const overheadEntry = calls.find((c) => c.source_type === 'production_overhead');
    expect(overheadEntry).toMatchObject({ quantity: 10, unit_cost: 1, total_cost: 10 });
  });

  it.each([
    ['material_labor', 200 + 80],
    ['labor_only', 80],
    ['material_only', 200],
  ])('overhead_calculation_basis=%s aplica o percentual sobre a base correta', async (basis, expectedBase) => {
    const product = createProductStub(1, 10, 0);
    InventoryService.receive.mockResolvedValueOnce({ product });
    ProductionCostSettings.findByPk.mockResolvedValueOnce(
      mockSettings({ overhead_calculation_basis: basis, overhead_rate_percent: 25 })
    );

    const productionOrderRepository = baseRepository({
      listTrackingWithRouteStepByOrder: jest.fn(async () => [makeTracking(8, 10, 40)]), // 2h x 40/h = 80
    });

    const useCase = new ChangeProductionOrderStatusUseCase(productionOrderRepository);
    await useCase.execute({ id: 1, status: 'completed', quantity_produced: 10, user_id: 1 });

    const calls = (ProductCostLedger.create as jest.Mock).mock.calls.map((c) => c[0]);
    const overheadEntry = calls.find((c) => c.source_type === 'production_overhead');

    expect(overheadEntry.total_cost).toBeCloseTo(expectedBase * 0.25, 4);
  });
});
