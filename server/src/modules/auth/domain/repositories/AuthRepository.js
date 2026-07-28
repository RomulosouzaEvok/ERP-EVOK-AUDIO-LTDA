/**
 * Interface (contrato) de repositório de Autenticação/Usuário.
 *
 * Define os métodos que qualquer implementação de persistência deve
 * fornecer. A camada de aplicação (use cases) depende apenas desta
 * interface, nunca de uma implementação concreta.
 */
class AuthRepository {
  /**
   * Busca um usuário pelo email, incluindo o hash da senha (necessário para
   * `comparePassword` no login).
   *
   * @abstract
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async findUserByEmail(email) { // eslint-disable-line no-unused-vars
    throw new Error('AuthRepository.findUserByEmail não implementado.');
  }

  /**
   * Busca um usuário pelo id, sem o campo `password`.
   *
   * @abstract
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findUserById(id) { // eslint-disable-line no-unused-vars
    throw new Error('AuthRepository.findUserById não implementado.');
  }

  /**
   * Cria um novo usuário.
   *
   * @abstract
   * @param {Object} data - `{ name, email, password, role }`.
   * @returns {Promise<Object>}
   */
  async createUser(data) { // eslint-disable-line no-unused-vars
    throw new Error('AuthRepository.createUser não implementado.');
  }
}

module.exports = AuthRepository;
