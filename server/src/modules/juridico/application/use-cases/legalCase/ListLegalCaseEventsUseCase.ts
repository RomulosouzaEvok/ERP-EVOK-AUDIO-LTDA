/**
 * `GET /api/jur/legal-cases/:id/events` — lista andamentos, cronológico.
 *
 * @module modules/juridico/application/use-cases/legalCase/ListLegalCaseEventsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LegalCaseRepository from '../../../domain/repositories/LegalCaseRepository';
import { NotFoundError } from '../../../../../errors';

class ListLegalCaseEventsUseCase extends UseCase<{ legalCaseId: number | string }, any[]> {
  private readonly repository: LegalCaseRepository;

  public constructor(repository: LegalCaseRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Processo não encontrado (404). */
  public async execute({ legalCaseId }: { legalCaseId: number | string }): Promise<any[]> {
    const legalCase = await this.repository.findById(legalCaseId);
    if (!legalCase) throw new NotFoundError(`Processo ${legalCaseId} não encontrado.`);
    return this.repository.listEvents(legalCaseId);
  }
}

export = ListLegalCaseEventsUseCase;
