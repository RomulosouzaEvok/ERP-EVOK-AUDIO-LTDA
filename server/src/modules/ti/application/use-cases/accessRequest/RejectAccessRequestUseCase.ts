/**
 * `POST /api/ti/access-requests/:id/reject` — rejeita `grant`/`change` com
 * motivo (UC-51, A3). Mesma elegibilidade de `ApproveAccessRequestUseCase`.
 *
 * @module modules/ti/application/use-cases/accessRequest/RejectAccessRequestUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AccessRequestRepository from '../../../domain/repositories/AccessRequestRepository';
import { NotFoundError, ValidationError, ForbiddenError } from '../../../../../errors';
import type { RejectAccessRequestInput } from '../../../domain/entities/AccessRequestTypes';
import { toAccessRequestDTO } from '../../../infrastructure/mappers/AccessRequestMapper';
import { isEligibleApprover } from '../../../domain/services/approverEligibilityService';

class RejectAccessRequestUseCase extends UseCase<RejectAccessRequestInput, any> {
  private readonly repository: AccessRequestRepository;

  public constructor(repository: AccessRequestRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Solicitação não encontrada.
   * @throws {ValidationError} `rejection_reason` ausente, ou solicitação não está `pending`.
   * @throws {ForbiddenError} Aprovador não elegível.
   */
  public async execute({ id, rejection_reason, approverUserId, approverRole, approverHasTiApprove }: RejectAccessRequestInput): Promise<any> {
    if (!rejection_reason) throw new ValidationError('rejection_reason é obrigatório.');

    const request = await this.repository.findById(id);
    if (!request) throw new NotFoundError(`Solicitação de acesso ${id} não encontrada.`);
    if (request.status !== 'pending') throw new ValidationError(`Solicitação já está em status "${request.status}" — não pode ser rejeitada.`);

    const eligible = await isEligibleApprover({ approverUserId, approverRole, approverHasTiApprove, departmentId: request.department_id });
    if (!eligible) throw new ForbiddenError('Você não tem permissão para rejeitar esta solicitação.');

    await this.repository.update(id, { status: 'rejected', rejection_reason, approved_by: approverUserId, approved_at: new Date() });
    return toAccessRequestDTO(await this.repository.findById(id));
  }
}

export = RejectAccessRequestUseCase;
