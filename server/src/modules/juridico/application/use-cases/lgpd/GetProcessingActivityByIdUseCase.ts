/**
 * `GET /api/jur/lgpd/processing-activities/:id` — detalhe.
 *
 * @module modules/juridico/application/use-cases/lgpd/GetProcessingActivityByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdActivityRepository from '../../../domain/repositories/LgpdActivityRepository';
import { NotFoundError } from '../../../../../errors';

class GetProcessingActivityByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly repository: LgpdActivityRepository;

  public constructor(repository: LgpdActivityRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Atividade não encontrada (404). */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const activity = await this.repository.findById(id);
    if (!activity) throw new NotFoundError(`Atividade de tratamento ${id} não encontrada.`);
    return activity;
  }
}

export = GetProcessingActivityByIdUseCase;
