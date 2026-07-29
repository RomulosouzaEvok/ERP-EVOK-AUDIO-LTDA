const { Employee, Department, User } = require('../models/index');
const Validators = require('../utils/validators');
const { Op } = require('sequelize');

exports.list = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { page = '1', limit = '10', search, status, department_id } = req.query;
    const where: any = {};
    if (search) { const s = Validators.sanitizeSearch(search); where[Op.or] = [{ name: { [Op.like]: `%${s}%` } }, { cpf: { [Op.like]: `%${s}%` } }]; }
    if (status) where.status = status;
    if (department_id) where.department_id = department_id;
    const p = parseInt(page), l = parseInt(limit), o = (p - 1) * l;
    const { count, rows } = await Employee.findAndCountAll({ where, include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }], limit: l, offset: o, order: [['name', 'ASC']] });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) } });
  } catch (error) { next(error); }
};
exports.getById = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const emp = await Employee.findByPk(req.params.id, { include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }] });
    if (!emp) { res.status(404).json({ success: false, error: 'Funcionário não encontrado' }); return; }
    res.json({ success: true, data: emp });
  } catch (error) { next(error); }
};
exports.create = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { name, cpf, rg, pis_pasep, ctps, phone, email, position, salary, salary_type, department_id, hire_date, shift, work_regime, bank_name, bank_agency, bank_account, pix_key, notes } = req.body;
    if (!name || !cpf) { res.status(400).json({ success: false, error: 'Nome e CPF são obrigatórios' }); return; }
    if (!Validators.isValidCPF(cpf)) { res.status(400).json({ success: false, error: 'CPF inválido' }); return; }
    const emp = await Employee.create({ name, cpf: cpf.replace(/[^\d]/g, ''), rg, pis_pasep, ctps, phone, email, position, salary, salary_type, department_id, hire_date: hire_date || new Date(), shift, work_regime, bank_name, bank_agency, bank_account, pix_key, notes, status: 'active' });
    res.status(201).json({ success: true, data: emp });
  } catch (error: any) { if (error.name === 'SequelizeUniqueConstraintError') { res.status(409).json({ success: false, error: 'CPF já cadastrado' }); return; } next(error); }
};
exports.update = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const allowedFields = ['name', 'rg', 'pis_pasep', 'ctps', 'phone', 'email', 'position', 'salary', 'salary_type', 'department_id', 'shift', 'work_regime', 'bank_name', 'bank_agency', 'bank_account', 'pix_key', 'notes', 'status'];
    const updateData: any = {};
    for (const f of allowedFields) { if (req.body[f] !== undefined) updateData[f] = req.body[f]; }
    if (req.body.cpf !== undefined) { if (!Validators.isValidCPF(req.body.cpf)) { res.status(400).json({ success: false, error: 'CPF inválido' }); return; } updateData.cpf = req.body.cpf.replace(/[^\d]/g, ''); }
    const [u] = await Employee.update(updateData, { where: { id: req.params.id } });
    if (!u) { res.status(404).json({ success: false, error: 'Funcionário não encontrado' }); return; }
    res.json({ success: true, data: await Employee.findByPk(req.params.id) });
  } catch (error: any) { if (error.name === 'SequelizeUniqueConstraintError') { res.status(409).json({ success: false, error: 'CPF já cadastrado' }); return; } next(error); }
};
exports.remove = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const [u] = await Employee.update({ status: 'inactive', dismissal_date: new Date() }, { where: { id: req.params.id } });
    if (!u) { res.status(404).json({ success: false, error: 'Funcionário não encontrado' }); return; }
    res.json({ success: true, data: { message: 'Funcionário desligado com sucesso' } });
  } catch (error) { next(error); }
};

