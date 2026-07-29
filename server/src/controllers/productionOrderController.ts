const { ProductionOrder, Product, Employee, User, Sale } = require('../models/index');
const { Op } = require('sequelize');
const InventoryService = require('../services/inventoryService');
const BomService = require('../services/bomService');
const { logAction } = require('../services/auditLogService');

const STATUS_MACHINE: any = {
  planned: ['released', 'canceled'],
  released: ['in_progress', 'canceled'],
  in_progress: ['completed', 'paused', 'canceled'],
  paused: ['in_progress', 'canceled'],
  completed: [],
  canceled: []
};

exports.list = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { page = '1', limit = '10', status, product_id, priority, start_date, end_date } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (product_id) where.product_id = product_id;
    if (priority) where.priority = priority;
    if (start_date || end_date) { where.createdAt = {}; if (start_date) where.createdAt[Op.gte] = new Date(start_date); if (end_date) where.createdAt[Op.lte] = new Date(end_date); }
    const p = parseInt(page), l = parseInt(limit), o = (p - 1) * l;
    const { count, rows } = await ProductionOrder.findAndCountAll({ where, include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }, { model: Employee, as: 'responsible', attributes: ['id', 'name'] }, { model: User, as: 'createdBy', attributes: ['id', 'name'] }], limit: l, offset: o, order: [['createdAt', 'DESC']] });
    const summary = { total: count, planned: rows.filter((r: any) => r.status === 'planned').length, in_progress: rows.filter((r: any) => r.status === 'in_progress').length, completed: rows.filter((r: any) => r.status === 'completed').length, overdue: rows.filter((r: any) => r.status !== 'completed' && r.status !== 'canceled' && r.due_date && new Date(r.due_date) < new Date()).length };
    res.json({ success: true, data: rows, summary, pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) } });
  } catch (error) { next(error); }
};
exports.getById = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const op = await ProductionOrder.findByPk(req.params.id, { include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }, { model: Employee, as: 'responsible', attributes: ['id', 'name'] }, { model: User, as: 'createdBy', attributes: ['id', 'name'] }] });
    if (!op) { res.status(404).json({ success: false, error: 'Ordem de produção não encontrada' }); return; }
    res.json({ success: true, data: op });
  } catch (error) { next(error); }
};
exports.create = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { product_id, quantity, due_date, priority, responsible_id, notes } = req.body;
    if (!product_id || !quantity) { res.status(400).json({ success: false, error: 'Produto e quantidade são obrigatórios' }); return; }
    const qty = parseInt(quantity); if (qty <= 0) { res.status(400).json({ success: false, error: 'Quantidade deve ser maior que zero' }); return; }
    const product = await Product.findByPk(product_id);
    if (!product) { res.status(404).json({ success: false, error: 'Produto não encontrado' }); return; }
    if (product.status !== 'active') { res.status(400).json({ success: false, error: 'Produto deve estar ativo' }); return; }
    const year = new Date().getFullYear();
    const count = await ProductionOrder.count({ where: { createdAt: { [Op.gte]: new Date(`${year}-01-01`) } } });
    const op = await ProductionOrder.create({ order_number: `OP-${year}-${String(count + 1).padStart(4, '0')}`, product_id, quantity: qty, due_date, priority: priority || 'normal', responsible_id, created_by: req.user.id, notes, status: 'planned' });
    logAction(req, { action: 'create', entityType: 'ProductionOrder', entityId: op.id, entityDescription: op.order_number, newValues: { product_id, quantity: qty, status: 'planned' }, description: `OP ${op.order_number} criada` });
    res.status(201).json({ success: true, data: op });
  } catch (error) { next(error); }
};
exports.update = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const op = await ProductionOrder.findByPk(req.params.id);
    if (!op) { res.status(404).json({ success: false, error: 'Ordem de produção não encontrada' }); return; }
    if (req.body.status) { res.status(400).json({ success: false, error: 'Use /:id/status para alterar status' }); return; }
    const allowedFields = ['priority', 'due_date', 'responsible_id', 'notes'];
    const updateData: any = {}; for (const f of allowedFields) { if (req.body[f] !== undefined) updateData[f] = req.body[f]; }
    const oldValues: any = {}; for (const f of Object.keys(updateData)) oldValues[f] = op[f];
    await ProductionOrder.update(updateData, { where: { id: req.params.id } });
    logAction(req, { action: 'update', entityType: 'ProductionOrder', entityId: op.id, entityDescription: op.order_number, oldValues, newValues: updateData, description: `OP ${op.order_number} atualizada` });
    res.json({ success: true, data: await ProductionOrder.findByPk(req.params.id) });
  } catch (error) { next(error); }
};
exports.updateStatus = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { status, quantity_produced } = req.body;
    if (!status) { res.status(400).json({ success: false, error: 'Status é obrigatório' }); return; }
    const op = await ProductionOrder.findByPk(req.params.id, { include: [{ model: Product, as: 'product' }] });
    if (!op) { res.status(404).json({ success: false, error: 'Ordem de produção não encontrada' }); return; }
    if (op.status === status) { res.status(400).json({ success: false, error: `OP já está com status ${status}` }); return; }
    const allowed = STATUS_MACHINE[op.status] || [];
    if (!allowed.includes(status)) { res.status(400).json({ success: false, error: `Transição inválida: ${op.status} → ${status}` }); return; }
    const prev = op.status;
    if (status === 'completed') {
      if (quantity_produced !== undefined) { const qp = parseInt(quantity_produced); if (qp < 0) { res.status(400).json({ success: false, error: 'Quantidade produzida não pode ser negativa' }); return; } if (qp > op.quantity) { res.status(400).json({ success: false, error: `Quantidade produzida (${qp}) excede o planejado (${op.quantity}). Use allow_overproduction: true se deseja continuar.` }); return; } op.quantity_produced = qp; }
      if (!op.quantity_produced) op.quantity_produced = op.quantity;
      await InventoryService.receive(op.product_id, op.quantity_produced, null, { user_id: req.user.id, description: `Produção OP ${op.order_number}`, reference_id: op.id, reference_type: 'production' });
    }
    if (status === 'canceled') { op.quantity_produced = 0; }
    op.status = status;
    if (status === 'completed') op.completion_date = new Date();
    if (status === 'in_progress' && !op.start_date) op.start_date = new Date();
    await op.save();
    logAction(req, { action: 'status_change', entityType: 'ProductionOrder', entityId: op.id, entityDescription: op.order_number, oldValues: { status: prev }, newValues: { status }, description: `OP ${op.order_number}: ${prev} → ${status}` });
    res.json({ success: true, data: op });
  } catch (error) { next(error); }
};
exports.remove = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const op = await ProductionOrder.findByPk(req.params.id);
    if (!op) { res.status(404).json({ success: false, error: 'Ordem de produção não encontrada' }); return; }
    if (['in_progress', 'completed'].includes(op.status)) { res.status(400).json({ success: false, error: 'OP em progresso ou concluída não pode ser removida' }); return; }
    await op.destroy();
    res.json({ success: true, data: { message: 'Ordem de produção removida' } });
  } catch (error) { next(error); }
};
exports.report = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { start_date, end_date } = req.query;
    const where: any = {};
    if (start_date) where.createdAt = { [Op.gte]: new Date(start_date) };
    if (end_date) { if (!where.createdAt) where.createdAt = {}; where.createdAt[Op.lte] = new Date(end_date); }
    const orders = await ProductionOrder.findAll({ where, include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }] });
    const totalPlanned = orders.reduce((a: number, o: any) => a + o.quantity, 0);
    const totalProduced = orders.filter((o: any) => o.status === 'completed').reduce((a: number, o: any) => a + (o.quantity_produced || 0), 0);
    const byStatus: any = {}; for (const o of orders) { byStatus[o.status] = (byStatus[o.status] || 0) + 1; }
    res.json({ success: true, data: { total: orders.length, total_planned: totalPlanned, total_produced: totalProduced, completion_rate: totalPlanned > 0 ? Math.round((totalProduced / totalPlanned) * 100) : 0, by_status: byStatus, orders } });
  } catch (error) { next(error); }
};

