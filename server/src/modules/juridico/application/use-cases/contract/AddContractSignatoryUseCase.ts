/**
 * `POST /api/jur/contracts/:id/signatories` — adiciona parte ou testemunha
 * (RF-JUR-004).
 *
 * @module modules/juridico/application/use-cases/contract/AddContractSignatoryUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractRepository from '../../../domain/repositories/ContractRepository';
import { ValidationError, NotFoundError } from '../../../../../errors';
import type { AddContractSignatoryInput } from '../../../domain/entities/ContractTypes';

class AddContractSignatoryUseCase extends UseCase<AddContractSignatoryInput, any> {
  private readonly repository: ContractRepository;

  public constructor(repository: ContractRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `party_type` ou `name` ausentes (400).
   * @throws {NotFoundError} Contrato não encontrado (404).
   */
  public async execute(input: AddContractSignatoryInput): Promise<any> {
    if (!input.party_type || !input.name) throw new ValidationError('party_type e name são obrigatórios.');

    const contract = await this.repository.findById(input.contractId);
    if (!contract) throw new NotFoundError(`Contrato ${input.contractId} não encontrado.`);

    return this.repository.addSignatory({
      contract_id: input.contractId,
      signatory_role: input.party_type,
      name: input.name,
      document: input.document ?? null,
      employee_id: input.employee_id ?? null,
    });
  }
}

export = AddContractSignatoryUseCase;
