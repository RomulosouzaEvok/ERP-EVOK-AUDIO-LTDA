/**
 * Caso de uso: criação de material de divulgação (metadados — o arquivo em
 * si é enviado depois via `POST /api/marketing/materials/:id/file`),
 * cobrindo o fluxo do endpoint `POST /api/marketing/materials`.
 *
 * @module modules/marketing/application/use-cases/material/CreateMaterialUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import MaterialRepository from '../../../domain/repositories/MaterialRepository';

type CreateMaterialInput = Record<string, any>;

class CreateMaterialUseCase extends UseCase<CreateMaterialInput, any> {
  private readonly materialRepository: MaterialRepository;

  constructor(materialRepository: MaterialRepository) {
    super();
    this.materialRepository = materialRepository;
  }

  async execute(input: CreateMaterialInput) {
    return this.materialRepository.createMaterial(input);
  }
}

export = CreateMaterialUseCase;
