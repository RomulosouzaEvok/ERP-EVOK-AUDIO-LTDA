const { Op } = require('sequelize');
const InventoryCountRepository = require('../../domain/repositories/InventoryCountRepository');
const {
  InventoryCount,
  InventoryCountItem,
  Product,
  User
} = require('../../../../models/index');

/**
 * Implementação Sequelize/PostgreSQL do contrato `InventoryCountRepository`.
 *
 * Reutiliza os models Sequelize `InventoryCount`, `InventoryCountItem` e
 * `Product` (criados/registrados na Fase F09 - Inventário Cíclico).
 */
class SequelizeInventoryCountRepository extends InventoryCountRepository {
  /** @inheritdoc */
  async create(data, transaction) {
    return InventoryCount.create(data, { transaction });
  }

  /** @inheritdoc */
  async countByCountNumberPrefix(yearPrefix, transaction) {
    return InventoryCount.count({ where: { count_number: { [Op.like]: `${yearPrefix}%` } }, transaction });
  }

  /** @inheritdoc */
  async bulkCreateItems(items, transaction) {
    return InventoryCountItem.bulkCreate(items, { transaction });
  }

  /** @inheritdoc */
  async list(filters: any = {}, pagination: any = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.count_type) where.count_type = filters.count_type;

    return InventoryCount.findAndCountAll({
      where,
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'name'] },
        { model: User, as: 'approvedBy', attributes: ['id', 'name'] }
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']]
    });
  }

  /** @inheritdoc */
  async findById(id) {
    return InventoryCount.findByPk(id, {
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'name'] },
        { model: User, as: 'approvedBy', attributes: ['id', 'name'] },
        {
          model: InventoryCountItem,
          as: 'items',
          include: [
            { model: Product, as: 'product', attributes: ['id', 'name', 'code', 'quantity'] },
            { model: User, as: 'countedBy', attributes: ['id', 'name'] }
          ]
        }
      ]
    });
  }

  /** @inheritdoc */
  async findRawById(id, transaction) {
    return InventoryCount.findByPk(id, { transaction });
  }

  /** @inheritdoc */
  async update(id, data, transaction) {
    const [updated] = await InventoryCount.update(data, { where: { id }, transaction });
    return updated;
  }

  /** @inheritdoc */
  async findItemById(itemId, transaction) {
    return InventoryCountItem.findByPk(itemId, {
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code', 'quantity'] }],
      transaction
    });
  }

  /** @inheritdoc */
  async listItems(inventoryCountId, transaction) {
    return InventoryCountItem.findAll({
      where: { inventory_count_id: inventoryCountId },
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code', 'quantity'] }],
      order: [['id', 'ASC']],
      transaction
    });
  }

  /** @inheritdoc */
  async updateItem(itemId, data, transaction) {
    const [updated] = await InventoryCountItem.update(data, { where: { id: itemId }, transaction });
    return updated;
  }

  /** @inheritdoc */
  async findProductById(id, transaction) {
    return Product.findByPk(id, { transaction });
  }
}

module.exports = SequelizeInventoryCountRepository;




