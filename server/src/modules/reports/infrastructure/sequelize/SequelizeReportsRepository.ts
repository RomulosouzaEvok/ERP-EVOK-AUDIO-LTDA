const { Op } = require('sequelize');
const { Sale, Product, Client, Purchase } = require('../../../../models/index');
const Category = require('../../../../models/Category');
const ReportsRepository = require('../../domain/repositories/ReportsRepository');

/**
 * Implementação Sequelize/PostgreSQL de `ReportsRepository`, migrada 1:1 do
 * controller anterior (`server/src/controllers/reportController.ts`) — as
 * mesmas queries, agora isoladas do HTTP.
 */
class SequelizeReportsRepository extends ReportsRepository {
  /**
   * @param {Object} filters - `{ start_date, end_date, customer_id }`.
   * @returns {Promise<Object[]>}
   */
  async findSales({ start_date, end_date, customer_id }) {
    const where: any = { status: { [Op.notIn]: ['canceled'] } };
    if (start_date) where.createdAt = { [Op.gte]: new Date(start_date) };
    if (end_date) {
      if (!where.createdAt) where.createdAt = {};
      where.createdAt[Op.lte] = new Date(end_date);
    }
    if (customer_id) where.customer_id = customer_id;

    return Sale.findAll({
      where,
      include: [{ model: Client, as: 'customer', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });
  }

  /** @returns {Promise<Object[]>} */
  async findActiveProducts() {
    return Product.findAll({
      where: { status: 'active' },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']]
    });
  }

  /** @returns {Promise<Object[]>} */
  async findActiveCustomers() {
    return Client.findAll({ where: { status: 'active' }, order: [['name', 'ASC']] });
  }

  /**
   * @param {Date} start
   * @param {Date} end
   * @returns {Promise<{ sales: number, purchases: number }>}
   */
  async sumCashFlow(start, end) {
    const sales = await Sale.sum('total_amount', {
      where: { createdAt: { [Op.between]: [start, end] }, status: { [Op.notIn]: ['canceled'] } }
    }) || 0;
    const purchases = await Purchase.sum('total_amount', {
      where: { createdAt: { [Op.between]: [start, end] }, status: { [Op.notIn]: ['canceled'] } }
    }) || 0;
    return { sales, purchases };
  }
}

module.exports = SequelizeReportsRepository;
