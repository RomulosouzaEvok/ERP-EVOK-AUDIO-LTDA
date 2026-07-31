const { Op } = require('sequelize');
const PurchaseRepository = require('../../domain/repositories/PurchaseRepository');
const { Purchase, PurchaseItem, Product, Supplier, AccountPayable, Item } = require('../../../../models/index');

class SequelizePurchaseRepository extends PurchaseRepository {
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
        {
          model: PurchaseItem,
          as: 'items',
          include: [
            { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
            { model: Item, as: 'item', attributes: ['id', 'descricao'] },
          ],
        },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
    });

    return { rows, count };
  }

  async findPurchaseById(id) {
    return Purchase.findByPk(id, {
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'company_name', 'cnpj'] },
        {
          model: PurchaseItem,
          as: 'items',
          include: [
            { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
            { model: Item, as: 'item', attributes: ['id', 'descricao'] },
          ],
        },
      ],
    });
  }

  async findPurchaseByIdRaw(id, transaction) {
    return Purchase.findByPk(id, { transaction });
  }

  async findPurchaseByIdRawForUpdate(id, transaction) {
    return Purchase.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  async findPurchaseWithItems(id, transaction) {
    return Purchase.findByPk(id, {
      include: [
        {
          model: PurchaseItem,
          as: 'items',
          include: [
            { model: Item, as: 'item', attributes: ['id', 'descricao'] },
          ],
        },
      ],
      transaction,
    });
  }

  async findPurchaseWithItemsForUpdate(id, transaction) {
    // Nao usar `include` (LEFT OUTER JOIN) junto de `lock` aqui: o Postgres
    // rejeita "FOR UPDATE" no lado nullable de um outer join
    // ("FOR UPDATE cannot be applied to the nullable side of an outer
    // join"), o que derrubava o recebimento de compras com 500 em runtime
    // real mesmo com testes unitarios (mockados) passando. Trava o pedido
    // e os itens em duas queries de tabela unica, sem join.
    const purchase = await Purchase.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!purchase) return null;

    const items = await PurchaseItem.findAll({
      where: { purchase_id: id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    // Atribuicao direta (nao `setDataValue`): o alias `items` do hasMany so
    // ganha getter/property quando populado via `include`; ao buscar em
    // duas queries precisamos atribuir a propriedade manualmente para que
    // `purchase.items` funcione no restante do use case.
    purchase.items = items;
    return purchase;
  }

  async createPurchase(data, transaction) {
    return Purchase.create(data, { transaction });
  }

  async createPurchaseItem(data, transaction) {
    return PurchaseItem.create(data, { transaction });
  }

  async updatePurchaseFields(id, data, transaction) {
    await Purchase.update(data, { where: { id }, transaction });
  }

  async findProductById(id, transaction) {
    return Product.findByPk(id, { transaction });
  }

  async findPurchaseItems(purchaseId, transaction) {
    return PurchaseItem.findAll({ where: { purchase_id: purchaseId }, transaction });
  }

  async findPurchaseItemsForUpdate(purchaseId, transaction) {
    return PurchaseItem.findAll({
      where: { purchase_id: purchaseId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  async updatePurchaseItem(id, data, transaction) {
    await PurchaseItem.update(data, { where: { id }, transaction });
  }

  async findAccountPayableByPurchaseId(purchaseId, transaction) {
    return AccountPayable.findOne({ where: { purchase_id: purchaseId }, transaction });
  }

  async createAccountPayable(data, transaction) {
    return AccountPayable.create(data, { transaction });
  }
}

module.exports = SequelizePurchaseRepository;
