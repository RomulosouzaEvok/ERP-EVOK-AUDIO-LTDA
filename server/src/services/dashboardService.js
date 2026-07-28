const { Sale, SaleItem, Product, Client, Category, Supplier, Employee, ProductionOrder, AccountReceivable, AccountPayable, InventoryMovement, User } = require('../models/index');
const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/database');

class DashboardService {
  static async getDashboard() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [
      salesToday,
      salesMonth,
      salesYear,
      totalCustomers,
      totalProducts,
      totalSuppliers,
      totalEmployees,
      activeProduction,
      pendingReceivable,
      pendingPayable,
      overdueReceivable,
      overduePayable,
      lowStockProducts,
      movementsToday,
      recentSales,
      recentMovements,
      salesByDay
    ] = await Promise.all([
      // Vendas hoje
      Sale.findAll({ where: { created_at: { [Op.gte]: todayStart } }, attributes: [[fn('COALESCE', fn('SUM', col('total_amount')), 0), 'total'], [fn('COUNT', col('id')), 'count']], raw: true }),
      // Vendas no mês
      Sale.findAll({ where: { created_at: { [Op.gte]: monthStart } }, attributes: [[fn('COALESCE', fn('SUM', col('total_amount')), 0), 'total'], [fn('COUNT', col('id')), 'count']], raw: true }),
      // Vendas no ano
      Sale.findAll({ where: { created_at: { [Op.gte]: yearStart } }, attributes: [[fn('COALESCE', fn('SUM', col('total_amount')), 0), 'total'], [fn('COUNT', col('id')), 'count']], raw: true }),
      Client.count({ where: { status: 'active' } }),
      Product.count({ where: { status: 'active' } }),
      Supplier.count({ where: { status: 'active' } }),
      Employee.count({ where: { status: 'active' } }),
      ProductionOrder.count({ where: { status: { [Op.in]: ['planned', 'released', 'in_progress'] } } }),
      AccountReceivable.findAll({ where: { status: 'pending' }, attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total'], [fn('COUNT', col('id')), 'count']], raw: true }),
      AccountPayable.findAll({ where: { status: 'pending' }, attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total'], [fn('COUNT', col('id')), 'count']], raw: true }),
      AccountReceivable.findAll({ where: { status: 'overdue' }, attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total'], [fn('COUNT', col('id')), 'count']], raw: true }),
      AccountPayable.findAll({ where: { status: 'overdue' }, attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total'], [fn('COUNT', col('id')), 'count']], raw: true }),
      Product.count({ where: { status: 'active', quantity: { [Op.lte]: col('min_quantity') } } }),
      InventoryMovement.count({ where: { created_at: { [Op.gte]: todayStart } } }),
      // Últimas 5 vendas
      Sale.findAll({ limit: 5, order: [['created_at', 'DESC']], include: [{ model: Client, as: 'customer', attributes: ['id', 'name'] }] }),
      // Últimas 5 movimentações
      InventoryMovement.findAll({ limit: 5, order: [['created_at', 'DESC']], include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }, { model: User, as: 'user', attributes: ['id', 'name'] }] }),
      // Vendas por dia no mês
      Sale.findAll({
        where: { created_at: { [Op.gte]: monthStart } },
        attributes: [[fn('DATE', col('created_at')), 'day'], [fn('COALESCE', fn('SUM', col('total_amount')), 0), 'total'], [fn('COUNT', col('id')), 'count']],
        group: [fn('DATE', col('created_at'))],
        order: [[fn('DATE', col('created_at')), 'ASC']],
        raw: true
      })
    ]);

    return {
      generated_at: now,
      kpi: {
        sales: {
          today: salesToday.length > 0 ? parseFloat(salesToday[0].total) || 0 : 0,
          today_count: salesToday.length > 0 ? parseInt(salesToday[0].count) || 0 : 0,
          month: salesMonth.length > 0 ? parseFloat(salesMonth[0].total) || 0 : 0,
          month_count: salesMonth.length > 0 ? parseInt(salesMonth[0].count) || 0 : 0,
          year: salesYear.length > 0 ? parseFloat(salesYear[0].total) || 0 : 0,
          year_count: salesYear.length > 0 ? parseInt(salesYear[0].count) || 0 : 0
        },
        financial: {
          pending_receivable: pendingReceivable.length > 0 ? parseFloat(pendingReceivable[0].total) || 0 : 0,
          pending_receivable_count: pendingReceivable.length > 0 ? parseInt(pendingReceivable[0].count) || 0 : 0,
          pending_payable: pendingPayable.length > 0 ? parseFloat(pendingPayable[0].total) || 0 : 0,
          pending_payable_count: pendingPayable.length > 0 ? parseInt(pendingPayable[0].count) || 0 : 0,
          overdue_receivable: overdueReceivable.length > 0 ? parseFloat(overdueReceivable[0].total) || 0 : 0,
          overdue_payable: overduePayable.length > 0 ? parseFloat(overduePayable[0].total) || 0 : 0
        },
        operations: {
          active_customers: totalCustomers,
          active_products: totalProducts,
          active_suppliers: totalSuppliers,
          active_employees: totalEmployees,
          active_production_orders: activeProduction,
          low_stock_products: lowStockProducts,
          movements_today: movementsToday
        }
      },
      charts: { sales_by_day: salesByDay },
      recent_activity: { sales: recentSales, movements: recentMovements }
    };
  }
}

module.exports = DashboardService;
