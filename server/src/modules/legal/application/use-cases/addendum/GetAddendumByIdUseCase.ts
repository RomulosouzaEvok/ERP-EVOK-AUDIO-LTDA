/**
 * Caso de uso: busca de um aditivo contratual por id, cobrindo o fluxo do
 * endpoint `GET /api/legal/contract-addendums/:id`.
 *
 * @module modules/legal/application/use-cases/addendum/GetAddendumByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import ContractAddendumRepository from '../../../domain/repositories/ContractAddendumRepository';

type GetAddendumByIdInput = { id: number };

class GetAddendumByIdUseCase extends UseCase<GetAddendumByIdInput, any> {
  private readonly addendumRepository: ContractAddendumRepository;

  constructor(addendumRepository: ContractAddendumRepository) {
    super();
    this.addendumRepository = addendumRepository;
  }

  async execute({ id }: GetAddendumByIdInput) {
    const addendum = await this.addendumRepository.findAddendumById(id);
    if (!addendum) {
      throw new NotFoundError('Aditivo contratual não encontrado.');
    }
    return addendum;
  }
}

export = GetAddendumByIdUseCase;
