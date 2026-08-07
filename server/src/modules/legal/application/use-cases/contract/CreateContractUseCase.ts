/**
 * Caso de uso: criação de contrato, cobrindo o fluxo do endpoint
 * `POST /api/legal/contracts`.
 *
 * @module modules/legal/application/use-cases/contract/CreateContractUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { ConflictError } from '../../../../../errors';
import ContractRepository from '../../../domain/repositories/ContractRepository';

type CreateContractInput = Record<string, any>;

class CreateContractUseCase extends UseCase<CreateContractInput, any> {
  private readonly contractRepository: ContractRepository;

  constructor(contractRepository: ContractRepository) {
    super();
    this.contractRepository = contractRepository;
  }

  /**
   * @throws {ConflictError} Se já existir contrato com o mesmo `contract_number`.
   */
  async execute(input: CreateContractInput) {
    const existing = await this.contractRepository.findContractByNumber(input.contract_number);
    if (existing) {
      throw new ConflictError(`Já existe um contrato com o número "${input.contract_number}".`);
    }

    return this.contractRepository.createContract(input);
  }
}

export = CreateContractUseCase;
