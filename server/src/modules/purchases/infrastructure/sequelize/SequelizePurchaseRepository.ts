const { Op } = require('sequelize');
const PurchaseRepository = require('../../domain/repositories/PurchaseRepository');
const { Purchase, PurchaseItem, Product, Supplier, AccountPayable } = require('../../../../models/index');

/**
 * Implementação Sequelize/PostgreSQL do contrato `PurchaseRepository`.
 *
 * Reutiliza os models Sequelize já existentes `Purchase`, `PurchaseItem`,
 * `Product`, `Supplier` e `AccountPayable` — nenhum model novo é criado por
 * este módulo. As queries reproduzem exatamente as do controller anterior
 * `server/src/controllers/purchaseController.ts`.
 */
class SequelizePurchaseRepository extends PurchaseRepository {
  /** @inheritdoc */
  async listPurchases(filters: any = {}, pagination: any = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.supplier_id) where.supplier_id = filters.supplier_id;
    if (filters.start_date || filters.end_date) {
      where.order_date = {};
      if (filters.start_date) where.order_date[Op.gte] = filters.start_date;
      if (filters.end_date) where.order_date[Op.lte] = filters.end_date;
    }

    const { count, rows } = await Purchase.findAndCountAll({
      where,
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'company_name'] },
        { model: PurchaseItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']]
    });

    return { rows, count };
  }

  /** @inheritdoc */
  async findPurchaseById(id) {
    return Purchase.findByPk(id, {
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'company_name', 'cnpj'] },
        { model: PurchaseItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }
      ]
    });
  }

  /** @inheritdoc */
  async findPurchaseByIdRaw(id, transaction) {
    return Purchase.findByPk(id, { transaction });
  }

  /** @inheritdoc */
  async findPurchaseWithItems(id, transaction) {
    return Purchase.findByPk(id, {
      include: [{ model: PurchaseItem, as: 'items' }],
      transaction
    });
  }

  /** @inheritdoc */
  async createPurchase(data, transaction) {
    return Purchase.create(data, { transaction });
  }

  /** @inheritdoc */
  async createPurchaseItem(data, transaction) {
    return PurchaseItem.create(data, { transaction });
  }

  /** @inheritdoc */
  async updatePurchaseFields(id, data) {
    await Purchase.update(data, { where: { id } });
  }

  /** @inheritdoc */
  async findProductById(id, transaction) {
    return Product.findByPk(id, { transaction });
  }

  /** @inheritdoc */
  async findPurchaseItems(purchaseId, transaction) {
    return PurchaseItem.findAll({ where: { purchase_id: purchaseId }, transaction });
  }

  /** @inheritdoc */
  async updatePurchaseItem(id, data, transaction) {
    await PurchaseItem.update(data, { where: { id }, transaction });
  }

  /** @inheritdoc */
  async findAccountPayableByPurchaseId(purchaseId, transaction) {
    return AccountPayable.findOne({ where: { purchase_id: purchaseId }, transaction });
  }

  /** @inheritdoc */
  async createAccountPayable(data, transaction) {
    return AccountPayable.create(data, { transaction });
  }
}

module.exports = SequelizePurchaseRepository;




