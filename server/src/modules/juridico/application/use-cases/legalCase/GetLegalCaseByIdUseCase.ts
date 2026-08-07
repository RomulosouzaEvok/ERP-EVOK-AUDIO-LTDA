/**
 * `GET /api/jur/legal-cases/:id` — detalhe completo (eventos, provisão
 * vigente, custos).
 *
 * @module modules/juridico/application/use-cases/legalCase/GetLegalCaseByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LegalCaseRepository from '../../../domain/repositories/LegalCaseRepository';
import { NotFoundError } from '../../../../../errors';

class GetLegalCaseByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly repository: LegalCaseRepository;

  public constructor(repository: LegalCaseRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Processo não encontrado (404). */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const legalCase = await this.repository.findById(id);
    if (!legalCase) throw new NotFoundError(`Processo ${id} não encontrado.`);
    return legalCase;
  }
}

export = GetLegalCaseByIdUseCase;
