/**
 * `POST /api/jur/legal-case-deadlines/:id/acknowledge` — responsável
 * reconhece o alerta antes de D-3, evitando escalonamento automático
 * (RF-JUR-022). Só o próprio `responsible_user_id` (ou `backup_user_id`
 * com `as_backup: true`).
 *
 * @module modules/juridico/application/use-cases/deadline/AcknowledgeDeadlineUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import DeadlineRepository from '../../../domain/repositories/DeadlineRepository';
import { NotFoundError, ForbiddenError } from '../../../../../errors';
import type { AcknowledgeDeadlineInput } from '../../../domain/entities/DeadlineTypes';

class AcknowledgeDeadlineUseCase extends UseCase<AcknowledgeDeadlineInput, any> {
  private readonly repository: DeadlineRepository;

  public constructor(repository: DeadlineRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Prazo não encontrado (404).
   * @throws {ForbiddenError} Usuário diferente do responsável/backup autorizado (403).
   */
  public async execute(input: AcknowledgeDeadlineInput): Promise<any> {
    const deadline = await this.repository.findById(input.id);
    if (!deadline) throw new NotFoundError(`Prazo ${input.id} não encontrado.`);

    const isResponsible = deadline.responsible_user_id === input.requestingUserId;
    const isAuthorizedBackup = input.asBackup && deadline.backup_user_id === input.requestingUserId;
    if (!isResponsible && !isAuthorizedBackup) {
      throw new ForbiddenError('Apenas o responsável (ou o backup, informando as_backup) pode reconhecer este prazo.');
    }

    return this.repository.update(input.id, { acknowledged_at: new Date() });
  }
}

export = AcknowledgeDeadlineUseCase;
