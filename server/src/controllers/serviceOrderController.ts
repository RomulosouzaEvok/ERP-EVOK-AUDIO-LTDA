const { ServiceOrder, Client, Product, User } = require('../models/index');
const { Op } = require('sequelize');

exports.list = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { page = '1', limit = '10', status, client_id } = req.query;
    const where: any = {}; if (status) where.status = status; if (client_id) where.client_id = client_id;
    const p = parseInt(String(page), 10), l = parseInt(String(limit), 10), o = (p - 1) * l;
    const { count, rows } = await ServiceOrder.findAndCountAll({ where, include: [{ model: Client, as: 'client', attributes: ['id', 'name'] }, { model: Product, as: 'product', attributes: ['id', 'name', 'code'] }], limit: l, offset: o, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) } });
  } catch (error) { next(error); }
};
exports.getById = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const os = await ServiceOrder.findByPk(req.params.id, { include: [{ model: Client, as: 'client' }, { model: Product, as: 'product' }, { model: User, as: 'technician', attributes: ['id', 'name'] }] });
    if (!os) { res.status(404).json({ success: false, error: 'Ordem de serviço não encontrada' }); return; }
    res.json({ success: true, data: os });
  } catch (error) { next(error); }
};
exports.create = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { client_id, product_id, equipment_desc, reported_issue, priority, technician_id, responsible_id, notes } = req.body;
    if (!client_id) { res.status(400).json({ success: false, error: 'Cliente é obrigatório' }); return; }
    const count = await ServiceOrder.count();
    const os = await ServiceOrder.create({ order_number: `OS-${Date.now()}`, client_id, product_id, equipment_desc, reported_issue, priority: priority || 'normal', technician_id, responsible_id, notes, status: 'open', entry_date: new Date() });
    res.status(201).json({ success: true, data: os });
  } catch (error) { next(error); }
};
exports.update = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const allowedFields = ['diagnosed_issue', 'service_performed', 'labor_cost', 'total_amount', 'status', 'priority', 'technician_id', 'responsible_id', 'notes', 'completion_date', 'delivery_date', 'warranty_days'];
    const updateData: any = {}; for (const f of allowedFields) { if (req.body[f] !== undefined) updateData[f] = req.body[f]; }
    if (req.body.status === 'completed' && !updateData.completion_date) updateData.completion_date = new Date();
    const [u] = await ServiceOrder.update(updateData, { where: { id: req.params.id } });
    if (!u) { res.status(404).json({ success: false, error: 'Ordem de serviço não encontrada' }); return; }
    res.json({ success: true, data: await ServiceOrder.findByPk(req.params.id) });
  } catch (error) { next(error); }
};
exports.remove = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const [u] = await ServiceOrder.update({ status: 'canceled' }, { where: { id: req.params.id } });
    if (!u) { res.status(404).json({ success: false, error: 'Ordem de serviço não encontrada' }); return; }
    res.json({ success: true, data: { message: 'Ordem de serviço cancelada' } });
  } catch (error) { next(error); }
};


