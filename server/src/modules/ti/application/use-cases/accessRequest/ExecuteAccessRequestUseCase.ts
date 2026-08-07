/**
 * `POST /api/ti/access-requests/:id/execute` — executa `grant`/`change`/
 * `revoke` (UC-51, RF-TI-036). Delega 100% da execução RBAC real a
 * `AccessProfileExecutionService` — nunca duplica `AuditLog`
 * (BR-TI-013). `revoke` é bloqueado por termo `active` sem tratamento
 * (E1/RF-TI-037/BR-TI-011) — checagem síncrona, within-transaction lógica
 * (mesmo request), conforme diagrama de sequência §6 da API.
 *
 * @module modules/ti/application/use-cases/accessRequest/ExecuteAccessRequestUseCase
 */

import type { Request } from 'express';
import UseCase from '../../../../../shared/application/UseCase';
import AccessRequestRepository from '../../../domain/repositories/AccessRequestRepository';
import AccessProfileExecutionService from '../../../application/services/AccessProfileExecutionService';
import CheckOffboardingBlockersUseCase from './CheckOffboardingBlockersUseCase';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import { toAccessRequestDTO } from '../../../infrastructure/mappers/AccessRequestMapper';

interface Input {
  id: number;
  executedBy: number;
  req: Request;
}

class ExecuteAccessRequestUseCase extends UseCase<Input, any> {
  private readonly repository: AccessRequestRepository;
  private readonly accessProfileExecutionService: AccessProfileExecutionService;
  private readonly checkOffboardingBlockersUseCase: CheckOffboardingBlockersUseCase;

  public constructor(
    repository: AccessRequestRepository,
    accessProfileExecutionService: AccessProfileExecutionService,
    checkOffboardingBlockersUseCase: CheckOffboardingBlockersUseCase,
  ) {
    super();
    this.repository = repository;
    this.accessProfileExecutionService = accessProfileExecutionService;
    this.checkOffboardingBlockersUseCase = checkOffboardingBlockersUseCase;
  }

  /**
   * @throws {NotFoundError} Solicitação não encontrada.
   * @throws {ValidationError} Solicitação já `done`/`rejected`/`canceled`, ou `grant`/`change` ainda `pending`.
   * @throws {BusinessRuleError} `revoke` com termo `active` sem tratamento (E1/RF-TI-037). HTTP 422, com `details.pending_terms`.
   */
  public async execute({ id, executedBy, req }: Input): Promise<any> {
    const request = await this.repository.findById(id);
    if (!request) throw new NotFoundError(`Solicitação de acesso ${id} não encontrada.`);
    if (['done', 'rejected', 'canceled'].includes(request.status)) {
      throw new ValidationError(`Solicitação já está em status "${request.status}" e não pode ser executada.`);
    }
    if (['grant', 'change'].includes(request.type) && request.status === 'pending') {
      throw new ValidationError('Solicitações do tipo "grant"/"change" precisam ser aprovadas antes de executadas.');
    }

    if (request.type === 'revoke') {
      const blockers = await this.checkOffboardingBlockersUseCase.execute({ employeeId: request.employee_id });
      if (blockers.blocked) {
        throw new BusinessRuleError(
          'Não é possível concluir o recolhimento de equipamentos: existem termos de responsabilidade ativos para este funcionário.',
          { pending_terms: blockers.pendingTerms },
        );
      }

      const { userId } = await this.accessProfileExecutionService.deactivateUser({ employeeId: request.employee_id, req });
      const checklist = { ...(request.checklist ?? {}), user_deactivated: true, equipment_collected: true };
      await this.repository.update(id, {
        checklist,
        status: 'done',
        executed_by: executedBy,
        executed_at: new Date(),
        execution_notes: userId ? `Usuário ${userId} desativado via AccessProfileExecutionService.` : 'Funcionário sem usuário vinculado — nenhuma desativação necessária.',
      });
    } else {
      await this.accessProfileExecutionService.provisionAccess({
        employeeId: request.employee_id,
        profileId: request.requested_profile_id,
        corporateEmail: request.corporate_email,
        req,
      });

      await this.repository.update(id, {
        status: 'done',
        executed_by: executedBy,
        executed_at: new Date(),
      });
    }

    return toAccessRequestDTO(await this.repository.findById(id));
  }
}

export = ExecuteAccessRequestUseCase;
