import type { ICostCenterRepository } from '../../domain/repositories/CostCenterRepository';

const UseCase = require('../../../../shared/application/UseCase');
const { ConflictError } = require('../../../../errors');

type CreateCostCenterInput = {
  code: string;
  name: string;
  description?: string | null;
};

/**
 * Cria um centro de custo, cobrindo o fluxo do endpoint
 * `POST /api/finance/cost-centers`.
 *
 * O `code` é normalizado para uppercase/trim antes da checagem de
 * unicidade e da persistência (mesmo padrão de
 * `modules/workCenters/application/use-cases/CreateWorkCenterUseCase`).
 */
class CreateCostCenterUseCase extends UseCase {
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
   * @param {string} input.code
   * @param {string} input.name
   * @param {string} [input.description]
   * @returns {Promise<Object>} Centro de custo criado.
   * @throws {ConflictError} Se já existir um centro de custo com o mesmo `code`.
   */
  async execute({ code, name, description }: CreateCostCenterInput) {
    const normalizedCode = code.trim().toUpperCase();

    const existing = await this.costCenterRepository.findCostCenterByCode(normalizedCode);
    if (existing) {
      throw new ConflictError(`Já existe um centro de custo com o código ${normalizedCode}.`);
    }

    return this.costCenterRepository.createCostCenter({
      code: normalizedCode,
      name,
      description: description ?? null,
    });
  }
}

module.exports = CreateCostCenterUseCase;
