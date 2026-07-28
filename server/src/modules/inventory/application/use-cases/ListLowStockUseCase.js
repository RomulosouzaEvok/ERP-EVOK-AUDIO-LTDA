const UseCase = require('../../../../shared/application/UseCase');

/**
 * Lista produtos ativos com estoque em ou abaixo do ponto de reposição
 * (`quantity <= min_quantity`).
 *
 * Endpoint novo (aditivo) `GET /api/inventory/low-stock`. Reusa a mesma
 * regra que hoje só existia implicitamente dentro do `summary.low_stock_count`
 * de `GetStockReportUseCase`, mas expõe a lista completa dos produtos.
 */
class ListLowStockUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/InventoryRepository')} inventoryRepository
   */
  constructor(inventoryRepository) {
    super();
    this.inventoryRepository = inventoryRepository;
  }

  /**
   * @returns {Promise<Object[]>} Lista de produtos com estoque baixo.
   */
  async execute() {
    return this.inventoryRepository.listLowStockProducts();
  }
}

module.exports = ListLowStockUseCase;
