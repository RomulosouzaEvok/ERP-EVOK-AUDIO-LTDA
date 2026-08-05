const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');
import type { IBOMRepository } from '../../domain/repositories/BOMRepository';

/**
 * Busca uma BOM por id com produto e itens, cobrindo
 * `GET /api/engineering/bom/:id`.
 */
class GetBOMByIdUseCase extends UseCase {
  private bomRepository: IBOMRepository;

  /** @param {IBOMRepository} bomRepository */
  constructor(bomRepository: IBOMRepository) {
    super();
    this.bomRepository = bomRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da BOM.
   * @returns {Promise<Object>} BOM encontrada.
   * @throws {NotFoundError} Se a BOM não existir.
   */
  async execute({ id }: { id: number }) {
    const bom = await this.bomRepository.findById(id);
    if (!bom) {
      throw new NotFoundError('Estrutura de produto (BOM) não encontrada');
    }

    // `unit_cost`/`total_cost` persistidos sao um SNAPSHOT do momento da
    // criacao/aprovacao da BOM — ficam desatualizados quando o
    // `cost_price` do componente muda depois (compra, custeio medio
    // ponderado). Como `componentProduct.cost_price` ja vem carregado
    // junto (sem query extra), expomos o custo ATUAL ao lado do
    // persistido e um flag explicito, em vez de deixar o consumidor da
    // API achar que o numero cacheado ainda reflete o preco de hoje.
    let currentTotalCost = 0;
    if (Array.isArray(bom.items)) {
      for (const item of bom.items) {
        const currentUnitCost = item.componentProduct ? parseFloat(item.componentProduct.cost_price || 0) : 0;
        const currentItemCost = currentUnitCost * parseFloat(item.quantity || 0);
        item.setDataValue ? item.setDataValue('current_unit_cost', currentUnitCost) : (item.current_unit_cost = currentUnitCost);
        currentTotalCost += currentItemCost;
      }
    }
    const persistedTotalCost = parseFloat(bom.total_cost || 0);
    bom.setDataValue ? bom.setDataValue('current_total_cost', currentTotalCost) : (bom.current_total_cost = currentTotalCost);
    const isCostStale = Math.abs(currentTotalCost - persistedTotalCost) > 0.005;
    bom.setDataValue ? bom.setDataValue('cost_is_stale', isCostStale) : (bom.cost_is_stale = isCostStale);

    return bom;
  }
}

module.exports = GetBOMByIdUseCase;


