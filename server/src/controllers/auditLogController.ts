const { AuditLog, User } = require('../models/index');
const { Op } = require('sequelize');

exports.list = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { page = '1', limit = '10', entity_type, action, start_date, end_date } = req.query;
    const where: any = {};
    if (entity_type) where.entity = entity_type;
    if (action) where.action = action;
    if (start_date || end_date) { where.createdAt = {}; if (start_date) where.createdAt[Op.gte] = new Date(start_date); if (end_date) where.createdAt[Op.lte] = new Date(end_date); }
    const p = parseInt(String(page), 10), l = parseInt(String(limit), 10), o = (p - 1) * l;
    const { count, rows } = await AuditLog.findAndCountAll({ where, include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }], limit: l, offset: o, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) } });
  } catch (error) { next(error); }
};
exports.getById = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const log = await AuditLog.findByPk(req.params.id, { include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] });
    if (!log) { res.status(404).json({ success: false, error: 'Registro de auditoria não encontrado' }); return; }
    res.json({ success: true, data: log });
  } catch (error) { next(error); }
};


