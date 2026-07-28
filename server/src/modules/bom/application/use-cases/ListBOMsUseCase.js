const UseCase = require('../../../../shared/application/UseCase');

/**
 * Lista BOMs com paginação e filtros, cobrindo `GET /api/engineering/bom`.
 * Wrapper fino sobre `SequelizeBOMRepository.list` — nenhuma regra de
 * negócio, apenas cálculo de paginação (mesmo comportamento do
 * `bomController.list` legado).
 */
class ListBOMsUseCase extends UseCase {
  /** @param {import('../../domain/repositories/BOMRepository')} bomRepository */
  constructor(bomRepository) {
    super();
    this.bomRepository = bomRepository;
  }

  /**
   * @param {Object} input
   * @param {number} [input.page=1]
   * @param {number} [input.limit=10]
   * @param {string} [input.status]
   * @param {string} [input.search]
   * @param {number} [input.product_id]
   * @returns {Promise<{ rows: Object[], count: number, page: number, limit: number, totalPages: number }>}
   */
  async execute({ page = 1, limit = 10, status, search, product_id } = {}) {
    const p = parseInt(page);
    const l = parseInt(limit);
    const offset = (p - 1) * l;

    const { count, rows } = await this.bomRepository.list({ status, product_id, search, limit: l, offset });

    return { rows, count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

module.exports = ListBOMsUseCase;
