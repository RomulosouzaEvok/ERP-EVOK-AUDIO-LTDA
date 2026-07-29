const { InventoryMovement, Product, User, Category } = require('../models/index');
const InventoryService = require('../services/inventoryService');
const { Op, sequelize: sq } = require('sequelize');
const { sequelize } = require('../config/database');
const { logAction } = require('../services/auditLogService');

exports.listMovements = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { product_id, type, start_date, end_date, page = '1', limit = '10' } = req.query;
    const where: any = {};
    if (product_id) where.product_id = product_id;
    if (type) where.type = type;
    if (start_date || end_date) { where.createdAt = {}; if (start_date) where.createdAt[Op.gte] = new Date(start_date); if (end_date) where.createdAt[Op.lte] = new Date(end_date); }
    const p = parseInt(page), l = parseInt(limit), o = (p - 1) * l;
    const { count, rows } = await InventoryMovement.findAndCountAll({ where, include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }, { model: User, as: 'user', attributes: ['id', 'name'] }], limit: l, offset: o, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) } });
  } catch (error) { next(error); }
};
exports.getMovementById = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const movement = await InventoryMovement.findByPk(req.params.id, { include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }, { model: User, as: 'user', attributes: ['id', 'name'] }] });
    if (!movement) { res.status(404).json({ success: false, error: 'Movimentação não encontrada' }); return; }
    res.json({ success: true, data: movement });
  } catch (error) { next(error); }
};
exports.createMovement = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { product_id, type, quantity, description } = req.body;
    if (!product_id || !type || quantity === undefined) { res.status(400).json({ success: false, error: 'Produto, tipo e quantidade são obrigatórios' }); return; }
    const qty = parseInt(quantity);
    if (qty <= 0) { res.status(400).json({ success: false, error: 'Quantidade deve ser maior que zero' }); return; }
    if (!['in', 'out', 'adjustment'].includes(type)) { res.status(400).json({ success: false, error: 'Tipo deve ser in, out ou adjustment' }); return; }
    const product = await Product.findByPk(product_id);
    if (!product) { res.status(404).json({ success: false, error: 'Produto não encontrado' }); return; }
    if (type === 'out' && product.quantity < qty) { res.status(400).json({ success: false, error: `Estoque insuficiente. Disponível: ${product.quantity}` }); return; }
    const movement = await InventoryService.adjust(product_id, type, qty, req.user.id, description || `Movimentação ${type} manual`, { reference_type: 'adjustment', reference_id: null });
    logAction(req, { action: 'create', entityType: 'InventoryMovement', entityId: movement.id, entityDescription: `Mov. ${type} - ${product.name}`, newValues: { product_id, type, quantity: qty, description }, description: `Movimentação de estoque: ${product.name} (${type}) qtd: ${qty}` });
    res.status(201).json({ success: true, data: movement });
  } catch (error) { next(error); }
};
exports.stockReport = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const products = await Product.findAll({ where: { status: 'active' }, order: [['name', 'ASC']] });
    const summary = { total_products: products.length, total_items: products.reduce((a: number, p: any) => a + p.quantity, 0), total_value: products.reduce((a: number, p: any) => a + parseFloat(p.cost_price || 0) * p.quantity, 0), low_stock_count: products.filter((p: any) => p.quantity <= p.min_quantity).length };
    res.json({ success: true, data: { summary, products } });
  } catch (error) { next(error); }
};
exports.lowStock = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const products = await Product.findAll({ where: { status: 'active', quantity: { [Op.lte]: sq.col('min_quantity') } }, include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }], order: [['quantity', 'ASC']] });
    res.json({ success: true, data: products });
  } catch (error) { next(error); }
};

