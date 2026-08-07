/**
 * `GET /api/jur/external-lawyers/:id` — detalhe.
 *
 * @module modules/juridico/application/use-cases/externalLawyer/GetExternalLawyerByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ExternalLawyerRepository from '../../../domain/repositories/ExternalLawyerRepository';
import { NotFoundError } from '../../../../../errors';

class GetExternalLawyerByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly repository: ExternalLawyerRepository;

  public constructor(repository: ExternalLawyerRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Advogado externo não encontrado (404). */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const lawyer = await this.repository.findById(id);
    if (!lawyer) throw new NotFoundError(`Advogado externo ${id} não encontrado.`);
    return lawyer;
  }
}

export = GetExternalLawyerByIdUseCase;
