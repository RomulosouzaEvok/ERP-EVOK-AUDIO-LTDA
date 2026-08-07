/**
 * Caso de uso: busca de um material de divulgação por id, cobrindo o fluxo
 * do endpoint `GET /api/marketing/materials/:id`.
 *
 * @module modules/marketing/application/use-cases/material/GetMaterialByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import MaterialRepository from '../../../domain/repositories/MaterialRepository';

type GetMaterialByIdInput = { id: number };

class GetMaterialByIdUseCase extends UseCase<GetMaterialByIdInput, any> {
  private readonly materialRepository: MaterialRepository;

  constructor(materialRepository: MaterialRepository) {
    super();
    this.materialRepository = materialRepository;
  }

  async execute({ id }: GetMaterialByIdInput) {
    const material = await this.materialRepository.findMaterialById(id);
    if (!material) {
      throw new NotFoundError('Material não encontrado.');
    }
    return material;
  }
}

export = GetMaterialByIdUseCase;
