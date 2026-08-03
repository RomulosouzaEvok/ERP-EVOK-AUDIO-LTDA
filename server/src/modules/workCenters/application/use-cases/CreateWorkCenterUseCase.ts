/**
 * Caso de uso: criacao de um centro de trabalho.
 *
 * O `code` e normalizado para uppercase/trim antes da checagem de unicidade
 * e da persistencia (regra de negocio do centro de trabalho, nao da camada
 * de validacao de schema).
 *
 * @module modules/workCenters/application/use-cases/CreateWorkCenterUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ConflictError } from '../../../../errors';
import WorkCenterRepository from '../../domain/repositories/WorkCenterRepository';

type CreateWorkCenterInput = {
  code: string;
  name: string;
  description?: string | null;
  machines_count?: number;
  capacity_hours_per_day?: number;
  efficiency_factor?: number;
  transaction?: any;
};

class CreateWorkCenterUseCase extends UseCase<CreateWorkCenterInput, any> {
  private readonly workCenterRepository: WorkCenterRepository;

  constructor(workCenterRepository: WorkCenterRepository) {
    super();
    this.workCenterRepository = workCenterRepository;
  }

  async execute(input: CreateWorkCenterInput): Promise<any> {
    const normalizedCode = input.code.trim().toUpperCase();

    const existing = await this.workCenterRepository.findWorkCenterByCode(normalizedCode);
    if (existing) {
      throw new ConflictError(`Ja existe um centro de trabalho com o codigo ${normalizedCode}.`);
    }

    return this.workCenterRepository.createWorkCenter({
      code: normalizedCode,
      name: input.name,
      description: input.description ?? null,
      machines_count: input.machines_count ?? 1,
      capacity_hours_per_day: input.capacity_hours_per_day ?? 8,
      efficiency_factor: input.efficiency_factor ?? 1,
    }, input.transaction);
  }
}

export = CreateWorkCenterUseCase;
