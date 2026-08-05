import UseCase from '../../../../shared/application/UseCase';
import InventoryRepository = require('../../domain/repositories/InventoryRepository');

/**
 * Monta o relatório consolidado de estoque (resumo + lista de produtos
 * ativos), cobrindo o fluxo do endpoint `GET /api/inventory/stock-report`.
 */
class GetStockReportUseCase extends UseCase {
  private readonly inventoryRepository: InventoryRepository;

  /** @param inventoryRepository - Repositório de estoque. */
  constructor(inventoryRepository: InventoryRepository) {
    super();
    this.inventoryRepository = inventoryRepository;
  }

  /**
   * @returns {Promise<{ summary: { total_products: number, total_items: number, total_value: number, low_stock_count: number }, products: Object[] }>}
   */
  async execute() {
    const products = await this.inventoryRepository.listActiveProductsWithCategory();
    const summary = {
      total_products: products.length,
      total_items: products.reduce((sum: number, p: any) => sum + p.quantity, 0),
      total_value: products.reduce((sum: number, p: any) => sum + (parseFloat(p.cost_price || 0) * p.quantity), 0),
      low_stock_count: products.filter((p: any) => p.quantity <= p.min_quantity).length
    };
    return { summary, products };
  }
}

export = GetStockReportUseCase;


