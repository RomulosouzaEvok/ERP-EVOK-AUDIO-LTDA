/**
 * Caso de uso: listagem paginada de materiais de divulgação, cobrindo o
 * fluxo do endpoint `GET /api/marketing/materials`.
 *
 * @module modules/marketing/application/use-cases/material/ListMaterialsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import MaterialRepository from '../../../domain/repositories/MaterialRepository';

type ListMaterialsInput = {
  material_type?: string;
  product_id?: string;
  approved?: boolean;
  page?: number;
  limit?: number;
  offset?: number;
};

class ListMaterialsUseCase extends UseCase<ListMaterialsInput, any> {
  private readonly materialRepository: MaterialRepository;

  constructor(materialRepository: MaterialRepository) {
    super();
    this.materialRepository = materialRepository;
  }

  async execute({ material_type, product_id, approved, page = 1, limit = 20, offset = 0 }: ListMaterialsInput = {}) {
    const { rows, count } = await this.materialRepository.listMaterials({ material_type, product_id, approved }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListMaterialsUseCase;
