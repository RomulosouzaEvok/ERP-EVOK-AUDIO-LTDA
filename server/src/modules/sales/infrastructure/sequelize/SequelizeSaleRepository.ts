const { Op } = require('sequelize');
const { Sale, SaleItem, Product, Client, AccountReceivable } = require('../../../../models/index');
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
  async findSaleById(id) {
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
  async findSaleWithCustomerSummary(id) {
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
  async findSaleWithItems(id, transaction) {
    return Sale.findByPk(id, {
      include: [{ model: SaleItem, as: 'items' }],
      transaction
    });
  }

  /**
   * @param {number} id
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object|null>}
   */
  async findProductById(id, transaction) {
    return Product.findByPk(id, { transaction });
  }

  /**
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async createSale(data, transaction) {
    return Sale.create(data, { transaction });
  }

  /**
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async createSaleItem(data, transaction) {
    return SaleItem.create(data, { transaction });
  }

  /**
   * @param {Object} data
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<Object>}
   */
  async createAccountReceivable(data, transaction) {
    return AccountReceivable.create(data, { transaction });
  }

  /**
   * @param {number} saleId
   * @param {import('sequelize').Transaction} [transaction]
   * @returns {Promise<void>}
   */
  async cancelPendingReceivables(saleId, transaction) {
    await AccountReceivable.update({ status: 'canceled' }, {
      where: { sale_id: saleId, status: { [Op.notIn]: ['paid', 'canceled'] } },
      transaction
    });
  }
}

module.exports = SequelizeSaleRepository;



