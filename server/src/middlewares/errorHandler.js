const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError, DatabaseError } = require('sequelize');

/** Mapa de mensagens amigáveis por tipo de erro */
const ERROR_MESSAGES = {
  SequelizeValidationError: 'Dados inválidos. Verifique os campos obrigatórios.',
  SequelizeUniqueConstraintError: 'Já existe um registro com este valor.',
  SequelizeForeignKeyConstraintError: 'Registro referenciado não encontrado.',
  SequelizeDatabaseError: 'Erro ao processar operação no banco de dados.',
  JsonWebTokenError: 'Token de autenticação inválido.',
  TokenExpiredError: 'Sessão expirada. Faça login novamente.'
};

/**
 * Middleware de tratamento centralizado de erros.
 * Em produção, NUNCA retorna stack traces ou detalhes internos.
 */
const errorHandler = (err, req, res, next) => {
  // Log interno (nunca exposto ao cliente)
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${new Date().toISOString()}] ERROR:`, err.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(err.stack);
    }
  }

  // Sequelize Validation Errors
  if (err instanceof ValidationError) {
    const messages = err.errors.map(e => e.message);
    return res.status(400).json({
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? ERROR_MESSAGES.SequelizeValidationError
        : messages.join('; ')
    });
  }

  // Unique constraint violation
  if (err instanceof UniqueConstraintError) {
    const fields = err.errors.map(e => e.path || 'campo').join(', ');
    return res.status(409).json({
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? ERROR_MESSAGES.SequelizeUniqueConstraintError
        : `Já existe um registro com este ${fields}`
    });
  }

  // Foreign key constraint
  if (err instanceof ForeignKeyConstraintError) {
    return res.status(400).json({
      success: false,
      error: ERROR_MESSAGES.SequelizeForeignKeyConstraintError
    });
  }

  // Database errors
  if (err instanceof DatabaseError) {
    return res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.SequelizeDatabaseError
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, error: ERROR_MESSAGES.JsonWebTokenError });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, error: ERROR_MESSAGES.TokenExpiredError });
  }

  // Multer errors (upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, error: 'Arquivo muito grande. Tamanho máximo: 10MB.' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ success: false, error: 'Campo de arquivo inesperado.' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, error: err.message || 'Erro no upload do arquivo.' });
  }

  // Custom errors with statusCode
  if (err.statusCode) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }

  // Fallback seguro: em produção nunca expõe detalhes
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor'
      : (err.message || 'Erro interno do servidor')
  });
};

module.exports = errorHandler;

