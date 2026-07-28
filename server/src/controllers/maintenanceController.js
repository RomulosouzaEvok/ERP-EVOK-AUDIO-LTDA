const { MaintenanceOrder, Asset, Department, Employee, User } = require('../models/index');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, maintenance_type, asset_id, priority, start_date, end_date, technician_id } = req.query;
    const where = {};
    if (status) where.status = status;
    if (maintenance_type) where.maintenance_type = maintenance_type;
    if (asset_id) where.asset_id = asset_id;
    if (priority) where.priority = priority;
    if (technician_id) where.technician_id = technician_id;
    if (start_date || end_date) {
      where.report_date = {};
      if (start_date) where.report_date[Op.gte] = start_date;
      if (end_date) where.report_date[Op.lte] = end_date;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await MaintenanceOrder.findAndCountAll({
      where,
      include: [
        { model: Asset, as: 'asset', attributes: ['id', 'tag', 'name', 'location'] },
        { model: User, as: 'technician', attributes: ['id', 'name'] },
        { model: User, as: 'reporter', attributes: ['id', 'name'] }
      ],
      limit: parseInt(limit), offset, order: [['report_date', 'DESC']]
    });

    const summary = {
      open: await MaintenanceOrder.count({ where: { status: { [Op.in]: ['open', 'scheduled', 'in_progress', 'waiting_parts'] } } }),
      overdue: await MaintenanceOrder.count({
        where: {
          scheduled_date: { [Op.lt]: new Date() },
          status: { [Op.in]: ['open', 'scheduled', 'in_progress', 'waiting_parts'] }
        }
      }),
      total_cost: (await MaintenanceOrder.findAll({
        attributes: [[sequelize.fn('SUM', sequelize.col('total_cost')), 'total']],
        raw: true
      }))[0]?.total || 0
    };

    res.json({
      success: true, data: rows,
      summary,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const order = await MaintenanceOrder.findByPk(req.params.id, {
      include: [
        { model: Asset, as: 'asset', attributes: ['id', 'tag', 'name', 'location', 'department_id'] },
        { model: Asset, as: 'asset', include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }] },
        { model: User, as: 'technician', attributes: ['id', 'name'] },
        { model: User, as: 'reporter', attributes: ['id', 'name'] },
        { model: User, as: 'diagnoser', attributes: ['id', 'name'] }
      ]
    });
    if (!order) return res.status(404).json({ success: false, error: 'Ordem de manutenção não encontrada' });
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { asset_id, maintenance_type, priority, problem_description, reported_by, notes, scheduled_date } = req.body;
    if (!asset_id || !maintenance_type || !problem_description) {
      return res.status(400).json({ success: false, error: 'Ativo, tipo de manutenção e descrição do problema são obrigatórios' });
    }

    const asset = await Asset.findByPk(asset_id);
    if (!asset) return res.status(404).json({ success: false, error: 'Ativo não encontrado' });

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await MaintenanceOrder.count({ where: { order_number: { [Op.like]: `OM-${dateStr}%` } } });
    const order_number = `OM-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const order = await MaintenanceOrder.create({
      order_number, asset_id, maintenance_type,
      priority: priority || 'normal',
      problem_description, reported_by: reported_by || req.user.id,
      notes, scheduled_date, status: 'open'
    });

    // Auto-update asset status to 'in_maintenance'
    if (asset.status === 'active') {
      await Asset.update({ status: 'in_maintenance' }, { where: { id: asset_id } });
    }

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const allowedFields = [
      'problem_description', 'diagnosed_problem', 'service_performed',
      'priority', 'technician_id', 'notes', 'scheduled_date',
      'parts_cost', 'labor_cost', 'downtime_hours'
    ];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    if (updateData.parts_cost !== undefined || updateData.labor_cost !== undefined) {
      const mo = await MaintenanceOrder.findByPk(req.params.id);
      if (mo) {
        updateData.total_cost = parseFloat(updateData.parts_cost ?? mo.parts_cost) + parseFloat(updateData.labor_cost ?? mo.labor_cost);
      }
    }

    const [updated] = await MaintenanceOrder.update(updateData, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'Ordem de manutenção não encontrada' });

    const order = await MaintenanceOrder.findByPk(req.params.id);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status, diagnosed_problem, service_performed, parts_cost, labor_cost, downtime_hours, result, notes, frequency_days } = req.body;

    const validTransitions = {
      'open': ['scheduled', 'in_progress', 'canceled'],
      'scheduled': ['in_progress', 'canceled'],
      'in_progress': ['waiting_parts', 'completed', 'canceled'],
      'waiting_parts': ['in_progress', 'canceled'],
      'completed': [],
      'canceled': []
    };

    const order = await MaintenanceOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Ordem de manutenção não encontrada' });

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: `Transição inválida: ${order.status} → ${status}` });
    }

    const updateData = { status };
    if (diagnosed_problem) updateData.diagnosed_problem = diagnosed_problem;
    if (service_performed) updateData.service_performed = service_performed;
    if (parts_cost !== undefined) updateData.parts_cost = parts_cost;
    if (labor_cost !== undefined) updateData.labor_cost = labor_cost;
    if (downtime_hours !== undefined) updateData.downtime_hours = downtime_hours;
    if (result) updateData.result = result;
    if (notes) updateData.notes = notes;
    if (frequency_days) {
      updateData.frequency_days = frequency_days;
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + frequency_days);
      updateData.next_maintenance_date = nextDate.toISOString().slice(0, 10);
    }

    if (status === 'in_progress') {
      updateData.start_date = new Date();
      if (req.body.diagnosed_problem) updateData.diagnosed_by = req.user.id;
    }
    if (status === 'completed') {
      updateData.completion_date = new Date();
      updateData.total_cost = parseFloat(updateData.parts_cost ?? order.parts_cost) + parseFloat(updateData.labor_cost ?? order.labor_cost);
      updateData.result = result || 'completed';

      // Reativar ativo se estava em manutenção
      const asset = await Asset.findByPk(order.asset_id);
      if (asset && asset.status === 'in_maintenance') {
        await Asset.update({ status: 'active' }, { where: { id: order.asset_id } });
      }

      // Agendar próxima manutenção se preventiva/preditiva
      if (['preventive', 'predictive'].includes(order.maintenance_type) && frequency_days) {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + frequency_days);
        updateData.next_maintenance_date = nextDate.toISOString().slice(0, 10);
      }
    }

    await MaintenanceOrder.update(updateData, { where: { id: req.params.id } });
    const updated = await MaintenanceOrder.findByPk(req.params.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const order = await MaintenanceOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Ordem de manutenção não encontrada' });
    if (!['open', 'canceled'].includes(order.status)) {
      return res.status(400).json({ success: false, error: 'Apenas ordens abertas ou canceladas podem ser removidas' });
    }
    await MaintenanceOrder.destroy({ where: { id: req.params.id } });
    res.json({ success: true, data: { message: 'Ordem de manutenção removida' } });
  } catch (error) {
    next(error);
  }
};

exports.getSchedule = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const where = { status: { [Op.notIn]: ['completed', 'canceled'] } };
    if (start_date || end_date) {
      where.scheduled_date = {};
      if (start_date) where.scheduled_date[Op.gte] = start_date;
      if (end_date) where.scheduled_date[Op.lte] = end_date;
    }

    const orders = await MaintenanceOrder.findAll({
      where,
      include: [
        { model: Asset, as: 'asset', attributes: ['id', 'tag', 'name', 'location'] },
        { model: User, as: 'technician', attributes: ['id', 'name'] }
      ],
      order: [['scheduled_date', 'ASC'], ['priority', 'DESC']]
    });

    res.json({ success: true, data: { total: orders.length, schedule: orders } });
  } catch (error) {
    next(error);
  }
};

exports.getReport = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const where = {};
    if (start_date || end_date) {
      where.report_date = {};
      if (start_date) where.report_date[Op.gte] = start_date;
      if (end_date) where.report_date[Op.lte] = end_date;
    }

    const orders = await MaintenanceOrder.findAll({ where });

    const byType = {}, byStatus = {}, byPriority = {};
    let totalCost = 0, totalDowntime = 0, completed = 0;

    orders.forEach(o => {
      byType[o.maintenance_type] = (byType[o.maintenance_type] || 0) + 1;
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      byPriority[o.priority] = (byPriority[o.priority] || 0) + 1;
      totalCost += parseFloat(o.total_cost || 0);
      totalDowntime += parseFloat(o.downtime_hours || 0);
      if (o.status === 'completed') completed++;
    });

    res.json({
      success: true, data: {
        period: { start_date, end_date },
        summary: {
          total_orders: orders.length,
          completed_orders: completed,
          total_cost: totalCost,
          total_downtime_hours: totalDowntime,
          average_cost: orders.length > 0 ? totalCost / orders.length : 0
        },
        by_type: byType,
        by_status: byStatus,
        by_priority: byPriority,
        details: orders
      }
    });
  } catch (error) {
    next(error);
  }
};
