/**
 * `PUT /api/jur/external-lawyers/:id` — atualiza contato/honorários/`supplier_id`.
 *
 * @module modules/juridico/application/use-cases/externalLawyer/UpdateExternalLawyerUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ExternalLawyerRepository from '../../../domain/repositories/ExternalLawyerRepository';
import { NotFoundError } from '../../../../../errors';
import type { UpdateExternalLawyerInput } from '../../../domain/entities/LegalCaseTypes';

class UpdateExternalLawyerUseCase extends UseCase<UpdateExternalLawyerInput, any> {
  private readonly repository: ExternalLawyerRepository;

  public constructor(repository: ExternalLawyerRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Advogado externo não encontrado (404). */
  public async execute(input: UpdateExternalLawyerInput): Promise<any> {
    const { id, ...rest } = input;
    const updated = await this.repository.update(id, rest);
    if (!updated) throw new NotFoundError(`Advogado externo ${id} não encontrado.`);
    return updated;
  }
}

export = UpdateExternalLawyerUseCase;
