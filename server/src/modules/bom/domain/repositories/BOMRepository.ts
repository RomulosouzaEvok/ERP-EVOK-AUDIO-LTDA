/**
 * Interface (contrato) do repositório de BOM. Documenta os métodos que a
 * implementação de infraestrutura (`SequelizeBOMRepository`) deve fornecer
 * à camada de aplicação. Não contém lógica — apenas assinaturas e docs.
 */

/**
 * Filtros aceitos por {@link BOMRepository.list}.
 */
export interface BOMListFilters {
  status?: string;
  product_id?: number;
  search?: string;
  limit: number;
  offset: number;
}

/**
 * Formato estrutural do contrato de repositório de BOM, usado apenas para
 * tipagem (type-only) nos casos de uso. Os retornos são `any` de propósito:
 * as implementações concretas (`SequelizeBOMRepository`) devolvem instâncias
 * de models Sequelize não tipados (`BillOfMaterial`, `BillOfMaterialItem`,
 * `Product`), cuja forma real só é conhecida em runtime.
 */
export interface IBOMRepository {
  list(filters: BOMListFilters): Promise<{ rows: any[]; count: number }>;
  findById(id: number): Promise<any | null>;
  findRawById(id: number): Promise<any | null>;
  findActiveByProduct(productId: number): Promise<any | null>;
  listVersionsByProduct(productId: number): Promise<any[]>;
  findProductById(id: number): Promise<any | null>;
  update(id: number, data: Record<string, unknown>): Promise<any>;
  listItems(bomId: number): Promise<any[]>;
}

class BOMRepository {
  /**
   * Lista BOMs com filtros e paginação.
   * @param {BOMListFilters} filters
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async list(filters: BOMListFilters): Promise<{ rows: any[]; count: number }> { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }

  /**
   * Busca uma BOM por id, com produto e itens.
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id: number): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }

  /**
   * Busca a BOM ativa de um produto.
   * @param {number} productId
   * @returns {Promise<Object|null>}
   */
  async findActiveByProduct(productId: number): Promise<any | null> { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }

  /**
   * Lista todas as versões (qualquer status) de BOM de um produto.
   * @param {number} productId
   * @returns {Promise<Object[]>}
   */
  async listVersionsByProduct(productId: number): Promise<any[]> { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }

  /**
   * Atualiza campos gerais de uma BOM.
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<Object|null>}
   */
  async update(id: number, data: Record<string, unknown>): Promise<any> { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }

  /**
   * Lista itens de uma BOM.
   * @param {number} bomId
   * @returns {Promise<Object[]>}
   */
  async listItems(bomId: number): Promise<any[]> { // eslint-disable-line no-unused-vars
    throw new Error('Não implementado');
  }
}

module.exports = BOMRepository;
