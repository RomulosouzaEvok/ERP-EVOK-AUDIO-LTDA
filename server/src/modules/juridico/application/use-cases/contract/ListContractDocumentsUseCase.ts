/**
 * `GET /api/jur/contracts/:id/documents` — lista versões de minuta.
 *
 * @module modules/juridico/application/use-cases/contract/ListContractDocumentsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractRepository from '../../../domain/repositories/ContractRepository';
import { NotFoundError } from '../../../../../errors';

class ListContractDocumentsUseCase extends UseCase<{ contractId: number | string }, any[]> {
  private readonly repository: ContractRepository;

  public constructor(repository: ContractRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Contrato não encontrado (404). */
  public async execute({ contractId }: { contractId: number | string }): Promise<any[]> {
    const contract = await this.repository.findById(contractId);
    if (!contract) throw new NotFoundError(`Contrato ${contractId} não encontrado.`);
    return this.repository.listDocuments(contractId);
  }
}

export = ListContractDocumentsUseCase;
