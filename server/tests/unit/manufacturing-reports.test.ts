/**
 * Testes dos relatórios de manufatura (item 9 do levantamento):
 * GET /api/reports/production e GET /api/reports/purchasing.
 */

const GetProductionReportUseCase = require('../../src/modules/reports/application/use-cases/GetProductionReportUseCase');
const GetPurchasingReportUseCase = require('../../src/modules/reports/application/use-cases/GetPurchasingReportUseCase');
const { safeRate, resolveReportPeriod } = require('../../src/modules/reports/application/use-cases/reportPeriod');
const { ValidationError } = require('../../src/errors');

describe('Relatórios de manufatura (item 9)', () => {
  describe('reportPeriod', () => {
    it('safeRate protege divisão por zero', () => {
      expect(safeRate(10, 0)).toBe(0);
      expect(safeRate(0, 0)).toBe(0);
      expect(safeRate(21, 21)).toBe(1);
      expect(safeRate(1, 3)).toBeCloseTo(0.3333, 4);
    });

    it('rejeita start_date maior que end_date', () => {
      expect(() => resolveReportPeriod({ start_date: '2026-08-10', end_date: '2026-08-01' }))
        .toThrow(ValidationError);
    });

    it('rejeita data inválida', () => {
      expect(() => resolveReportPeriod({ start_date: 'nao-e-data' })).toThrow(ValidationError);
    });
  });

  describe('GetProductionReportUseCase', () => {
    it('monta o relatório com taxas calculadas e refugo ordenado por taxa', async () => {
      const repository = {
        findProductionWip: jest.fn(async () => [
          { status: 'in_progress', orders_count: 2, total_quantity: 30 },
        ]),
        findProductionCompletedAggregates: jest.fn(async () => ({
          orders_completed: 3,
          total_planned_quantity: 100,
          total_produced_quantity: 90,
          total_scrapped_quantity: 10,
          avg_days: 2.5,
          min_days: 1,
          max_days: 4,
        })),
        findScrapByStep: jest.fn(async () => [
          { work_center: 'MONTAGEM', step_name: 'Colagem', sequence: 1, quantity_good: 95, quantity_scrapped: 5 },
          { work_center: 'TESTE', step_name: 'Teste acustico', sequence: 2, quantity_good: 80, quantity_scrapped: 20 },
        ]),
      };

      const useCase = new GetProductionReportUseCase(repository);
      const report = await useCase.execute({ start_date: '2026-07-01', end_date: '2026-08-01' });

      expect(report.adherence.adherence_rate).toBeCloseTo(0.9, 4);
      expect(report.adherence.scrap_rate).toBeCloseTo(0.1, 4);
      expect(report.scrap_by_step[0].work_center).toBe('TESTE');
      expect(report.scrap_by_step[0].scrap_rate).toBeCloseTo(0.2, 4);
      expect(report.lead_time.avg_days).toBe(2.5);
      expect(report.wip).toHaveLength(1);
    });

    it('não quebra com período sem OPs (planned 0, sem trackings)', async () => {
      const repository = {
        findProductionWip: jest.fn(async () => []),
        findProductionCompletedAggregates: jest.fn(async () => ({
          orders_completed: 0,
          total_planned_quantity: 0,
          total_produced_quantity: 0,
          total_scrapped_quantity: 0,
          avg_days: 0,
          min_days: 0,
          max_days: 0,
        })),
        findScrapByStep: jest.fn(async () => []),
      };

      const report = await new GetProductionReportUseCase(repository).execute({});
      expect(report.adherence.adherence_rate).toBe(0);
      expect(report.adherence.scrap_rate).toBe(0);
      expect(report.scrap_by_step).toEqual([]);
    });
  });

  describe('GetPurchasingReportUseCase', () => {
    it('agrega fornecedores com RNCs e pontualidade protegida', async () => {
      const repository = {
        findPurchasingBySupplier: jest.fn(async () => [
          {
            supplier_id: 3,
            company_name: 'Fornecedor CI EVOK',
            orders_count: 4,
            total_amount: 5000,
            received_orders: 3,
            avg_lead_time_days: 12.5,
            on_time_orders: 2,
            delivered_with_expected: 3,
            last_order_date: '2026-08-03',
          },
          {
            supplier_id: 9,
            company_name: 'Sem entregas com previsao',
            orders_count: 1,
            total_amount: 100,
            received_orders: 0,
            avg_lead_time_days: null,
            on_time_orders: 0,
            delivered_with_expected: 0,
            last_order_date: '2026-08-01',
          },
        ]),
        findRncCountBySupplier: jest.fn(async () => [{ supplier_id: 3, rnc_count: 1 }]),
        findPurchasingTotals: jest.fn(async () => ({ orders_count: 5, total_amount: 5100, open_orders: 2 })),
      };

      const report = await new GetPurchasingReportUseCase(repository).execute({});

      expect(report.by_supplier[0].rnc_count).toBe(1);
      expect(report.by_supplier[0].on_time_rate).toBeCloseTo(0.6667, 4);
      expect(report.by_supplier[1].rnc_count).toBe(0);
      expect(report.by_supplier[1].on_time_rate).toBe(0);
      expect(report.by_supplier[1].avg_lead_time_days).toBeNull();
      expect(report.totals.open_orders).toBe(2);
    });
  });
});
