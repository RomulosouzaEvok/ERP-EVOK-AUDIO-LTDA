/**
 * Caso de uso: atualização de metadados de um material de divulgação
 * (título, tipo, produto, item de estoque, versão), cobrindo o fluxo do
 * endpoint `PUT /api/marketing/materials/:id`.
 *
 * RF-MKT-039: aprovação SÓ via `ApproveMaterialUseCase`
 * (`PATCH /materials/:id/approve`) — `updateMaterialSchema` já não aceita
 * `approved`/`approved_by`/`approved_at` (Zod `.strict()`), este use case
 * reforça a regra em profundidade.
 *
 * @module modules/marketing/application/use-cases/material/UpdateMaterialUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import MaterialRepository from '../../../domain/repositories/MaterialRepository';

type UpdateMaterialInput = { id: number } & Record<string, any>;

class UpdateMaterialUseCase extends UseCase<UpdateMaterialInput, any> {
  private readonly materialRepository: MaterialRepository;

  constructor(materialRepository: MaterialRepository) {
    super();
    this.materialRepository = materialRepository;
  }

  /**
   * @throws {NotFoundError} Se o material não existir.
   */
  async execute({ id, approved: _ignoredApproved, approved_by: _ignoredApprovedBy, approved_at: _ignoredApprovedAt, ...rest }: UpdateMaterialInput) {
    const current = await this.materialRepository.findMaterialById(id);
    if (!current) {
      throw new NotFoundError('Material não encontrado.');
    }

    return this.materialRepository.updateMaterial(id, rest);
  }
}

export = UpdateMaterialUseCase;
