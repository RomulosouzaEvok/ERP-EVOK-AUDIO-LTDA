/**
 * Caso de uso: criação de ativo de propriedade intelectual, cobrindo o
 * fluxo do endpoint `POST /api/legal/intellectual-property`.
 *
 * @module modules/legal/application/use-cases/intellectualProperty/CreateIntellectualPropertyUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import IntellectualPropertyRepository from '../../../domain/repositories/IntellectualPropertyRepository';

type CreateIntellectualPropertyInput = Record<string, any>;

class CreateIntellectualPropertyUseCase extends UseCase<CreateIntellectualPropertyInput, any> {
  private readonly ipRepository: IntellectualPropertyRepository;

  constructor(ipRepository: IntellectualPropertyRepository) {
    super();
    this.ipRepository = ipRepository;
  }

  async execute(input: CreateIntellectualPropertyInput) {
    return this.ipRepository.createIntellectualProperty(input);
  }
}

export = CreateIntellectualPropertyUseCase;
