/**
 * 🚨 Barrel de exportação de erros padronizados.
 *
 * Todos os erros operacionais da aplicação herdam de {@link AppError}
 * e seguem o mesmo formato de resposta JSON:
 * `{ success: false, error: { code, message, details? } }`.
 *
 * @module errors
 */

import { AppError } from './AppError';

/**
 * Erro de validação de dados de entrada (ex.: campo obrigatório ausente,
 * formato inválido). HTTP 400.
 */
export class ValidationError extends AppError {
  constructor(message = 'Dados inválidos.', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Erro de recurso não encontrado (ex.: registro inexistente no banco). HTTP 404.
 */
export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado.', details?: unknown) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

/**
 * Erro de autenticação ausente ou inválida. HTTP 401.
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Não autenticado.', details?: unknown) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

/**
 * Erro de autorização: usuário autenticado mas sem permissão. HTTP 403.
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado.', details?: unknown) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

/**
 * Erro de conflito de estado (ex.: registro duplicado, violação de unicidade). HTTP 409.
 */
export class ConflictError extends AppError {
  constructor(message = 'Conflito de dados.', details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * Erro de violação de regra de negócio (ex.: cliente com vendas ativas não
 * pode ser inativado, estoque insuficiente para produção). HTTP 422.
 */
export class BusinessRuleError extends AppError {
  constructor(message = 'Operação não permitida pelas regras de negócio.', details?: unknown) {
    super(message, 422, 'BUSINESS_RULE_VIOLATION', details);
  }
}

export { AppError };

const Errors = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BusinessRuleError
};

export default Errors;
