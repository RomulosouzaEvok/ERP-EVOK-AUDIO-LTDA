/**
 * Interface (contrato) de repositório de Produtos.
 */

/** Filtros aceitos por {@link ProductRepository.list}. */
export interface ProductListFilters {
  search?: string;
  category_id?: number;
  status?: string;
  low_stock?: boolean | string;
}

/** Paginação aceita por {@link ProductRepository.list}. */
export interface ProductListPagination {
  limit?: number;
  offset?: number;
}

/**
 * Formato estrutural do contrato de repositório de Produtos, usado apenas
 * para tipagem (type-only) nos casos de uso. Os retornos são `any` de
 * propósito: as implementações concretas (`SequelizeProductRepository`)
 * devolvem instâncias de models Sequelize não tipados (`Product`, `Category`,
 * `Sale`, `SaleItem`, `BillOfMaterial`), cuja forma real só é conhecida em
 * runtime.
 */
/** Saldo de um produto em um depósito, retornado por {@link IProductRepository.getWarehouseStockSummary}. */
export interface ProductWarehouseStockRow {
  warehouse_id: number;
  warehouse_code: string;
  warehouse_name: string;
  quantity: number;
}

export interface IProductRepository {
  list(filters: ProductListFilters, pagination: ProductListPagination): Promise<{ rows: any[]; count: number }>;
  findById(id: number | string, options?: Record<string, unknown>): Promise<any | null>;
  findByCode(code: string): Promise<any | null>;
  create(data: Record<string, unknown>, transaction?: unknown): Promise<any>;
  update(id: number | string, data: Record<string, unknown>): Promise<any | null>;
  countActiveSales(productId: number | string): Promise<number>;
  countActiveBomLinks(productId: number | string): Promise<number>;
  getWarehouseStockSummary(productId: number | string): Promise<ProductWarehouseStockRow[]>;
}

class ProductRepository {
  async list(filters: ProductListFilters, pagination: ProductListPagination): Promise<{ rows: any[]; count: number }> { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.list não implementado.');
  }

  async findById(id: number | string): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.findById não implementado.');
  }

  async findByCode(code: string): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.findByCode não implementado.');
  }

  async create(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.create não implementado.');
  }

  async update(id: number | string, data: Record<string, unknown>): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.update não implementado.');
  }

  async countActiveSales(productId: number | string): Promise<number> { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.countActiveSales não implementado.');
  }

  async countActiveBomLinks(productId: number | string): Promise<number> { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.countActiveBomLinks não implementado.');
  }

  /**
   * Saldo de um produto em TODOS os depósitos ativos (leitura cross-module
   * pontual — `Warehouse`/`ProductWarehouseStock` pertencem ao domínio de
   * estoque/depósito, mas o use case pertence a `products`). Inclui
   * depósitos sem nenhuma linha em `ProductWarehouseStock` para o produto
   * (saldo tratado como `0`).
   *
   * @abstract
   * @param {number|string} productId
   * @returns {Promise<Array<{warehouse_id:number, warehouse_code:string, warehouse_name:string, quantity:number}>>}
   */
  async getWarehouseStockSummary(productId: number | string): Promise<any[]> { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.getWarehouseStockSummary não implementado.');
  }
}

module.exports = ProductRepository;
