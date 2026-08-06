import type { IFinancialRepository } from '../../domain/repositories/FinancialRepository';
import type { ICostCenterRepository } from '../../domain/repositories/CostCenterRepository';

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/**
 * Atribui (ou remove, com `cost_center_id: null`) o centro de custo de uma
 * conta a receber já existente, cobrindo o fluxo do endpoint
 * `PUT /api/finance/receivable/:id/cost-center`.
 */
class UpdateReceivableCostCenterUseCase extends UseCase {
  financialRepository: IFinancialRepository;
  costCenterRepository: ICostCenterRepository;

  /**
   * @param {import('../../domain/repositories/FinancialRepository')} financialRepository
   * @param {import('../../domain/repositories/CostCenterRepository')} costCenterRepository
   */
  constructor(financialRepository: IFinancialRepository, costCenterRepository: ICostCenterRepository) {
    super();
    this.financialRepository = financialRepository;
    this.costCenterRepository = costCenterRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da conta a receber.
   * @param {number|null} input.cost_center_id
   * @returns {Promise<Object>} Conta a receber atualizada.
   * @throws {NotFoundError} Se a conta a receber ou o centro de custo informado não existirem.
   */
  async execute({ id, cost_center_id }: { id: number | string; cost_center_id: number | null }) {
    const receivable = await this.financialRepository.findReceivableById(id);
    if (!receivable) {
      throw new NotFoundError('Conta a receber não encontrada.');
    }

    if (cost_center_id !== null) {
      const costCenter = await this.costCenterRepository.findCostCenterById(cost_center_id);
      if (!costCenter) {
        throw new NotFoundError('Centro de custo não encontrado.');
      }
    }

    return this.financialRepository.updateReceivableCostCenter(id, cost_center_id);
  }
}

module.exports = UpdateReceivableCostCenterUseCase;
