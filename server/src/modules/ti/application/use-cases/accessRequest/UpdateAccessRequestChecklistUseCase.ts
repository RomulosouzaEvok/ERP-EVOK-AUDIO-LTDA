/**
 * `POST /api/ti/access-requests/:id/checklist` — atualiza item do
 * `checklist` JSONB (parcial, sem re-executar tudo) — RF-TI-033/035.
 *
 * @module modules/ti/application/use-cases/accessRequest/UpdateAccessRequestChecklistUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AccessRequestRepository from '../../../domain/repositories/AccessRequestRepository';
import { NotFoundError, ValidationError } from '../../../../../errors';
import type { UpdateChecklistInput } from '../../../domain/entities/AccessRequestTypes';
import { toAccessRequestDTO } from '../../../infrastructure/mappers/AccessRequestMapper';

class UpdateAccessRequestChecklistUseCase extends UseCase<UpdateChecklistInput, any> {
  private readonly repository: AccessRequestRepository;

  public constructor(repository: AccessRequestRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `field` ausente.
   * @throws {NotFoundError} Solicitação não encontrada.
   */
  public async execute({ id, field, value }: UpdateChecklistInput): Promise<any> {
    if (!field) throw new ValidationError('field é obrigatório.');

    const request = await this.repository.findById(id);
    if (!request) throw new NotFoundError(`Solicitação de acesso ${id} não encontrada.`);

    const checklist = { ...(request.checklist ?? {}), [field]: value };
    await this.repository.update(id, { checklist });
    return toAccessRequestDTO(await this.repository.findById(id));
  }
}

export = UpdateAccessRequestChecklistUseCase;
