/**
 * `GET /api/jur/legal-case-deadlines/critical` — dashboard: `escalated` +
 * `missed` + `pending` vencendo em ≤3 dias.
 *
 * @module modules/juridico/application/use-cases/deadline/CriticalDeadlinesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import DeadlineRepository from '../../../domain/repositories/DeadlineRepository';

class CriticalDeadlinesUseCase extends UseCase<void, any[]> {
  private readonly repository: DeadlineRepository;

  public constructor(repository: DeadlineRepository) {
    super();
    this.repository = repository;
  }

  public async execute(): Promise<any[]> {
    return this.repository.listCritical();
  }
}

export = CriticalDeadlinesUseCase;
