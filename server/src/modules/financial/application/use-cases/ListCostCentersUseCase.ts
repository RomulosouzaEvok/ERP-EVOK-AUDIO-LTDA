import type { ICostCenterRepository } from '../../domain/repositories/CostCenterRepository';

const UseCase = require('../../../../shared/application/UseCase');

/**
 * Lista centros de custo com filtro de `active` e paginação, cobrindo o
 * fluxo do endpoint `GET /api/finance/cost-centers`.
 */
class ListCostCentersUseCase extends UseCase {
  costCenterRepository: ICostCenterRepository;

  /**
   * @param {import('../../domain/repositories/CostCenterRepository')} costCenterRepository
   */
  constructor(costCenterRepository: ICostCenterRepository) {
    super();
    this.costCenterRepository = costCenterRepository;
  }

  /**
   * @param {Object} input
   * @param {boolean} [input.active]
   * @param {number} [input.page]
   * @param {number} [input.limit]
   * @param {number} [input.offset]
   * @returns {Promise<{ rows: Object[], count: number, page: number, limit: number, totalPages: number }>}
   */
  async execute({ active, page = 1, limit = 20, offset = 0 }: { active?: boolean; page?: number; limit?: number; offset?: number } = {}) {
    const { rows, count } = await this.costCenterRepository.listCostCenters({ active }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

module.exports = ListCostCentersUseCase;
