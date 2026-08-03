/**
 * Test: Onda 3 — Expedição (shipped), Cockpit de Compras e Projeção de
 * Fluxo de Caixa.
 *
 * Cobre:
 * 1) `ChangeSaleStatusUseCase`: transição `invoiced -> shipped` permitida;
 *    `confirmed -> shipped` rejeitada (422); cancelamento de venda `shipped`
 *    bloqueado (422 com mensagem dedicada).
 * 2) `GetPurchaseCockpitUseCase`: delega ao repositório e retorna o
 *    envelope de métricas esperado.
 * 3) `GetCashFlowProjectionUseCase`: projeção com semanas, saldo acumulado
 *    e bucket de vencidos, mockando o repositório.
 *
 * @group unit
 * @ticket Onda3
 */

jest.mock('../../src/services/inventoryService', () => ({
  consume: jest.fn(async () => ({ product: { id: 10, quantity: 8 } })),
  receive: jest.fn(async () => ({ product: { id: 10, quantity: 10 } })),
}));

import { BusinessRuleError } from '../../src/errors';

import ChangeSaleStatusUseCase = require('../../src/modules/sales/application/use-cases/ChangeSaleStatusUseCase');
import GetPurchaseCockpitUseCase = require('../../src/modules/purchases/application/use-cases/GetPurchaseCockpitUseCase');
import GetCashFlowProjectionUseCase = require('../../src/modules/financial/application/use-cases/GetCashFlowProjectionUseCase');

const InventoryService = require('../../src/services/inventoryService');

describe('Onda 3 - Expedicao (shipped)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function buildSaleRepository(sale: any) {
    return {
      findSaleWithItemsForUpdate: jest.fn(async () => sale),
      cancelPendingReceivables: jest.fn(async () => {}),
      createAccountReceivable: jest.fn(async (data: any) => ({ id: 1, ...data })),
    };
  }

  const baseInput = { userId: 7, transaction: { id: 'tx-shipping' } };

  it('permite transicao invoiced -> shipped', async () => {
    const sale = { id: 1, status: 'invoiced', items: [], save: jest.fn(async function (this: any) {}) };
    const saleRepository = buildSaleRepository(sale);
    const useCase = new ChangeSaleStatusUseCase(saleRepository);

    const { sale: updated, previousStatus } = await useCase.execute({ id: 1, status: 'shipped', ...baseInput });

    expect(previousStatus).toBe('invoiced');
    expect(updated.status).toBe('shipped');
    expect(InventoryService.consume).not.toHaveBeenCalled();
    expect(InventoryService.receive).not.toHaveBeenCalled();
  });

  it('rejeita transicao confirmed -> shipped com 422 (BusinessRuleError)', async () => {
    const sale = { id: 2, status: 'confirmed', items: [], save: jest.fn() };
    const saleRepository = buildSaleRepository(sale);
    const useCase = new ChangeSaleStatusUseCase(saleRepository);

    await expect(useCase.execute({ id: 2, status: 'shipped', ...baseInput })).rejects.toThrow(BusinessRuleError);
    await expect(useCase.execute({ id: 2, status: 'shipped', ...baseInput })).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it('bloqueia cancelamento de venda ja shipped com 422 e mensagem dedicada', async () => {
    const sale = { id: 3, status: 'shipped', items: [], save: jest.fn() };
    const saleRepository = buildSaleRepository(sale);
    const useCase = new ChangeSaleStatusUseCase(saleRepository);

    await expect(useCase.execute({ id: 3, status: 'canceled', ...baseInput })).rejects.toThrow(
      /ja foi expedida/i
    );
    await expect(useCase.execute({ id: 3, status: 'canceled', ...baseInput })).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it('shipped e terminal: nenhuma outra transicao e permitida', async () => {
    const sale = { id: 4, status: 'shipped', items: [], save: jest.fn() };
    const saleRepository = buildSaleRepository(sale);
    const useCase = new ChangeSaleStatusUseCase(saleRepository);

    await expect(useCase.execute({ id: 4, status: 'confirmed', ...baseInput })).rejects.toThrow(BusinessRuleError);
    await expect(useCase.execute({ id: 4, status: 'invoiced', ...baseInput })).rejects.toThrow(BusinessRuleError);
  });
});

describe('Onda 3 - Cockpit de Compras', () => {
  it('delega ao repositorio e retorna o envelope de metricas esperado', async () => {
    const metrics = {
      pending_requisitions: 3,
      open_orders: { count: 5, total_amount: 12345.67 },
      arriving_this_week: 2,
      overdue: 1,
    };
    const purchaseRepository = { getCockpitMetrics: jest.fn(async () => metrics) };
    const useCase = new GetPurchaseCockpitUseCase(purchaseRepository);

    const result = await useCase.execute();

    expect(purchaseRepository.getCockpitMetrics).toHaveBeenCalledTimes(1);
    expect(result).toEqual(metrics);
  });
});

describe('Onda 3 - Projecao de Fluxo de Caixa', () => {
  function mondayOf(date: Date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  }

  function toDateOnly(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  it('monta semanas, calcula saldo acumulado e separa bucket de vencidos', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const inThreeDays = new Date(today);
    inThreeDays.setDate(inThreeDays.getDate() + 3);

    const financialRepository = {
      getOpenTitlesForProjection: jest.fn(async () => ({
        receivableRows: [
          { due_date: toDateOnly(inThreeDays), amount: '1000.00' },
        ],
        payableRows: [
          { due_date: toDateOnly(inThreeDays), amount: '400.00' },
        ],
        overdueReceivable: 250.5,
        overduePayable: 100.25,
      })),
    };

    const useCase = new GetCashFlowProjectionUseCase(financialRepository);
    const result = await useCase.execute({ days: 30 });

    expect(financialRepository.getOpenTitlesForProjection).toHaveBeenCalledWith(30);
    expect(result.horizon_days).toBe(30);
    expect(result.totals.receivable).toBe(1000);
    expect(result.totals.payable).toBe(400);
    expect(result.totals.net).toBe(600);
    expect(result.totals.overdue_receivable).toBe(250.5);
    expect(result.totals.overdue_payable).toBe(100.25);

    expect(result.due_next_7_days.receivable).toBe(1000);
    expect(result.due_next_7_days.payable).toBe(400);

    expect(Array.isArray(result.weeks)).toBe(true);
    expect(result.weeks.length).toBeGreaterThan(0);

    // A semana que contem `inThreeDays` deve carregar os valores lancados.
    const expectedWeekStart = toDateOnly(mondayOf(inThreeDays));
    const targetWeek = result.weeks.find((w: any) => w.week_start === expectedWeekStart);
    expect(targetWeek).toBeDefined();
    expect(targetWeek.receivable).toBe(1000);
    expect(targetWeek.payable).toBe(400);
    expect(targetWeek.net).toBe(600);

    // cumulative_net deve ser monotonicamente acumulado semana a semana.
    let runningTotal = 0;
    for (const week of result.weeks) {
      runningTotal += week.net;
      expect(week.cumulative_net).toBeCloseTo(runningTotal, 6);
    }
    expect(result.weeks[result.weeks.length - 1].cumulative_net).toBeCloseTo(600, 6);
  });

  it('usa 30 dias como default quando days nao informado', async () => {
    const financialRepository = {
      getOpenTitlesForProjection: jest.fn(async () => ({
        receivableRows: [],
        payableRows: [],
        overdueReceivable: 0,
        overduePayable: 0,
      })),
    };

    const useCase = new GetCashFlowProjectionUseCase(financialRepository);
    const result = await useCase.execute({ days: undefined });

    expect(result.horizon_days).toBe(30);
    expect(result.totals.net).toBe(0);
    expect(result.weeks.length).toBeGreaterThan(0);
  });
});
