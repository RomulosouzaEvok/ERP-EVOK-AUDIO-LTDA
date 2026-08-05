const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError } = require('../../../../errors');
const BomService = require('../../../../services/bomService');
import type { IBOMRepository } from '../../domain/repositories/BOMRepository';

/**
 * Calcula o custo do produto baseado na BOM ativa, cobrindo
 * `GET /api/engineering/bom/:id/cost?qty=`.
 *
 * Wrapper fino sobre `BomService.calculateCost`.
 */
class CalculateBOMCostUseCase extends UseCase {
  private bomRepository: IBOMRepository;

  /** @param {IBOMRepository} bomRepository */
  constructor(bomRepository: IBOMRepository) {
    super();
    this.bomRepository = bomRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da BOM (usado para descobrir o `product_id`).
   * @param {number} [input.qty=1] - Quantidade para calcular.
   * @returns {Promise<Object>} Detalhamento de custos.
   * @throws {ValidationError} Se `qty` for <= 0.
   * @throws {NotFoundError} Se a BOM não existir.
   */
  async execute({ id, qty }: { id: number; qty?: number | string }) {
    const quantity = qty === undefined ? 1 : parseFloat(String(qty));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ValidationError('Quantidade deve ser maior que zero');
    }

    const bom = await this.bomRepository.findRawById(id);
    if (!bom) {
      throw new NotFoundError('BOM não encontrada');
    }

    return BomService.calculateCost(bom.product_id, quantity);
  }
}

module.exports = CalculateBOMCostUseCase;


