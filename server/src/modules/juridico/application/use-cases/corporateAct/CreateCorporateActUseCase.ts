/**
 * `POST /api/jur/corporate-acts` — cadastra ato societário (RF-JUR-030).
 * Sempre criado em `status='draft'` — a transição para `registered`
 * acontece apenas via `UpdateCorporateActUseCase`, quando
 * `registration_protocol`+`registered_at` são informados juntos.
 *
 * @module modules/juridico/application/use-cases/corporateAct/CreateCorporateActUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CorporateActRepository from '../../../domain/repositories/CorporateActRepository';
import { ValidationError } from '../../../../../errors';
import type { CreateCorporateActInput } from '../../../domain/entities/CorporateActTypes';

class CreateCorporateActUseCase extends UseCase<CreateCorporateActInput, any> {
  private readonly repository: CorporateActRepository;

  public constructor(repository: CorporateActRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {ValidationError} `act_type`, `title` ou `act_date` ausentes (400). */
  public async execute(input: CreateCorporateActInput): Promise<any> {
    if (!input.act_type || !input.title || !input.act_date) {
      throw new ValidationError('act_type, title e act_date são obrigatórios.');
    }

    return this.repository.create({
      act_type: input.act_type,
      title: input.title,
      description: input.description ?? null,
      act_date: input.act_date,
      registration_protocol: input.registration_protocol ?? null,
      registered_at: input.registered_at ?? null,
      document_file_path: input.document_file_path ?? null,
      status: 'draft',
      created_by: input.createdBy,
    });
  }
}

export = CreateCorporateActUseCase;
