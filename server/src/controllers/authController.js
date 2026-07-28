const jwt = require('jsonwebtoken');
const { User } = require('../models/index');
const { logAction } = require('../services/auditLogService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email e senha são obrigatórios' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      logAction(req, { action: 'login', entityType: 'User', entityDescription: email, description: `Tentativa de login falhou: email não encontrado (${email})`, success: false, errorMessage: 'Email não encontrado' });
      return res.status(401).json({ success: false, error: 'Email ou senha incorretos' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logAction(req, { action: 'login', entityType: 'User', entityId: user.id, entityDescription: user.email, description: 'Tentativa de login falhou: senha incorreta', success: false, errorMessage: 'Senha incorreta' });
      return res.status(401).json({ success: false, error: 'Email ou senha incorretos' });
    }

    if (!user.active) {
      logAction(req, { action: 'login', entityType: 'User', entityId: user.id, entityDescription: user.email, description: 'Tentativa de login falhou: usuário inativo', success: false, errorMessage: 'Usuário inativo' });
      return res.status(401).json({ success: false, error: 'Usuário inativo. Contate o administrador.' });
    }

    const token = generateToken(user.id);

    logAction(req, { action: 'login', entityType: 'User', entityId: user.id, entityDescription: user.email, description: 'Login realizado com sucesso' });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Nome, email e senha são obrigatórios' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Formato de email inválido' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Senha deve ter no mínimo 6 caracteres' });
    }

    const user = await User.create({ name, email, password, role: role || 'operator' });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'Email já cadastrado' });
    }
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

