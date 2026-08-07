/**
 * `POST /api/jur/legal-case-deadlines/:id/confirm` — 2ª confirmação
 * obrigatória (RF-JUR-024). Regra central (BR-JUR-013): o usuário que
 * confirma NUNCA pode ser o mesmo que registrou o cumprimento
 * (`fulfilled_by`) — verificável isoladamente pelo `AuditorIntegrador`.
 *
 * @module modules/juridico/application/use-cases/deadline/ConfirmDeadlineUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import DeadlineRepository from '../../../domain/repositories/DeadlineRepository';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import type { ConfirmDeadlineInput } from '../../../domain/entities/DeadlineTypes';

class ConfirmDeadlineUseCase extends UseCase<ConfirmDeadlineInput, any> {
  private readonly repository: DeadlineRepository;

  public constructor(repository: DeadlineRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Prazo não encontrado (404).
   * @throws {ValidationError} Prazo não está `fulfilled_pending_confirmation` (400).
   * @throws {BusinessRuleError} `confirmedBy === fulfilled_by` (422, E2 do UC-54, BR-JUR-013).
   */
  public async execute(input: ConfirmDeadlineInput): Promise<any> {
    const deadline = await this.repository.findById(input.id);
    if (!deadline) throw new NotFoundError(`Prazo ${input.id} não encontrado.`);

    if (deadline.status !== 'fulfilled_pending_confirmation') {
      throw new ValidationError('Prazo não está aguardando confirmação (fulfilled_pending_confirmation).');
    }

    if (input.confirmedBy === deadline.fulfilled_by) {
      throw new BusinessRuleError(
        'A confirmação de um prazo fatal exige um segundo usuário, diferente de quem registrou o cumprimento.',
        { rule: 'BR-JUR-013', fulfilled_by: deadline.fulfilled_by, attempted_confirm_by: input.confirmedBy },
      );
    }

    const finalStatus = deadline.retroactive_justification ? 'confirmed_late' : 'confirmed';

    return this.repository.update(input.id, {
      status: finalStatus,
      confirmed_by: input.confirmedBy,
      confirmed_at: new Date(),
    });
  }
}

export = ConfirmDeadlineUseCase;
