/**
 * Caso de uso: atualizacao de um projeto de engenharia existente.
 *
 * Se `project_code` for informado, e revalidado quanto a unicidade
 * (ignorando o proprio registro).
 *
 * @module modules/engineering/application/use-cases/UpdateProjectUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ConflictError, NotFoundError } from '../../../../errors';
import EngineeringRepository from '../../domain/repositories/EngineeringRepository';

type UpdateProjectInput = {
  id: number;
  project_code?: string;
  name?: string;
  description?: string | null;
  project_type?: 'new_product' | 'improvement' | 'customization' | 'research';
  product_id?: number | null;
  project_manager_id?: number | null;
  start_date?: string | null;
  target_date?: string | null;
  completion_date?: string | null;
  budget?: number | null;
  actual_cost?: number;
  stage?: 'concept' | 'design' | 'prototype' | 'testing' | 'homologation' | 'production';
  status?: 'active' | 'paused' | 'completed' | 'canceled';
  priority?: 'low' | 'normal' | 'high' | 'critical';
  notes?: string | null;
};

class UpdateProjectUseCase extends UseCase<UpdateProjectInput, any> {
  private readonly engineeringRepository: EngineeringRepository;

  constructor(engineeringRepository: EngineeringRepository) {
    super();
    this.engineeringRepository = engineeringRepository;
  }

  async execute(input: UpdateProjectInput): Promise<any> {
    const { id, ...rest } = input;

    const current = await this.engineeringRepository.findProjectById(id);
    if (!current) {
      throw new NotFoundError('Projeto de engenharia nao encontrado.');
    }

    const updateData: Record<string, unknown> = { ...rest };

    if (typeof rest.project_code === 'string') {
      const normalizedCode = rest.project_code.trim();
      const existing = await this.engineeringRepository.findProjectByCode(normalizedCode);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Ja existe um projeto de engenharia com o codigo ${normalizedCode}.`);
      }
      updateData.project_code = normalizedCode;
    }

    return this.engineeringRepository.updateProject(id, updateData);
  }
}

export = UpdateProjectUseCase;
