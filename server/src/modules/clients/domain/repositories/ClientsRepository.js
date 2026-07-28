/**
 * Interface (contrato) de repositório de Clientes.
 *
 * Define os métodos que qualquer implementação de persistência deve
 * fornecer. A camada de aplicação (use cases) depende apenas desta
 * interface, nunca de uma implementação concreta.
 */
class ClientsRepository {
  /**
   * Lista clientes com busca/filtro e paginação.
   *
   * @abstract
   * @param {Object} options
   * @param {number} options.limit
   * @param {number} options.offset
   * @param {string} [options.search] - Busca por `name`/`cpf_cnpj`/`email` (LIKE, sanitizada).
   * @param {string} [options.status] - Filtro exato de status.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async list(options) { // eslint-disable-line no-unused-vars
    throw new Error('ClientsRepository.list não implementado.');
  }

  /**
   * Busca um cliente pelo id.
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) { // eslint-disable-line no-unused-vars
    throw new Error('ClientsRepository.findById não implementado.');
  }

  /**
   * Cria um novo cliente.
   *
   * @abstract
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) { // eslint-disable-line no-unused-vars
    throw new Error('ClientsRepository.create não implementado.');
  }

  /**
   * Atualiza um cliente existente.
   *
   * @abstract
   * @param {number} id
   * @param {Object} data - Campos a atualizar.
   * @returns {Promise<number>} Número de linhas afetadas (0 se o id não existir).
   */
  async update(id, data) { // eslint-disable-line no-unused-vars
    throw new Error('ClientsRepository.update não implementado.');
  }

  /**
   * Conta vendas ativas (`quote`/`confirmed`/`invoiced`) de um cliente.
   *
   * @abstract
   * @param {number} clientId
   * @returns {Promise<number>}
   */
  async countActiveSales(clientId) { // eslint-disable-line no-unused-vars
    throw new Error('ClientsRepository.countActiveSales não implementado.');
  }
}

module.exports = ClientsRepository;
