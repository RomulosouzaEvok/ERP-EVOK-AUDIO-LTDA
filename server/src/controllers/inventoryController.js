const { InventoryMovement, Product, User } = require('../models/index');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

exports.list = async (req, res) => {
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
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

exports.getById = async (req, res) => {
  try {
    const movement = await InventoryMovement.findByPk(req.params.id, {
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code', 'quantity'] }, { model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
    });
    if (!movement) return res.status(404).json({ success: false, error: 'Movimentação não encontrada' });
    res.json({ success: true, data: movement });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

exports.create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { product_id, type, quantity, description, reference_id, reference_type } = req.body;
    if (!product_id || !type || !quantity) { await t.rollback(); return res.status(400).json({ success: false, error: 'Produto, tipo e quantidade são obrigatórios' }); }
    if (quantity <= 0) { await t.rollback(); return res.status(400).json({ success: false, error: 'Quantidade deve ser maior que zero' }); }

    const product = await Product.findByPk(product_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!product) { await t.rollback(); return res.status(404).json({ success: false, error: 'Produto não encontrado' }); }
    if (type === 'out' && product.quantity < quantity) { await t.rollback(); return res.status(400).json({ success: false, error: `Estoque insuficiente. Disponível: ${product.quantity}, Solicitado: ${quantity}` }); }

    const movement = await InventoryMovement.create({ product_id, user_id: req.user.id, type, quantity, description, reference_id, reference_type }, { transaction: t });
    await Product.update({ quantity: sequelize.literal(`quantity ${type === 'in' ? '+' : '-'} ${quantity}`) }, { where: { id: product_id, quantity: { [Op.gte]: type === 'out' ? quantity : 0 } }, transaction: t });
    await t.commit();
    res.status(201).json({ success: true, data: movement });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getStockReport = async (req, res) => {
  try {
    const products = await Product.findAll({ where: { status: 'active' }, include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }], order: [['name', 'ASC']] });
    const summary = { total_products: products.length, total_items: products.reduce((sum, p) => sum + p.quantity, 0), total_value: products.reduce((sum, p) => sum + (parseFloat(p.cost_price || 0) * p.quantity), 0), low_stock_count: products.filter(p => p.quantity <= p.min_quantity).length };
    res.json({ success: true, data: { summary, products } });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};
