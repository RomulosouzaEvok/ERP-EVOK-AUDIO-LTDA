/**
 * Classe base de erro operacional da aplicação.
 *
 * Erros operacionais são falhas previstas do domínio de negócio (ex.: recurso
 * não encontrado, violação de regra de negócio, dados inválidos) que podem
 * ser tratadas de forma segura e comunicadas ao cliente HTTP sem expor
 * detalhes internos de implementação (stack trace, mensagens de driver de
 * banco de dados, etc.).
 *
 * O middleware `server/src/middlewares/errorHandler.js` reconhece instâncias
 * de `AppError` e usa `statusCode`, `code`, `message` e `details` para montar
 * a resposta JSON padronizada `{ success: false, error: { code, message, details? } }`.
 *
 * Erros que NÃO são instâncias de `AppError` (ex.: exceções inesperadas,
 * erros de driver, bugs) são tratados como não operacionais: são logados
 * integralmente no servidor e respondidos ao cliente com uma mensagem
 * genérica, sem vazar `error.message` ou stack trace.
 */
class AppError extends Error {
  /**
   * @param {string} message - Mensagem de erro segura para exibição ao cliente.
   * @param {number} [statusCode=500] - Código de status HTTP a ser retornado.
   * @param {string} [code='INTERNAL_ERROR'] - Código curto e estável para identificação programática do erro.
   * @param {*} [details] - Informações adicionais opcionais (ex.: lista de campos inválidos). Deve ser seguro para expor ao cliente.
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    if (details !== undefined) this.details = details;
    /** Indica que este é um erro previsto/tratado (não um bug inesperado). */
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
