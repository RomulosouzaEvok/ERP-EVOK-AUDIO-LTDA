const { Supplier, Purchase } = require('../models/index');
const { Op } = require('sequelize');
const Validators = require('../utils/validators');

exports.list = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { page = '1', limit = '10', search, status } = req.query;
    const where: any = {};
    if (search) { const s = Validators.sanitizeSearch(search); where[Op.or] = [{ company_name: { [Op.like]: `%${s}%` } }, { cnpj: { [Op.like]: `%${s}%` } }]; }
    if (status) where.status = status;
    const p = parseInt(page), l = parseInt(limit), o = (p - 1) * l;
    const { count, rows } = await Supplier.findAndCountAll({ where, limit: l, offset: o, order: [['company_name', 'ASC']] });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) } });
  } catch (error) { next(error); }
};
exports.getById = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) { res.status(404).json({ success: false, error: 'Fornecedor não encontrado' }); return; }
    res.json({ success: true, data: supplier });
  } catch (error) { next(error); }
};
exports.create = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { company_name, trade_name, cnpj, ie, phone, email, contact_name, contact_phone, payment_terms, delivery_time, notes } = req.body;
    if (!company_name || !cnpj) { res.status(400).json({ success: false, error: 'Razão social e CNPJ são obrigatórios' }); return; }
    const dv = Validators.validateDocument(cnpj);
    if (!dv.valid) { res.status(400).json({ success: false, error: `CNPJ inválido: ${dv.error}` }); return; }
    const supplier = await Supplier.create({ company_name, trade_name, cnpj: cnpj.replace(/[^\d]/g, ''), ie, phone, email, contact_name, contact_phone, payment_terms, delivery_time: delivery_time || 15, rating: 3, status: 'active', notes });
    res.status(201).json({ success: true, data: supplier });
  } catch (error: any) { if (error.name === 'SequelizeUniqueConstraintError') { res.status(409).json({ success: false, error: 'CNPJ já cadastrado' }); return; } next(error); }
};
exports.update = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const allowedFields = ['company_name', 'trade_name', 'ie', 'phone', 'email', 'cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state', 'contact_name', 'contact_phone', 'payment_terms', 'delivery_time', 'rating', 'notes'];
    const updateData: any = {};
    for (const f of allowedFields) { if (req.body[f] !== undefined) updateData[f] = req.body[f]; }
    const [updated] = await Supplier.update(updateData, { where: { id: req.params.id } });
    if (!updated) { res.status(404).json({ success: false, error: 'Fornecedor não encontrado' }); return; }
    res.json({ success: true, data: await Supplier.findByPk(req.params.id) });
  } catch (error) { next(error); }
};
exports.remove = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const p = await Purchase.count({ where: { supplier_id: req.params.id, status: { [Op.in]: ['pending', 'approved', 'sent', 'partial'] } } });
    if (p > 0) { res.status(400).json({ success: false, error: `Fornecedor possui ${p} pedido(s) de compra pendente(s).` }); return; }
    const [u] = await Supplier.update({ status: 'inactive' }, { where: { id: req.params.id } });
    if (!u) { res.status(404).json({ success: false, error: 'Fornecedor não encontrado' }); return; }
    res.json({ success: true, data: { message: 'Fornecedor inativado com sucesso' } });
  } catch (error) { next(error); }
};

