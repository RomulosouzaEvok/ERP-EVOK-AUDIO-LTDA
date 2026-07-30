/**
 * 🧱 Classe base abstrata para casos de uso da camada de aplicação.
 *
 * Subclasses devem implementar o método {@link execute}. Esta classe existe
 * apenas para padronizar o contrato entre use cases e facilitar testes/mocking.
 *
 * @module shared/application/UseCase
 */

export abstract class UseCase<TInput = unknown, TOutput = unknown> {
  /**
   * Executa o caso de uso.
   *
   * @param input - Dados de entrada do caso de uso.
   * @returns Resultado do caso de uso.
   * @throws Error se a subclasse não implementar `execute()`.
   */
  public abstract execute(input: TInput): Promise<TOutput> | TOutput;
}

export default UseCase;

// Compatibilidade com imports CommonJS legados (`require(...)`) usados no projeto.
module.exports = UseCase;
module.exports.UseCase = UseCase;
module.exports.default = UseCase;
