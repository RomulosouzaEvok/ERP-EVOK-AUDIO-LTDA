import UseCase from '../../../../shared/application/UseCase';
import InventoryCountRepository = require('../../domain/repositories/InventoryCountRepository');

/**
 * Lista contagens de inventário cíclico com filtros e paginação, cobrindo
 * `GET /api/inventory-counts`.
 */
class ListInventoryCountsUseCase extends UseCase {
  private readonly inventoryCountRepository: InventoryCountRepository;

  /** @param inventoryCountRepository - Repositório de contagens de inventário. */
  constructor(inventoryCountRepository: InventoryCountRepository) {
    super();
    this.inventoryCountRepository = inventoryCountRepository;
  }

  /**
   * @param {Object} input
   * @param {string} [input.status]
   * @param {string} [input.count_type]
   * @param {number|string} [input.page=1]
   * @param {number|string} [input.limit=10]
   * @returns {Promise<{ rows: Object[], count: number, page: number, limit: number, totalPages: number }>}
   */
  async execute({ status, count_type, page = 1, limit = 10 }: any = {}) {
    const p = parseInt(String(page), 10) || 1;
    const l = parseInt(String(limit), 10) || 10;
    const offset = (p - 1) * l;

    const { rows, count } = await this.inventoryCountRepository.list({ status, count_type }, { limit: l, offset });

    return { rows, count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListInventoryCountsUseCase;




