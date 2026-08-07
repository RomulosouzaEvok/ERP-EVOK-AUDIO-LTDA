/**
 * Caso de uso: aprovação de material de divulgação, cobrindo o fluxo do
 * endpoint `PATCH /api/marketing/materials/:id/approve` (RF-MKT-039,
 * nível RBAC `approve`).
 *
 * @module modules/marketing/application/use-cases/material/ApproveMaterialUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import MaterialRepository from '../../../domain/repositories/MaterialRepository';

type ApproveMaterialInput = { id: number; approvedByUserId: number };

class ApproveMaterialUseCase extends UseCase<ApproveMaterialInput, any> {
  private readonly materialRepository: MaterialRepository;

  constructor(materialRepository: MaterialRepository) {
    super();
    this.materialRepository = materialRepository;
  }

  /**
   * @throws {NotFoundError} Se o material não existir.
   * @throws {BusinessRuleError} Se o material já estiver aprovado (no-op rejeitado, não silencioso).
   */
  async execute({ id, approvedByUserId }: ApproveMaterialInput) {
    const material = await this.materialRepository.findMaterialById(id);
    if (!material) {
      throw new NotFoundError('Material não encontrado.');
    }

    if (material.approved) {
      throw new BusinessRuleError('Material já está aprovado.');
    }

    return this.materialRepository.updateMaterial(id, {
      approved: true,
      approved_by: approvedByUserId,
      approved_at: new Date(),
    });
  }
}

export = ApproveMaterialUseCase;
