/**
 * `POST /api/jur/contracts/:id/addendums` — cria e assina um aditivo
 * (RF-JUR-008). Atualiza os campos vigentes do contrato na mesma
 * transação; o aditivo e os valores anteriores (`previous_*`, snapshot)
 * são imutáveis a partir da criação (trigger de banco).
 *
 * @module modules/juridico/application/use-cases/contract/CreateContractAddendumUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractRepository from '../../../domain/repositories/ContractRepository';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../../../../errors';
import type { CreateContractAddendumInput } from '../../../domain/entities/ContractTypes';

class CreateContractAddendumUseCase extends UseCase<CreateContractAddendumInput, any> {
  private readonly repository: ContractRepository;

  public constructor(repository: ContractRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `change_type`/`description` ausentes ou dados incoerentes com o tipo (400).
   * @throws {NotFoundError} Contrato não encontrado (404).
   * @throws {BusinessRuleError} `change_type=value` sem `new_value`, ou `term` sem `new_end_date` (422).
   */
  public async execute(input: CreateContractAddendumInput): Promise<any> {
    if (!input.change_type || !input.description) {
      throw new ValidationError('change_type e description são obrigatórios.');
    }

    const contract = await this.repository.findById(input.contractId);
    if (!contract) throw new NotFoundError(`Contrato ${input.contractId} não encontrado.`);

    if (input.change_type === 'value' && (input.new_value === undefined || input.new_value === null)) {
      throw new BusinessRuleError('change_type=value exige new_value.', { rule: 'BR-JUR-003' });
    }
    if (input.change_type === 'term' && !input.new_end_date) {
      throw new BusinessRuleError('change_type=term exige new_end_date.', { rule: 'BR-JUR-003' });
    }

    const addendumNumber = (await this.repository.countAddendums(input.contractId)) + 1;

    const addendum = await this.repository.addAddendum({
      contract_id: input.contractId,
      addendum_number: addendumNumber,
      addendum_type: input.change_type,
      description: input.description,
      previous_end_date: contract.end_date,
      new_end_date: input.new_end_date ?? null,
      previous_value: contract.value,
      new_value: input.new_value ?? null,
      document_url: input.document_url ?? null,
      signed_at: new Date().toISOString().slice(0, 10),
      created_by: input.createdBy,
    });

    const contractUpdates: Record<string, unknown> = {};
    if (input.new_end_date) contractUpdates.end_date = input.new_end_date;
    if (input.new_value !== undefined && input.new_value !== null) contractUpdates.value = input.new_value;
    if (Object.keys(contractUpdates).length > 0) {
      await this.repository.update(input.contractId, contractUpdates);
    }

    return addendum;
  }
}

export = CreateContractAddendumUseCase;
