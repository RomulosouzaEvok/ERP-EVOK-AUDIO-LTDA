/**
 * `POST /api/jur/contracts/:id/documents` — anexa minuta versionada
 * (RF-JUR-002). Sequência `v1, v2...` calculada pelo backend.
 *
 * @module modules/juridico/application/use-cases/contract/AddContractDocumentUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractRepository from '../../../domain/repositories/ContractRepository';
import { ValidationError, NotFoundError } from '../../../../../errors';
import type { AddContractDocumentInput } from '../../../domain/entities/ContractTypes';

class AddContractDocumentUseCase extends UseCase<AddContractDocumentInput, any> {
  private readonly repository: ContractRepository;

  public constructor(repository: ContractRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `file_url` ausente (400).
   * @throws {NotFoundError} Contrato não encontrado (404).
   */
  public async execute(input: AddContractDocumentInput): Promise<any> {
    if (!input.file_url) throw new ValidationError('file_url é obrigatório.');

    const contract = await this.repository.findById(input.contractId);
    if (!contract) throw new NotFoundError(`Contrato ${input.contractId} não encontrado.`);

    const versionNumber = (await this.repository.countDocuments(input.contractId)) + 1;

    return this.repository.addDocument({
      contract_id: input.contractId,
      version_number: versionNumber,
      file_url: input.file_url,
      author_id: input.authorId,
      observations: input.notes ?? null,
      is_signed_version: Boolean(input.is_signed_version),
    });
  }
}

export = AddContractDocumentUseCase;
