/**
 * Caso de uso: busca da ficha tecnica (especificacao Thiele-Small) de um item.
 *
 * @module modules/engineering/application/use-cases/GetTechnicalSpecUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import EngineeringRepository from '../../domain/repositories/EngineeringRepository';

type GetTechnicalSpecInput = { itemId: string };

class GetTechnicalSpecUseCase extends UseCase<GetTechnicalSpecInput, any> {
  private readonly engineeringRepository: EngineeringRepository;

  constructor(engineeringRepository: EngineeringRepository) {
    super();
    this.engineeringRepository = engineeringRepository;
  }

  /**
   * @param input - `{ itemId }`.
   * @returns A especificacao tecnica, ou `null` se o item existe mas ainda
   *   nao possui ficha tecnica cadastrada.
   * @throws {NotFoundError} Se o item nao existir.
   */
  async execute({ itemId }: GetTechnicalSpecInput): Promise<any | null> {
    const item = await this.engineeringRepository.findItemById(itemId);
    if (!item) {
      throw new NotFoundError('Item nao encontrado.');
    }

    return this.engineeringRepository.findTechnicalSpecByItemId(itemId);
  }
}

export = GetTechnicalSpecUseCase;
