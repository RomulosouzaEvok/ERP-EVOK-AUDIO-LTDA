const { Op } = require('sequelize');
const SuppliersRepository = require('../../domain/repositories/SuppliersRepository');
const { Supplier, Purchase } = require('../../../../models/index');

/**
 * Implementação Sequelize/MySQL do contrato `SuppliersRepository`.
 *
 * Reutiliza os models Sequelize já existentes `Supplier` e `Purchase` —
 * nenhum model novo é criado por este módulo. As queries reproduzem
 * exatamente as do controller legado
 * `server/src/controllers/supplierController.js`.
 */
class SequelizeSuppliersRepository extends SuppliersRepository {
  /** @inheritdoc */
  async list({ limit, offset, search, status }) {
    const where = {};
    if (search) {
      where[Op.or] = [
        { company_name: { [Op.like]: `%${search}%` } },
        { cnpj: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) where.status = status;

    return Supplier.findAndCountAll({
      where,
      limit,
      offset,
      order: [['company_name', 'ASC']]
    });
  }

  /** @inheritdoc */
  async findById(id) {
    return Supplier.findByPk(id);
  }

  /** @inheritdoc */
  async create(data) {
    return Supplier.create(data);
  }

  /** @inheritdoc */
  async update(id, data) {
    const [updated] = await Supplier.update(data, { where: { id } });
    return updated;
  }

  /** @inheritdoc */
  async countPendingPurchases(supplierId) {
    return Purchase.count({
      where: {
        supplier_id: supplierId,
        status: { [Op.in]: ['pending', 'approved', 'sent', 'partial'] }
      }
    });
  }
}

module.exports = SequelizeSuppliersRepository;
