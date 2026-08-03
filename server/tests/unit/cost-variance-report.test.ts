/**
 * Testes do relatório de variação de custo (item 7 do levantamento):
 * GET /api/reports/cost-variance.
 */

const GetCostVarianceReportUseCase = require('../../src/modules/reports/application/use-cases/GetCostVarianceReportUseCase');

describe('GetCostVarianceReportUseCase (item 7)', () => {
  it('calcula variância de custo padrão x real ponderada, ordenada por |variance_rate| desc', async () => {
    const repository = {
      findCostVarianceByProduct: jest.fn(async () => [
        {
          product_id: 1,
          code: 'ALTO-FALANTE-10',
          name: 'Alto-falante 10"',
          standard_cost: 100,
          avg_real_cost: 105,
          entries_count: 2,
          total_quantity: 20,
        },
        {
          product_id: 2,
          code: 'BOBINA-VC',
          name: 'Bobina VC',
          standard_cost: 10,
          avg_real_cost: 15,
          entries_count: 1,
          total_quantity: 5,
        },
      ]),
      findPurchasePriceVarianceByProductSupplier: jest.fn(async () => []),
    };

    const useCase = new GetCostVarianceReportUseCase(repository);
    const report = await useCase.execute({ start_date: '2026-07-01', end_date: '2026-08-01' });

    expect(report.report_type).toBe('cost_variance');
    expect(report.by_product).toHaveLength(2);

    // BOBINA-VC: variance_abs = 5, variance_rate = 0.5 (maior |rate|) deve vir primeiro.
    expect(report.by_product[0].product_id).toBe(2);
    expect(report.by_product[0].variance_abs).toBeCloseTo(5, 4);
    expect(report.by_product[0].variance_rate).toBeCloseTo(0.5, 4);

    // ALTO-FALANTE-10: variance_abs = 5, variance_rate = 0.05.
    expect(report.by_product[1].product_id).toBe(1);
    expect(report.by_product[1].variance_abs).toBeCloseTo(5, 4);
    expect(report.by_product[1].variance_rate).toBeCloseTo(0.05, 4);

    // totals.products_with_variance: |rate| > 0.05 -> só o produto 2 (0.5 > 0.05); produto 1 é exatamente 0.05.
    expect(report.totals.products_with_variance).toBe(1);

    // avg_variance_rate ponderada por quantidade: (0.05*20 + 0.5*5) / 25 = 3.5/25 = 0.14
    expect(report.totals.avg_variance_rate).toBeCloseTo(0.14, 4);
  });

  it('protege standard_cost 0 (variance_rate = 0, sem NaN/Infinity)', async () => {
    const repository = {
      findCostVarianceByProduct: jest.fn(async () => [
        {
          product_id: 3,
          code: 'SEM-CUSTO-PADRAO',
          name: 'Item sem custo padrão',
          standard_cost: 0,
          avg_real_cost: 42,
          entries_count: 1,
          total_quantity: 1,
        },
      ]),
      findPurchasePriceVarianceByProductSupplier: jest.fn(async () => []),
    };

    const report = await new GetCostVarianceReportUseCase(repository).execute({});

    expect(report.by_product[0].variance_rate).toBe(0);
    expect(Number.isFinite(report.by_product[0].variance_abs)).toBe(true);
    expect(report.totals.products_with_variance).toBe(0);
    expect(report.totals.avg_variance_rate).toBe(0);
  });

  it('retorna apenas produtos com lançamentos no período (repositório já filtra)', async () => {
    const repository = {
      findCostVarianceByProduct: jest.fn(async () => []),
      findPurchasePriceVarianceByProductSupplier: jest.fn(async () => []),
    };

    const report = await new GetCostVarianceReportUseCase(repository).execute({});

    expect(report.by_product).toEqual([]);
    expect(report.totals.products_with_variance).toBe(0);
    expect(report.totals.avg_variance_rate).toBe(0);
  });

  describe('purchase_price_variance', () => {
    it('calcula variância vs preço de catálogo quando presente', async () => {
      const repository = {
        findCostVarianceByProduct: jest.fn(async () => []),
        findPurchasePriceVarianceByProductSupplier: jest.fn(async () => [
          {
            product_id: 1,
            code: 'ALTO-FALANTE-10',
            name: 'Alto-falante 10"',
            supplier_id: 7,
            company_name: 'Fornecedor CI EVOK',
            catalog_price: 90,
            avg_paid_price: 99,
            total_quantity: 50,
          },
        ]),
      };

      const report = await new GetCostVarianceReportUseCase(repository).execute({});

      expect(report.purchase_price_variance).toHaveLength(1);
      const row = report.purchase_price_variance[0];
      expect(row.catalog_price).toBe(90);
      expect(row.avg_paid_price).toBe(99);
      expect(row.variance_abs).toBeCloseTo(9, 4);
      expect(row.variance_rate).toBeCloseTo(0.1, 4);
    });

    it('retorna variance_abs/variance_rate null quando catalog_price é null', async () => {
      const repository = {
        findCostVarianceByProduct: jest.fn(async () => []),
        findPurchasePriceVarianceByProductSupplier: jest.fn(async () => [
          {
            product_id: 2,
            code: 'BOBINA-VC',
            name: 'Bobina VC',
            supplier_id: 4,
            company_name: 'Sem catálogo cadastrado',
            catalog_price: null,
            avg_paid_price: 12.5,
            total_quantity: 10,
          },
        ]),
      };

      const report = await new GetCostVarianceReportUseCase(repository).execute({});

      const row = report.purchase_price_variance[0];
      expect(row.catalog_price).toBeNull();
      expect(row.avg_paid_price).toBe(12.5);
      expect(row.variance_abs).toBeNull();
      expect(row.variance_rate).toBeNull();
    });
  });
});
