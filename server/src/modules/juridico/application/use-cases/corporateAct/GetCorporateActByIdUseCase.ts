/**
 * `GET /api/jur/corporate-acts/:id` — detalhe do ato societário.
 *
 * @module modules/juridico/application/use-cases/corporateAct/GetCorporateActByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CorporateActRepository from '../../../domain/repositories/CorporateActRepository';
import { NotFoundError } from '../../../../../errors';

class GetCorporateActByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly repository: CorporateActRepository;

  public constructor(repository: CorporateActRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Ato societário não encontrado (404). */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const act = await this.repository.findById(id);
    if (!act) throw new NotFoundError(`Ato societário ${id} não encontrado.`);
    return act;
  }
}

export = GetCorporateActByIdUseCase;
