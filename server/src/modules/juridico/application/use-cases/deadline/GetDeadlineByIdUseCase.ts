/**
 * `GET /api/jur/legal-case-deadlines/:id` — detalhe completo.
 *
 * @module modules/juridico/application/use-cases/deadline/GetDeadlineByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import DeadlineRepository from '../../../domain/repositories/DeadlineRepository';
import { NotFoundError } from '../../../../../errors';

class GetDeadlineByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly repository: DeadlineRepository;

  public constructor(repository: DeadlineRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Prazo não encontrado (404). */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const deadline = await this.repository.findById(id);
    if (!deadline) throw new NotFoundError(`Prazo ${id} não encontrado.`);
    return deadline;
  }
}

export = GetDeadlineByIdUseCase;
