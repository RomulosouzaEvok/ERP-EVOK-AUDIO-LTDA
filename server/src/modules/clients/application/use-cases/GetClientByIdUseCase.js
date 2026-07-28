const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/**
 * Busca um cliente pelo id, cobrindo o fluxo do endpoint
 * `GET /api/clients/:id`.
 */
class GetClientByIdUseCase extends UseCase {
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
   * @returns {Promise<Object>} Cliente encontrado.
   * @throws {NotFoundError} Com mensagem `'Cliente não encontrado'` se o id não existir.
   */
  async execute({ id }) {
    const client = await this.clientsRepository.findById(id);
    if (!client) {
      throw new NotFoundError('Cliente não encontrado');
    }
    return client;
  }
}

module.exports = GetClientByIdUseCase;
