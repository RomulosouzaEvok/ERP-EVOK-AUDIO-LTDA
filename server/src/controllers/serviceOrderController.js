const { ServiceOrder, Client, Product, User } = require('../models/index');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, client_id, priority, start_date, end_date } = req.query;
    const where = {};
    if (status) where.status = status;
    if (client_id) where.client_id = client_id;
    if (priority) where.priority = priority;
    if (start_date || end_date) {
      where.entry_date = {};
      if (start_date) where.entry_date[Op.gte] = start_date;
      if (end_date) where.entry_date[Op.lte] = end_date;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await ServiceOrder.findAndCountAll({
      where,
      include: [
        { model: Client, as: 'client', attributes: ['id', 'name', 'cpf_cnpj', 'phone'] },
        { model: User, as: 'technician', attributes: ['id', 'name'] }
      ],
      limit: parseInt(limit), offset, order: [['entry_date', 'DESC']]
    });

    res.json({
      success: true, data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const order = await ServiceOrder.findByPk(req.params.id, {
      include: [
        { model: Client, as: 'client', attributes: ['id', 'name', 'cpf_cnpj', 'phone', 'email'] },
        { model: User, as: 'technician', attributes: ['id', 'name'] },
        { model: User, as: 'responsible', attributes: ['id', 'name'] }
      ]
    });
    if (!order) return res.status(404).json({ success: false, error: 'Ordem de serviço não encontrada' });
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { client_id, product_id, equipment_description, reported_issue, priority, technician_id, responsible_id, notes } = req.body;
    if (!client_id || !equipment_description || !reported_issue) {
      return res.status(400).json({ success: false, error: 'Cliente, descrição do equipamento e problema reportado são obrigatórios' });
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await ServiceOrder.count({ where: { order_number: { [Op.like]: `OS-${dateStr}%` } } });
    const order_number = `OS-${dateStr}-${String(count + 1).padStart(3, '0')}`;

    const order = await ServiceOrder.create({
      order_number, client_id, product_id, equipment_description, reported_issue,
      priority: priority || 'normal', status: 'open',
      technician_id, responsible_id, notes, created_by: req.user.id
    });
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const allowedFields = ['equipment_description', 'reported_issue', 'diagnosed_issue', 'service_performed', 'priority', 'technician_id', 'responsible_id', 'notes', 'product_id'];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    const [updated] = await ServiceOrder.update(updateData, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'Ordem de serviço não encontrada' });
    const order = await ServiceOrder.findByPk(req.params.id, {
      include: [{ model: Client, as: 'client', attributes: ['id', 'name'] }]
    });
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status, diagnosed_issue, service_performed, labor_cost, parts_used, completion_date } = req.body;
    const updateData = { status };

    const validTransitions = {
      'open': ['diagnosing', 'canceled'],
      'diagnosing': ['in_progress', 'waiting_parts', 'canceled'],
      'in_progress': ['completed', 'waiting_parts', 'canceled'],
      'waiting_parts': ['in_progress', 'canceled'],
      'completed': ['delivered', 'canceled'],
      'delivered': [],
      'canceled': []
    };

    const order = await ServiceOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Ordem de serviço não encontrada' });

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Transição inválida: ${order.status} → ${status}` });
    }

    if (diagnosed_issue) updateData.diagnosed_issue = diagnosed_issue;
    if (service_performed) updateData.service_performed = service_performed;
    if (labor_cost !== undefined) updateData.labor_cost = labor_cost;
    if (status === 'completed') updateData.completion_date = completion_date || new Date();
    if (status === 'delivered') updateData.delivery_date = new Date();

    // Calculate totals
    const partsTotal = (parts_used || []).reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);
    updateData.total_amount = (labor_cost || 0) + partsTotal;

    await ServiceOrder.update(updateData, { where: { id: req.params.id } });
    const updated = await ServiceOrder.findByPk(req.params.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const order = await ServiceOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Ordem de serviço não encontrada' });
    if (!['open', 'canceled'].includes(order.status)) {
      return res.status(400).json({ error: 'Apenas ordens abertas ou canceladas podem ser removidas' });
    }
    await ServiceOrder.destroy({ where: { id: req.params.id } });
    res.json({ success: true, data: { message: 'Ordem de serviço removida com sucesso' } });
  } catch (error) {
    next(error);
  }
};

exports.getServiceReport = async (req, res, next) => {
  try {
    const { start_date, end_date, technician_id } = req.query;
    const where = {};
    if (start_date || end_date) {
      where.entry_date = {};
      if (start_date) where.entry_date[Op.gte] = start_date;
      if (end_date) where.entry_date[Op.lte] = end_date;
    }
    if (technician_id) where.technician_id = technician_id;

    const orders = await ServiceOrder.findAll({
      where,
      include: [
        { model: Client, as: 'client', attributes: ['id', 'name'] },
        { model: User, as: 'technician', attributes: ['id', 'name'] }
      ]
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const completed = orders.filter(o => ['completed', 'delivered'].includes(o.status)).length;
    const avgDays = orders.filter(o => o.completion_date && o.entry_date)
      .reduce((sum, o) => {
        const days = (new Date(o.completion_date) - new Date(o.entry_date)) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0) / (completed || 1);

    res.json({
      success: true, data: {
        period: { start_date, end_date },
        summary: { total_orders: totalOrders, total_revenue: totalRevenue, completed_orders: completed, avg_completion_days: Math.round(avgDays * 10) / 10 },
        details: orders
      }
    });
  } catch (error) {
    next(error);
  }
};
