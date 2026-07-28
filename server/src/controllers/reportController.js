const { Sale, SaleItem, Product, Client, AccountReceivable, AccountPayable, InventoryMovement } = require('../models/index');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

exports.sales = async (req, res) => {
  try {
    const { start_date, end_date, customer_id } = req.query;
    const where = {};
    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) where.createdAt[Op.gte] = new Date(start_date);
      if (end_date) where.createdAt[Op.lte] = new Date(end_date);
    }
    if (customer_id) where.customer_id = customer_id;

    const sales = await Sale.findAll({
      where,
      include: [
        { model: Client, as: 'customer', attributes: ['id', 'name'] },
        { model: SaleItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }
      ]
    });

    const totalSales = sales.length;
    const totalAmount = sales.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
    const averageTicket = totalSales > 0 ? totalAmount / totalSales : 0;

    res.json({ success: true, data: { report_type: 'sales', generated_at: new Date(), filters: { start_date, end_date }, summary: { total_sales: totalSales, total_amount: totalAmount, average_ticket: averageTicket }, details: sales } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.inventory = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { status: 'active' },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
    });

    const totalItems = products.reduce((sum, p) => sum + p.quantity, 0);
    const totalValue = products.reduce((sum, p) => sum + (parseFloat(p.cost_price || 0) * p.quantity), 0);
    const lowStock = products.filter(p => p.quantity <= p.min_quantity);

    res.json({ success: true, data: { report_type: 'inventory', generated_at: new Date(), summary: { total_products: products.length, total_items: totalItems, total_value: totalValue, low_stock_items: lowStock.length }, details: products, low_stock: lowStock } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.customers = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const customers = await Client.findAll({ where: { status: 'active' } });

    const enriched = await Promise.all(customers.map(async (c) => {
      const salesWhere = { customer_id: c.id };
      if (start_date || end_date) {
        salesWhere.createdAt = {};
        if (start_date) salesWhere.createdAt[Op.gte] = new Date(start_date);
        if (end_date) salesWhere.createdAt[Op.lte] = new Date(end_date);
      }
      const sales = await Sale.findAll({ where: salesWhere });
      const totalSpent = sales.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
      return { ...c.toJSON(), total_purchases: sales.length, total_spent: totalSpent };
    }));

    res.json({ success: true, data: { report_type: 'customers', generated_at: new Date(), summary: { total_customers: enriched.length, active_customers: enriched.filter(c => c.total_purchases > 0).length }, details: enriched } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.cashFlow = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const start = start_date ? new Date(start_date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = end_date ? new Date(end_date) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const receivable = await AccountReceivable.findAll({
      where: { due_date: { [Op.between]: [start, end] } },
      attributes: ['status', [sequelize.fn('SUM', sequelize.col('amount')), 'total'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'], raw: true
    });

    const payable = await AccountPayable.findAll({
      where: { due_date: { [Op.between]: [start, end] } },
      attributes: ['status', [sequelize.fn('SUM', sequelize.col('amount')), 'total'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'], raw: true
    });

    const totalReceivable = receivable.filter(r => r.status !== 'paid').reduce((a, r) => a + parseFloat(r.total || 0), 0);
    const totalPayable = payable.filter(p => p.status !== 'paid').reduce((a, p) => a + parseFloat(p.total || 0), 0);

    res.json({ success: true, data: { report_type: 'cash-flow', generated_at: new Date(), filters: { start_date: start, end_date: end }, summary: { total_receivable: totalReceivable, total_payable: totalPayable, balance: totalReceivable - totalPayable }, receivable_by_status: receivable, payable_by_status: payable } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
