/**
 * Caso de uso: atualizacao de um centro de trabalho existente.
 *
 * Se `code` for informado, e normalizado (uppercase/trim) e revalidado
 * quanto a unicidade (ignorando o proprio registro).
 *
 * @module modules/workCenters/application/use-cases/UpdateWorkCenterUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ConflictError, NotFoundError } from '../../../../errors';
import WorkCenterRepository from '../../domain/repositories/WorkCenterRepository';

type UpdateWorkCenterInput = {
  id: number;
  code?: string;
  name?: string;
  description?: string | null;
  machines_count?: number;
  capacity_hours_per_day?: number;
  efficiency_factor?: number;
  active?: boolean;
};

class UpdateWorkCenterUseCase extends UseCase<UpdateWorkCenterInput, any> {
  private readonly workCenterRepository: WorkCenterRepository;

  constructor(workCenterRepository: WorkCenterRepository) {
    super();
    this.workCenterRepository = workCenterRepository;
  }

  async execute(input: UpdateWorkCenterInput): Promise<any> {
    const { id, ...rest } = input;

    const current = await this.workCenterRepository.findWorkCenterById(id);
    if (!current) {
      throw new NotFoundError('Centro de trabalho nao encontrado.');
    }

    const updateData: Record<string, unknown> = { ...rest };

    if (typeof rest.code === 'string') {
      const normalizedCode = rest.code.trim().toUpperCase();
      const existing = await this.workCenterRepository.findWorkCenterByCode(normalizedCode);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Ja existe um centro de trabalho com o codigo ${normalizedCode}.`);
      }
      updateData.code = normalizedCode;
    }

    return this.workCenterRepository.updateWorkCenter(id, updateData);
  }
}

export = UpdateWorkCenterUseCase;
