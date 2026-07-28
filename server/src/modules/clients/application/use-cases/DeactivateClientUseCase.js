const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError } = require('../../../../errors');

/**
 * Inativa (soft delete via `status='inactive'`) um cliente, cobrindo o
 * fluxo de `DELETE /api/clients/:id`.
 *
 * Migrado 1:1 do controller legado
 * `server/src/controllers/clientController.js#remove`: bloqueia a
 * inativação caso o cliente possua vendas ativas (status
 * `quote`/`confirmed`/`invoiced`).
 */
class DeactivateClientUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/ClientsRepository')} clientsRepository
   */
  constructor(clientsRepository) {
    super();
    this.clientsRepository = clientsRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @returns {Promise<{ message: string }>}
   * @throws {ValidationError} Com mensagem `'Cliente possui N venda(s) ativa(s). Não é possível inativar.'` se houver vendas ativas.
   * @throws {NotFoundError} Com mensagem `'Cliente não encontrado'` se o id não existir.
   */
  async execute({ id }) {
    const activeSales = await this.clientsRepository.countActiveSales(id);
    if (activeSales > 0) {
      throw new ValidationError(`Cliente possui ${activeSales} venda(s) ativa(s). Não é possível inativar.`);
    }

    const updated = await this.clientsRepository.update(id, { status: 'inactive' });
    if (!updated) {
      throw new NotFoundError('Cliente não encontrado');
    }

    return { message: 'Cliente inativado com sucesso' };
  }
}

module.exports = DeactivateClientUseCase;
