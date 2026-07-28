const { User } = require('../models/index');
const { Op } = require('sequelize');
const { logAction } = require('../services/auditLogService');

exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, role, active } = req.query;
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    if (role) where.role = role;
    if (active !== undefined) where.active = active === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit), offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true, data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, error: 'Nome, email e senha são obrigatórios' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ success: false, error: 'Formato de email inválido' });
    if (password.length < 6) return res.status(400).json({ success: false, error: 'Senha deve ter no mínimo 6 caracteres' });
    const validRoles = ['admin', 'operator', 'financial'];
    if (role && !validRoles.includes(role)) return res.status(400).json({ success: false, error: `Perfil inválido. Use: ${validRoles.join(', ')}` });

    const user = await User.create({ name, email, password, role: role || 'operator' });

    logAction(req, { action: 'create', entityType: 'User', entityId: user.id, entityDescription: user.email, newValues: { name: user.name, email: user.email, role: user.role }, description: `Usuário ${user.email} criado` });

    res.status(201).json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, error: 'Email já cadastrado' });
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    if (req.body.password) return res.status(400).json({ success: false, error: 'Use endpoint específico para alterar senha' });
    const allowedFields = ['name', 'email', 'role', 'active'];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) return res.status(400).json({ success: false, error: 'Formato de email inválido' });
    }

    const before = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    if (!before) return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    const oldValues = {};
    for (const field of Object.keys(updateData)) oldValues[field] = before[field];

    const [updated] = await User.update(updateData, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });

    logAction(req, { action: 'update', entityType: 'User', entityId: user.id, entityDescription: user.email, oldValues, newValues: updateData, description: `Usuário ${user.email} atualizado` });

    res.json({ success: true, data: user });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, error: 'Email já cadastrado' });
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ success: false, error: 'Você não pode inativar seu próprio usuário' });
    const before = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    if (!before) return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    const [updated] = await User.update({ active: false }, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ success: false, error: 'Usuário não encontrado' });

    logAction(req, { action: 'soft_delete', entityType: 'User', entityId: before.id, entityDescription: before.email, oldValues: { active: before.active }, newValues: { active: false }, description: `Usuário ${before.email} inativado` });

    res.json({ success: true, data: { message: 'Usuário inativado com sucesso' } });
  } catch (error) {
    next(error);
  }
};
