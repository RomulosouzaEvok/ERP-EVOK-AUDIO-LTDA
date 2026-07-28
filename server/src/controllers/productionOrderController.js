const { ProductionOrder, Product, InventoryMovement, Employee, User } = require('../models/index');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, product_id, start_date, end_date, priority } = req.query;
    const where = {};
    if (status) where.status = status;
    if (product_id) where.product_id = product_id;
    if (priority) where.priority = priority;
    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) where.createdAt[Op.gte] = new Date(start_date);
      if (end_date) where.createdAt[Op.lte] = new Date(end_date);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await ProductionOrder.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code', 'product_type'] },
        { model: Employee, as: 'responsible', attributes: ['id', 'name'] }
      ],
      limit: parseInt(limit), offset, order: [['createdAt', 'DESC']]
    });

    const totals = await Promise.all([
      ProductionOrder.count(),
      ProductionOrder.count({ where: { status: 'planned' } }),
      ProductionOrder.count({ where: { status: 'in_progress' } }),
      ProductionOrder.count({ where: { status: 'completed' } }),
      ProductionOrder.count({ where: { due_date: { [Op.lt]: new Date() }, status: { [Op.notIn]: ['completed', 'canceled'] } } })
    ]);

    res.json({
      success: true, data: rows,
      summary: { total: totals[0], planned: totals[1], in_progress: totals[2], completed: totals[3], overdue: totals[4] },
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const order = await ProductionOrder.findByPk(req.params.id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code', 'product_type'] },
        { model: Employee, as: 'responsible', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'name'] }
      ]
    });
    if (!order) return res.status(404).json({ success: false, error: 'Ordem de produção não encontrada' });
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { product_id, quantity, priority, due_date, responsible_id, sales_order_id, notes } = req.body;
    if (!product_id || !quantity || !due_date) { await t.rollback(); return res.status(400).json({ success: false, error: 'Produto, quantidade e data de vencimento são obrigatórios' }); }
    if (quantity <= 0) { await t.rollback(); return res.status(400).json({ success: false, error: 'Quantidade deve ser maior que zero' }); }

    const product = await Product.findByPk(product_id, { transaction: t });
    if (!product) { await t.rollback(); return res.status(404).json({ success: false, error: 'Produto não encontrado' }); }
    if (product.status !== 'active') { await t.rollback(); return res.status(400).json({ success: false, error: 'Produto inativo não pode ser produzido' }); }
    if (product.product_type !== 'finished') { await t.rollback(); return res.status(400).json({ success: false, error: `Apenas produtos acabados têm OP. '${product.name}' é '${product.product_type}'` }); }

    const year = new Date().getFullYear();
    const count = await ProductionOrder.count({ where: { order_number: { [Op.like]: `OP-${year}%` } }, transaction: t });
    const order_number = `OP-${year}-${String(count + 1).padStart(4, '0')}`;

    const order = await ProductionOrder.create({
      order_number, product_id, quantity,
      priority: priority || 'normal', status: 'planned',
      due_date, sales_order_id, responsible_id, notes, created_by: req.user.id
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    if (req.body.status) return res.status(400).json({ success: false, error: 'Use /:id/status para alterar status' });
    const allowedFields = ['priority', 'due_date', 'responsible_id', 'notes'];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    const [updated] = await ProductionOrder.update(updateData, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'Ordem de produção não encontrada' });
    const order = await ProductionOrder.findByPk(req.params.id, { include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] });
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { status, quantity_produced } = req.body;
    if (!status) { await t.rollback(); return res.status(400).json({ success: false, error: 'Status é obrigatório' }); }

    const validTransitions = {
      'planned': ['released', 'canceled'],
      'released': ['in_progress', 'canceled'],
      'in_progress': ['completed', 'paused', 'canceled'],
      'paused': ['in_progress', 'canceled'],
      'completed': [], 'canceled': []
    };

    const order = await ProductionOrder.findByPk(req.params.id, { transaction: t });
    if (!order) { await t.rollback(); return res.status(404).json({ success: false, error: 'Ordem de produção não encontrada' }); }
    if (order.status === status) { await t.rollback(); return res.status(400).json({ success: false, error: `OP já está com status ${status}` }); }

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(status)) { await t.rollback(); return res.status(400).json({ success: false, error: `Transição inválida: ${order.status} → ${status}` }); }

    const updateData = { status };
    if (status === 'in_progress') updateData.start_date = new Date();
    if (status === 'completed') {
      const producedQty = quantity_produced !== undefined ? quantity_produced : order.quantity;
      if (producedQty < 0) { await t.rollback(); return res.status(400).json({ success: false, error: 'Quantidade produzida não pode ser negativa' }); }
      updateData.quantity_produced = producedQty;
      updateData.completion_date = new Date();
      if (producedQty > 0) {
        await InventoryMovement.create({ product_id: order.product_id, user_id: req.user.id, type: 'in', quantity: producedQty, description: `Produção concluída - ${order.order_number}`, reference_id: order.id, reference_type: 'production' }, { transaction: t });
        await Product.update({ quantity: sequelize.literal(`quantity + ${producedQty}`) }, { where: { id: order.product_id }, transaction: t });
      }
    }

    await ProductionOrder.update(updateData, { where: { id: req.params.id }, transaction: t });
    await t.commit();
    const updated = await ProductionOrder.findByPk(req.params.id, { include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] });
    res.json({ success: true, data: updated });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const order = await ProductionOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Ordem de produção não encontrada' });
    if (['in_progress', 'completed'].includes(order.status)) return res.status(400).json({ success: false, error: 'Ordens em andamento ou concluídas não podem ser removidas' });
    await ProductionOrder.destroy({ where: { id: req.params.id } });
    res.json({ success: true, data: { message: 'Ordem de produção removida com sucesso' } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getProductionReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const where = {};
    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) where.createdAt[Op.gte] = new Date(start_date);
      if (end_date) where.createdAt[Op.lte] = new Date(end_date);
    }

    const orders = await ProductionOrder.findAll({
      where,
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }]
    });

    const totalPlanned = orders.reduce((sum, o) => sum + o.quantity, 0);
    const totalProduced = orders.reduce((sum, o) => sum + (o.quantity_produced || 0), 0);
    const completionRate = totalPlanned > 0 ? (totalProduced / totalPlanned) * 100 : 0;

    const byStatus = { planned: 0, released: 0, in_progress: 0, completed: 0, paused: 0, canceled: 0 };
    orders.forEach(o => { if (byStatus[o.status] !== undefined) byStatus[o.status]++; });

    res.json({ success: true, data: { period: { start_date, end_date }, summary: { total_orders: orders.length, total_planned: totalPlanned, total_produced: totalProduced, completion_rate: `${completionRate.toFixed(2)}%` }, by_status: byStatus, details: orders } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
