const { User } = require('../../../../models/index');
const AuthRepository = require('../../domain/repositories/AuthRepository');

/**
 * Implementação Sequelize/MySQL de `AuthRepository`, usando exclusivamente
 * o model `User` já existente em `server/src/models/User.js` (com
 * `comparePassword`, hash de senha via hook e `toJSON` que remove
 * `password`) — nenhum model novo foi criado por esta migração.
 */
class SequelizeAuthRepository extends AuthRepository {
  /**
   * @param {string} email
   * @returns {Promise<Object|null>} Instância do model `User` (com `password`, necessário para `comparePassword`).
   */
  async findUserByEmail(email) {
    return User.findOne({ where: { email } });
  }

  /**
   * @param {number} id
   * @returns {Promise<Object|null>} Instância do model `User` sem o campo `password`.
   */
  async findUserById(id) {
    return User.findByPk(id, { attributes: { exclude: ['password'] } });
  }

  /**
   * @param {Object} data - `{ name, email, password, role }`.
   * @returns {Promise<Object>} Instância do model `User` criada (o hook `beforeSave` do model faz o hash da senha).
   */
  async createUser(data) {
    return User.create(data);
  }
}

module.exports = SequelizeAuthRepository;
