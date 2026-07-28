const { InventoryMovement, Product, User } = require('../models/index');
const InventoryService = require('../services/inventoryService');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logAction } = require('../services/auditLogService');

exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, product_id, type, start_date, end_date } = req.query;
    const where = {};
    if (product_id) where.product_id = product_id;
    if (type) where.type = type;
    if (start_date || end_date) { where.created_at = {}; if (start_date) where.created_at[Op.gte] = new Date(start_date); if (end_date) where.created_at[Op.lte] = new Date(end_date); }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await InventoryMovement.findAndCountAll({
      where, include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }, { model: User, as: 'user', attributes: ['id', 'name'] }],
      limit: parseInt(limit), offset, order: [['created_at', 'DESC']]
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) } });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const movement = await InventoryMovement.findByPk(req.params.id, {
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code', 'quantity'] }, { model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
    });
    if (!movement) return res.status(404).json({ success: false, error: 'Movimentação não encontrada' });
    res.json({ success: true, data: movement });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { product_id, type, quantity, description, reference_id, reference_type } = req.body;
    if (!product_id || !type || !quantity) { await t.rollback(); return res.status(400).json({ success: false, error: 'Produto, tipo e quantidade são obrigatórios' }); }
    const qty = parseFloat(quantity);
    if (!Number.isFinite(qty) || qty <= 0) { await t.rollback(); return res.status(400).json({ success: false, error: 'Quantidade deve ser um número maior que zero' }); }
    if (!['in', 'out', 'adjustment'].includes(type)) { await t.rollback(); return res.status(400).json({ success: false, error: `Tipo de movimentação inválido: '${type}'` }); }

    // InventoryService locks the Product row (SELECT ... FOR UPDATE), validates
    // available stock for saídas and registers the InventoryMovement atomically.
    let result;
    try {
      result = await InventoryService.adjust(product_id, type, qty, description, t, {
        user_id: req.user.id,
        reference_id,
        reference_type
      });
    } catch (stockError) {
      await t.rollback();
      return res.status(stockError.statusCode || 400).json({ success: false, error: stockError.message });
    }

    await t.commit();

    // Log de auditoria feito após o commit para não segurar locks de banco.
    logAction(req, { action: type === 'out' ? 'update' : 'create', entityType: 'InventoryMovement', entityId: result.movement.id, entityDescription: `Produto #${product_id}`, newValues: { type, quantity: qty }, description: `Movimentação de estoque (${type}) - quantidade ${qty}` });

    res.status(201).json({ success: true, data: result.movement });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

exports.getStockReport = async (req, res, next) => {
  try {
    const products = await Product.findAll({ where: { status: 'active' }, include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }], order: [['name', 'ASC']] });
    const summary = { total_products: products.length, total_items: products.reduce((sum, p) => sum + p.quantity, 0), total_value: products.reduce((sum, p) => sum + (parseFloat(p.cost_price || 0) * p.quantity), 0), low_stock_count: products.filter(p => p.quantity <= p.min_quantity).length };
    res.json({ success: true, data: { summary, products } });
  } catch (error) { next(error); }
};
