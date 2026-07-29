const { Op, sequelize: sq } = require('sequelize');
const { Product, Sale, Purchase, InventoryMovement, AccountReceivable, AccountPayable } = require('../models/index');
const { sequelize } = require('../config/database');

exports.auditStock = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const negative = await Product.findAll({ where: { quantity: { [Op.lt]: 0 } }, attributes: ['id', 'name', 'code', 'quantity'], raw: true });
    const zeroMovements = await Product.findAll({ where: { quantity: { [Op.gt]: 0 } }, raw: true });
    const noMovementProducts: any[] = [];
    for (const p of zeroMovements) {
      const m = await InventoryMovement.findOne({ where: { product_id: p.id }, raw: true });
      if (!m) noMovementProducts.push(p);
    }
    res.json({ success: true, data: { negative_stock: negative, no_movement: noMovementProducts, summary: { total_negative: negative.length, total_no_movement: noMovementProducts.length, products_audited: await Product.count() } } });
  } catch (error) { next(error); }
};

exports.auditSales = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const incomplete = await Sale.findAll({ where: { status: 'confirmed' }, include: [{ model: require('../models/AccountReceivable'), as: 'accounts_receivable', required: false }], raw: true });
    const withoutItems = await Sale.findAll({ where: { '$items.id$': null }, include: [{ model: require('../models/SaleItem'), as: 'items', required: false, attributes: [] }], raw: true });
    res.json({ success: true, data: { incomplete_receivables: incomplete.length, sales_without_items: withoutItems.length } });
  } catch (error) { next(error); }
};

exports.auditPurchases = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const pendingLong = await Purchase.findAll({ where: { status: { [Op.in]: ['pending', 'approved'] }, createdAt: { [Op.lte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, attributes: ['id', 'order_number', 'total_amount', 'createdAt', 'status'], raw: true });
    res.json({ success: true, data: { purchases_stalled: pendingLong.length, details: pendingLong } });
  } catch (error) { next(error); }
};

exports.auditFinancial = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const overdueReceivable = await AccountReceivable.findAll({ where: { status: 'pending', due_date: { [Op.lt]: new Date() } }, include: [{ model: require('../models/Client'), as: 'customer', attributes: ['id', 'name'] }], raw: true });
    const overduePayable = await AccountPayable.findAll({ where: { status: 'pending', due_date: { [Op.lt]: new Date() } }, raw: true });
    const recSum = await AccountReceivable.findAll({ attributes: ['status', [sequelize.fn('SUM', sequelize.col('amount')), 'total']], group: ['status'], raw: true });
    const paySum = await AccountPayable.findAll({ attributes: ['status', [sequelize.fn('SUM', sequelize.col('amount')), 'total']], group: ['status'], raw: true });
    res.json({ success: true, data: { overdue_receivable: { count: overdueReceivable.length, total: overdueReceivable.reduce((a: number, r: any) => a + parseFloat(r.amount || 0), 0) }, overdue_payable: { count: overduePayable.length, total: overduePayable.reduce((a: number, p: any) => a + parseFloat(p.amount || 0), 0) }, receivable_by_status: recSum, payable_by_status: paySum } });
  } catch (error) { next(error); }
};

