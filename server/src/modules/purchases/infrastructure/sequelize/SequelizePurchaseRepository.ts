const { Op, QueryTypes } = require('sequelize');
const PurchaseRepository = require('../../domain/repositories/PurchaseRepository');
const { sequelize } = require('../../../../config/database');
const { Purchase, PurchaseItem, Product, Supplier, AccountPayable, Item, PurchaseRequisition } = require('../../../../models/index');

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
        // Bloco 2 (UC-39): expõe `requisition.origin` para a fila de
        // Recebimento exibir o badge "Amostra — Engenharia" (leitura simples,
        // sem regra de negócio nova — o roteamento de depósito já é
        // resolvido separadamente em `ReceivePurchaseItemsUseCase`).
        { model: PurchaseRequisition, as: 'requisition', attributes: ['id', 'origin'] },
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
        { model: PurchaseRequisition, as: 'requisition', attributes: ['id', 'origin'] },
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

  async findProductByCode(code, transaction) {
    return Product.findOne({ where: { code }, transaction });
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

  /** @inheritdoc */
  async getCockpitMetrics() {
    // SQL raw parametrizado (sem interpolacao de strings de usuario — os
    // unicos parametros dinamicos sao listas fixas de status e a data atual
    // do servidor de banco via `CURRENT_DATE`, nunca input externo).
    const [pendingRequisitionsRow] = await sequelize.query(
      `SELECT COUNT(*)::int AS count
       FROM purchase_requisitions
       WHERE status = :pendingStatus`,
      { replacements: { pendingStatus: 'pending' }, type: QueryTypes.SELECT }
    );

    const [openOrdersRow] = await sequelize.query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(total_amount), 0)::numeric AS total_amount
       FROM purchase_orders
       WHERE status IN (:openStatuses)`,
      { replacements: { openStatuses: ['pending', 'approved', 'sent', 'partial'] }, type: QueryTypes.SELECT }
    );

    const [arrivingRow] = await sequelize.query(
      `SELECT COUNT(*)::int AS count
       FROM purchase_orders
       WHERE status IN (:arrivingStatuses)
         AND expected_date IS NOT NULL
         AND expected_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')`,
      { replacements: { arrivingStatuses: ['sent', 'approved', 'partial'] }, type: QueryTypes.SELECT }
    );

    const [overdueRow] = await sequelize.query(
      `SELECT COUNT(*)::int AS count
       FROM purchase_orders
       WHERE status NOT IN (:excludedStatuses)
         AND expected_date IS NOT NULL
         AND expected_date < CURRENT_DATE
         AND delivery_date IS NULL`,
      { replacements: { excludedStatuses: ['received', 'canceled'] }, type: QueryTypes.SELECT }
    );

    return {
      pending_requisitions: pendingRequisitionsRow?.count ?? 0,
      open_orders: {
        count: openOrdersRow?.count ?? 0,
        total_amount: parseFloat(openOrdersRow?.total_amount ?? 0)
      },
      arriving_this_week: arrivingRow?.count ?? 0,
      overdue: overdueRow?.count ?? 0
    };
  }
}

module.exports = SequelizePurchaseRepository;
