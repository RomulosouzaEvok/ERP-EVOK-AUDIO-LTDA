const UseCase = require('../../../../shared/application/UseCase');

/**
 * Lista todos os itens de uma BOM específica, cobrindo
 * `GET /api/engineering/bom/:id/items`.
 */
class ListBOMItemsUseCase extends UseCase {
  /** @param {import('../../domain/repositories/BOMRepository')} bomRepository */
  constructor(bomRepository) {
    super();
    this.bomRepository = bomRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da BOM.
   * @returns {Promise<Object[]>} Lista de itens da BOM.
   */
  async execute({ id }) {
    return this.bomRepository.listItems(id);
  }
}

module.exports = ListBOMItemsUseCase;


