const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError, DatabaseError } = require('sequelize');
const { AppError } = require('../errors');

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
 *
 * Nunca retorna stack trace ou `error.message` cru de exceções inesperadas
 * ao cliente HTTP, em nenhum ambiente (dev ou produção). Erros inesperados
 * são sempre logados por completo no servidor (console.error com stack) para
 * fins de depuração, mas o cliente recebe apenas uma mensagem genérica.
 *
 * Erros que sejam instâncias de {@link AppError} (ou subclasses como
 * `NotFoundError`, `ValidationError`, `BusinessRuleError`, etc.) são
 * considerados operacionais/esperados: sua `message`, `code` e `details`
 * (quando definidos) são seguros para expor ao cliente e são retornados
 * diretamente com o `statusCode` apropriado.
 *
 * @param {Error} err - Erro capturado (via `next(error)` ou lançado em rota async).
 * @param {import('express').Request} req - Requisição Express.
 * @param {import('express').Response} res - Resposta Express.
 * @param {import('express').NextFunction} next - Próximo middleware (não utilizado, mas exigido pela assinatura do Express).
 * @returns {void}
 */
const errorHandler = (err, req, res, next) => {
  // Log interno (nunca exposto ao cliente)
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${new Date().toISOString()}] ERROR:`, err.message);
    console.error(err.stack);
  }

  // Erros operacionais padronizados da aplicação (AppError e subclasses)
  if (err instanceof AppError) {
    const body = {
      success: false,
      error: {
        code: err.code,
        message: err.message
      }
    };
    if (err.details !== undefined) body.error.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  // Erros legados de services que anexam { statusCode } a um Error simples
  // (ex.: Object.assign(new Error('...'), { statusCode: 404 })). Quando o
  // statusCode é < 500, o erro é considerado controlado/esperado e sua
  // mensagem é segura para o cliente. Erros com statusCode 500 (ou sem
  // statusCode) caem no fallback genérico abaixo.
  if (err.statusCode && err.statusCode < 500) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
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
    return res.status(400).json({ success: false, error: 'Erro no upload do arquivo.' });
  }

  // Fallback seguro: erro inesperado/não operacional.
  // Nunca expõe err.message ou stack ao cliente, em nenhum ambiente.
  // Detalhes completos já foram logados no servidor acima.
  res.status(err.statusCode || err.status || 500).json({
    success: false,
    error: 'Erro interno do servidor'
  });
};

module.exports = errorHandler;
