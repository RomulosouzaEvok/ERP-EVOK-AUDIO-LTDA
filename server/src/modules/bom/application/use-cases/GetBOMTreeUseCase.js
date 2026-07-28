const UseCase = require('../../../../shared/application/UseCase');
const BomService = require('../../../../services/bomService');

/**
 * Retorna a árvore hierárquica completa da BOM para visualização, cobrindo
 * `GET /api/engineering/bom/:id/tree`.
 *
 * Wrapper fino sobre `BomService.getBOMTree` (que já lança um `Error` com
 * `statusCode: 404` quando a BOM não existe).
 */
class GetBOMTreeUseCase extends UseCase {
  /**
   * @param {Object} input
   * @param {number} input.id - Id da BOM.
   * @returns {Promise<{ bom: Object, tree: Object[] }>} Árvore estruturada.
   * @throws {Error} Com `statusCode: 404` se a BOM não existir (propagado por `BomService.getBOMTree`).
   */
  async execute({ id }) {
    return BomService.getBOMTree(id);
  }
}

module.exports = GetBOMTreeUseCase;
