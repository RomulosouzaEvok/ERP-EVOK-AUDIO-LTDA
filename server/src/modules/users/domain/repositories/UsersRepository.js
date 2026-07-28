/**
 * Interface (contrato) de repositório de Usuários.
 *
 * Define os métodos que qualquer implementação de persistência deve
 * fornecer. A camada de aplicação (use cases) depende apenas desta
 * interface, nunca de uma implementação concreta.
 */
class UsersRepository {
  /**
   * Lista usuários com busca/filtro e paginação.
   *
   * @abstract
   * @param {Object} options
   * @param {number} options.page
   * @param {number} options.limit
   * @param {string} [options.search] - Busca por `name`/`email` (LIKE).
   * @param {string} [options.role] - Filtro exato de papel.
   * @param {boolean} [options.active] - Filtro exato de ativo/inativo.
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async list(options) { // eslint-disable-line no-unused-vars
    throw new Error('UsersRepository.list não implementado.');
  }

  /**
   * Busca um usuário pelo id, sem o campo `password`.
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) { // eslint-disable-line no-unused-vars
    throw new Error('UsersRepository.findById não implementado.');
  }

  /**
   * Cria um novo usuário.
   *
   * @abstract
   * @param {Object} data - `{ name, email, password, role }`.
   * @returns {Promise<Object>}
   */
  async create(data) { // eslint-disable-line no-unused-vars
    throw new Error('UsersRepository.create não implementado.');
  }

  /**
   * Atualiza um usuário existente.
   *
   * @abstract
   * @param {number} id
   * @param {Object} data - Campos a atualizar.
   * @returns {Promise<number>} Número de linhas afetadas (0 se o id não existir).
   */
  async update(id, data) { // eslint-disable-line no-unused-vars
    throw new Error('UsersRepository.update não implementado.');
  }
}

module.exports = UsersRepository;
