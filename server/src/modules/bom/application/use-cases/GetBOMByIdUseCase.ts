const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/**
 * Busca uma BOM por id com produto e itens, cobrindo
 * `GET /api/engineering/bom/:id`.
 */
class GetBOMByIdUseCase extends UseCase {
  /** @param {import('../../domain/repositories/BOMRepository')} bomRepository */
  constructor(bomRepository) {
    super();
    this.bomRepository = bomRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da BOM.
   * @returns {Promise<Object>} BOM encontrada.
   * @throws {NotFoundError} Se a BOM não existir.
   */
  async execute({ id }) {
    const bom = await this.bomRepository.findById(id);
    if (!bom) {
      throw new NotFoundError('Estrutura de produto (BOM) não encontrada');
    }
    return bom;
  }
}

module.exports = GetBOMByIdUseCase;


