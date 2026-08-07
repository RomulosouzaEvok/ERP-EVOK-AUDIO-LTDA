/**
 * Caso de uso: atualização de um contrato, cobrindo o fluxo do endpoint
 * `PUT /api/legal/contracts/:id`.
 *
 * @module modules/legal/application/use-cases/contract/UpdateContractUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ConflictError } from '../../../../../errors';
import ContractRepository from '../../../domain/repositories/ContractRepository';

type UpdateContractInput = { id: number } & Record<string, any>;

class UpdateContractUseCase extends UseCase<UpdateContractInput, any> {
  private readonly contractRepository: ContractRepository;

  constructor(contractRepository: ContractRepository) {
    super();
    this.contractRepository = contractRepository;
  }

  /**
   * @throws {NotFoundError} Se o contrato não existir.
   * @throws {ConflictError} Se `contract_number` for alterado para um valor já usado por outro contrato.
   */
  async execute({ id, ...rest }: UpdateContractInput) {
    const current = await this.contractRepository.findContractById(id);
    if (!current) {
      throw new NotFoundError('Contrato não encontrado.');
    }

    if (rest.contract_number && rest.contract_number !== current.contract_number) {
      const existing = await this.contractRepository.findContractByNumber(rest.contract_number);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Já existe um contrato com o número "${rest.contract_number}".`);
      }
    }

    return this.contractRepository.updateContract(id, rest);
  }
}

export = UpdateContractUseCase;
