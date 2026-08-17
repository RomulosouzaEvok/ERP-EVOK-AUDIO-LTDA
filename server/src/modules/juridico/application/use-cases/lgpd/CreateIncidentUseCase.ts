/**
 * `POST /api/jur/lgpd/incidents` - abre incidente de seguranca (RF-JUR-040,
 * LGPD art. 48).
 *
 * `dpo_user_id` (Encarregado/DPO responsavel pela investigacao): se o
 * payload nao trouxer o id explicitamente, o use case resolve o DPO ativo
 * configurado; se nao houver DPO ativo, falha de forma clara em vez de
 * gravar o usuario que abriu o incidente como fallback silencioso.
 *
 * `assessment_due_at` (D4): prazo operacional interno de 72h a partir de
 * `detected_at` para iniciar a avaliacao do incidente.
 *
 * @module modules/juridico/application/use-cases/lgpd/CreateIncidentUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdIncidentRepository from '../../../domain/repositories/LgpdIncidentRepository';
import LgpdDpoDesignationRepository from '../../../domain/repositories/LgpdDpoDesignationRepository';
import { ValidationError } from '../../../../../errors';
import type { CreateIncidentInput } from '../../../domain/entities/LgpdTypes';

const SequelizeLgpdDpoDesignationRepository = require('../../../infrastructure/sequelize/SequelizeLgpdDpoDesignationRepository');

function toText(value: string[] | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return Array.isArray(value) ? value.join(', ') : value;
}

class CreateIncidentUseCase extends UseCase<CreateIncidentInput, any> {
  private readonly repository: LgpdIncidentRepository;
  private readonly dpoDesignationRepository: LgpdDpoDesignationRepository;

  public constructor(
    repository: LgpdIncidentRepository,
    dpoDesignationRepository: LgpdDpoDesignationRepository = new SequelizeLgpdDpoDesignationRepository(),
  ) {
    super();
    this.repository = repository;
    this.dpoDesignationRepository = dpoDesignationRepository;
  }

  private async resolveDpoUserId(input: CreateIncidentInput): Promise<number> {
    if (input.dpoUserId !== undefined && input.dpoUserId !== null) {
      return Number(input.dpoUserId);
    }

    const activeDesignation = await this.dpoDesignationRepository.findActive();
    if (!activeDesignation?.user_id) {
      throw new ValidationError('Nenhum DPO ativo configurado. Cadastre uma designacao formal antes de abrir o incidente.');
    }

    return Number(activeDesignation.user_id);
  }

  /** @throws {ValidationError} `detected_at`/`description`/`risk_assessment` ausentes (400). */
  public async execute(input: CreateIncidentInput): Promise<any> {
    if (!input.detected_at || !input.description || !input.risk_assessment) {
      throw new ValidationError('detected_at, description e risk_assessment sao obrigatorios.');
    }

    const detectedAt = new Date(input.detected_at);
    if (Number.isNaN(detectedAt.getTime())) {
      throw new ValidationError('detected_at deve ser uma data valida.');
    }

    const dataCategories = toText(input.data_categories_affected);
    const subjectCategories = toText(input.subject_categories_affected);
    const affectedCategories = [
      dataCategories ? `Dados: ${dataCategories}` : null,
      subjectCategories ? `Titulares: ${subjectCategories}` : null,
    ].filter(Boolean).join(' | ') || null;
    const assessmentDueAt = new Date(detectedAt);
    assessmentDueAt.setHours(assessmentDueAt.getHours() + 72);
    const dpoUserId = await this.resolveDpoUserId(input);

    return this.repository.create({
      occurred_at: input.occurred_at ?? null,
      detected_at: detectedAt,
      description: input.description,
      affected_categories: affectedCategories,
      risk_assessment: input.risk_assessment,
      action_plan: input.action_plan ?? null,
      status: 'open',
      dpo_user_id: dpoUserId,
      assessment_due_at: assessmentDueAt,
      created_by: input.createdBy,
    });
  }
}

export = CreateIncidentUseCase;
