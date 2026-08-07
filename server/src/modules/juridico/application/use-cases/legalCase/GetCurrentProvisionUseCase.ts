/**
 * `GET /api/jur/legal-cases/:id/provisions/current` — só a linha vigente
 * (mais recente, `ORDER BY assessed_at DESC LIMIT 1`).
 *
 * @module modules/juridico/application/use-cases/legalCase/GetCurrentProvisionUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LegalCaseRepository from '../../../domain/repositories/LegalCaseRepository';
import { NotFoundError } from '../../../../../errors';

class GetCurrentProvisionUseCase extends UseCase<{ legalCaseId: number | string }, any> {
  private readonly repository: LegalCaseRepository;

  public constructor(repository: LegalCaseRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Processo, ou processo sem avaliação registrada (404). */
  public async execute({ legalCaseId }: { legalCaseId: number | string }): Promise<any> {
    const legalCase = await this.repository.findById(legalCaseId);
    if (!legalCase) throw new NotFoundError(`Processo ${legalCaseId} não encontrado.`);

    const current = await this.repository.getCurrentProvision(legalCaseId);
    if (!current) throw new NotFoundError(`Processo ${legalCaseId} ainda não tem avaliação de risco registrada.`);
    return current;
  }
}

export = GetCurrentProvisionUseCase;
