import UseCase from '../../../../shared/application/UseCase';
import InventoryCountRepository = require('../../domain/repositories/InventoryCountRepository');

/**
 * Lista contagens de inventário cíclico com filtros e paginação, cobrindo
 * `GET /api/inventory-counts`.
 *
 * Filtros de atribuição (app mobile — tela "Contagens disponíveis para
 * mim"):
 * - `assigned_to`: contagens atribuídas a um funcionário específico (o
 *   controller resolve o atalho `assigned_to=me` para o id do usuário
 *   autenticado antes de chamar este use case).
 * - `unassigned`: quando `true`, lista apenas contagens do "pool"
 *   (`assigned_to IS NULL`) — tipicamente combinado com `status=draft`
 *   pelo chamador para montar a lista de contagens disponíveis para pegar.
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
   * @param {number|string} [input.assigned_to] - Filtra por funcionário atribuído (já resolvido pelo controller, inclusive o atalho `me`).
   * @param {boolean|string} [input.unassigned] - Quando truthy, filtra apenas contagens do pool (`assigned_to IS NULL`). Tem prioridade sobre `assigned_to`.
   * @param {number|string} [input.page=1]
   * @param {number|string} [input.limit=10]
   * @returns {Promise<{ rows: Object[], count: number, page: number, limit: number, totalPages: number }>}
   */
  async execute({ status, count_type, assigned_to, unassigned, page = 1, limit = 10 }: any = {}) {
    const p = parseInt(String(page), 10) || 1;
    const l = parseInt(String(limit), 10) || 10;
    const offset = (p - 1) * l;

    const filters: Record<string, unknown> = { status, count_type };
    const isUnassigned = unassigned === true || unassigned === 'true';
    if (isUnassigned) {
      filters.unassigned = true;
    } else if (assigned_to !== undefined && assigned_to !== null && assigned_to !== '') {
      const parsedAssignedTo = parseInt(String(assigned_to), 10);
      if (!Number.isNaN(parsedAssignedTo)) {
        filters.assigned_to = parsedAssignedTo;
      }
    }

    const { rows, count } = await this.inventoryCountRepository.list(filters, { limit: l, offset });

    return { rows, count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListInventoryCountsUseCase;




