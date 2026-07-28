const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/**
 * Busca um fornecedor pelo id, cobrindo o fluxo do endpoint
 * `GET /api/suppliers/:id`.
 */
class GetSupplierByIdUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/SuppliersRepository')} suppliersRepository
   */
  constructor(suppliersRepository) {
    super();
    this.suppliersRepository = suppliersRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @returns {Promise<Object>} Fornecedor encontrado.
   * @throws {NotFoundError} Com mensagem `'Fornecedor não encontrado'` se o id não existir.
   */
  async execute({ id }) {
    const supplier = await this.suppliersRepository.findById(id);
    if (!supplier) {
      throw new NotFoundError('Fornecedor não encontrado');
    }
    return supplier;
  }
}

module.exports = GetSupplierByIdUseCase;
