const { Sale, SaleItem, Product, Client, Purchase, InventoryMovement } = require('../models/index');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

exports.sales = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { start_date, end_date, customer_id } = req.query;
    const where: any = { status: { [Op.notIn]: ['canceled'] } };
    if (start_date) where.createdAt = { [Op.gte]: new Date(start_date) };
    if (end_date) { if (!where.createdAt) where.createdAt = {}; where.createdAt[Op.lte] = new Date(end_date); }
    if (customer_id) where.customer_id = customer_id;
    const sales = await Sale.findAll({ where, include: [{ model: Client, as: 'customer', attributes: ['id', 'name'] }] });
    const totalSales = sales.length;
    const totalAmount = sales.reduce((a: number, s: any) => a + parseFloat(s.total_amount || 0), 0);
    res.json({ success: true, data: { report_type: 'sales', generated_at: new Date(), filters: { start_date, end_date, customer_id }, summary: { total_sales: totalSales, total_amount: totalAmount, average_ticket: totalSales > 0 ? totalAmount / totalSales : 0 }, details: sales } });
  } catch (error) { next(error); }
};

exports.inventory = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const products = await Product.findAll({ where: { status: 'active' }, include: [{ model: require('../models/Category'), as: 'category', attributes: ['id', 'name'] }], order: [['name', 'ASC']] });
    const totalItems = products.reduce((a: number, p: any) => a + p.quantity, 0);
    const totalValue = products.reduce((a: number, p: any) => a + parseFloat(p.cost_price || 0) * p.quantity, 0);
    res.json({ success: true, data: { report_type: 'inventory', generated_at: new Date(), summary: { total_products: products.length, total_items: totalItems, total_value: totalValue }, details: products } });
  } catch (error) { next(error); }
};

exports.customers = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const clients = await Client.findAll({ where: { status: 'active' }, order: [['name', 'ASC']] });
    res.json({ success: true, data: { report_type: 'customers', generated_at: new Date(), summary: { total_customers: clients.length }, details: clients } });
  } catch (error) { next(error); }
};

exports.cashFlow = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { start_date, end_date } = req.query;
    const start = start_date ? new Date(start_date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = end_date ? new Date(end_date) : new Date();
    const sales = await Sale.sum('total_amount', { where: { createdAt: { [Op.between]: [start, end] }, status: { [Op.notIn]: ['canceled'] } } }) || 0;
    const purchases = await Purchase.sum('total_amount', { where: { createdAt: { [Op.between]: [start, end] }, status: { [Op.notIn]: ['canceled'] } } }) || 0;
    res.json({ success: true, data: { report_type: 'cash-flow', generated_at: new Date(), period: { start, end }, summary: { total_sales: sales, total_purchases: purchases, balance: sales - purchases } } });
  } catch (error) { next(error); }
};

