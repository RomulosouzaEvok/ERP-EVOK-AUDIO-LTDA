import type { Transaction } from 'sequelize';

const { Op } = require('sequelize');
const { Sale, SaleItem, Product, Client, AccountReceivable, CustomerPriceList } = require('../../../../models/index');
const SaleRepository = require('../../domain/repositories/SaleRepository');

/**
 * Implementação Sequelize/PostgreSQL de `SaleRepository`, usando exclusivamente
 * os models já existentes em `server/src/models/` (nenhum model novo foi
 * criado por esta migração).
 */
class SequelizeSaleRepository extends SaleRepository {
  /**
   * @param {Object} [filters]
   * @param {string} [filters.status]
   * @param {number} [filters.customer_id]
   * @param {string} [filters.start_date]
   * @param {string} [filters.end_date]
   * @param {Object} [pagination]
   * @param {number} pagination.limit
   * @param {number} pagination.offset
   * @returns {Promise<{ rows: Object[], count: number }>}
   */
  async listSales({ status, customer_id, start_date, end_date }: any = {}, { limit, offset }: any = {}) {
    const where: any = {};
    if (status) where.status = status;
    if (customer_id) where.customer_id = customer_id;
    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) where.createdAt[Op.gte] = new Date(start_date);
      if (end_date) where.createdAt[Op.lte] = new Date(end_date);
    }

    const { count, rows } = await Sale.findAndCountAll({
      where,
      include: [
        { model: Client, as: 'customer', attributes: ['id', 'name'] },
        { model: SaleItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return { rows, count };
  }

  /**
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findSaleById(id: number) {
    return Sale.findByPk(id, {
      include: [
        { model: Client, as: 'customer', attributes: ['id', 'name', 'cpf_cnpj', 'phone', 'email'] },
        { model: SaleItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }
      ]
    });
  }

  /**
   * Busca uma venda com o mesmo formato de include usado na lista (cliente
   * resumido + itens/produto), usado após `create` para devolver a venda
   * completa ao cliente.
   *
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findSaleWithCustomerSummary(id: number) {
    return Sale.findByPk(id, {
      include: [
        { model: Client, as: 'customer', attributes: ['id', 'name'] },
        { model: SaleItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }
      ]
    });
  }

  /**
   * @param {number} id
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findSaleWithItems(id: number, transaction?: Transaction) {
    return Sale.findByPk(id, {
      include: [{ model: SaleItem, as: 'items' }],
      transaction
    });
  }

  /**
   * @param {number} id
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<Object|null>}
   */
  async findSaleWithItemsForUpdate(id: number, transaction: Transaction) {
    // Nao usar `include` (LEFT OUTER JOIN) junto de `lock` aqui: o Postgres
    // rejeita "FOR UPDATE" no lado nullable de um outer join
    // ("FOR UPDATE cannot be applied to the nullable side of an outer
    // join"), o que derrubava o cancelamento de vendas com 500 em runtime
    // real mesmo com testes unitarios (mockados) passando. Trava a venda e
    // os itens em duas queries de tabela unica, sem join.
    const sale = await Sale.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!sale) return null;

    const items = await SaleItem.findAll({
      where: { sale_id: id },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    // Atribuicao direta (nao `setDataValue`): o alias `items` do hasMany so
    // ganha getter/property quando populado via `include`.
    sale.items = items;
    return sale;
  }

  /**
   * @param {number} id
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findProductById(id: number, transaction?: Transaction) {
    return Product.findByPk(id, { transaction });
  }

  /**
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async createSale(data: Record<string, unknown>, transaction?: Transaction) {
    return Sale.create(data, { transaction });
  }

  /**
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async createSaleItem(data: Record<string, unknown>, transaction?: Transaction) {
    return SaleItem.create(data, { transaction });
  }

  /**
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async createAccountReceivable(data: Record<string, unknown>, transaction?: Transaction) {
    return AccountReceivable.create(data, { transaction });
  }

  /**
   * @param {number} saleId
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<void>}
   */
  async cancelPendingReceivables(saleId: number, transaction?: Transaction) {
    await AccountReceivable.update({ status: 'canceled' }, {
      where: { sale_id: saleId, status: { [Op.notIn]: ['paid', 'canceled'] } },
      transaction
    });
  }

  /**
   * @param {number} id
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async updateSaleItem(id: number, data: Record<string, unknown>, transaction?: Transaction) {
    const item = await SaleItem.findByPk(id, { transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });
    if (!item) return null;
    Object.assign(item, data);
    await item.save({ transaction });
    return item;
  }

  /**
   * @param {number} id
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<void>}
   */
  async deleteSaleItem(id: number, transaction?: Transaction) {
    await SaleItem.destroy({ where: { id }, transaction });
  }

  /**
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findClientById(id: number) {
    return Client.findByPk(id);
  }

  /**
   * @param {number} customerId
   * @param {Object} [filters]
   * @param {number} [filters.product_id]
   * @param {boolean} [filters.active_only]
   * @returns {Promise<Object[]>}
   */
  async listCustomerPrices(customerId: number, { product_id, active_only }: any = {}) {
    const where: any = { customer_id: customerId };
    if (product_id) where.product_id = product_id;
    if (active_only) where.active = true;

    return CustomerPriceList.findAll({
      where,
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }],
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findCustomerPriceById(id: number) {
    return CustomerPriceList.findByPk(id, {
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }]
    });
  }

  /**
   * @param {number} customerId
   * @param {number} productId
   * @param {number} [excludeId]
   * @returns {Promise<Object[]>}
   */
  async listActiveCustomerPricesForProduct(customerId: number, productId: number, excludeId?: number) {
    const where: any = { customer_id: customerId, product_id: productId, active: true };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    return CustomerPriceList.findAll({ where });
  }

  /**
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createCustomerPrice(data: Record<string, unknown>) {
    return CustomerPriceList.create(data);
  }
}

module.exports = SequelizeSaleRepository;



