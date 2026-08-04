const { Op, col } = require('sequelize');
const InventoryRepository = require('../../domain/repositories/InventoryRepository');
const { InventoryMovement, Product, User, Category, Item } = require('../../../../models/index');

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
   * @param {number} [filters.product_id] - Modo legado (INTEGER)
   * @param {string} [filters.item_id] - Modo novo (UUID, PREFERIDO)
   * @param {string} [filters.type] - `in` | `out` | `adjustment`.
   * @param {string|Date} [filters.start_date]
   * @param {string|Date} [filters.end_date]
   * @param {number} [filters.warehouse_id] - Filtra movimentações de um depósito específico (Bloco 4, UC-42).
   * @param {Object} [pagination]
   * @param {number} [pagination.limit]
   * @param {number} [pagination.offset]
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async listMovements(filters: any = {}, pagination: any = {}) {
    const where: any = {};

    // DUAL-READ: Suportar ambos product_id (legado) e item_id (novo)
    if (filters.product_id && !filters.item_id) {
      where.product_id = filters.product_id;
      console.log('[InventoryMovement] Using legacy product_id filter');
    } else if (filters.item_id && !filters.product_id) {
      where.item_id = filters.item_id;
      console.log('[InventoryMovement] Using new item_id filter (PREFERRED)');
    } else if (filters.product_id && filters.item_id) {
      console.warn(`[DRIFT WARNING] Both product_id and item_id specified; using item_id (preferred)`);
      where.item_id = filters.item_id;
    }

    if (filters.type) where.type = filters.type;
    if (filters.warehouse_id) where.warehouse_id = filters.warehouse_id;
    if (filters.start_date || filters.end_date) {
      where.created_at = {};
      if (filters.start_date) where.created_at[Op.gte] = new Date(filters.start_date);
      if (filters.end_date) where.created_at[Op.lte] = new Date(filters.end_date);
    }

    const includeArray: any[] = [
      { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
      { model: User, as: 'user', attributes: ['id', 'name'] }
    ];

    // Incluir Item quando item_id for usado
    if (filters.item_id) {
      includeArray.push({ model: Item, as: 'item', attributes: ['id', 'codigo', 'descricao'] });
    }

    const { count, rows } = await InventoryMovement.findAndCountAll({
      where,
      include: includeArray,
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
        { model: Item, as: 'item', attributes: ['id', 'codigo', 'descricao'] },
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




