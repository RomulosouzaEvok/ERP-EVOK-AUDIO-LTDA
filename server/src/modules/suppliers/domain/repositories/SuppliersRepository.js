/**
 * Interface (contrato) de repositório de Fornecedores.
 *
 * Define os métodos que qualquer implementação de persistência deve
 * fornecer. A camada de aplicação (use cases) depende apenas desta
 * interface, nunca de uma implementação concreta.
 */
class SuppliersRepository {
  /**
   * Lista fornecedores com busca/filtro e paginação.
   *
   * @abstract
   * @param {Object} options
   * @param {number} options.limit
   * @param {number} options.offset
   * @param {string} [options.search] - Busca por `company_name`/`cnpj` (LIKE, sanitizada).
   * @param {string} [options.status] - Filtro exato de status.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async list(options) { // eslint-disable-line no-unused-vars
    throw new Error('SuppliersRepository.list não implementado.');
  }

  /**
   * Busca um fornecedor pelo id.
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) { // eslint-disable-line no-unused-vars
    throw new Error('SuppliersRepository.findById não implementado.');
  }

  /**
   * Cria um novo fornecedor.
   *
   * @abstract
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) { // eslint-disable-line no-unused-vars
    throw new Error('SuppliersRepository.create não implementado.');
  }

  /**
   * Atualiza um fornecedor existente.
   *
   * @abstract
   * @param {number} id
   * @param {Object} data - Campos a atualizar.
   * @returns {Promise<number>} Número de linhas afetadas (0 se o id não existir).
   */
  async update(id, data) { // eslint-disable-line no-unused-vars
    throw new Error('SuppliersRepository.update não implementado.');
  }

  /**
   * Conta pedidos de compra pendentes (`pending`/`approved`/`sent`/`partial`)
   * de um fornecedor.
   *
   * @abstract
   * @param {number} supplierId
   * @returns {Promise<number>}
   */
  async countPendingPurchases(supplierId) { // eslint-disable-line no-unused-vars
    throw new Error('SuppliersRepository.countPendingPurchases não implementado.');
  }
}

module.exports = SuppliersRepository;
