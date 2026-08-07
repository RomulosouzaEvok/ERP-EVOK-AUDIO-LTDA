/**
 * `GET /api/ti/access-requests/:id` — detalhe (inclui checklist, aprovação,
 * execução).
 *
 * @module modules/ti/application/use-cases/accessRequest/GetAccessRequestByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AccessRequestRepository from '../../../domain/repositories/AccessRequestRepository';
import { NotFoundError } from '../../../../../errors';
import { toAccessRequestDTO } from '../../../infrastructure/mappers/AccessRequestMapper';

class GetAccessRequestByIdUseCase extends UseCase<{ id: number }, any> {
  private readonly repository: AccessRequestRepository;

  public constructor(repository: AccessRequestRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Solicitação não encontrada. */
  public async execute({ id }: { id: number }): Promise<any> {
    const request = await this.repository.findById(id);
    if (!request) throw new NotFoundError(`Solicitação de acesso ${id} não encontrada.`);
    return toAccessRequestDTO(request);
  }
}

export = GetAccessRequestByIdUseCase;
