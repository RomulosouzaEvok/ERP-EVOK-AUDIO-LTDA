/**
 * `GET /api/ti/responsibility-terms/:id` — detalhe do termo.
 *
 * @module modules/ti/application/use-cases/term/GetResponsibilityTermByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ResponsibilityTermRepository from '../../../domain/repositories/ResponsibilityTermRepository';
import { NotFoundError } from '../../../../../errors';
import { toTermDTO } from '../../../infrastructure/mappers/TermMapper';

class GetResponsibilityTermByIdUseCase extends UseCase<{ id: number }, any> {
  private readonly repository: ResponsibilityTermRepository;

  public constructor(repository: ResponsibilityTermRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Termo não encontrado. */
  public async execute({ id }: { id: number }): Promise<any> {
    const term = await this.repository.findById(id);
    if (!term) throw new NotFoundError(`Termo de responsabilidade ${id} não encontrado.`);
    return toTermDTO(term);
  }
}

export = GetResponsibilityTermByIdUseCase;
