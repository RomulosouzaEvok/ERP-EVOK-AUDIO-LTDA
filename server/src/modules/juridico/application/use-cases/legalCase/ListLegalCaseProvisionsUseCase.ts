/**
 * `GET /api/jur/legal-cases/:id/provisions` — histórico completo (inclui
 * `rationale`, só disponível aqui e no detalhe do processo, nunca na
 * listagem geral — §0.4 da API).
 *
 * @module modules/juridico/application/use-cases/legalCase/ListLegalCaseProvisionsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LegalCaseRepository from '../../../domain/repositories/LegalCaseRepository';
import { NotFoundError } from '../../../../../errors';

class ListLegalCaseProvisionsUseCase extends UseCase<{ legalCaseId: number | string }, any[]> {
  private readonly repository: LegalCaseRepository;

  public constructor(repository: LegalCaseRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Processo não encontrado (404). */
  public async execute({ legalCaseId }: { legalCaseId: number | string }): Promise<any[]> {
    const legalCase = await this.repository.findById(legalCaseId);
    if (!legalCase) throw new NotFoundError(`Processo ${legalCaseId} não encontrado.`);
    return this.repository.listProvisions(legalCaseId);
  }
}

export = ListLegalCaseProvisionsUseCase;
