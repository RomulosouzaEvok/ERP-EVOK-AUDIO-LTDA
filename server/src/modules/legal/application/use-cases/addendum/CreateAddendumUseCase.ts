/**
 * Caso de uso: criação de aditivo contratual, cobrindo o fluxo do endpoint
 * `POST /api/legal/contract-addendums`.
 *
 * @module modules/legal/application/use-cases/addendum/CreateAddendumUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import ContractAddendumRepository from '../../../domain/repositories/ContractAddendumRepository';
import ContractRepository from '../../../domain/repositories/ContractRepository';

type CreateAddendumInput = Record<string, any>;

class CreateAddendumUseCase extends UseCase<CreateAddendumInput, any> {
  private readonly addendumRepository: ContractAddendumRepository;
  private readonly contractRepository: ContractRepository;

  constructor(addendumRepository: ContractAddendumRepository, contractRepository: ContractRepository) {
    super();
    this.addendumRepository = addendumRepository;
    this.contractRepository = contractRepository;
  }

  /**
   * @throws {NotFoundError} Se `contract_id` não corresponder a um contrato existente.
   */
  async execute(input: CreateAddendumInput) {
    const contract = await this.contractRepository.findContractById(input.contract_id);
    if (!contract) {
      throw new NotFoundError('Contrato não encontrado.');
    }

    return this.addendumRepository.createAddendum(input);
  }
}

export = CreateAddendumUseCase;
