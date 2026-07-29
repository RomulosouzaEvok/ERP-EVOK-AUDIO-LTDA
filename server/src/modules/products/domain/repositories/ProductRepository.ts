/**
 * Interface (contrato) de repositório de Produtos.
 *
 * Define os métodos que qualquer implementação de persistência deve
 * fornecer. A camada de aplicação (use cases) depende apenas desta
 * interface, nunca de uma implementação concreta — isso mantém a regra de
 * negócio independente do Sequelize/PostgreSQL.
 *
 * Todos os métodos desta classe base lançam erro "not implemented" e devem
 * ser sobrescritos pela implementação concreta (ex.: `SequelizeProductRepository`).
 */
class ProductRepository {
  /**
   * Lista produtos com filtros e paginação.
   *
   * @abstract
   * @param {Object} [filters] - Filtros de busca (search, category_id, status, low_stock).
   * @param {Object} [pagination] - `{ limit, offset }`.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async list(filters, pagination) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.list não implementado.');
  }

  /**
   * Busca um produto pelo id.
   *
   * @abstract
   * @param {number} id - Id do produto.
   * @returns {Promise<Object|null>} Registro encontrado ou `null`.
   */
  async findById(id) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.findById não implementado.');
  }

  /**
   * Busca um produto pelo código.
   *
   * @abstract
   * @param {string} code - Código do produto.
   * @returns {Promise<Object|null>} Registro encontrado ou `null`.
   */
  async findByCode(code) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.findByCode não implementado.');
  }

  /**
   * Persiste um novo produto.
   *
   * @abstract
   * @param {Object} data - Dados já validados prontos para persistência.
   * @returns {Promise<Object>} Registro criado.
   */
  async create(data) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.create não implementado.');
  }

  /**
   * Atualiza um produto existente.
   *
   * @abstract
   * @param {number} id - Id do produto.
   * @param {Object} data - Campos a atualizar.
   * @returns {Promise<Object|null>} Registro atualizado ou `null` se não encontrado.
   */
  async update(id, data) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.update não implementado.');
  }

  /**
   * Verifica se existem vendas ativas (confirmed/invoiced) para o produto.
   *
   * @abstract
   * @param {number} productId - Id do produto.
   * @returns {Promise<number>} Quantidade de vendas ativas encontradas.
   */
  async countActiveSales(productId) { // eslint-disable-line no-unused-vars
    throw new Error('ProductRepository.countActiveSales não implementado.');
  }
}

module.exports = ProductRepository;


