/**
 * `POST /api/jur/lgpd/incidents` — abre incidente de segurança (RF-JUR-040,
 * LGPD art. 48).
 *
 * `dpo_user_id` (Encarregado/DPO responsável pela investigação): mesma
 * reconciliação de `CreateDataSubjectRequestUseCase` — se não informado,
 * assume quem abriu o incidente (`createdBy`).
 *
 * @module modules/juridico/application/use-cases/lgpd/CreateIncidentUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdIncidentRepository from '../../../domain/repositories/LgpdIncidentRepository';
import { ValidationError } from '../../../../../errors';
import type { CreateIncidentInput } from '../../../domain/entities/LgpdTypes';

function toText(value: string[] | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return Array.isArray(value) ? value.join(', ') : value;
}

class CreateIncidentUseCase extends UseCase<CreateIncidentInput, any> {
  private readonly repository: LgpdIncidentRepository;

  public constructor(repository: LgpdIncidentRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {ValidationError} `detected_at`/`description`/`risk_assessment` ausentes (400). */
  public async execute(input: CreateIncidentInput): Promise<any> {
    if (!input.detected_at || !input.description || !input.risk_assessment) {
      throw new ValidationError('detected_at, description e risk_assessment são obrigatórios.');
    }

    const dataCategories = toText(input.data_categories_affected);
    const subjectCategories = toText(input.subject_categories_affected);
    const affectedCategories = [
      dataCategories ? `Dados: ${dataCategories}` : null,
      subjectCategories ? `Titulares: ${subjectCategories}` : null,
    ].filter(Boolean).join(' | ') || null;

    return this.repository.create({
      occurred_at: input.occurred_at ?? null,
      detected_at: input.detected_at,
      description: input.description,
      affected_categories: affectedCategories,
      risk_assessment: input.risk_assessment,
      action_plan: input.action_plan ?? null,
      status: 'open',
      dpo_user_id: input.dpoUserId ?? input.createdBy,
      created_by: input.createdBy,
    });
  }
}

export = CreateIncidentUseCase;
