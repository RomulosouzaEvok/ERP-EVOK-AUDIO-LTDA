import type { ICostCenterRepository } from '../../domain/repositories/CostCenterRepository';

const UseCase = require('../../../../shared/application/UseCase');
const { ConflictError, NotFoundError } = require('../../../../errors');

type UpdateCostCenterInput = {
  id: number;
  code?: string;
  name?: string;
  description?: string | null;
  active?: boolean;
};

/**
 * Atualiza um centro de custo existente, incluindo a desativação lógica via
 * `active: false` (sem delete físico — cobre o fluxo de
 * `PUT /api/finance/cost-centers/:id`).
 *
 * Se `code` for informado, é normalizado (uppercase/trim) e revalidado
 * quanto à unicidade (ignorando o próprio registro).
 */
class UpdateCostCenterUseCase extends UseCase {
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
   * @param {number} input.id
   * @param {string} [input.code]
   * @param {string} [input.name]
   * @param {string} [input.description]
   * @param {boolean} [input.active]
   * @returns {Promise<Object>} Centro de custo atualizado.
   * @throws {NotFoundError} Se o centro de custo não existir.
   * @throws {ConflictError} Se `code` colidir com outro centro de custo.
   */
  async execute({ id, ...rest }: UpdateCostCenterInput) {
    const current = await this.costCenterRepository.findCostCenterById(id);
    if (!current) {
      throw new NotFoundError('Centro de custo não encontrado.');
    }

    const updateData: Record<string, unknown> = { ...rest };

    if (typeof rest.code === 'string') {
      const normalizedCode = rest.code.trim().toUpperCase();
      const existing = await this.costCenterRepository.findCostCenterByCode(normalizedCode);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Já existe um centro de custo com o código ${normalizedCode}.`);
      }
      updateData.code = normalizedCode;
    }

    return this.costCenterRepository.updateCostCenter(id, updateData);
  }
}

module.exports = UpdateCostCenterUseCase;
