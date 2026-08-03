/**
 * Caso de uso: criacao de um projeto de engenharia (P&D).
 *
 * `project_code` e normalizado (trim) e validado quanto a unicidade antes
 * da persistencia (regra de negocio, nao de schema).
 *
 * @module modules/engineering/application/use-cases/CreateProjectUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ConflictError } from '../../../../errors';
import EngineeringRepository from '../../domain/repositories/EngineeringRepository';

type CreateProjectInput = {
  project_code: string;
  name: string;
  description?: string | null;
  project_type?: 'new_product' | 'improvement' | 'customization' | 'research';
  product_id?: number | null;
  project_manager_id?: number | null;
  start_date?: string | null;
  target_date?: string | null;
  budget?: number | null;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  notes?: string | null;
};

class CreateProjectUseCase extends UseCase<CreateProjectInput, any> {
  private readonly engineeringRepository: EngineeringRepository;

  constructor(engineeringRepository: EngineeringRepository) {
    super();
    this.engineeringRepository = engineeringRepository;
  }

  async execute(input: CreateProjectInput): Promise<any> {
    const normalizedCode = input.project_code.trim();

    const existing = await this.engineeringRepository.findProjectByCode(normalizedCode);
    if (existing) {
      throw new ConflictError(`Ja existe um projeto de engenharia com o codigo ${normalizedCode}.`);
    }

    return this.engineeringRepository.createProject({
      project_code: normalizedCode,
      name: input.name,
      description: input.description ?? null,
      project_type: input.project_type ?? 'new_product',
      product_id: input.product_id ?? null,
      project_manager_id: input.project_manager_id ?? null,
      start_date: input.start_date ?? null,
      target_date: input.target_date ?? null,
      budget: input.budget ?? null,
      priority: input.priority ?? 'normal',
      notes: input.notes ?? null,
    });
  }
}

export = CreateProjectUseCase;
