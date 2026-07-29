const { User } = require('../../../../models/index');
const { Op } = require('sequelize');
const UsersRepository = require('../../domain/repositories/UsersRepository');

/**
 * Implementação Sequelize/PostgreSQL de `UsersRepository`, usando exclusivamente
 * o model `User` já existente em `server/src/models/User.ts` — nenhum
 * model novo foi criado por esta migração.
 */
class SequelizeUsersRepository extends UsersRepository {
  /**
   * @param {Object} options - `{ page, limit, search, role, active }`.
   * @returns {Promise<{ rows: Object[], count: number }>} Mesma lógica de busca/filtro/paginação do controller anterior.
   */
  async list({ page, limit, search, role, active }) {
    const where: any = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    if (role) where.role = role;
    if (active !== undefined) where.active = active;

    const offset = (page - 1) * limit;
    return User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * @param {number} id
   * @returns {Promise<Object|null>} Instância do model `User` sem o campo `password`.
   */
  async findById(id) {
    return User.findByPk(id, { attributes: { exclude: ['password'] } });
  }

  /**
   * @param {Object} data - `{ name, email, password, role }`.
   * @returns {Promise<Object>} Instância do model `User` criada (o hook `beforeSave` faz o hash da senha).
   */
  async create(data) {
    return User.create(data);
  }

  /**
   * @param {number} id
   * @param {Object} data - Campos a atualizar.
   * @returns {Promise<number>} Número de linhas afetadas (0 se o id não existir).
   */
  async update(id, data) {
    const [updated] = await User.update(data, { where: { id } });
    return updated;
  }
}

module.exports = SequelizeUsersRepository;



