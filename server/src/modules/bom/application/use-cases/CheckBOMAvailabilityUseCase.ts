const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError } = require('../../../../errors');
const BomService = require('../../../../services/bomService');

/**
 * Verifica disponibilidade de estoque para produzir uma quantidade,
 * cobrindo `GET /api/engineering/bom/:id/availability?qty=`.
 *
 * Wrapper fino sobre `BomService.checkAvailability`.
 */
class CheckBOMAvailabilityUseCase extends UseCase {
  /** @param {import('../../domain/repositories/BOMRepository')} bomRepository */
  constructor(bomRepository) {
    super();
    this.bomRepository = bomRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da BOM (usado para descobrir o `product_id`).
   * @param {number} input.qty - Quantidade desejada (deve ser > 0).
   * @returns {Promise<Object>} Status de disponibilidade.
   * @throws {ValidationError} Se `qty` estiver ausente ou <= 0.
   * @throws {NotFoundError} Se a BOM não existir.
   */
  async execute({ id, qty }) {
    const parsedQty = parseFloat(String(qty));
    if (!qty || !Number.isFinite(parsedQty) || parsedQty <= 0) {
      throw new ValidationError('Parâmetro "qty" (quantidade) é obrigatório');
    }

    const bom = await this.bomRepository.findRawById(id);
    if (!bom) {
      throw new NotFoundError('BOM não encontrada');
    }

    return BomService.checkAvailability(bom.product_id, parsedQty);
  }
}

module.exports = CheckBOMAvailabilityUseCase;


