/**
 * `POST /api/jur/legal-case-deadlines/:id/fulfill` — 1ª confirmação de
 * baixa de prazo fatal (RF-JUR-024): responsável (ou `backup_user_id`)
 * registra cumprimento com evidência. Se o prazo já venceu sem baixa
 * (`missed`), `retroactive_justification` passa a ser obrigatória
 * (RF-JUR-025/BR-JUR-014) — nunca aceito silenciosamente.
 *
 * @module modules/juridico/application/use-cases/deadline/FulfillDeadlineUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import DeadlineRepository from '../../../domain/repositories/DeadlineRepository';
import { ValidationError, NotFoundError, ConflictError, BusinessRuleError } from '../../../../../errors';
import type { FulfillDeadlineInput } from '../../../domain/entities/DeadlineTypes';

class FulfillDeadlineUseCase extends UseCase<FulfillDeadlineInput, any> {
  private readonly repository: DeadlineRepository;

  public constructor(repository: DeadlineRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `evidence_file_path` ausente (400).
   * @throws {NotFoundError} Prazo não encontrado (404).
   * @throws {ConflictError} Prazo já `fulfilled_pending_confirmation`/`confirmed`/`confirmed_late` (409).
   * @throws {BusinessRuleError} Prazo vencido (`missed`) sem `retroactive_justification` (422, E3/BR-JUR-014).
   */
  public async execute(input: FulfillDeadlineInput): Promise<any> {
    if (!input.evidence_file_path) throw new ValidationError('evidence_file_path é obrigatório.');

    const deadline = await this.repository.findById(input.id);
    if (!deadline) throw new NotFoundError(`Prazo ${input.id} não encontrado.`);

    if (['fulfilled_pending_confirmation', 'confirmed', 'confirmed_late'].includes(deadline.status)) {
      throw new ConflictError('Prazo já foi cumprido/confirmado — não pode ser registrado novamente.');
    }

    const dueDatePassed = new Date(deadline.due_date) < new Date();
    const isMissed = deadline.status === 'missed' || dueDatePassed;

    if (isMissed && !input.retroactive_justification) {
      throw new BusinessRuleError(
        'Prazo vencido sem baixa exige justificativa retroativa registrada — nunca silenciosa.',
        { rule: 'BR-JUR-014' },
      );
    }

    return this.repository.update(input.id, {
      status: 'fulfilled_pending_confirmation',
      evidence_file_path: input.evidence_file_path,
      fulfilled_by: input.fulfilledBy,
      fulfilled_at: new Date(),
      missed_at: isMissed ? (deadline.missed_at ?? new Date()) : deadline.missed_at,
      retroactive_justification: isMissed ? input.retroactive_justification : null,
    });
  }
}

export = FulfillDeadlineUseCase;
