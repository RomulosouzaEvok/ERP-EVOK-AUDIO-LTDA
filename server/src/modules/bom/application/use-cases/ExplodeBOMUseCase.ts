const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError } = require('../../../../errors');
const BomService = require('../../../../services/bomService');
import type { IBOMRepository } from '../../domain/repositories/BOMRepository';

/**
 * Explode a BOM para uma quantidade específica, retornando todos os
 * componentes necessários em todos os níveis. Cobre
 * `GET /api/engineering/bom/:id/explode?qty=`.
 *
 * Wrapper fino sobre `BomService.explodeBOM` — toda a lógica de recursão,
 * controle de profundidade máxima (`MAX_BOM_DEPTH`) e cálculo de
 * quantidades/custos permanece no service.
 */
class ExplodeBOMUseCase extends UseCase {
  private bomRepository: IBOMRepository;

  /** @param {IBOMRepository} bomRepository */
  constructor(bomRepository: IBOMRepository) {
    super();
    this.bomRepository = bomRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da BOM (usado apenas para descobrir o `product_id`).
   * @param {number} input.qty - Quantidade a produzir (deve ser > 0).
   * @returns {Promise<Object>} BOM explodida.
   * @throws {ValidationError} Se `qty` estiver ausente ou <= 0.
   * @throws {NotFoundError} Se a BOM não existir.
   */
  async execute({ id, qty }: { id: number; qty?: number | string }) {
    const parsedQty = parseFloat(String(qty));
    if (!qty || !Number.isFinite(parsedQty) || parsedQty <= 0) {
      throw new ValidationError('Parâmetro "qty" (quantidade) é obrigatório e deve ser > 0');
    }

    const bom = await this.bomRepository.findRawById(id);
    if (!bom) {
      throw new NotFoundError('BOM não encontrada');
    }

    return BomService.explodeBOM(bom.product_id, parsedQty);
  }
}

module.exports = ExplodeBOMUseCase;


