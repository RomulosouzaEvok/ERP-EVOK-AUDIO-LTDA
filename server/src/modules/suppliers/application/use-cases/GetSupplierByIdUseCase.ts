import type SuppliersRepository = require('../../domain/repositories/SuppliersRepository');

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/**
 * Busca um fornecedor pelo id, cobrindo o fluxo do endpoint
 * `GET /api/suppliers/:id`.
 */
class GetSupplierByIdUseCase extends UseCase {
  private suppliersRepository: SuppliersRepository;

  /**
   * @param {import('../../domain/repositories/SuppliersRepository')} suppliersRepository
   */
  constructor(suppliersRepository: SuppliersRepository) {
    super();
    this.suppliersRepository = suppliersRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @returns {Promise<Object>} Fornecedor encontrado.
   * @throws {NotFoundError} Com mensagem `'Fornecedor não encontrado'` se o id não existir.
   */
  async execute({ id }: { id: number | string }) {
    const supplier = await this.suppliersRepository.findById(Number(id));
    if (!supplier) {
      throw new NotFoundError('Fornecedor não encontrado');
    }
    return supplier;
  }
}

module.exports = GetSupplierByIdUseCase;


