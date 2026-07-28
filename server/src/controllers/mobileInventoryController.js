const { Product, Asset, InventoryMovement, Category, User } = require('../models/index');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

exports.scanProduct = async (req, res) => {
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
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

exports.quickAdjust = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { product_id, type, quantity, description } = req.body;
    if (!product_id || !type || !quantity) { await t.rollback(); return res.status(400).json({ success: false, error: 'Produto, tipo e quantidade são obrigatórios' }); }
    if (quantity <= 0) { await t.rollback(); return res.status(400).json({ success: false, error: 'Quantidade deve ser maior que zero' }); }

    const product = await Product.findByPk(product_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!product) { await t.rollback(); return res.status(404).json({ success: false, error: 'Produto não encontrado' }); }
    if (type === 'out' && product.quantity < quantity) { await t.rollback(); return res.status(400).json({ success: false, error: `Estoque insuficiente. Disponível: ${product.quantity}` }); }

    const movement = await InventoryMovement.create({ product_id, user_id: req.user.id, type, quantity, description: description || `Ajuste rápido via mobile: ${type === 'in' ? 'entrada' : 'saída'}`, reference_type: 'adjustment' }, { transaction: t });
    await Product.update({ quantity: sequelize.literal(`quantity ${type === 'in' ? '+' : '-'} ${quantity}`) }, { where: { id: product_id, quantity: { [Op.gte]: type === 'out' ? quantity : 0 } }, transaction: t });

    const updatedProduct = await Product.findByPk(product_id, { transaction: t });
    await t.commit();
    res.status(201).json({ success: true, data: { movement, product: { id: updatedProduct.id, name: updatedProduct.name, code: updatedProduct.code, quantity: updatedProduct.quantity }, low_stock: updatedProduct.quantity <= updatedProduct.min_quantity } });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.batchScan = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) { await t.rollback(); return res.status(400).json({ success: false, error: 'Lista de itens é obrigatória' }); }
    if (items.length > 100) { await t.rollback(); return res.status(400).json({ success: false, error: 'Máximo de 100 itens por lote' }); }

    const results = [], errors = [];
    for (const item of items) {
      try {
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
        if (!product) { errors.push({ item, error: 'Produto não encontrado' }); continue; }

        if (item.type === 'out' && product.quantity < item.quantity) { errors.push({ item, error: `Estoque insuficiente para ${product.name}. Disponível: ${product.quantity}` }); continue; }

        const movement = await InventoryMovement.create({ product_id: product.id, user_id: req.user.id, type: item.type || 'adjustment', quantity: item.quantity, description: item.description || 'Inventário mobile - lote', reference_type: 'adjustment' }, { transaction: t });
        await Product.update({ quantity: sequelize.literal(`quantity ${item.type === 'in' ? '+' : '-'} ${item.quantity}`) }, { where: { id: product.id, quantity: { [Op.gte]: item.type === 'out' ? item.quantity : 0 } }, transaction: t });

        results.push({ product_id: product.id, name: product.name, code: product.code, movement_id: movement.id });
      } catch (err) { errors.push({ item, error: err.message }); }
    }

    await t.commit();
    res.json({ success: true, data: { processed: results.length, errors: errors.length, results, errors: errors.length > 0 ? errors : undefined } });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.inventoryByLocation = async (req, res) => {
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
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

exports.productHistory = async (req, res) => {
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
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};
