/**
 * `GET /api/jur/lgpd/data-subject-requests/:id` — detalhe completo.
 *
 * @module modules/juridico/application/use-cases/lgpd/GetDataSubjectRequestByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdRequestRepository from '../../../domain/repositories/LgpdRequestRepository';
import { NotFoundError } from '../../../../../errors';

class GetDataSubjectRequestByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly repository: LgpdRequestRepository;

  public constructor(repository: LgpdRequestRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Solicitação não encontrada (404). */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const request = await this.repository.findById(id);
    if (!request) throw new NotFoundError(`Solicitação ${id} não encontrada.`);
    return request;
  }
}

export = GetDataSubjectRequestByIdUseCase;
