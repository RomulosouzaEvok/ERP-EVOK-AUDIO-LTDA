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
    const items = await this.bomRepository.listItems(id);

    // `unit_cost` persistido e um snapshot; expoe o custo ATUAL do
    // componente ao lado (ja carregado via include, sem query extra) —
    // mesma correcao de `GetBOMByIdUseCase` para o achado de auditoria de
    // custo de BOM desatualizado.
    for (const item of items) {
      const currentUnitCost = item.componentProduct ? parseFloat(item.componentProduct.cost_price || 0) : 0;
      if (item.setDataValue) {
        item.setDataValue('current_unit_cost', currentUnitCost);
      } else {
        item.current_unit_cost = currentUnitCost;
      }
    }

    return items;
  }
}

module.exports = ListBOMItemsUseCase;


