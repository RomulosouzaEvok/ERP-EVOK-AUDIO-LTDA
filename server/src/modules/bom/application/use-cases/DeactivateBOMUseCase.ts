const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');

/**
 * Inativa (soft delete) uma BOM, cobrindo `DELETE /api/engineering/bom/:id`.
 * Apenas BOMs em status `draft` ou `active` podem ser inativadas (mesma
 * regra do controller anterior).
 */
class DeactivateBOMUseCase extends UseCase {
  /** @param {import('../../domain/repositories/BOMRepository')} bomRepository */
  constructor(bomRepository) {
    super();
    this.bomRepository = bomRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da BOM a inativar.
   * @returns {Promise<Object>} BOM (estado anterior, com `status` original) que foi inativada.
   * @throws {NotFoundError} Se a BOM não existir.
   * @throws {BusinessRuleError} Se a BOM estiver em status que não permite inativação.
   */
  async execute({ id }) {
    const bom = await this.bomRepository.findRawById(id);
    if (!bom) {
      throw new NotFoundError('BOM não encontrada');
    }

    if (!['draft', 'active'].includes(bom.status)) {
      throw new BusinessRuleError(`BOM em status "${bom.status}" não pode ser inativada. Apenas BOMs 'draft' ou 'active'`);
    }

    await this.bomRepository.update(id, { status: 'inactive' });

    return bom;
  }
}

module.exports = DeactivateBOMUseCase;


