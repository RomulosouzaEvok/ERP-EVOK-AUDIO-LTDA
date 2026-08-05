/**
 * Interface (contrato) de repositório de Estoque (movimentações + relatório).
 *
 * Define os métodos que qualquer implementação de persistência deve
 * fornecer. A camada de aplicação (use cases) depende apenas desta
 * interface, nunca de uma implementação concreta — isso mantém a regra de
 * negócio independente do Sequelize/PostgreSQL.
 *
 * A alteração efetiva de `Product.quantity` continua centralizada em
 * `server/src/services/inventoryService.ts` (não duplicada aqui); este
 * repositório cobre apenas leitura/listagem de movimentações e produtos.
 */
/** Filtros de listagem (product_id, type, start_date, end_date, warehouse_id) aceitos por `listMovements`. */
type InventoryMovementFilters = Record<string, any>;
/** Paginação `{ limit, offset }` aceita por `listMovements`. */
type InventoryMovementPagination = { limit?: number; offset?: number };

class InventoryRepository {
  /**
   * Lista movimentações de estoque com filtros e paginação.
   *
   * @abstract
   * @param {Object} [filters] - Filtros de busca (product_id, type, start_date, end_date, warehouse_id).
   * @param {Object} [pagination] - `{ limit, offset }`.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async listMovements(filters?: InventoryMovementFilters, pagination?: InventoryMovementPagination): Promise<{ rows: any[]; count: number }> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryRepository.listMovements não implementado.');
  }

  /**
   * Busca uma movimentação de estoque pelo id.
   *
   * @abstract
   * @param {number} id - Id da movimentação.
   * @returns {Promise<Object|null>} Registro encontrado ou `null`.
   */
  async findMovementById(id: number | string): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('InventoryRepository.findMovementById não implementado.');
  }

  /**
   * Lista produtos ativos com sua categoria (usado no relatório de estoque).
   *
   * @abstract
   * @returns {Promise<Object[]>}
   */
  async listActiveProductsWithCategory(): Promise<any[]> {
    throw new Error('InventoryRepository.listActiveProductsWithCategory não implementado.');
  }

  /**
   * Lista produtos ativos com estoque igual ou abaixo do mínimo (`quantity <= min_quantity`).
   *
   * @abstract
   * @returns {Promise<Object[]>}
   */
  async listLowStockProducts(): Promise<any[]> {
    throw new Error('InventoryRepository.listLowStockProducts não implementado.');
  }
}

export = InventoryRepository;

