/**
 * `POST /api/jur/lgpd/data-subject-requests/:id/resolve` — registra
 * desfecho (RF-JUR-037).
 *
 * @module modules/juridico/application/use-cases/lgpd/ResolveDataSubjectRequestUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdRequestRepository from '../../../domain/repositories/LgpdRequestRepository';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../../../../errors';
import type { ResolveDataSubjectRequestInput } from '../../../domain/entities/LgpdTypes';

class ResolveDataSubjectRequestUseCase extends UseCase<ResolveDataSubjectRequestInput, any> {
  private readonly repository: LgpdRequestRepository;

  public constructor(repository: LgpdRequestRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `resolution_notes` ausente (400).
   * @throws {NotFoundError} Solicitação não encontrada (404).
   */
  public async execute(input: ResolveDataSubjectRequestInput): Promise<any> {
    if (!input.resolution_notes) throw new ValidationError('resolution_notes é obrigatório.');

    const request = await this.repository.findById(input.id);
    if (!request) throw new NotFoundError(`Solicitação ${input.id} não encontrada.`);

    if (!request.identity_verified) {
      throw new BusinessRuleError(
        'Não é possível resolver a solicitação sem identidade verificada (CHECK ck_jur_lgpd_dsr_in_progress_requires_verification).',
        { field: 'identity_verified', rule: 'BR-JUR-041' },
      );
    }

    return this.repository.update(input.id, {
      status: 'answered',
      resolution_notes: input.resolution_notes,
      answered_at: input.answered_at ? new Date(input.answered_at) : new Date(),
    });
  }
}

export = ResolveDataSubjectRequestUseCase;
