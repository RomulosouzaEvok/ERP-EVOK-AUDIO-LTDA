/**
 * Classe base abstrata para casos de uso da camada de aplicação.
 *
 * Subclasses devem implementar o método {@link UseCase#execute}. Esta
 * classe existe apenas para padronizar o contrato entre use cases e
 * facilitar testes/mocking; ela não possui lógica própria.
 */
class UseCase {
  /**
   * Executa o caso de uso. Deve ser sobrescrito pela subclasse.
   *
   * @abstract
   * @param {*} [input] - Dados de entrada do caso de uso (formato definido pela subclasse).
   * @returns {Promise<*>} Resultado do caso de uso (formato definido pela subclasse).
   * @throws {Error} Se a subclasse não implementar `execute()`.
   */
  async execute(input) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name} deve implementar o método execute().`);
  }
}

module.exports = UseCase;
