/**
 * 📦 Product Controller — CRUD de Produtos e Movimentações de Estoque
 *
 * @module controllers/productController
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Product, Category, InventoryMovement, Sale } = require('../models/index');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Op, col } = require('sequelize');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { logAction } = require('../services/auditLogService');

/**
 * GET /api/products
 * Lista produtos com paginação e filtros.
 * @param req - Express Request
 * @param res - Express Response
 * @param next - Express NextFunction
 */
exports.list = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { page = '1', limit = '10', search, category_id, low_stock, status } = req.query;
    const where: any = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } }
      ];
    }
    if (category_id) where.category_id = parseInt(category_id);
    if (status) where.status = status;
    else where.status = 'active';
    if (low_stock === 'true') where.quantity = { [Op.lte]: col('min_quantity') };

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: pageNum, limit: limitNum, totalPages: Math.ceil(count / limitNum) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/:id
 * Retorna um produto pelo ID.
 * @param req - Express Request
 * @param res - Express Response
 * @param next - Express NextFunction
 */
exports.getById = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
    });
    if (!product) {
      res.status(404).json({ success: false, error: 'Produto não encontrado' });
      return;
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/products
 * Cria um novo produto.
 * @param req - Express Request
 * @param res - Express Response
 * @param next - Express NextFunction
 */
exports.create = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { name, code, description, category_id, price, cost_price, quantity, min_quantity, product_type, ncm, cest, weight, unit, lead_time, drawing_number, revision, location } = req.body;

    if (!name || !code || price === undefined || price === null) {
      res.status(400).json({ success: false, error: 'Nome, código e preço são obrigatórios' });
      return;
    }
    const parsedPrice = parseFloat(price);
    if (parsedPrice < 0) {
      res.status(400).json({ success: false, error: 'Preço não pode ser negativo' });
      return;
    }
    const parsedCostPrice = cost_price !== undefined ? parseFloat(cost_price) : 0;
    if (parsedCostPrice > 0 && parsedPrice <= parsedCostPrice) {
      res.status(400).json({ success: false, error: 'Preço de venda deve ser maior que o preço de custo' });
      return;
    }

    const product = await Product.create({
      name, code, description, category_id,
      price: parsedPrice,
      cost_price: parsedCostPrice,
      quantity: quantity || 0,
      min_quantity: min_quantity || 5,
      product_type: product_type || 'finished',
      ncm: ncm || '85182100', cest, weight, unit, lead_time, drawing_number, revision, location,
      status: 'active'
    });

    logAction(req, {
      action: 'create', entityType: 'Product', entityId: product.id,
      entityDescription: product.code,
      newValues: { name: product.name, code: product.code, price: product.price },
      description: `Produto ${product.code} criado`
    });

    res.status(201).json({ success: true, data: product });
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(409).json({ success: false, error: 'Código do produto já existe' });
      return;
    }
    next(error);
  }
};

/**
 * PUT /api/products/:id
 * Atualiza dados de um produto.
 * @param req - Express Request
 * @param res - Express Response
 * @param next - Express NextFunction
 */
exports.update = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const allowedFields = ['name', 'description', 'category_id', 'price', 'cost_price', 'min_quantity', 'status', 'product_type', 'ncm', 'cest', 'weight', 'unit', 'lead_time', 'drawing_number', 'revision', 'location'];
    const updateData: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    if (updateData.price !== undefined && updateData.cost_price !== undefined) {
      if (parseFloat(updateData.price) <= parseFloat(updateData.cost_price)) {
        res.status(400).json({ success: false, error: 'Preço de venda deve ser maior que o preço de custo' });
        return;
      }
    }
    const before = await Product.findByPk(req.params.id);
    if (!before) {
      res.status(404).json({ success: false, error: 'Produto não encontrado' });
      return;
    }
    const oldValues: any = {};
    for (const field of Object.keys(updateData)) oldValues[field] = before[field];

    const [updated] = await Product.update(updateData, { where: { id: req.params.id } });
    if (!updated) {
      res.status(404).json({ success: false, error: 'Produto não encontrado' });
      return;
    }
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
    });

    logAction(req, {
      action: 'update', entityType: 'Product', entityId: product.id,
      entityDescription: product.code, oldValues, newValues: updateData,
      description: `Produto ${product.code} atualizado`
    });

    res.json({ success: true, data: product });
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(409).json({ success: false, error: 'Código já existe' });
      return;
    }
    next(error);
  }
};

/**
 * DELETE /api/products/:id
 * Inativa um produto (soft delete).
 * @param req - Express Request
 * @param res - Express Response
 * @param next - Express NextFunction
 */
exports.remove = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const activeSales = await Sale.count({
      where: {
        product_id: req.params.id,
        status: { [Op.in]: ['confirmed', 'invoiced'] }
      }
    });
    if (activeSales > 0) {
      res.status(400).json({
        success: false,
        error: `Produto possui ${activeSales} venda(s) ativa(s). Não pode ser inativado.`
      });
      return;
    }
    const before = await Product.findByPk(req.params.id);
    if (!before) {
      res.status(404).json({ success: false, error: 'Produto não encontrado' });
      return;
    }
    const [updated] = await Product.update({ status: 'inactive' }, { where: { id: req.params.id } });
    if (!updated) {
      res.status(404).json({ success: false, error: 'Produto não encontrado' });
      return;
    }

    logAction(req, {
      action: 'soft_delete', entityType: 'Product', entityId: before.id,
      entityDescription: before.code,
      oldValues: { status: before.status }, newValues: { status: 'inactive' },
      description: `Produto ${before.code} inativado`
    });

    res.json({ success: true, data: { message: 'Produto inativado com sucesso' } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/products/movements
 * Registra movimentação manual de estoque.
 * @param req - Express Request
 * @param res - Express Response
 * @param next - Express NextFunction
 */
exports.movement = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { product_id, type, quantity, description } = req.body;

    if (!product_id || !type || !quantity) {
      res.status(400).json({ success: false, error: 'Produto, tipo e quantidade são obrigatórios' });
      return;
    }
    const qty = parseInt(quantity);
    if (qty <= 0) {
      res.status(400).json({ success: false, error: 'Quantidade deve ser maior que zero' });
      return;
    }

    const product = await Product.findByPk(product_id);
    if (!product) {
      res.status(404).json({ success: false, error: 'Produto não encontrado' });
      return;
    }
    if (type === 'out' && product.quantity < qty) {
      res.status(400).json({
        success: false,
        error: `Estoque insuficiente. Disponível: ${product.quantity}, Solicitado: ${qty}`
      });
      return;
    }

    const movement = await InventoryMovement.create({
      product_id, user_id: req.user.id, type, quantity: qty,
      description: description || 'Movimentação manual',
      reference_type: 'adjustment'
    });

    const previousQuantity = product.quantity;
    const newQuantity = product.quantity + (type === 'in' ? qty : -qty);
    await Product.update({ quantity: newQuantity }, { where: { id: product_id } });

    logAction(req, {
      action: 'create', entityType: 'InventoryMovement', entityId: movement.id,
      entityDescription: product.code,
      oldValues: { quantity: previousQuantity }, newValues: { quantity: newQuantity },
      description: `Movimentação manual de estoque (${type}) - produto ${product.code}`
    });

    res.status(201).json({ success: true, data: movement });
  } catch (error) {
    next(error);
  }
};

