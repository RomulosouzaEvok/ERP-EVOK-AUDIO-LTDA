const AppError = require('./AppError');

/**
 * Erro de validação de dados de entrada (ex.: campo obrigatório ausente,
 * formato inválido). HTTP 400.
 */
class ValidationError extends AppError {
  /**
   * @param {string} message - Mensagem descrevendo o problema de validação.
   * @param {*} [details] - Detalhes adicionais (ex.: lista de campos inválidos).
   */
  constructor(message = 'Dados inválidos.', details) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Erro de recurso não encontrado (ex.: registro inexistente no banco). HTTP 404.
 */
class NotFoundError extends AppError {
  /**
   * @param {string} message - Mensagem descrevendo o recurso não encontrado.
   * @param {*} [details] - Detalhes adicionais opcionais.
   */
  constructor(message = 'Recurso não encontrado.', details) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

/**
 * Erro de autenticação ausente ou inválida. HTTP 401.
 */
class UnauthorizedError extends AppError {
  /**
   * @param {string} message - Mensagem descrevendo a falha de autenticação.
   * @param {*} [details] - Detalhes adicionais opcionais.
   */
  constructor(message = 'Não autenticado.', details) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

/**
 * Erro de autorização: usuário autenticado mas sem permissão. HTTP 403.
 */
class ForbiddenError extends AppError {
  /**
   * @param {string} message - Mensagem descrevendo a falta de permissão.
   * @param {*} [details] - Detalhes adicionais opcionais.
   */
  constructor(message = 'Acesso negado.', details) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

/**
 * Erro de conflito de estado (ex.: registro duplicado, violação de unicidade). HTTP 409.
 */
class ConflictError extends AppError {
  /**
   * @param {string} message - Mensagem descrevendo o conflito.
   * @param {*} [details] - Detalhes adicionais opcionais.
   */
  constructor(message = 'Conflito de dados.', details) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * Erro de violação de regra de negócio (ex.: cliente com vendas ativas não
 * pode ser inativado, estoque insuficiente para produção). HTTP 422.
 */
class BusinessRuleError extends AppError {
  /**
   * @param {string} message - Mensagem descrevendo a regra de negócio violada.
   * @param {*} [details] - Detalhes adicionais opcionais.
   */
  constructor(message = 'Operação não permitida pelas regras de negócio.', details) {
    super(message, 422, 'BUSINESS_RULE_VIOLATION', details);
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BusinessRuleError
};
