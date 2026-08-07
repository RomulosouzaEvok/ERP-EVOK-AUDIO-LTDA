/**
 * Caso de uso: busca de um contrato por id, cobrindo o fluxo do endpoint
 * `GET /api/legal/contracts/:id`.
 *
 * @module modules/legal/application/use-cases/contract/GetContractByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import ContractRepository from '../../../domain/repositories/ContractRepository';

type GetContractByIdInput = { id: number };

class GetContractByIdUseCase extends UseCase<GetContractByIdInput, any> {
  private readonly contractRepository: ContractRepository;

  constructor(contractRepository: ContractRepository) {
    super();
    this.contractRepository = contractRepository;
  }

  async execute({ id }: GetContractByIdInput) {
    const contract = await this.contractRepository.findContractById(id);
    if (!contract) {
      throw new NotFoundError('Contrato não encontrado.');
    }
    return contract;
  }
}

export = GetContractByIdUseCase;
