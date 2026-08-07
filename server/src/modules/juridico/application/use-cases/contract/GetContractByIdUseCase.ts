/**
 * `GET /api/jur/contracts/:id` — detalhe completo (UC-52).
 *
 * @module modules/juridico/application/use-cases/contract/GetContractByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractRepository from '../../../domain/repositories/ContractRepository';
import { NotFoundError } from '../../../../../errors';

class GetContractByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly repository: ContractRepository;

  public constructor(repository: ContractRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Contrato não encontrado (404). */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const contract = await this.repository.findById(id);
    if (!contract) throw new NotFoundError(`Contrato ${id} não encontrado.`);
    return contract;
  }
}

export = GetContractByIdUseCase;
