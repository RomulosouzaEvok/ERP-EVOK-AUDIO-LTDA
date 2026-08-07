/**
 * `POST /api/ti/responsibility-terms/:id/lost` — marca `lost` com
 * justificativa obrigatória (UC-50, A2, `ti:approve`).
 *
 * @module modules/ti/application/use-cases/term/MarkTermLostUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ResponsibilityTermRepository from '../../../domain/repositories/ResponsibilityTermRepository';
import AssetLookupService from '../../../application/services/AssetLookupService';
import { NotFoundError, ValidationError } from '../../../../../errors';
import type { MarkTermLostInput } from '../../../domain/entities/TermTypes';
import { toTermDTO } from '../../../infrastructure/mappers/TermMapper';

const { sequelize } = require('../../../../../config/database');

class MarkTermLostUseCase extends UseCase<MarkTermLostInput, any> {
  private readonly repository: ResponsibilityTermRepository;
  private readonly assetLookupService: AssetLookupService;

  public constructor(repository: ResponsibilityTermRepository, assetLookupService: AssetLookupService) {
    super();
    this.repository = repository;
    this.assetLookupService = assetLookupService;
  }

  /**
   * @throws {NotFoundError} Termo não encontrado.
   * @throws {ValidationError} `justification` ausente, ou termo não está `active`.
   */
  public async execute({ id, justification }: MarkTermLostInput): Promise<any> {
    if (!justification || !justification.trim()) throw new ValidationError('justification é obrigatória.');

    const term = await this.repository.findById(id);
    if (!term) throw new NotFoundError(`Termo de responsabilidade ${id} não encontrado.`);
    if (term.status !== 'active') throw new ValidationError('Só é possível marcar como "lost" um termo em status "active".');

    const t = await sequelize.transaction();
    try {
      await this.repository.update(id, { status: 'lost', lost_justification: justification }, t);
      await this.assetLookupService.updateResponsible(term.asset_id, { responsible_id: null }, t);
      await t.commit();

      return toTermDTO(await this.repository.findById(id));
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = MarkTermLostUseCase;
