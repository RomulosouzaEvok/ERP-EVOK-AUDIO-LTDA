/**
 * `POST /api/ti/access-requests/:id/cancel` — cancela solicitação
 * `pending`/`approved` ainda não executada (RF-TI-038).
 *
 * @module modules/ti/application/use-cases/accessRequest/CancelAccessRequestUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AccessRequestRepository from '../../../domain/repositories/AccessRequestRepository';
import { NotFoundError, ValidationError } from '../../../../../errors';
import { toAccessRequestDTO } from '../../../infrastructure/mappers/AccessRequestMapper';

class CancelAccessRequestUseCase extends UseCase<{ id: number }, any> {
  private readonly repository: AccessRequestRepository;

  public constructor(repository: AccessRequestRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Solicitação não encontrada.
   * @throws {ValidationError} Solicitação já `done`/`rejected`/`canceled`.
   */
  public async execute({ id }: { id: number }): Promise<any> {
    const request = await this.repository.findById(id);
    if (!request) throw new NotFoundError(`Solicitação de acesso ${id} não encontrada.`);
    if (['done', 'rejected', 'canceled'].includes(request.status)) {
      throw new ValidationError(`Solicitação já está em status "${request.status}" e não pode ser cancelada.`);
    }

    await this.repository.update(id, { status: 'canceled' });
    return toAccessRequestDTO(await this.repository.findById(id));
  }
}

export = CancelAccessRequestUseCase;
