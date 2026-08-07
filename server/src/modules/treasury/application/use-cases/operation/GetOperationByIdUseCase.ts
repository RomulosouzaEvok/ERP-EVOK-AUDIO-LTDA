/**
 * Caso de uso: busca de uma operação financeira por id, cobrindo o fluxo do
 * endpoint `GET /api/treasury/financial-operations/:id`.
 *
 * @module modules/treasury/application/use-cases/operation/GetOperationByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import TreasuryRepository from '../../../domain/repositories/TreasuryRepository';

type GetOperationByIdInput = { id: number };

class GetOperationByIdUseCase extends UseCase<GetOperationByIdInput, any> {
  private readonly treasuryRepository: TreasuryRepository;

  constructor(treasuryRepository: TreasuryRepository) {
    super();
    this.treasuryRepository = treasuryRepository;
  }

  /** @throws {NotFoundError} Se a operação financeira não existir. */
  async execute({ id }: GetOperationByIdInput) {
    const operation = await this.treasuryRepository.findOperationById(id);
    if (!operation) {
      throw new NotFoundError(`Operação financeira ${id} não encontrada.`);
    }
    return operation;
  }
}

export = GetOperationByIdUseCase;
