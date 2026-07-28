const jwt = require('jsonwebtoken');
const { User } = require('../models/index');

module.exports = async (req, res, next) => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET não configurado ou muito curto. Configure no .env com no mínimo 32 caracteres.');
    return res.status(500).json({ success: false, error: 'Erro de configuração do servidor. Contate o administrador.' });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Usuário não encontrado' });
    }

    if (!user.active) {
      return res.status(401).json({ success: false, error: 'Usuário inativo' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expirado' });
    }
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
};

// Alias: a maioria das rotas importa `{ authenticate }` (destructuring nomeado).
// Sem isso, require() das rotas quebra em tempo de carga (Route.get() recebe undefined).
module.exports.authenticate = module.exports;

module.exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Sem permissão para esta ação' });
    }
    next();
  };
};

