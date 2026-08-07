/**
 * `GET /api/jur/lgpd/incidents/:id` — detalhe completo.
 *
 * @module modules/juridico/application/use-cases/lgpd/GetIncidentByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdIncidentRepository from '../../../domain/repositories/LgpdIncidentRepository';
import { NotFoundError } from '../../../../../errors';

class GetIncidentByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly repository: LgpdIncidentRepository;

  public constructor(repository: LgpdIncidentRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Incidente não encontrado (404). */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const incident = await this.repository.findById(id);
    if (!incident) throw new NotFoundError(`Incidente ${id} não encontrado.`);
    return incident;
  }
}

export = GetIncidentByIdUseCase;
