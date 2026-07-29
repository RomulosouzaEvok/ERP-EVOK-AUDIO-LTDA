const { InventoryMovement, Product, User } = require('../models/index');
const InventoryService = require('../services/inventoryService');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

exports.scanItem = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { product_code, quantity, type, description } = req.body;
    if (!product_code || quantity === undefined || !type) { res.status(400).json({ success: false, error: 'Código do produto, quantidade e tipo são obrigatórios' }); return; }
    const qty = parseInt(quantity); if (qty <= 0) { res.status(400).json({ success: false, error: 'Quantidade deve ser maior que zero' }); return; }
    if (!['in', 'out'].includes(type)) { res.status(400).json({ success: false, error: 'Tipo deve ser in ou out' }); return; }
    const product = await Product.findOne({ where: { [Op.or]: [{ code: product_code }, { id: isNaN(product_code) ? undefined : product_code }] } });
    if (!product) { res.status(404).json({ success: false, error: 'Produto não encontrado' }); return; }
    if (type === 'out' && product.quantity < qty) { res.status(400).json({ success: false, error: `Estoque insuficiente. Disponível: ${product.quantity}` }); return; }
    const movement = await InventoryService.adjust(product.id, type, qty, req.user.id, description || `Scan mobile ${type}`, { reference_type: 'adjustment' });
    res.json({ success: true, data: { product: { id: product.id, name: product.name, code: product.code }, movement, new_quantity: type === 'in' ? product.quantity + qty : product.quantity - qty } });
  } catch (error) { next(error); }
};

exports.batchScan = async (req: any, res: any, next: any): Promise<void> => {
  const t = await sequelize.transaction();
  try {
    const { items } = req.body;
    if (!items || items.length === 0) { await t.rollback(); res.status(400).json({ success: false, error: 'Lista de itens é obrigatória' }); return; }
    const results: any[] = [];
    for (const item of items) {
      const { product_code, quantity, type, description } = item;
      if (!product_code || quantity === undefined || !type) { await t.rollback(); res.status(400).json({ success: false, error: 'Cada item deve ter product_code, quantity e type' }); return; }
      const qty = parseInt(quantity); if (qty <= 0) { await t.rollback(); res.status(400).json({ success: false, error: `Quantidade inválida para ${product_code}` }); return; }
      if (!['in', 'out'].includes(type)) { await t.rollback(); res.status(400).json({ success: false, error: `Tipo inválido para ${product_code}` }); return; }
      const product = await Product.findOne({ where: { [Op.or]: [{ code: product_code }, { id: isNaN(product_code) ? undefined : product_code }] }, lock: t.LOCK.UPDATE, transaction: t });
      if (!product) { await t.rollback(); res.status(404).json({ success: false, error: `Produto ${product_code} não encontrado` }); return; }
      if (type === 'out' && product.quantity < qty) { await t.rollback(); res.status(400).json({ success: false, error: `Estoque insuficiente para ${product.name}. Disponível: ${product.quantity}` }); return; }
      const movement = await InventoryMovement.create({ product_id: product.id, user_id: req.user.id, type, quantity: qty, description: description || `Batch scan ${type}`, reference_type: 'adjustment' }, { transaction: t });
      if (type === 'in') { await product.increment('quantity', { by: qty, transaction: t }); } else { await product.decrement('quantity', { by: qty, transaction: t }); }
      results.push({ product_code, product_name: product.name, type, quantity: qty, movement_id: movement.id });
    }
    await t.commit();
    res.json({ success: true, data: { items_processed: results.length, results } });
  } catch (error) { await t.rollback(); next(error); }
};

exports.listMovements = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { page = '1', limit = '10' } = req.query;
    const p = parseInt(String(page), 10), l = parseInt(String(limit), 10), o = (p - 1) * l;
    const { count, rows } = await InventoryMovement.findAndCountAll({ include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }, { model: User, as: 'user', attributes: ['id', 'name'] }], limit: l, offset: o, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) } });
  } catch (error) { next(error); }
};


