import UseCase from '../../../../shared/application/UseCase';
import ReportsRepository = require('../../domain/repositories/ReportsRepository');
import type { CostVarianceRow, PurchasePriceVarianceRow } from '../../domain/reportTypes';
import type { ReportPeriodInput, ResolvedReportPeriod } from './reportPeriod';

const { resolveReportPeriod, safeRate } = require('./reportPeriod');

/** Linha de variação de custo por produto, já normalizada/calculada para o relatório. */
interface CostVarianceByProduct {
  product_id: number;
  code: string;
  name: string;
  standard_cost: number;
  avg_real_cost: number;
  entries_count: number;
  total_quantity: number;
  variance_abs: number;
  variance_rate: number;
}

/** Linha de variação de preço de compra por produto x fornecedor, já normalizada. */
interface PurchasePriceVarianceByProductSupplier {
  product_id: number;
  code: string;
  name: string;
  supplier_id: number;
  company_name: string;
  catalog_price: number | null;
  avg_paid_price: number;
  total_quantity: number;
  variance_abs: number | null;
  variance_rate: number | null;
}

/** Saída de `GetCostVarianceReportUseCase`. */
interface GetCostVarianceReportOutput {
  report_type: 'cost_variance';
  generated_at: Date;
  period: ResolvedReportPeriod['period'];
  by_product: CostVarianceByProduct[];
  purchase_price_variance: PurchasePriceVarianceByProductSupplier[];
  totals: { products_with_variance: number; avg_variance_rate: number };
}

/**
 * Variação de custo (`GET /api/reports/cost-variance`): compara o custo
 * padrão (`items.custo_padrao`, fallback `products.cost_price`) com o custo
 * real ponderado registrado em `product_cost_ledgers` no período, além da
 * variação entre preço de catálogo por fornecedor (`item_suppliers.unit_price`)
 * e o preço médio efetivamente pago em pedidos de compra.
 */
class GetCostVarianceReportUseCase extends UseCase<ReportPeriodInput, GetCostVarianceReportOutput> {
  private readonly reportsRepository: ReportsRepository;

  /** @param reportsRepository - Repositório de relatórios. */
  constructor(reportsRepository: ReportsRepository) {
    super();
    this.reportsRepository = reportsRepository;
  }

  /**
   * @param input - `{ start_date?, end_date? }` (YYYY-MM-DD; default últimos 30 dias).
   * @returns Relatório de variação de custo por produto e de preço de compra por fornecedor.
   */
  async execute(input: ReportPeriodInput = {}): Promise<GetCostVarianceReportOutput> {
    const { start, end, period } = resolveReportPeriod(input);

    const [byProductRows, priceVarianceRows]: [CostVarianceRow[], PurchasePriceVarianceRow[]] = await Promise.all([
      this.reportsRepository.findCostVarianceByProduct(start, end),
      this.reportsRepository.findPurchasePriceVarianceByProductSupplier(start, end),
    ]);

    const byProduct: CostVarianceByProduct[] = (byProductRows || [])
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

    const purchasePriceVariance: PurchasePriceVarianceByProductSupplier[] = (priceVarianceRows || []).map((row) => {
      const catalogPrice = row.catalog_price === null || row.catalog_price === undefined
        ? null
        : Number(row.catalog_price);
      const avgPaidPrice = Number(row.avg_paid_price ?? 0);
      const hasCatalog = catalogPrice !== null;
      const varianceAbs = hasCatalog ? Math.round((avgPaidPrice - catalogPrice) * 10000) / 10000 : null;
      const varianceRate = hasCatalog ? safeRate(varianceAbs as number, catalogPrice as number) : null;

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

export = GetCostVarianceReportUseCase;
