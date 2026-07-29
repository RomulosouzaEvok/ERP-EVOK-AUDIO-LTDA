const { NonConformity, Product, ProductionOrder, Supplier, User } = require('../models/index');
const { Op } = require('sequelize');

exports.list = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { page = '1', limit = '10', status, severity } = req.query;
    const where: any = {}; if (status) where.status = status; if (severity) where.severity = severity;
    const p = parseInt(String(page), 10), l = parseInt(String(limit), 10), o = (p - 1) * l;
    const { count, rows } = await NonConformity.findAndCountAll({ where, include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'code'] }, { model: User, as: 'reporter', attributes: ['id', 'name'] }], limit: l, offset: o, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) } });
  } catch (error) { next(error); }
};
exports.getById = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const nc = await NonConformity.findByPk(req.params.id, { include: [{ model: Product, as: 'product' }, { model: ProductionOrder, as: 'productionOrder' }, { model: Supplier, as: 'supplier' }, { model: User, as: 'reporter' }] });
    if (!nc) { res.status(404).json({ success: false, error: 'Não conformidade não encontrada' }); return; }
    res.json({ success: true, data: nc });
  } catch (error) { next(error); }
};
exports.create = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { product_id, production_order_id, supplier_id, description, severity, origin, quantity_affected, immediate_action } = req.body;
    if (!description) { res.status(400).json({ success: false, error: 'Descrição é obrigatória' }); return; }
    const nc = await NonConformity.create({ product_id, production_order_id, supplier_id, description, severity: severity || 'medium', origin: origin || 'internal', quantity_affected, immediate_action, reported_by: req.user.id, status: 'open' });
    res.status(201).json({ success: true, data: nc });
  } catch (error) { next(error); }
};
exports.update = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const allowedFields = ['description', 'severity', 'origin', 'quantity_affected', 'immediate_action', 'root_cause', 'corrective_action', 'status', 'responsible_id', 'closed_by'];
    const updateData: any = {}; for (const f of allowedFields) { if (req.body[f] !== undefined) updateData[f] = req.body[f]; }
    if (req.body.status === 'closed') { updateData.closed_by = req.user.id; updateData.closed_at = new Date(); }
    const [u] = await NonConformity.update(updateData, { where: { id: req.params.id } });
    if (!u) { res.status(404).json({ success: false, error: 'Não conformidade não encontrada' }); return; }
    res.json({ success: true, data: await NonConformity.findByPk(req.params.id) });
  } catch (error) { next(error); }
};
exports.remove = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const [u] = await NonConformity.update({ status: 'closed' }, { where: { id: req.params.id } });
    if (!u) { res.status(404).json({ success: false, error: 'Não conformidade não encontrada' }); return; }
    res.json({ success: true, data: { message: 'Não conformidade fechada' } });
  } catch (error) { next(error); }
};


