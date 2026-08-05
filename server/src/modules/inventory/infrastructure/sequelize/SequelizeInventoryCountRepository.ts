import type { Transaction } from 'sequelize';

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
  async create(data: Record<string, unknown>, transaction?: Transaction) {
    return InventoryCount.create(data, { transaction });
  }

  /** @inheritdoc */
  async countByCountNumberPrefix(yearPrefix: string, transaction?: Transaction) {
    return InventoryCount.count({ where: { count_number: { [Op.like]: `${yearPrefix}%` } }, transaction });
  }

  /** @inheritdoc */
  async bulkCreateItems(items: Record<string, unknown>[], transaction?: Transaction) {
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
  async findById(id: number | string) {
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
  async findRawById(id: number | string, transaction?: Transaction) {
    return InventoryCount.findByPk(id, { transaction });
  }

  /**
   * Busca a contagem com lock pessimista (`SELECT ... FOR UPDATE`), usado
   * para serializar aprovação/rejeição concorrente da mesma contagem.
   *
   * @inheritdoc
   */
  async findRawByIdForUpdate(id: number | string, transaction: Transaction) {
    return InventoryCount.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  }

  /** @inheritdoc */
  async update(id: number | string, data: Record<string, unknown>, transaction?: Transaction) {
    const [updated] = await InventoryCount.update(data, { where: { id }, transaction });
    return updated;
  }

  /**
   * Atualiza a contagem apenas se ainda estiver no `expectedStatus`
   * informado (`UPDATE ... WHERE id = :id AND status = :expectedStatus`).
   * Retorna o número de linhas afetadas (0 ou 1) — usado para detectar,
   * de forma atômica, uma segunda aprovação/rejeição concorrente que
   * tenha vencido a corrida mesmo com o lock pessimista já liberado.
   *
   * @inheritdoc
   */
  async updateIfStatus(id: number | string, expectedStatus: string, data: Record<string, unknown>, transaction?: Transaction) {
    const [updated] = await InventoryCount.update(data, {
      where: { id, status: expectedStatus },
      transaction
    });
    return updated;
  }

  /** @inheritdoc */
  async findItemById(itemId: number | string, transaction?: Transaction) {
    return InventoryCountItem.findByPk(itemId, {
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code', 'quantity'] }],
      transaction
    });
  }

  /** @inheritdoc */
  async listItems(inventoryCountId: number | string, transaction?: Transaction) {
    return InventoryCountItem.findAll({
      where: { inventory_count_id: inventoryCountId },
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code', 'quantity'] }],
      order: [['id', 'ASC']],
      transaction
    });
  }

  /** @inheritdoc */
  async updateItem(itemId: number | string, data: Record<string, unknown>, transaction?: Transaction) {
    const [updated] = await InventoryCountItem.update(data, { where: { id: itemId }, transaction });
    return updated;
  }

  /** @inheritdoc */
  async findProductById(id: number | string, transaction?: Transaction) {
    return Product.findByPk(id, { transaction });
  }
}

module.exports = SequelizeInventoryCountRepository;




