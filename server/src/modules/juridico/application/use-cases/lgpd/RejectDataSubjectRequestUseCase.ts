/**
 * `POST /api/jur/lgpd/data-subject-requests/:id/reject` — recusa com
 * justificativa obrigatória (nível `approve`, RF-JUR-037, E3/BR-JUR-041).
 *
 * @module modules/juridico/application/use-cases/lgpd/RejectDataSubjectRequestUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdRequestRepository from '../../../domain/repositories/LgpdRequestRepository';
import { ValidationError, NotFoundError } from '../../../../../errors';
import type { RejectDataSubjectRequestInput } from '../../../domain/entities/LgpdTypes';

class RejectDataSubjectRequestUseCase extends UseCase<RejectDataSubjectRequestInput, any> {
  private readonly repository: LgpdRequestRepository;

  public constructor(repository: LgpdRequestRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `rejection_justification` ausente (400, E3/BR-JUR-041).
   * @throws {NotFoundError} Solicitação não encontrada (404).
   */
  public async execute(input: RejectDataSubjectRequestInput): Promise<any> {
    if (!input.rejection_justification) throw new ValidationError('rejection_justification é obrigatório.');

    const request = await this.repository.findById(input.id);
    if (!request) throw new NotFoundError(`Solicitação ${input.id} não encontrada.`);

    return this.repository.update(input.id, {
      status: 'rejected_justified',
      rejection_justification: input.rejection_justification,
    });
  }
}

export = RejectDataSubjectRequestUseCase;
