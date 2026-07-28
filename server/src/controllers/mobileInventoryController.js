const { Product, Asset, InventoryMovement, Category, User } = require('../models/index');
const InventoryService = require('../services/inventoryService');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logAction } = require('../services/auditLogService');

exports.scanProduct = async (req, res, next) => {
  try {
    const { code, qrCodeData } = req.query;
    let product;

    if (qrCodeData) {
      try {
        const parsed = JSON.parse(qrCodeData);
        if (parsed.type === 'product') {
          product = await Product.findByPk(parsed.id, { include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }] });
        } else if (parsed.type === 'asset') {
          const asset = await Asset.findByPk(parsed.id, { include: [{ model: Product, as: 'product' }] });
          if (asset && asset.product) { product = await Product.findByPk(asset.product.id, { include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }] }); }
        }
      } catch { /* not a valid QR */ }
    }

    if (!product && code) { product = await Product.findOne({ where: { code }, include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }] }); }
    if (!product) return res.status(404).json({ success: false, error: 'Produto não encontrado' });

    res.json({ success: true, data: { id: product.id, name: product.name, code: product.code, description: product.description, category: product.category, quantity: product.quantity, min_quantity: product.min_quantity, price: product.price, status: product.status, location: product.location || 'Não definido' } });
  } catch (error) { next(error); }
};

exports.quickAdjust = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { product_id, type, quantity, description } = req.body;
    if (!product_id || !type || !quantity) { await t.rollback(); return res.status(400).json({ success: false, error: 'Produto, tipo e quantidade são obrigatórios' }); }
    const qty = parseFloat(quantity);
    if (!Number.isFinite(qty) || qty <= 0) { await t.rollback(); return res.status(400).json({ success: false, error: 'Quantidade deve ser um número maior que zero' }); }
    if (!['in', 'out', 'adjustment'].includes(type)) { await t.rollback(); return res.status(400).json({ success: false, error: `Tipo de movimentação inválido: '${type}'` }); }

    // InventoryService locks the Product row (SELECT ... FOR UPDATE), validates
    // available stock for saídas and registers the InventoryMovement atomically.
    let result;
    try {
      result = await InventoryService.adjust(product_id, type, qty, description || `Ajuste rápido via mobile: ${type === 'in' ? 'entrada' : 'saída'}`, t, {
        user_id: req.user.id,
        reference_type: 'adjustment'
      });
    } catch (stockError) {
      await t.rollback();
      return res.status(stockError.statusCode || 400).json({ success: false, error: stockError.message });
    }

    await t.commit();
    const updatedProduct = result.product;

    // Log de auditoria feito após o commit para não segurar locks de banco.
    logAction(req, { action: 'update', entityType: 'InventoryMovement', entityId: result.movement.id, entityDescription: updatedProduct.code, newValues: { type, quantity: qty }, description: `Ajuste rápido de estoque via mobile (${type}) - produto ${updatedProduct.code}` });

    res.status(201).json({ success: true, data: { movement: result.movement, product: { id: updatedProduct.id, name: updatedProduct.name, code: updatedProduct.code, quantity: updatedProduct.quantity }, low_stock: updatedProduct.quantity <= updatedProduct.min_quantity } });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

exports.batchScan = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) { await t.rollback(); return res.status(400).json({ success: false, error: 'Lista de itens é obrigatória' }); }
    if (items.length > 100) { await t.rollback(); return res.status(400).json({ success: false, error: 'Máximo de 100 itens por lote' }); }

    // Lote é atômico: todos os itens são processados na mesma transaction.
    // Se qualquer item falhar (produto não encontrado, estoque insuficiente,
    // tipo inválido), a transaction inteira é revertida e nada é persistido.
    const results = [];
    for (const item of items) {
      let product;
      if (item.qrCodeData) {
        try {
          const parsed = JSON.parse(item.qrCodeData);
          if (parsed.type === 'product') { product = await Product.findByPk(parsed.id, { transaction: t, lock: t.LOCK.UPDATE }); }
          else if (parsed.type === 'asset') { const asset = await Asset.findByPk(parsed.id, { include: [{ model: Product, as: 'product' }] }); if (asset && asset.product) { product = await Product.findByPk(asset.product.id, { transaction: t, lock: t.LOCK.UPDATE }); } }
        } catch { /* continue */ }
      }
      if (!product && item.code) { product = await Product.findOne({ where: { code: item.code }, transaction: t, lock: t.LOCK.UPDATE }); }
      if (!product && item.product_id) { product = await Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE }); }
      if (!product) {
        await t.rollback();
        return res.status(404).json({ success: false, error: `Produto não encontrado para o item informado`, item });
      }

      const type = item.type || 'adjustment';
      if (!['in', 'out', 'adjustment'].includes(type)) {
        await t.rollback();
        return res.status(400).json({ success: false, error: `Tipo de movimentação inválido: '${type}'`, item });
      }

      try {
        const result = await InventoryService.adjust(product.id, type, item.quantity, item.description || 'Inventário mobile - lote', t, {
          user_id: req.user.id,
          reference_type: 'adjustment'
        });
        results.push({ product_id: product.id, name: product.name, code: product.code, movement_id: result.movement.id, type });
      } catch (stockError) {
        await t.rollback();
        return res.status(stockError.statusCode || 400).json({ success: false, error: stockError.message, item });
      }
    }

    await t.commit();

    // Log de auditoria feito após o commit para não segurar locks de banco.
    for (const r of results) {
      logAction(req, { action: 'update', entityType: 'InventoryMovement', entityId: r.movement_id, entityDescription: r.code, newValues: { type: r.type }, description: `Inventário mobile em lote - produto ${r.code}` });
    }

    res.json({ success: true, data: { processed: results.length, errors: 0, results } });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

exports.inventoryByLocation = async (req, res, next) => {
  try {
    const products = await Product.findAll({ where: { status: 'active' }, include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }], order: [['name', 'ASC']] });

    const byLocation = {};
    products.forEach(p => {
      const loc = p.location || 'Não definido';
      if (!byLocation[loc]) { byLocation[loc] = { location: loc, items: [], count: 0, totalValue: 0 }; }
      byLocation[loc].items.push({ id: p.id, name: p.name, code: p.code, quantity: p.quantity, min_quantity: p.min_quantity, price: p.price });
      byLocation[loc].count += p.quantity;
      byLocation[loc].totalValue += (parseFloat(p.cost_price || p.price || 0)) * p.quantity;
    });

    const locations = Object.values(byLocation).sort((a, b) => a.location.localeCompare(b.location));
    res.json({ success: true, data: { total_locations: locations.length, total_items: products.length, locations } });
  } catch (error) { next(error); }
};

exports.productHistory = async (req, res, next) => {
  try {
    const { product_id, page = 1, limit = 20 } = req.query;
    if (!product_id) return res.status(400).json({ success: false, error: 'ID do produto é obrigatório' });

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await InventoryMovement.findAndCountAll({
      where: { product_id },
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
      limit: parseInt(limit), offset, order: [['created_at', 'DESC']]
    });
    res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) } });
  } catch (error) { next(error); }
};
