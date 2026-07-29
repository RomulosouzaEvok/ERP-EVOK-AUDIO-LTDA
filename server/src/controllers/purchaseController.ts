const { Purchase, PurchaseItem, Product, Supplier, AccountPayable } = require('../models/index');
const InventoryService = require('../services/inventoryService');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logAction } = require('../services/auditLogService');

const createPurchasePayable = async (purchase: any, userId: number, transaction?: any): Promise<void> => {
  if (!purchase.supplier_id) return;
  const totalPayable = parseFloat(purchase.total_amount) || 0;
  if (totalPayable <= 0) return;
  const existing = await AccountPayable.findOne({ where: { purchase_id: purchase.id }, transaction });
  if (existing) return;
  const dueDate = purchase.expected_date ? new Date(new Date(purchase.expected_date).getTime() + 30 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await AccountPayable.create({ description: `Fornecimento PO ${purchase.order_number}`, amount: totalPayable, due_date: dueDate.toISOString().slice(0, 10), status: 'pending', category: 'Fornecedores', supplier_id: purchase.supplier_id, purchase_id: purchase.id, approved_by: userId, approval_date: new Date(), notes: `Gerado na aprovacao do pedido ${purchase.order_number}` }, { transaction });
};

exports.list = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { page = '1', limit = '10', status, supplier_id, start_date, end_date } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (supplier_id) where.supplier_id = supplier_id;
    if (start_date || end_date) { where.order_date = {}; if (start_date) where.order_date[Op.gte] = start_date; if (end_date) where.order_date[Op.lte] = end_date; }
    const p = parseInt(page), l = parseInt(limit), o = (p - 1) * l;
    const { count, rows } = await Purchase.findAndCountAll({ where, include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'company_name'] }, { model: PurchaseItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }], limit: l, offset: o, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) } });
  } catch (error) { next(error); }
};

exports.getById = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const purchase = await Purchase.findByPk(req.params.id, { include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'company_name', 'cnpj'] }, { model: PurchaseItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }] });
    if (!purchase) { res.status(404).json({ success: false, error: 'Pedido não encontrado' }); return; }
    res.json({ success: true, data: purchase });
  } catch (error) { next(error); }
};

exports.create = async (req: any, res: any, next: any): Promise<void> => {
  const t = await sequelize.transaction();
  try {
    const { supplier_id, items, notes, expected_date } = req.body;
    if (!supplier_id) { await t.rollback(); res.status(400).json({ success: false, error: 'Fornecedor é obrigatório' }); return; }
    if (!items || items.length === 0) { await t.rollback(); res.status(400).json({ success: false, error: 'Adicione pelo menos um item' }); return; }
    let totalAmount = 0;
    for (const item of items) {
      if (!item.product_id || item.quantity === undefined || item.unit_price === undefined) { await t.rollback(); res.status(400).json({ success: false, error: 'Cada item deve ter product_id, quantity e unit_price' }); return; }
      const qty = parseFloat(item.quantity);
      if (qty <= 0) { await t.rollback(); res.status(400).json({ success: false, error: 'Quantidade deve ser maior que zero' }); return; }
      const up = parseFloat(item.unit_price);
      if (up <= 0) { await t.rollback(); res.status(400).json({ success: false, error: 'Preço unitário deve ser maior que zero' }); return; }
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (!product) { await t.rollback(); res.status(404).json({ success: false, error: `Produto ${item.product_id} não encontrado` }); return; }
      totalAmount += qty * up;
    }
    const purchase = await Purchase.create({ order_number: `PO-${Date.now()}`, supplier_id, requester_id: req.user.id, total_amount: totalAmount, order_date: new Date(), expected_date: expected_date || null, status: 'pending', notes }, { transaction: t });
    for (const item of items) { const qty = parseFloat(item.quantity), up = parseFloat(item.unit_price); await PurchaseItem.create({ purchase_id: purchase.id, product_id: item.product_id, quantity: qty, unit_price: up, total_price: qty * up, status: 'pending' }, { transaction: t }); }
    await t.commit();
    logAction(req, { action: 'create', entityType: 'Purchase', entityId: purchase.id, entityDescription: purchase.order_number, newValues: { supplier_id, total_amount: totalAmount, status: 'pending' }, description: `Pedido de compra ${purchase.order_number} criado` });
    const full = await Purchase.findByPk(purchase.id, { include: [{ model: PurchaseItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }] });
    res.status(201).json({ success: true, data: full });
  } catch (error) { await t.rollback(); next(error); }
};

exports.update = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const purchase = await Purchase.findByPk(req.params.id);
    if (!purchase) { res.status(404).json({ success: false, error: 'Pedido não encontrado' }); return; }
    if (!['pending', 'approved'].includes(purchase.status)) { res.status(400).json({ success: false, error: 'Apenas pedidos pendentes ou aprovados podem ser editados' }); return; }
    const allowedFields = ['expected_date', 'freight_type', 'freight_value', 'notes', 'supplier_id'];
    const updateData: any = {};
    for (const f of allowedFields) { if (req.body[f] !== undefined) updateData[f] = req.body[f]; }
    const oldValues: any = {};
    for (const f of Object.keys(updateData)) oldValues[f] = purchase[f];
    await Purchase.update(updateData, { where: { id: req.params.id } });
    const updated = await Purchase.findByPk(req.params.id, { include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'company_name'] }] });
    logAction(req, { action: 'update', entityType: 'Purchase', entityId: updated.id, entityDescription: updated.order_number, oldValues, newValues: updateData, description: `Pedido ${updated.order_number} atualizado` });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};

exports.updateStatus = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { status } = req.body;
    if (!status) { res.status(400).json({ success: false, error: 'Status é obrigatório' }); return; }
    const valid: any = { 'pending': ['approved', 'canceled'], 'approved': ['sent', 'canceled'], 'sent': ['partial', 'received', 'canceled'], 'partial': ['received', 'canceled'], 'received': [], 'canceled': [] };
    const purchase = await Purchase.findByPk(req.params.id);
    if (!purchase) { res.status(404).json({ success: false, error: 'Pedido não encontrado' }); return; }
    if (purchase.status === status) { res.status(400).json({ success: false, error: `Pedido já está com status ${status}` }); return; }
    const allowed = valid[purchase.status] || [];
    if (!allowed.includes(status)) { res.status(400).json({ success: false, error: `Transição inválida: ${purchase.status} → ${status}. Permitidas: ${allowed.join(', ') || 'nenhuma'}` }); return; }
    const prev = purchase.status;
    purchase.status = status;
    await purchase.save();
    if (status === 'approved') { await createPurchasePayable(purchase, req.user.id); }
    logAction(req, { action: status === 'approved' ? 'approve' : 'status_change', entityType: 'Purchase', entityId: purchase.id, entityDescription: purchase.order_number, oldValues: { status: prev }, newValues: { status }, description: `Pedido ${purchase.order_number}: ${prev} → ${status}` });
    res.json({ success: true, data: purchase });
  } catch (error) { next(error); }
};

exports.receiveItems = async (req: any, res: any, next: any): Promise<void> => {
  const t = await sequelize.transaction();
  try {
    const { items } = req.body;
    const purchase = await Purchase.findByPk(req.params.id, { include: [{ model: PurchaseItem, as: 'items' }], transaction: t });
    if (!purchase) { await t.rollback(); res.status(404).json({ success: false, error: 'Pedido não encontrado' }); return; }
    if (!['sent', 'partial'].includes(purchase.status)) { await t.rollback(); res.status(400).json({ success: false, error: 'Apenas pedidos enviados ou com recebimento parcial podem ser recebidos' }); return; }
    if (!items || items.length === 0) { await t.rollback(); res.status(400).json({ success: false, error: 'Lista de itens é obrigatória' }); return; }
    const prevStatus = purchase.status;
    for (const received of items) {
      if (!received.item_id || received.quantity === undefined) { await t.rollback(); res.status(400).json({ success: false, error: 'Cada item deve ter item_id e quantity' }); return; }
      const qty = parseFloat(received.quantity);
      if (qty <= 0) { await t.rollback(); res.status(400).json({ success: false, error: 'Quantidade deve ser maior que zero' }); return; }
      const item = purchase.items.find((i: any) => i.id === parseInt(received.item_id));
      if (!item) { await t.rollback(); res.status(400).json({ success: false, error: `Item ${received.item_id} não encontrado` }); return; }
      const currentReceived = parseFloat(item.received_quantity) || 0;
      const maxReceivable = parseFloat(item.quantity) - currentReceived;
      if (qty > maxReceivable) { await t.rollback(); res.status(400).json({ success: false, error: `Quantidade excedente. Máximo: ${maxReceivable}` }); return; }
      const newReceived = currentReceived + qty;
      const itemStatus = newReceived >= parseFloat(item.quantity) ? 'received' : 'partial';
      await PurchaseItem.update({ received_quantity: newReceived, status: itemStatus }, { where: { id: item.id }, transaction: t });
      await InventoryService.receive(item.product_id, qty, t, { user_id: req.user.id, description: `Recebimento PO ${purchase.order_number}`, reference_id: purchase.id, reference_type: 'purchase' });
    }
    const updatedItems = await PurchaseItem.findAll({ where: { purchase_id: purchase.id }, transaction: t });
    purchase.status = updatedItems.every((i: any) => i.status === 'received') ? 'received' : 'partial';
    await purchase.save({ transaction: t });
    await t.commit();
    logAction(req, { action: 'update', entityType: 'Purchase', entityId: purchase.id, entityDescription: purchase.order_number, oldValues: { status: prevStatus }, newValues: { status: purchase.status }, description: `Recebimento de itens do pedido ${purchase.order_number}` });
    const full = await Purchase.findByPk(purchase.id, { include: [{ model: PurchaseItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }] });
    res.json({ success: true, data: full });
  } catch (error) { await t.rollback(); next(error); }
};

