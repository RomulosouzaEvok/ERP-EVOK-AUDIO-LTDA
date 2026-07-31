/**
 * 🚨 Middleware de tratamento centralizado de erros.
 *
 * Nunca retorna stack trace ou `error.message` cru de exceções
 * inesperadas ao cliente HTTP, em nenhum ambiente. Erros inesperados
 * são sempre logados por completo no servidor para depuração, mas
 * o cliente recebe apenas uma mensagem genérica.
 *
 * @module middlewares/errorHandler
 */

import { Request, Response, NextFunction } from 'express';

// Importação híbrida para compatibilidade CommonJS
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AppError } = require('../errors/index');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Sequelize = require('sequelize');

const ERROR_MESSAGES: Record<string, string> = {
  SequelizeValidationError: 'Dados inválidos. Verifique os campos obrigatórios.',
  SequelizeUniqueConstraintError: 'Já existe um registro com este valor.',
  SequelizeForeignKeyConstraintError: 'Registro referenciado não encontrado.',
  SequelizeDatabaseError: 'Erro ao processar operação no banco de dados.',
  JsonWebTokenError: 'Token de autenticação inválido.',
  TokenExpiredError: 'Sessão expirada. Faça login novamente.'
};

interface ExtendedError extends Error {
  statusCode?: number;
  status?: number;
  code?: string;
  details?: unknown;
  errors?: Array<{ message: string; path?: string }>;
}

const errorHandler = (err: ExtendedError, req: Request, res: Response, _next: NextFunction): Response | void => {
  // Log interno (nunca exposto ao cliente)
  if (process.env.NODE_ENV !== 'test' || process.env.DEBUG_ERRORS === 'true') {
    console.error(`[${new Date().toISOString()}] ERROR:`, err.message);
    console.error(err.stack);
  }

  // 1. Erros operacionais padronizados (AppError e subclasses)
  if (err instanceof AppError) {
    const errCode: string = err.code ?? 'INTERNAL_ERROR';
    const statusCode: number = err.statusCode ?? 500;
    const errorBody: Record<string, unknown> = { code: errCode, message: err.message };
    if (err.details !== undefined) {
      errorBody.details = err.details;
    }
    return res.status(statusCode).json({ success: false, error: errorBody });
  }

  // 2. Erros anteriors com statusCode < 500
  if (typeof err.statusCode === 'number' && err.statusCode < 500) {
    return res.status(err.statusCode).json({ success: false, error: err.message ?? 'Erro' });
  }

  // 3. Sequelize Validation Errors
  if (err instanceof Sequelize.ValidationError) {
    const messages = (err.errors ?? []).map((e: { message: string }) => e.message);
    return res.status(400).json({
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? ERROR_MESSAGES.SequelizeValidationError
        : messages.join('; ')
    });
  }

  // 4. Unique constraint violation
  if (err instanceof Sequelize.UniqueConstraintError) {
    const fields = (err.errors ?? []).map((e: { path?: string }) => e.path ?? 'campo').join(', ');
    return res.status(409).json({
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? ERROR_MESSAGES.SequelizeUniqueConstraintError
        : `Já existe um registro com este ${fields}`
    });
  }

  // 5. Foreign key constraint
  if (err instanceof Sequelize.ForeignKeyConstraintError) {
    return res.status(400).json({
      success: false,
      error: ERROR_MESSAGES.SequelizeForeignKeyConstraintError
    });
  }

  // 6. Database errors
  if (err instanceof Sequelize.DatabaseError) {
    return res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.SequelizeDatabaseError
    });
  }

  // 7. JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, error: ERROR_MESSAGES.JsonWebTokenError });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, error: ERROR_MESSAGES.TokenExpiredError });
  }

  // 8. Multer errors (upload)
  if (typeof err.code === 'string') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'Arquivo muito grande. Tamanho máximo: 10MB.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ success: false, error: 'Campo de arquivo inesperado.' });
    }
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, error: 'Erro no upload do arquivo.' });
  }

  // 9. Fallback seguro: erro inesperado/não operacional.
  const fallbackStatus: number = err.statusCode ?? err.status ?? 500;
  return res.status(fallbackStatus).json({
    success: false,
    error: 'Erro interno do servidor'
  });
};

module.exports = errorHandler;
