const { Purchase, PurchaseItem, Product, Supplier, AccountPayable } = require('../models/index');
const InventoryService = require('../services/inventoryService');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logAction } = require('../services/auditLogService');

const createPurchasePayable = async (purchase, userId, transaction) => {
  if (!purchase.supplier_id) return;

  const totalPayable = parseFloat(purchase.total_amount) || 0;
  if (totalPayable <= 0) return;

  const existingPayable = await AccountPayable.findOne({
    where: { purchase_id: purchase.id },
    transaction
  });
  if (existingPayable) return;

  const dueDate = purchase.expected_date
    ? new Date(new Date(purchase.expected_date).getTime() + 30 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await AccountPayable.create({
    description: `Fornecimento PO ${purchase.order_number}`,
    amount: totalPayable,
    due_date: dueDate.toISOString().slice(0, 10),
    status: 'pending',
    category: 'Fornecedores',
    supplier_id: purchase.supplier_id,
    purchase_id: purchase.id,
    approved_by: userId,
    approval_date: new Date(),
    notes: `Gerado automaticamente na aprovacao do pedido ${purchase.order_number}`
  }, { transaction });
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'Status é obrigatório' });

    const validTransitions = {
      'pending': ['approved', 'canceled'],
      'approved': ['sent', 'canceled'],
      'sent': ['partial', 'received', 'canceled'],
      'partial': ['received', 'canceled'],
      'received': [],
      'canceled': []
    };

    const purchase = await Purchase.findByPk(req.params.id);
    if (!purchase) return res.status(404).json({ success: false, error: 'Pedido não encontrado' });
    if (purchase.status === status) return res.status(400).json({ success: false, error: `Pedido já está com status ${status}` });

    const allowed = validTransitions[purchase.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Transição de status inválida: ${purchase.status} → ${status}. Permitidas: ${allowed.join(', ') || 'nenhuma'}`
      });
    }

    const previousStatus = purchase.status;
    purchase.status = status;
    await purchase.save();
    if (status === 'approved') {
      await createPurchasePayable(purchase, req.user.id);
    }

    logAction(req, {
      action: status === 'approved' ? 'approve' : (status === 'canceled' ? 'status_change' : 'status_change'),
      entityType: 'Purchase',
      entityId: purchase.id,
      entityDescription: purchase.order_number,
      oldValues: { status: previousStatus },
      newValues: { status },
      description: `Pedido de compra ${purchase.order_number}: status alterado de ${previousStatus} para ${status}`
    });

    res.json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, supplier_id, start_date, end_date } = req.query;
    const where = {};
    if (status) where.status = status;
    if (supplier_id) where.supplier_id = supplier_id;
    if (start_date || end_date) {
      where.order_date = {};
      if (start_date) where.order_date[Op.gte] = start_date;
      if (end_date) where.order_date[Op.lte] = end_date;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Purchase.findAndCountAll({
      where,
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'company_name'] },
        { model: PurchaseItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }
      ],
      limit: parseInt(limit), offset, order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const purchase = await Purchase.findByPk(req.params.id);
    if (!purchase) return res.status(404).json({ success: false, error: 'Pedido não encontrado' });
    if (!['pending', 'approved'].includes(purchase.status)) {
      return res.status(400).json({ success: false, error: 'Apenas pedidos pendentes ou aprovados podem ser editados' });
    }

    const allowedFields = ['expected_date', 'freight_type', 'freight_value', 'notes', 'supplier_id'];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    const oldValues = {};
    for (const field of Object.keys(updateData)) oldValues[field] = purchase[field];

    await Purchase.update(updateData, { where: { id: req.params.id } });
    const updated = await Purchase.findByPk(req.params.id, {
      include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'company_name'] }]
    });

    logAction(req, { action: 'update', entityType: 'Purchase', entityId: updated.id, entityDescription: updated.order_number, oldValues, newValues: updateData, description: `Pedido de compra ${updated.order_number} atualizado` });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const purchase = await Purchase.findByPk(req.params.id, {
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'company_name', 'cnpj'] },
        { model: PurchaseItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }
      ]
    });
    if (!purchase) return res.status(404).json({ success: false, error: 'Pedido não encontrado' });
    res.json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { supplier_id, items, notes, expected_date } = req.body;
    if (!supplier_id) { await t.rollback(); return res.status(400).json({ success: false, error: 'Fornecedor é obrigatório' }); }
    if (!items || items.length === 0) { await t.rollback(); return res.status(400).json({ success: false, error: 'Adicione pelo menos um item' }); }

    let totalAmount = 0;
    for (const item of items) {
      if (!item.product_id || item.quantity === undefined || item.unit_price === undefined) {
        await t.rollback(); return res.status(400).json({ success: false, error: 'Cada item deve ter product_id, quantity e unit_price' });
      }
      const qty = parseFloat(item.quantity);
      if (qty <= 0) { await t.rollback(); return res.status(400).json({ success: false, error: 'Quantidade deve ser maior que zero' }); }
const unitPrice = parseFloat(item.unit_price);
      if (unitPrice <= 0) { await t.rollback(); return res.status(400).json({ success: false, error: 'Preço unitário deve ser maior que zero' }); }
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (!product) { await t.rollback(); return res.status(404).json({ success: false, error: `Produto ${item.product_id} não encontrado` }); }
      totalAmount += qty * unitPrice;
    }

    const purchase = await Purchase.create({
      order_number: `PO-${Date.now()}`,
      supplier_id, requester_id: req.user.id,
      total_amount: totalAmount, order_date: new Date(),
      expected_date: expected_date || null, status: 'pending', notes
    }, { transaction: t });

    for (const item of items) {
      const qty = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unit_price);
      const totalPrice = qty * unitPrice;
      await PurchaseItem.create({
        purchase_id: purchase.id, product_id: item.product_id,
        quantity: qty, unit_price: unitPrice, total_price: totalPrice, status: 'pending'
      }, { transaction: t });
    }

    await t.commit();

    // Log de auditoria feito após o commit para não segurar locks de banco.
    logAction(req, { action: 'create', entityType: 'Purchase', entityId: purchase.id, entityDescription: purchase.order_number, newValues: { supplier_id, total_amount: totalAmount, status: 'pending' }, description: `Pedido de compra ${purchase.order_number} criado` });

    const fullPurchase = await Purchase.findByPk(purchase.id, {
      include: [{ model: PurchaseItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }]
    });
    res.status(201).json({ success: true, data: fullPurchase });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

exports.receiveItems = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { items } = req.body;
    const purchase = await Purchase.findByPk(req.params.id, {
      include: [{ model: PurchaseItem, as: 'items' }],
      transaction: t
    });
    if (!purchase) { await t.rollback(); return res.status(404).json({ success: false, error: 'Pedido não encontrado' }); }
    if (!['sent', 'partial'].includes(purchase.status)) { await t.rollback(); return res.status(400).json({ success: false, error: 'Apenas pedidos enviados ou com recebimento parcial podem ser recebidos' }); }
    if (!items || items.length === 0) { await t.rollback(); return res.status(400).json({ success: false, error: 'Lista de itens é obrigatória' }); }

    const previousStatus = purchase.status;

    for (const received of items) {
      if (!received.item_id || received.quantity === undefined) { await t.rollback(); return res.status(400).json({ success: false, error: 'Cada item deve ter item_id e quantity' }); }
      const qty = parseFloat(received.quantity);
      if (qty <= 0) { await t.rollback(); return res.status(400).json({ success: false, error: 'Quantidade deve ser maior que zero' }); }

      const item = purchase.items.find(i => i.id === parseInt(received.item_id));
      if (!item) { await t.rollback(); return res.status(400).json({ success: false, error: `Item ${received.item_id} não encontrado` }); }

      const currentReceived = parseFloat(item.received_quantity) || 0;
      const maxReceivable = parseFloat(item.quantity) - currentReceived;
      if (qty > maxReceivable) { await t.rollback(); return res.status(400).json({ success: false, error: `Quantidade excedente. Máximo: ${maxReceivable}` }); }

      const newReceived = currentReceived + qty;
      const itemStatus = newReceived >= parseFloat(item.quantity) ? 'received' : 'partial';
      await PurchaseItem.update({ received_quantity: newReceived, status: itemStatus }, { where: { id: item.id }, transaction: t });

      // InventoryService locks the Product row and registers the InventoryMovement
      // atomically in the same transaction. Duplicate/excess receiving is already
      // blocked above by the maxReceivable check against received_quantity.
      await InventoryService.receive(item.product_id, qty, t, {
        user_id: req.user.id,
        description: `Recebimento PO ${purchase.order_number}`,
        reference_id: purchase.id,
        reference_type: 'purchase'
      });
    }

    const updatedItems = await PurchaseItem.findAll({ where: { purchase_id: purchase.id }, transaction: t });
    const allReceived = updatedItems.every(i => i.status === 'received');
    purchase.status = allReceived ? 'received' : 'partial';
    await purchase.save({ transaction: t });

    await t.commit();

    // Log de auditoria feito após o commit para não segurar locks de banco.
    logAction(req, { action: 'update', entityType: 'Purchase', entityId: purchase.id, entityDescription: purchase.order_number, oldValues: { status: previousStatus }, newValues: { status: purchase.status }, description: `Recebimento de itens do pedido ${purchase.order_number}` });

    const fullPurchase = await Purchase.findByPk(purchase.id, {
      include: [{ model: PurchaseItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] }]
    });
    res.json({ success: true, data: fullPurchase });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};
