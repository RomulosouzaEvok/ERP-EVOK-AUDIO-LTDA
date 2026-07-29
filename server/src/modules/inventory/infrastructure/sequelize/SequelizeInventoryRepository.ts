const { Op, col } = require('sequelize');
const InventoryRepository = require('../../domain/repositories/InventoryRepository');
const { InventoryMovement, Product, User, Category } = require('../../../../models/index');

/**
 * Implementação Sequelize/PostgreSQL do contrato `InventoryRepository`.
 *
 * Reutiliza os models Sequelize já existentes `InventoryMovement` e
 * `Product` — nenhum model novo é criado por este módulo.
 */
class SequelizeInventoryRepository extends InventoryRepository {
  /**
   * @inheritdoc
   * @param {Object} [filters]
   * @param {number} [filters.product_id]
   * @param {string} [filters.type] - `in` | `out` | `adjustment`.
   * @param {string|Date} [filters.start_date]
   * @param {string|Date} [filters.end_date]
   * @param {Object} [pagination]
   * @param {number} [pagination.limit]
   * @param {number} [pagination.offset]
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async listMovements(filters: any = {}, pagination: any = {}) {
    const where: any = {};
    if (filters.product_id) where.product_id = filters.product_id;
    if (filters.type) where.type = filters.type;
    if (filters.start_date || filters.end_date) {
      where.created_at = {};
      if (filters.start_date) where.created_at[Op.gte] = new Date(filters.start_date);
      if (filters.end_date) where.created_at[Op.lte] = new Date(filters.end_date);
    }

    const { count, rows } = await InventoryMovement.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'user', attributes: ['id', 'name'] }
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['created_at', 'DESC']]
    });

    return { rows, count };
  }

  /** @inheritdoc */
  async findMovementById(id) {
    return InventoryMovement.findByPk(id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code', 'quantity'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
      ]
    });
  }

  /** @inheritdoc */
  async listActiveProductsWithCategory() {
    return Product.findAll({
      where: { status: 'active' },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']]
    });
  }

  /** @inheritdoc */
  async listLowStockProducts() {
    return Product.findAll({
      where: { status: 'active', quantity: { [Op.lte]: col('min_quantity') } },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']]
    });
  }
}

module.exports = SequelizeInventoryRepository;




