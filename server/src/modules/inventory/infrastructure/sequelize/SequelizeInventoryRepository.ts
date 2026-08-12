import type { Transaction } from 'sequelize';

const { Op, col, Transaction: SequelizeTransaction } = require('sequelize');
const InventoryRepository = require('../../domain/repositories/InventoryRepository');
const {
  InventoryMovement,
  Product,
  User,
  Category,
  Item,
  Warehouse,
  WarehouseTransfer,
  ProductWarehouseStock,
  LotControl,
  Supplier
} = require('../../../../models/index');

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
  async findMovementById(id: number | string) {
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

  /** @inheritdoc */
  async findProductById(id: number | string) {
    return Product.findByPk(id);
  }

  /** @inheritdoc */
  async createInventoryMovement(data: Record<string, unknown>, transaction?: Transaction) {
    return InventoryMovement.create(data, { transaction });
  }

  /** @inheritdoc */
  async findWarehouseByCode(code: string) {
    return Warehouse.findOne({ where: { code } });
  }

  /** @inheritdoc */
  async findWarehouseById(id: number | string) {
    return Warehouse.findByPk(id);
  }

  /** @inheritdoc */
  async listActiveWarehouses() {
    return Warehouse.findAll({
      where: { active: true },
      order: [['code', 'ASC']]
    });
  }

  /** @inheritdoc */
  async createWarehouse(data: Record<string, unknown>) {
    return Warehouse.create(data);
  }

  /** @inheritdoc */
  async findWarehouseTransferForUpdate(id: number | string, transaction: Transaction) {
    return WarehouseTransfer.findByPk(id, {
      transaction,
      lock: SequelizeTransaction.LOCK.UPDATE
    });
  }

  /** @inheritdoc */
  async createWarehouseTransfer(data: Record<string, unknown>) {
    return WarehouseTransfer.create(data);
  }

  /** @inheritdoc */
  async listWarehouseTransfers(where: Record<string, unknown> = {}) {
    return WarehouseTransfer.findAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: Warehouse, as: 'fromWarehouse', attributes: ['id', 'code', 'name'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['id', 'code', 'name'] },
        { model: User, as: 'requestedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'approvedBy', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  /** @inheritdoc */
  async listWarehouseStock(where: Record<string, unknown> = {}, warehouseWhere: Record<string, unknown> = {}, pagination: any = {}) {
    const { count, rows } = await ProductWarehouseStock.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: Warehouse, as: 'warehouse', attributes: ['id', 'code', 'name'], where: warehouseWhere }
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['product_id', 'ASC']]
    });
    return { rows, count };
  }

  /** @inheritdoc */
  async findLotById(id: number | string) {
    return LotControl.findByPk(id);
  }

  /** @inheritdoc */
  async findLotByIdForUpdate(id: number | string, transaction: Transaction) {
    return LotControl.findByPk(id, {
      transaction,
      lock: (transaction as any).LOCK.UPDATE,
    });
  }

  /** @inheritdoc */
  async findLotByCodeForProduct(where: Record<string, unknown>) {
    return LotControl.findOne({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: Supplier, as: 'supplier', attributes: ['id', 'company_name'] },
        { model: Warehouse, as: 'warehouse', attributes: ['id', 'code', 'name'] }
      ],
      order: [['createdAt', 'ASC']]
    });
  }

  /** @inheritdoc */
  async findLotsByCode(where: Record<string, unknown>) {
    return LotControl.findAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: Supplier, as: 'supplier', attributes: ['id', 'company_name'] },
        { model: Warehouse, as: 'warehouse', attributes: ['id', 'code', 'name'] }
      ],
      order: [['createdAt', 'ASC']],
      limit: 2
    });
  }

  /** @inheritdoc */
  async listLots(where: Record<string, unknown> = {}, pagination: any = {}) {
    const { count, rows } = await LotControl.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: Supplier, as: 'supplier', attributes: ['id', 'company_name'] }
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'ASC']]
    });
    return { rows, count };
  }
}

module.exports = SequelizeInventoryRepository;




