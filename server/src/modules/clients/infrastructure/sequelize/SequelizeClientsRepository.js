const { Op } = require('sequelize');
const ClientsRepository = require('../../domain/repositories/ClientsRepository');
const { Client, Sale } = require('../../../../models/index');

/**
 * Implementação Sequelize/MySQL do contrato `ClientsRepository`.
 *
 * Reutiliza os models Sequelize já existentes `Client` e `Sale` — nenhum
 * model novo é criado por este módulo. As queries reproduzem exatamente as
 * do controller legado `server/src/controllers/clientController.js`.
 */
class SequelizeClientsRepository extends ClientsRepository {
  /** @inheritdoc */
  async list({ limit, offset, search, status }) {
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { cpf_cnpj: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) where.status = status;

    return Client.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
  }

  /** @inheritdoc */
  async findById(id) {
    return Client.findByPk(id);
  }

  /** @inheritdoc */
  async create(data) {
    return Client.create(data);
  }

  /** @inheritdoc */
  async update(id, data) {
    const [updated] = await Client.update(data, { where: { id } });
    return updated;
  }

  /** @inheritdoc */
  async countActiveSales(clientId) {
    return Sale.count({
      where: {
        customer_id: clientId,
        status: { [Op.in]: ['quote', 'confirmed', 'invoiced'] }
      }
    });
  }
}

module.exports = SequelizeClientsRepository;
