const { Sale, SaleItem, Product, Client, AccountReceivable } = require('../models/index');
const InventoryService = require('../services/inventoryService');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logAction } = require('../services/auditLogService');

const toCents = (v: any) => Math.round((parseFloat(v) || 0) * 100);
const fromCents = (c: any) => parseFloat((c / 100).toFixed(2));

exports.list = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { page = '1', limit = '10', status, start_date, end_date, customer_id } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (customer_id) where.customer_id = customer_id;
    if (start_date || end_date) { where.createdAt = {}; if (start_date) where.createdAt[Op.gte] = new Date(start_date); if (end_date) where.createdAt[Op.lte] = new Date(end_date); }
    const p = parseInt(page), l = parseInt(limit), o = (p - 1) * l;
    const { count, rows } = await Sale.findAndCountAll({ where, include: [{ model: Client, as: 'customer', attributes: ['id', 'name'] }, { model: SaleItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }], limit: l, offset: o, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: rows.map((s: any) => ({ ...s.toJSON(), items_count: s.items ? s.items.length : 0 })), pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) } });
  } catch (error) { next(error); }
};

exports.getById = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const sale = await Sale.findByPk(req.params.id, { include: [{ model: Client, as: 'customer', attributes: ['id', 'name', 'cpf_cnpj', 'phone', 'email'] }, { model: SaleItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }] });
    if (!sale) { res.status(404).json({ success: false, error: 'Venda não encontrada' }); return; }
    res.json({ success: true, data: sale });
  } catch (error) { next(error); }
};

exports.create = async (req: any, res: any, next: any): Promise<void> => {
  const t = await sequelize.transaction();
  try {
    const { customer_id, items, discount = 0, payment_method, installments = 1, notes } = req.body;
    if (!customer_id) { await t.rollback(); res.status(400).json({ success: false, error: 'Cliente é obrigatório' }); return; }
    if (!items || items.length === 0) { await t.rollback(); res.status(400).json({ success: false, error: 'Adicione pelo menos um item à venda' }); return; }
    if (installments < 1) { await t.rollback(); res.status(400).json({ success: false, error: 'Número de parcelas deve ser maior ou igual a 1' }); return; }
    const parsedDiscount = parseFloat(discount) || 0;
    if (parsedDiscount < 0) { await t.rollback(); res.status(400).json({ success: false, error: 'Desconto não pode ser negativo' }); return; }
    let totalCents = 0;
    const processedItems: any[] = [];
    for (const item of items) {
      if (!item.product_id || item.quantity === undefined || item.unit_price === undefined) { await t.rollback(); res.status(400).json({ success: false, error: 'Cada item deve ter product_id, quantity e unit_price' }); return; }
      const qty = parseInt(item.quantity);
      if (qty <= 0) { await t.rollback(); res.status(400).json({ success: false, error: 'Quantidade deve ser maior que zero' }); return; }
      const unitPrice = parseFloat(item.unit_price);
      if (unitPrice <= 0) { await t.rollback(); res.status(400).json({ success: false, error: 'Preço unitário deve ser maior que zero' }); return; }
      const uc = toCents(unitPrice);
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (!product) { await t.rollback(); res.status(404).json({ success: false, error: `Produto ID ${item.product_id} não encontrado` }); return; }
      if (product.status !== 'active') { await t.rollback(); res.status(400).json({ success: false, error: `Produto ${product.name} está inativo` }); return; }
      if (product.quantity < qty) { await t.rollback(); res.status(400).json({ success: false, error: `Estoque insuficiente para ${product.name}. Disponível: ${product.quantity}` }); return; }
      const tp = qty * uc;
      totalCents += tp;
      processedItems.push({ product_id: item.product_id, quantity: qty, unit_price: fromCents(uc), total_price: fromCents(tp) });
    }
    const dc = toCents(parsedDiscount);
    if (dc > totalCents) { await t.rollback(); res.status(400).json({ success: false, error: 'Desconto não pode ser maior que o valor total' }); return; }
    const tNet = totalCents - dc;
    const sale = await Sale.create({ customer_id, user_id: req.user.id, total_amount: fromCents(tNet), discount: fromCents(dc), status: 'confirmed', payment_method, installments, notes }, { transaction: t });
    for (const item of processedItems) {
      await SaleItem.create({ sale_id: sale.id, product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price, total_price: item.total_price }, { transaction: t });
      try { await InventoryService.consume(item.product_id, item.quantity, t, { user_id: req.user.id, description: `Venda #${sale.id} - ${payment_method}`, reference_id: sale.id, reference_type: 'sale' }); } catch (e: any) { await t.rollback(); res.status(e.statusCode || 409).json({ success: false, error: e.message || `Estoque insuficiente para o produto ID ${item.product_id}` }); return; }
    }
    if (installments > 1) {
      const base = Math.floor(tNet / installments);
      const rem = tNet % installments;
      const today = new Date();
      const day = today.getDate();
      for (let i = 1; i <= installments; i++) {
        const nm = today.getMonth() + i;
        const y = today.getFullYear() + Math.floor(nm / 12);
        const m = nm % 12;
        const ld = new Date(y, m + 1, 0).getDate();
        const sd = Math.min(day, ld);
        await AccountReceivable.create({ sale_id: sale.id, customer_id, installment: i, amount: fromCents(base + (i === installments ? rem : 0)), due_date: new Date(y, m, sd), status: 'pending' }, { transaction: t });
      }
    } else {
      await AccountReceivable.create({ sale_id: sale.id, customer_id, installment: 1, amount: fromCents(tNet), due_date: new Date(), status: 'paid', payment_date: new Date(), payment_method }, { transaction: t });
    }
    await t.commit();
    logAction(req, { action: 'create', entityType: 'Sale', entityId: sale.id, entityDescription: `Venda #${sale.id}`, newValues: { customer_id, total_amount: fromCents(tNet), status: 'confirmed' }, description: `Venda #${sale.id} criada` });
    const fullSale = await Sale.findByPk(sale.id, { include: [{ model: Client, as: 'customer', attributes: ['id', 'name'] }, { model: SaleItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }] });
    res.status(201).json({ success: true, data: fullSale });
  } catch (error) { await t.rollback(); next(error); }
};

exports.updateStatus = async (req: any, res: any, next: any): Promise<void> => {
  const t = await sequelize.transaction();
  try {
    const { status } = req.body;
    if (!status) { await t.rollback(); res.status(400).json({ success: false, error: 'Status é obrigatório' }); return; }
    const valid: any = { 'quote': ['confirmed', 'canceled'], 'confirmed': ['invoiced', 'canceled'], 'invoiced': ['canceled'], 'canceled': [] };
    const sale = await Sale.findByPk(req.params.id, { include: [{ model: SaleItem, as: 'items' }], transaction: t });
    if (!sale) { await t.rollback(); res.status(404).json({ success: false, error: 'Venda não encontrada' }); return; }
    const allowed = valid[sale.status] || [];
    if (!allowed.includes(status)) { await t.rollback(); res.status(400).json({ success: false, error: `Transição inválida: ${sale.status} → ${status}. Permitidas: ${allowed.join(', ') || 'nenhuma'}` }); return; }
    if (sale.status === status) { await t.rollback(); res.status(400).json({ success: false, error: `Venda já está com status ${status}` }); return; }
    const prev = sale.status;
    if (status === 'canceled') {
      for (const item of sale.items) { await InventoryService.receive(item.product_id, item.quantity, t, { user_id: req.user.id, description: `Cancelamento venda #${sale.id}`, reference_id: sale.id, reference_type: 'adjustment' }); }
      await AccountReceivable.update({ status: 'canceled' }, { where: { sale_id: sale.id, status: { [Op.notIn]: ['paid', 'canceled'] } }, transaction: t });
    }
    sale.status = status;
    await sale.save({ transaction: t });
    await t.commit();
    logAction(req, { action: 'status_change', entityType: 'Sale', entityId: sale.id, entityDescription: `Venda #${sale.id}`, oldValues: { status: prev }, newValues: { status }, description: `Venda #${sale.id}: ${prev} → ${status}` });
    res.json({ success: true, data: sale });
  } catch (error) { await t.rollback(); next(error); }
};

