/**
 * 🚨 Classe base de erro operacional da aplicação.
 *
 * Erros operacionais são falhas previstas do domínio de negócio (ex.: recurso
 * não encontrado, violação de regra de negócio, dados inválidos) que podem
 * ser tratadas de forma segura e comunicadas ao cliente HTTP sem expor
 * detalhes internos de implementação (stack trace, mensagens de driver de
 * banco de dados, etc.).
 *
 * O middleware `server/src/middlewares/errorHandler.ts` reconhece instâncias
 * de `AppError` e usa `statusCode`, `code`, `message` e `details` para montar
 * a resposta JSON padronizada `{ success: false, error: { code, message, details? } }`.
 *
 * @module errors/AppError
 */

export class AppError extends Error {
  /** Código de status HTTP. */
  public readonly statusCode: number;

  /** Código curto e estável para identificação programática do erro. */
  public readonly code: string;

  /** Informações adicionais opcionais (ex.: lista de campos inválidos). */
  public readonly details?: unknown;

  /** Indica que este é um erro previsto/tratado (não um bug inesperado). */
  public readonly isOperational: boolean;

  /**
   * @param message - Mensagem de erro segura para exibição ao cliente.
   * @param statusCode - Código de status HTTP.
   * @param code - Código curto para identificação programática.
   * @param details - Informações adicionais opcionais (seguras para expor).
   */
  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    if (details !== undefined) this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
