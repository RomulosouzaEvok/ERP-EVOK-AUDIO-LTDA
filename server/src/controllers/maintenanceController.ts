const { MaintenanceOrder, Asset, User } = require('../models/index');
const { Op } = require('sequelize');

exports.list = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { page = '1', limit = '10', status, asset_id } = req.query;
    const where: any = {}; if (status) where.status = status; if (asset_id) where.asset_id = asset_id;
    const p = parseInt(page), l = parseInt(limit), o = (p - 1) * l;
    const { count, rows } = await MaintenanceOrder.findAndCountAll({ where, include: [{ model: Asset, as: 'asset', attributes: ['id', 'name', 'tag'] }, { model: User, as: 'technician', attributes: ['id', 'name'] }], limit: l, offset: o, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) } });
  } catch (error) { next(error); }
};
exports.getById = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const mo = await MaintenanceOrder.findByPk(req.params.id, { include: [{ model: Asset, as: 'asset' }, { model: User, as: 'technician' }, { model: User, as: 'reporter' }, { model: User, as: 'diagnoser' }] });
    if (!mo) { res.status(404).json({ success: false, error: 'Ordem de manutenção não encontrada' }); return; }
    res.json({ success: true, data: mo });
  } catch (error) { next(error); }
};
exports.create = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { asset_id, description, priority, maintenance_type } = req.body;
    if (!asset_id || !description) { res.status(400).json({ success: false, error: 'Ativo e descrição são obrigatórios' }); return; }
    const mo = await MaintenanceOrder.create({ asset_id, description, priority: priority || 'medium', maintenance_type: maintenance_type || 'corrective', reported_by: req.user.id, status: 'open' });
    res.status(201).json({ success: true, data: mo });
  } catch (error) { next(error); }
};
exports.update = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const allowedFields = ['description', 'diagnosis', 'solution', 'parts_used', 'cost', 'status', 'priority', 'maintenance_type', 'technician_id', 'start_date', 'completion_date', 'notes'];
    const updateData: any = {}; for (const f of allowedFields) { if (req.body[f] !== undefined) updateData[f] = req.body[f]; }
    if (req.body.status === 'in_progress' && !updateData.start_date) updateData.start_date = new Date();
    if (req.body.status === 'completed' && !updateData.completion_date) updateData.completion_date = new Date();
    const [u] = await MaintenanceOrder.update(updateData, { where: { id: req.params.id } });
    if (!u) { res.status(404).json({ success: false, error: 'Ordem de manutenção não encontrada' }); return; }
    res.json({ success: true, data: await MaintenanceOrder.findByPk(req.params.id) });
  } catch (error) { next(error); }
};
exports.remove = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const [u] = await MaintenanceOrder.update({ status: 'canceled' }, { where: { id: req.params.id } });
    if (!u) { res.status(404).json({ success: false, error: 'Ordem de manutenção não encontrada' }); return; }
    res.json({ success: true, data: { message: 'Ordem de manutenção cancelada' } });
  } catch (error) { next(error); }
};

