/**
 * Caso de uso: atualização de um aditivo contratual, cobrindo o fluxo do
 * endpoint `PUT /api/legal/contract-addendums/:id`.
 *
 * @module modules/legal/application/use-cases/addendum/UpdateAddendumUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import ContractAddendumRepository from '../../../domain/repositories/ContractAddendumRepository';

type UpdateAddendumInput = { id: number } & Record<string, any>;

class UpdateAddendumUseCase extends UseCase<UpdateAddendumInput, any> {
  private readonly addendumRepository: ContractAddendumRepository;

  constructor(addendumRepository: ContractAddendumRepository) {
    super();
    this.addendumRepository = addendumRepository;
  }

  /**
   * @throws {NotFoundError} Se o aditivo não existir.
   */
  async execute({ id, ...rest }: UpdateAddendumInput) {
    const current = await this.addendumRepository.findAddendumById(id);
    if (!current) {
      throw new NotFoundError('Aditivo contratual não encontrado.');
    }

    return this.addendumRepository.updateAddendum(id, rest);
  }
}

export = UpdateAddendumUseCase;
