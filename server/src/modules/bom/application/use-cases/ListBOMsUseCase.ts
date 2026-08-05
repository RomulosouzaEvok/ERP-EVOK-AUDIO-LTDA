const UseCase = require('../../../../shared/application/UseCase');
import type { IBOMRepository } from '../../domain/repositories/BOMRepository';

/**
 * Lista BOMs com paginação e filtros, cobrindo `GET /api/engineering/bom`.
 * Wrapper fino sobre `SequelizeBOMRepository.list` — nenhuma regra de
 * negócio, apenas cálculo de paginação (mesmo comportamento do
 * `bomController.list` anterior).
 */
class ListBOMsUseCase extends UseCase {
  private bomRepository: IBOMRepository;

  /** @param {IBOMRepository} bomRepository */
  constructor(bomRepository: IBOMRepository) {
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
  async execute({ page = 1, limit = 10, status, search, product_id }: any = {}) {
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const offset = (p - 1) * l;

    const { count, rows } = await this.bomRepository.list({ status, product_id, search, limit: l, offset });

    return { rows, count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

module.exports = ListBOMsUseCase;




