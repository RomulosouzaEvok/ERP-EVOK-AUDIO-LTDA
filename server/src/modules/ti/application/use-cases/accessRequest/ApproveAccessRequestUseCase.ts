/**
 * `POST /api/ti/access-requests/:id/approve` — aprova `grant`/`change`
 * (UC-51, RF-TI-034). Elegibilidade (§4.1 da API): `ti:approve` OU gestor
 * do `department_id` via `departments.manager_id → employees.user_id`.
 *
 * @module modules/ti/application/use-cases/accessRequest/ApproveAccessRequestUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AccessRequestRepository from '../../../domain/repositories/AccessRequestRepository';
import { NotFoundError, ValidationError, ForbiddenError } from '../../../../../errors';
import type { ApproveAccessRequestInput } from '../../../domain/entities/AccessRequestTypes';
import { toAccessRequestDTO } from '../../../infrastructure/mappers/AccessRequestMapper';
import { isEligibleApprover } from '../../../domain/services/approverEligibilityService';
import {
  SEGREGATION_RULES,
  assertApproverIsNotRequester,
} from '../../../../../shared/domain/segregationOfDuties';

class ApproveAccessRequestUseCase extends UseCase<ApproveAccessRequestInput, any> {
  private readonly repository: AccessRequestRepository;

  public constructor(repository: AccessRequestRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Solicitação não encontrada.
   * @throws {ValidationError} Solicitação não está `pending`, ou é `type=revoke`.
   * @throws {ForbiddenError} Usuário não é `ti:approve` nem gestor do departamento (§4.1).
   */
  public async execute({ id, approverUserId, approverRole, approverHasTiApprove }: ApproveAccessRequestInput): Promise<any> {
    const request = await this.repository.findById(id);
    if (!request) throw new NotFoundError(`Solicitação de acesso ${id} não encontrada.`);
    if (request.status !== 'pending') throw new ValidationError(`Solicitação já está em status "${request.status}" — não pode ser aprovada novamente.`);
    if (request.type === 'revoke') throw new ValidationError('Solicitações do tipo "revoke" não passam por aprovação — vá direto para execução.');

    const eligible = await isEligibleApprover({ approverUserId, approverRole, approverHasTiApprove, departmentId: request.department_id });
    if (!eligible) {
      throw new ForbiddenError('Você não tem permissão para aprovar esta solicitação — apenas o módulo ti:approve ou o gestor do departamento podem fazê-lo.');
    }

    assertApproverIsNotRequester({
      rule: SEGREGATION_RULES.TI_ACCESS_REQUEST_APPROVE,
      requesterUserId: request.requested_by,
      approverUserId,
      documentLabel: `a solicitacao de acesso #${id}`,
      approverHint: "outro usuario com nivel 'approve' no modulo de TI ou o gestor do departamento",
    });

    await this.repository.update(id, { status: 'approved', approved_by: approverUserId, approved_at: new Date() });
    return toAccessRequestDTO(await this.repository.findById(id));
  }
}

export = ApproveAccessRequestUseCase;
