/**
 * `POST /api/jur/legal-cases/:id/events` — registra andamento processual
 * (RF-JUR-014, insert-only). `event_type=decision` dispara pendência de
 * reavaliação de risco em 90 dias (RF-JUR-017) na mesma transação lógica
 * (fora do escopo de trigger de banco — regra de PROCESSO).
 *
 * @module modules/juridico/application/use-cases/legalCase/CreateLegalCaseEventUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LegalCaseRepository from '../../../domain/repositories/LegalCaseRepository';
import { ValidationError, NotFoundError } from '../../../../../errors';
import type { CreateLegalCaseEventInput } from '../../../domain/entities/LegalCaseTypes';

class CreateLegalCaseEventUseCase extends UseCase<CreateLegalCaseEventInput, any> {
  private readonly repository: LegalCaseRepository;

  public constructor(repository: LegalCaseRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `event_type`/`description` ausentes (400).
   * @throws {NotFoundError} Processo não encontrado (404).
   */
  public async execute(input: CreateLegalCaseEventInput): Promise<any> {
    if (!input.event_type || !input.description) {
      throw new ValidationError('event_type e description são obrigatórios.');
    }

    const legalCase = await this.repository.findById(input.legalCaseId);
    if (!legalCase) throw new NotFoundError(`Processo ${input.legalCaseId} não encontrado.`);

    const event = await this.repository.addEvent({
      legal_case_id: input.legalCaseId,
      event_type: input.event_type,
      occurred_at: input.event_date ?? new Date(),
      description: input.description,
      document_url: input.attachment_url ?? null,
      created_by: input.createdBy,
    });

    if (input.event_type === 'decision') {
      const reassessDate = new Date();
      reassessDate.setDate(reassessDate.getDate() + 90);
      await this.repository.update(input.legalCaseId, {
        next_risk_reassessment_due_at: reassessDate.toISOString().slice(0, 10),
      });
    }

    return event;
  }
}

export = CreateLegalCaseEventUseCase;
