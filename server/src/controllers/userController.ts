const { User } = require('../models/index');
const { Op } = require('sequelize');

exports.list = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { page = '1', limit = '10', search, role, active } = req.query;
    const where: any = {};
    if (search) { const s = String(search).replace(/[%_]/g, '\\$&'); where[Op.or] = [{ name: { [Op.like]: `%${s}%` } }, { email: { [Op.like]: `%${s}%` } }]; }
    if (role) where.role = role;
    if (active !== undefined) where.active = active === 'true';
    const p = parseInt(page), l = parseInt(limit), o = (p - 1) * l;
    const { count, rows } = await User.findAndCountAll({ where, attributes: { exclude: ['password'] }, limit: l, offset: o, order: [['name', 'ASC']] });
    res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) } });
  } catch (error) { next(error); }
};
exports.getById = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    if (!user) { res.status(404).json({ success: false, error: 'Usuário não encontrado' }); return; }
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};
exports.create = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const { name, email, password, role = 'operator' } = req.body;
    if (!name || !email || !password) { res.status(400).json({ success: false, error: 'Nome, email e senha são obrigatórios' }); return; }
    if (password.length < 6) { res.status(400).json({ success: false, error: 'Senha deve ter no mínimo 6 caracteres' }); return; }
    if (!['admin', 'operator', 'financial'].includes(role)) { res.status(400).json({ success: false, error: 'Role deve ser admin, operator ou financial' }); return; }
    const user = await User.create({ name, email, password, role, active: true });
    const { password: _, ...safe } = user.toJSON();
    res.status(201).json({ success: true, data: safe });
  } catch (error: any) { if (error.name === 'SequelizeUniqueConstraintError') { res.status(409).json({ success: false, error: 'Email já cadastrado' }); return; } next(error); }
};
exports.update = async (req: any, res: any, next: any): Promise<void> => {
  try {
    if (req.body.password) { res.status(400).json({ success: false, error: 'Use endpoint específico para alterar senha' }); return; }
    const { name, email, role, active } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) { if (!['admin', 'operator', 'financial'].includes(role)) { res.status(400).json({ success: false, error: 'Role inválida' }); return; } updateData.role = role; }
    if (active !== undefined) updateData.active = active;
    const [u] = await User.update(updateData, { where: { id: req.params.id } });
    if (!u) { res.status(404).json({ success: false, error: 'Usuário não encontrado' }); return; }
    res.json({ success: true, data: await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } }) });
  } catch (error: any) { if (error.name === 'SequelizeUniqueConstraintError') { res.status(409).json({ success: false, error: 'Email já cadastrado' }); return; } next(error); }
};
exports.remove = async (req: any, res: any, next: any): Promise<void> => {
  try {
    if (parseInt(req.params.id) === req.user.id) { res.status(400).json({ success: false, error: 'Você não pode inativar seu próprio usuário' }); return; }
    const [u] = await User.update({ active: false }, { where: { id: req.params.id } });
    if (!u) { res.status(404).json({ success: false, error: 'Usuário não encontrado' }); return; }
    res.json({ success: true, data: { message: 'Usuário inativado com sucesso' } });
  } catch (error) { next(error); }
};

