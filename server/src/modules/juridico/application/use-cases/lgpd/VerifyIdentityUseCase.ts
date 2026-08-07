/**
 * `POST /api/jur/lgpd/data-subject-requests/:id/verify-identity` —
 * verifica identidade e avança `verifying → in_progress` (RF-JUR-039).
 * `identity_verified: false` não avança de estado — a rota rejeita
 * explicitamente `verifying → in_progress` sem `identity_verified=true`
 * (E1/BR-JUR-041), refletindo o `CHECK` de banco
 * `ck_jur_lgpd_dsr_in_progress_requires_verification`.
 *
 * @module modules/juridico/application/use-cases/lgpd/VerifyIdentityUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdRequestRepository from '../../../domain/repositories/LgpdRequestRepository';
import { NotFoundError, ValidationError } from '../../../../../errors';
import type { VerifyIdentityInput } from '../../../domain/entities/LgpdTypes';

class VerifyIdentityUseCase extends UseCase<VerifyIdentityInput, any> {
  private readonly repository: LgpdRequestRepository;

  public constructor(repository: LgpdRequestRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Solicitação não encontrada (404).
   * @throws {ValidationError} `identity_verified` não é `true` (400, E1/BR-JUR-041).
   */
  public async execute(input: VerifyIdentityInput): Promise<any> {
    const request = await this.repository.findById(input.id);
    if (!request) throw new NotFoundError(`Solicitação ${input.id} não encontrada.`);

    if (input.identity_verified !== true) {
      throw new ValidationError(
        'Identidade não confirmada — a solicitação permanece em verifying, não avança para in_progress sem identity_verified=true.',
        { field: 'identity_verified', rule: 'BR-JUR-041' },
      );
    }

    return this.repository.update(input.id, {
      status: 'in_progress',
      identity_verified: true,
      identity_verified_by: input.verifiedBy,
      identity_verified_at: new Date(),
    });
  }
}

export = VerifyIdentityUseCase;
