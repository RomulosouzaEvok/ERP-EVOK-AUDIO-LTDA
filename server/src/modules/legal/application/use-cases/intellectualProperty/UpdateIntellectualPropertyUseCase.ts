/**
 * Caso de uso: atualização de um ativo de propriedade intelectual, cobrindo
 * o fluxo do endpoint `PUT /api/legal/intellectual-property/:id`.
 *
 * @module modules/legal/application/use-cases/intellectualProperty/UpdateIntellectualPropertyUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import IntellectualPropertyRepository from '../../../domain/repositories/IntellectualPropertyRepository';

type UpdateIntellectualPropertyInput = { id: number } & Record<string, any>;

class UpdateIntellectualPropertyUseCase extends UseCase<UpdateIntellectualPropertyInput, any> {
  private readonly ipRepository: IntellectualPropertyRepository;

  constructor(ipRepository: IntellectualPropertyRepository) {
    super();
    this.ipRepository = ipRepository;
  }

  /**
   * @throws {NotFoundError} Se o ativo de PI não existir.
   */
  async execute({ id, ...rest }: UpdateIntellectualPropertyInput) {
    const current = await this.ipRepository.findIntellectualPropertyById(id);
    if (!current) {
      throw new NotFoundError('Ativo de propriedade intelectual não encontrado.');
    }

    return this.ipRepository.updateIntellectualProperty(id, rest);
  }
}

export = UpdateIntellectualPropertyUseCase;
