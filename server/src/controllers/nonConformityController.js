const { NonConformity, Product, ProductionOrder, Supplier, User } = require('../models/index');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, origin, severity, product_id, start_date, end_date } = req.query;
    const where = {};
    if (status) where.status = status;
    if (origin) where.origin = origin;
    if (severity) where.severity = severity;
    if (product_id) where.product_id = product_id;
    if (start_date || end_date) {
      where.report_date = {};
      if (start_date) where.report_date[Op.gte] = start_date;
      if (end_date) where.report_date[Op.lte] = end_date;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await NonConformity.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'reporter', attributes: ['id', 'name'] },
        { model: User, as: 'responsible', attributes: ['id', 'name'] }
      ],
      limit: parseInt(limit), offset, order: [['report_date', 'DESC']]
    });

    const summary = {
      open: await NonConformity.count({ where: { status: { [Op.in]: ['open', 'analysis', 'corrective_action', 'effectiveness_check'] } } }),
      closed: await NonConformity.count({ where: { status: 'closed' } }),
      critical: await NonConformity.count({ where: { severity: 'critical', status: { [Op.notIn]: ['closed', 'canceled'] } } }),
      total_cost: (await NonConformity.findAll({
        where: { status: { [Op.notIn]: ['canceled'] } },
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
    const nc = await NonConformity.findByPk(req.params.id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: ProductionOrder, as: 'productionOrder', attributes: ['id', 'order_number'] },
        { model: Supplier, as: 'supplier', attributes: ['id', 'company_name'] },
        { model: User, as: 'reporter', attributes: ['id', 'name'] },
        { model: User, as: 'responsible', attributes: ['id', 'name'] },
        { model: User, as: 'closer', attributes: ['id', 'name'] }
      ]
    });
    if (!nc) return res.status(404).json({ success: false, error: 'NC não encontrada' });
    res.json({ success: true, data: nc });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const {
      origin, product_id, purchase_item_id, production_order_id, service_order_id, supplier_id,
      description, defect_type, severity, quantity_affected,
      immediate_action, immediate_action_desc, lot_number, batch_number,
      scrap_cost, rework_cost, notes
    } = req.body;

    if (!origin || !description || !defect_type || !severity) {
      return res.status(400).json({ success: false, error: 'Origem, descrição, tipo de defeito e severidade são obrigatórios' });
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await NonConformity.count({ where: { nc_number: { [Op.like]: `NC-${dateStr}%` } } });
    const nc_number = `NC-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const totalCost = parseFloat(scrap_cost || 0) + parseFloat(rework_cost || 0);

    const nc = await NonConformity.create({
      nc_number, origin, product_id, purchase_item_id, production_order_id, service_order_id, supplier_id,
      description, defect_type, severity, quantity_affected: quantity_affected || 0,
      immediate_action: immediate_action || 'rework', immediate_action_desc,
      lot_number, batch_number,
      scrap_cost: scrap_cost || 0, rework_cost: rework_cost || 0, total_cost: totalCost,
      reported_by: req.user.id, notes, status: 'open'
    });

    res.status(201).json({ success: true, data: nc });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'Número de NC já existe' });
    }
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const allowedFields = [
      'description', 'defect_type', 'severity', 'quantity_affected',
      'immediate_action', 'immediate_action_desc', 'notes',
      'lot_number', 'batch_number', 'scrap_cost', 'rework_cost'
    ];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    if (updateData.scrap_cost !== undefined || updateData.rework_cost !== undefined) {
      const nc = await NonConformity.findByPk(req.params.id);
      if (nc) {
        updateData.total_cost = parseFloat(updateData.scrap_cost ?? nc.scrap_cost) + parseFloat(updateData.rework_cost ?? nc.rework_cost);
      }
    }

    const [updated] = await NonConformity.update(updateData, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'NC não encontrada' });

    const nc = await NonConformity.findByPk(req.params.id);
    res.json({ success: true, data: nc });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status, root_cause, root_cause_category, corrective_action, corrective_action_deadline, responsible_id, effectiveness_check, effectiveness_date, effectiveness_result, notes } = req.body;

    const validTransitions = {
      'open': ['analysis', 'canceled'],
      'analysis': ['corrective_action', 'canceled'],
      'corrective_action': ['effectiveness_check', 'canceled'],
      'effectiveness_check': ['closed', 'canceled'],
      'closed': [],
      'canceled': []
    };

    const nc = await NonConformity.findByPk(req.params.id);
    if (!nc) return res.status(404).json({ success: false, error: 'NC não encontrada' });

    const allowed = validTransitions[nc.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: `Transição inválida: ${nc.status} → ${status}` });
    }

    const updateData = { status };
    if (root_cause) updateData.root_cause = root_cause;
    if (root_cause_category) updateData.root_cause_category = root_cause_category;
    if (corrective_action) updateData.corrective_action = corrective_action;
    if (corrective_action_deadline) updateData.corrective_action_deadline = corrective_action_deadline;
    if (responsible_id) updateData.responsible_id = responsible_id;
    if (effectiveness_check) updateData.effectiveness_check = effectiveness_check;
    if (effectiveness_date) updateData.effectiveness_date = effectiveness_date;
    if (effectiveness_result) updateData.effectiveness_result = effectiveness_result;
    if (notes) updateData.notes = notes;
    if (status === 'closed') {
      updateData.closed_date = new Date();
      updateData.closed_by = req.user.id;
    }

    await NonConformity.update(updateData, { where: { id: req.params.id } });
    const updated = await NonConformity.findByPk(req.params.id);
    res.json({ success: true, data: updated });
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

    const ncs = await NonConformity.findAll({ where });

    const byOrigin = {}, bySeverity = {}, byDefect = {}, byStatus = {};
    let totalCost = 0, totalScrap = 0;

    ncs.forEach(nc => {
      byOrigin[nc.origin] = (byOrigin[nc.origin] || 0) + 1;
      bySeverity[nc.severity] = (bySeverity[nc.severity] || 0) + 1;
      byDefect[nc.defect_type] = (byDefect[nc.defect_type] || 0) + 1;
      byStatus[nc.status] = (byStatus[nc.status] || 0) + 1;
      totalCost += parseFloat(nc.total_cost || 0);
      totalScrap += parseFloat(nc.scrap_cost || 0);
    });

    res.json({
      success: true, data: {
        period: { start_date, end_date },
        summary: {
          total_ncs: ncs.length,
          total_cost: totalCost,
          total_scrap_cost: totalScrap,
          avg_cost_per_nc: ncs.length > 0 ? totalCost / ncs.length : 0
        },
        by_origin: byOrigin,
        by_severity: bySeverity,
        by_defect_type: byDefect,
        by_status: byStatus,
        details: ncs
      }
    });
  } catch (error) {
    next(error);
  }
};
