const UseCase = require('../../../../shared/application/UseCase');
const { resolveReportPeriod, safeRate } = require('./reportPeriod');

/**
 * Variação de custo (`GET /api/reports/cost-variance`): compara o custo
 * padrão (`items.custo_padrao`, fallback `products.cost_price`) com o custo
 * real ponderado registrado em `product_cost_ledgers` no período, além da
 * variação entre preço de catálogo por fornecedor (`item_suppliers.unit_price`)
 * e o preço médio efetivamente pago em pedidos de compra.
 */
class GetCostVarianceReportUseCase extends UseCase {
  /** @param {import('../../domain/repositories/ReportsRepository')} reportsRepository */
  constructor(reportsRepository) {
    super();
    this.reportsRepository = reportsRepository;
  }

  /**
   * @param {Object} input - `{ start_date?, end_date? }` (YYYY-MM-DD; default últimos 30 dias).
   * @returns {Promise<Object>}
   */
  async execute(input = {}) {
    const { start, end, period } = resolveReportPeriod(input);

    const [byProductRows, priceVarianceRows] = await Promise.all([
      this.reportsRepository.findCostVarianceByProduct(start, end),
      this.reportsRepository.findPurchasePriceVarianceByProductSupplier(start, end),
    ]);

    const byProduct = (byProductRows || [])
      .map((row) => {
        const standardCost = Number(row.standard_cost ?? 0);
        const avgRealCost = Number(row.avg_real_cost ?? 0);
        const varianceAbs = Math.round((avgRealCost - standardCost) * 10000) / 10000;
        return {
          product_id: Number(row.product_id),
          code: row.code,
          name: row.name,
          standard_cost: standardCost,
          avg_real_cost: avgRealCost,
          entries_count: Number(row.entries_count ?? 0),
          total_quantity: Number(row.total_quantity ?? 0),
          variance_abs: varianceAbs,
          variance_rate: safeRate(varianceAbs, standardCost),
        };
      })
      .sort((a, b) => Math.abs(b.variance_rate) - Math.abs(a.variance_rate));

    const purchasePriceVariance = (priceVarianceRows || []).map((row) => {
      const catalogPrice = row.catalog_price === null || row.catalog_price === undefined
        ? null
        : Number(row.catalog_price);
      const avgPaidPrice = Number(row.avg_paid_price ?? 0);
      const hasCatalog = catalogPrice !== null;
      const varianceAbs = hasCatalog ? Math.round((avgPaidPrice - catalogPrice) * 10000) / 10000 : null;
      const varianceRate = hasCatalog ? safeRate(varianceAbs, catalogPrice) : null;

      return {
        product_id: Number(row.product_id),
        code: row.code,
        name: row.name,
        supplier_id: Number(row.supplier_id),
        company_name: row.company_name,
        catalog_price: catalogPrice,
        avg_paid_price: avgPaidPrice,
        total_quantity: Number(row.total_quantity ?? 0),
        variance_abs: varianceAbs,
        variance_rate: varianceRate,
      };
    });

    const productsWithVariance = byProduct.filter((row) => Math.abs(row.variance_rate) > 0.05).length;

    const totalQuantity = byProduct.reduce((acc, row) => acc + row.total_quantity, 0);
    const weightedVarianceSum = byProduct.reduce((acc, row) => acc + row.variance_rate * row.total_quantity, 0);
    const avgVarianceRate = safeRate(weightedVarianceSum, totalQuantity);

    return {
      report_type: 'cost_variance',
      generated_at: new Date(),
      period,
      by_product: byProduct,
      purchase_price_variance: purchasePriceVariance,
      totals: {
        products_with_variance: productsWithVariance,
        avg_variance_rate: avgVarianceRate,
      },
    };
  }
}

module.exports = GetCostVarianceReportUseCase;
