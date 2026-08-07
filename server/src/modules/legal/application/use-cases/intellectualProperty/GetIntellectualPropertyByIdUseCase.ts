/**
 * Caso de uso: busca de um ativo de propriedade intelectual por id, cobrindo
 * o fluxo do endpoint `GET /api/legal/intellectual-property/:id`.
 *
 * @module modules/legal/application/use-cases/intellectualProperty/GetIntellectualPropertyByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import IntellectualPropertyRepository from '../../../domain/repositories/IntellectualPropertyRepository';

type GetIntellectualPropertyByIdInput = { id: number };

class GetIntellectualPropertyByIdUseCase extends UseCase<GetIntellectualPropertyByIdInput, any> {
  private readonly ipRepository: IntellectualPropertyRepository;

  constructor(ipRepository: IntellectualPropertyRepository) {
    super();
    this.ipRepository = ipRepository;
  }

  async execute({ id }: GetIntellectualPropertyByIdInput) {
    const ip = await this.ipRepository.findIntellectualPropertyById(id);
    if (!ip) {
      throw new NotFoundError('Ativo de propriedade intelectual não encontrado.');
    }
    return ip;
  }
}

export = GetIntellectualPropertyByIdUseCase;
