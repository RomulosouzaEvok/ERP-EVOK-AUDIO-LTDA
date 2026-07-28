const { Product, Category, InventoryMovement } = require('../models/index');
const { Op, col } = require('sequelize');
const { logAction } = require('../services/auditLogService');

exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, category_id, low_stock, status } = req.query;
    const where = {};
    if (search) { where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { code: { [Op.like]: `%${search}%` } }]; }
    if (category_id) where.category_id = category_id;
    if (status) where.status = status; else where.status = 'active';
    if (low_stock === 'true') where.quantity = { [Op.lte]: col('min_quantity') };

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Product.findAndCountAll({
      where, include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      limit: parseInt(limit), offset, order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) } });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id, { include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }] });
    if (!product) return res.status(404).json({ success: false, error: 'Produto não encontrado' });
    res.json({ success: true, data: product });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, code, description, category_id, price, cost_price, quantity, min_quantity, product_type, ncm, cest, weight, unit, lead_time, drawing_number, revision, location } = req.body;
    if (!name || !code || price === undefined || price === null) return res.status(400).json({ success: false, error: 'Nome, código e preço são obrigatórios' });
    const parsedPrice = parseFloat(price);
    if (parsedPrice < 0) return res.status(400).json({ success: false, error: 'Preço não pode ser negativo' });
    const parsedCostPrice = cost_price !== undefined ? parseFloat(cost_price) : 0;
    if (parsedCostPrice > 0 && parsedPrice <= parsedCostPrice) return res.status(400).json({ success: false, error: 'Preço de venda deve ser maior que o preço de custo' });

    const product = await Product.create({ name, code, description, category_id, price: parsedPrice, cost_price: parsedCostPrice, quantity: quantity || 0, min_quantity: min_quantity || 5, product_type: product_type || 'finished', ncm: ncm || '85182100', cest, weight, unit, lead_time, drawing_number, revision, location, status: 'active' });

    logAction(req, { action: 'create', entityType: 'Product', entityId: product.id, entityDescription: product.code, newValues: { name: product.name, code: product.code, price: product.price }, description: `Produto ${product.code} criado` });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, error: 'Código do produto já existe' });
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'description', 'category_id', 'price', 'cost_price', 'min_quantity', 'status', 'product_type', 'ncm', 'cest', 'weight', 'unit', 'lead_time', 'drawing_number', 'revision', 'location'];
    const updateData = {};
    for (const field of allowedFields) { if (req.body[field] !== undefined) updateData[field] = req.body[field]; }
    if (updateData.price !== undefined && updateData.cost_price !== undefined) {
      if (parseFloat(updateData.price) <= parseFloat(updateData.cost_price)) return res.status(400).json({ success: false, error: 'Preço de venda deve ser maior que o preço de custo' });
    }
    const before = await Product.findByPk(req.params.id);
    if (!before) return res.status(404).json({ success: false, error: 'Produto não encontrado' });
    const oldValues = {};
    for (const field of Object.keys(updateData)) oldValues[field] = before[field];

    const [updated] = await Product.update(updateData, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'Produto não encontrado' });
    const product = await Product.findByPk(req.params.id, { include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }] });

    const isRevision = updateData.revision !== undefined && updateData.revision !== before.revision;
    logAction(req, {
      action: isRevision ? 'update' : 'update',
      entityType: 'Product',
      entityId: product.id,
      entityDescription: product.code,
      oldValues,
      newValues: updateData,
      description: isRevision ? `Produto ${product.code} revisado (revisão ${before.revision} → ${updateData.revision})` : `Produto ${product.code} atualizado`
    });

    res.json({ success: true, data: product });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, error: 'Código já existe' });
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { Sale } = require('../models/index');
    const activeSales = await Sale.count({ where: { product_id: req.params.id, status: { [Op.in]: ['confirmed', 'invoiced'] } } });
    if (activeSales > 0) {
      return res.status(400).json({ success: false, error: `Produto possui ${activeSales} venda(s) ativa(s). Não pode ser inativado.` });
    }
    const before = await Product.findByPk(req.params.id);
    if (!before) return res.status(404).json({ success: false, error: 'Produto não encontrado' });
    const [updated] = await Product.update({ status: 'inactive' }, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'Produto não encontrado' });

    logAction(req, { action: 'soft_delete', entityType: 'Product', entityId: before.id, entityDescription: before.code, oldValues: { status: before.status }, newValues: { status: 'inactive' }, description: `Produto ${before.code} inativado` });

    res.json({ success: true, data: { message: 'Produto inativado com sucesso' } });
  } catch (error) { next(error); }
};

exports.movement = async (req, res, next) => {
  try {
    const { product_id, type, quantity, description } = req.body;
    if (!product_id || !type || !quantity) return res.status(400).json({ success: false, error: 'Produto, tipo e quantidade são obrigatórios' });
    if (quantity <= 0) return res.status(400).json({ success: false, error: 'Quantidade deve ser maior que zero' });
    const product = await Product.findByPk(product_id);
    if (!product) return res.status(404).json({ success: false, error: 'Produto não encontrado' });
    if (type === 'out' && product.quantity < quantity) return res.status(400).json({ success: false, error: `Estoque insuficiente. Disponível: ${product.quantity}, Solicitado: ${quantity}` });

    const movement = await InventoryMovement.create({ product_id, user_id: req.user.id, type, quantity, description: description || 'Movimentação manual', reference_type: 'adjustment' });
    const previousQuantity = product.quantity;
    const newQuantity = product.quantity + (type === 'in' ? quantity : -quantity);
    await Product.update({ quantity: newQuantity }, { where: { id: product_id } });

    logAction(req, { action: 'create', entityType: 'InventoryMovement', entityId: movement.id, entityDescription: product.code, oldValues: { quantity: previousQuantity }, newValues: { quantity: newQuantity }, description: `Movimentação manual de estoque (${type}) - produto ${product.code}` });

    res.status(201).json({ success: true, data: movement });
  } catch (error) { next(error); }
};
