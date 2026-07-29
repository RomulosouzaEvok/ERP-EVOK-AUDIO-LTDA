const { Asset, Department, Employee, Product } = require('../models/index');
const { Op } = require('sequelize');

exports.list = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { page = '1', limit = '10', status, department_id } = req.query;
    const where: any = {}; if (status) where.status = status; if (department_id) where.department_id = department_id;
    const p = parseInt(page), l = parseInt(limit), o = (p - 1) * l;
    const { count, rows } = await Asset.findAndCountAll({ where, include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }, { model: Employee, as: 'responsible', attributes: ['id', 'name'] }], limit: l, offset: o, order: [['name', 'ASC']] });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) } });
  } catch (error) { next(error); }
};
exports.getById = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const asset = await Asset.findByPk(req.params.id, { include: [{ model: Department, as: 'department' }, { model: Employee, as: 'responsible' }] });
    if (!asset) { res.status(404).json({ success: false, error: 'Ativo não encontrado' }); return; }
    res.json({ success: true, data: asset });
  } catch (error) { next(error); }
};
exports.create = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { tag, name, description, department_id, responsible_id, location, asset_type, brand, model, serial_number, purchase_date, purchase_value, useful_life_months, notes } = req.body;
    if (!tag || !name) { res.status(400).json({ success: false, error: 'Tag e nome são obrigatórios' }); return; }
    const asset = await Asset.create({ tag, name, description, department_id, responsible_id, location, asset_type, brand, model, serial_number, purchase_date, purchase_value, useful_life_months, current_value: purchase_value, status: 'active', notes });
    res.status(201).json({ success: true, data: asset });
  } catch (error: any) { if (error.name === 'SequelizeUniqueConstraintError') { res.status(409).json({ success: false, error: 'Tag já existe' }); return; } next(error); }
};
exports.update = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const allowedFields = ['name', 'description', 'department_id', 'responsible_id', 'location', 'asset_type', 'brand', 'model', 'serial_number', 'purchase_date', 'purchase_value', 'current_value', 'useful_life_months', 'status', 'notes'];
    const updateData: any = {}; for (const f of allowedFields) { if (req.body[f] !== undefined) updateData[f] = req.body[f]; }
    const [u] = await Asset.update(updateData, { where: { id: req.params.id } });
    if (!u) { res.status(404).json({ success: false, error: 'Ativo não encontrado' }); return; }
    res.json({ success: true, data: await Asset.findByPk(req.params.id) });
  } catch (error: any) { if (error.name === 'SequelizeUniqueConstraintError') { res.status(409).json({ success: false, error: 'Tag já existe' }); return; } next(error); }
};
exports.remove = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const [u] = await Asset.update({ status: 'inactive' }, { where: { id: req.params.id } });
    if (!u) { res.status(404).json({ success: false, error: 'Ativo não encontrado' }); return; }
    res.json({ success: true, data: { message: 'Ativo inativado' } });
  } catch (error) { next(error); }
};

