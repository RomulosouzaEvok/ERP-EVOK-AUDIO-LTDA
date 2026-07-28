const { Sale, SaleItem, Product, Client, Category, AccountReceivable, AccountPayable, ProductionOrder, Employee } = require('../models/index');
const { Op, fn, col } = require('sequelize');

class ReportService {
  static async salesReport(startDate, endDate, filters = {}) {
    const where = {};
    if (startDate || endDate) { where.created_at = {}; if (startDate) where.created_at[Op.gte] = new Date(startDate); if (endDate) where.created_at[Op.lte] = new Date(endDate); }
    if (filters.status) where.status = filters.status;
    if (filters.customer_id) where.customer_id = filters.customer_id;

    const sales = await Sale.findAll({
      where,
      include: [
        { model: Client, as: 'customer', attributes: ['id', 'name'] },
        { model: SaleItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code', 'category_id'] }] }
      ]
    });

    const byDay = {};
    sales.forEach(s => {
      const day = new Date(s.created_at).toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { date: day, count: 0, total: 0 };
      byDay[day].count++;
      byDay[day].total += parseFloat(s.total_amount || 0);
    });

    const byProduct = {};
    sales.forEach(s => {
      (s.items || []).forEach(item => {
        const productId = item.product?.id?.toString() || 'unknown';
        if (!byProduct[productId]) byProduct[productId] = { product: item.product, quantity: 0, total: 0 };
        byProduct[productId].quantity += item.quantity;
        byProduct[productId].total += parseFloat(item.total_price || 0);
      });
    });

    const totalAmount = sales.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
    const totalItems = sales.reduce((sum, s) => sum + (s.items || []).reduce((si, i) => si + (i.quantity || 0), 0), 0);

    return { period: { start: startDate, end: endDate }, summary: { total_sales: sales.length, total_amount: totalAmount, total_items: totalItems, average_ticket: sales.length > 0 ? totalAmount / sales.length : 0, daily_average: Object.keys(byDay).length > 0 ? totalAmount / Object.keys(byDay).length : 0 }, by_day: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)), top_products: Object.values(byProduct).sort((a, b) => b.total - a.total).slice(0, 20), details: sales };
  }

  static async financialReport(startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    const nextMonth = new Date(end); nextMonth.setMonth(nextMonth.getMonth() + 1);

    const [receivable, payable, futureReceivable, futurePayable] = await Promise.all([
      AccountReceivable.findAll({ where: { due_date: { [Op.between]: [start, end] } }, attributes: ['status', [fn('COALESCE', fn('SUM', col('amount')), 0), 'total'], [fn('COUNT', col('id')), 'count']], group: ['status'], raw: true }),
      AccountPayable.findAll({ where: { due_date: { [Op.between]: [start, end] } }, attributes: ['status', [fn('COALESCE', fn('SUM', col('amount')), 0), 'total'], [fn('COUNT', col('id')), 'count']], group: ['status'], raw: true }),
      AccountReceivable.findAll({ where: { due_date: { [Op.between]: [end, nextMonth] }, status: 'pending' }, attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']], raw: true }),
      AccountPayable.findAll({ where: { due_date: { [Op.between]: [end, nextMonth] }, status: 'pending' }, attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']], raw: true })
    ]);

    const totalReceivable = receivable.reduce((sum, r) => sum + parseFloat(r.total || 0), 0);
    const totalPayable = payable.reduce((sum, p) => sum + parseFloat(p.total || 0), 0);
    const pendingReceivable = receivable.filter(r => r.status === 'pending').reduce((sum, r) => sum + parseFloat(r.total || 0), 0);
    const pendingPayable = payable.filter(p => p.status === 'pending').reduce((sum, p) => sum + parseFloat(p.total || 0), 0);
    const overdueReceivable = receivable.filter(r => r.status === 'overdue').reduce((sum, r) => sum + parseFloat(r.total || 0), 0);
    const overduePayable = payable.filter(p => p.status === 'overdue').reduce((sum, p) => sum + parseFloat(p.total || 0), 0);

    return { period: { start, end }, summary: { total_receivable: totalReceivable, total_payable: totalPayable, balance: totalReceivable - totalPayable, pending_receivable: pendingReceivable, pending_payable: pendingPayable, overdue_receivable: overdueReceivable, overdue_payable: overduePayable }, projection: { next_30days_receivable: futureReceivable.length > 0 ? parseFloat(futureReceivable[0].total) || 0 : 0, next_30days_payable: futurePayable.length > 0 ? parseFloat(futurePayable[0].total) || 0 : 0, projected_balance: (futureReceivable.length > 0 ? parseFloat(futureReceivable[0].total) || 0 : 0) - (futurePayable.length > 0 ? parseFloat(futurePayable[0].total) || 0 : 0) }, receivable_by_status: receivable, payable_by_status: payable };
  }

  static async productionReport(startDate, endDate) {
    const where = {};
    if (startDate || endDate) { where.createdAt = {}; if (startDate) where.createdAt[Op.gte] = new Date(startDate); if (endDate) where.createdAt[Op.lte] = new Date(endDate); }

    const orders = await ProductionOrder.findAll({
      where, include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }, { model: Employee, as: 'responsible', attributes: ['id', 'name'] }]
    });

    const totalPlanned = orders.reduce((sum, o) => sum + o.quantity, 0);
    const totalProduced = orders.reduce((sum, o) => sum + (o.quantity_produced || 0), 0);
    const completed = orders.filter(o => o.status === 'completed');
    const onTime = completed.filter(o => !o.completion_date || !o.due_date || new Date(o.completion_date) <= new Date(o.due_date));

    return { period: { start: startDate, end: endDate }, summary: { total_orders: orders.length, total_planned: totalPlanned, total_produced: totalProduced, completion_rate: totalPlanned > 0 ? `${((totalProduced / totalPlanned) * 100).toFixed(2)}%` : '0%', efficiency: completed.length > 0 ? `${((onTime.length / completed.length) * 100).toFixed(2)}%` : 'N/A', on_time_delivery: onTime.length, delayed: completed.length - onTime.length }, by_status: { planned: orders.filter(o => o.status === 'planned').length, released: orders.filter(o => o.status === 'released').length, in_progress: orders.filter(o => o.status === 'in_progress').length, completed: completed.length, paused: orders.filter(o => o.status === 'paused').length, canceled: orders.filter(o => o.status === 'canceled').length }, details: orders };
  }
}

module.exports = ReportService;
