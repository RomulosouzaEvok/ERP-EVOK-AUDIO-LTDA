import UseCase from '../../../../shared/application/UseCase';
import ReportsRepository = require('../../domain/repositories/ReportsRepository');

/** Saída de `GetInventoryReportUseCase`. */
interface GetInventoryReportOutput {
  report_type: 'inventory';
  generated_at: Date;
  summary: { total_products: number; total_items: number; total_value: number };
  details: any[];
}

/**
 * Gera o relatório consolidado de estoque, cobrindo `GET /api/reports/inventory`.
 */
class GetInventoryReportUseCase extends UseCase<void, GetInventoryReportOutput> {
  private readonly reportsRepository: ReportsRepository;

  /** @param reportsRepository - Repositório de relatórios. */
  constructor(reportsRepository: ReportsRepository) {
    super();
    this.reportsRepository = reportsRepository;
  }

  /** @returns `{ report_type, generated_at, summary, details }`. */
  async execute(): Promise<GetInventoryReportOutput> {
    const products = await this.reportsRepository.findActiveProducts();
    const totalItems = products.reduce((acc: number, product: any) => acc + Number(product.quantity), 0);
    const totalValue = products.reduce(
      (acc: number, product: any) => acc + parseFloat(product.cost_price || 0) * Number(product.quantity),
      0
    );

    return {
      report_type: 'inventory',
      generated_at: new Date(),
      summary: { total_products: products.length, total_items: totalItems, total_value: totalValue },
      details: products
    };
  }
}

export = GetInventoryReportUseCase;
