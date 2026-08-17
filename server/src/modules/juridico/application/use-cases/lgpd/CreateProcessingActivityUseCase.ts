/**
 * `POST /api/jur/lgpd/processing-activities` - cadastra atividade de
 * tratamento (RoPA, RF-JUR-035, LGPD art. 37).
 *
 * @module modules/juridico/application/use-cases/lgpd/CreateProcessingActivityUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdActivityRepository from '../../../domain/repositories/LgpdActivityRepository';
import LgpdRetentionPolicyRepository from '../../../domain/repositories/LgpdRetentionPolicyRepository';
import { ValidationError, NotFoundError } from '../../../../../errors';
import type { CreateProcessingActivityInput, LegalBasis } from '../../../domain/entities/LgpdTypes';

const SequelizeLgpdRetentionPolicyRepository = require('../../../infrastructure/sequelize/SequelizeLgpdRetentionPolicyRepository');

const LEGAL_BASIS_VALUES: LegalBasis[] = [
  'consent', 'legal_obligation', 'public_administration', 'research', 'contract_execution',
  'judicial_process', 'life_protection', 'health_protection', 'legitimate_interest', 'credit_protection',
];

function toText(value: string[] | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return Array.isArray(value) ? value.join(', ') : value;
}

class CreateProcessingActivityUseCase extends UseCase<CreateProcessingActivityInput, any> {
  private readonly repository: LgpdActivityRepository;
  private readonly retentionPolicyRepository: LgpdRetentionPolicyRepository;

  public constructor(
    repository: LgpdActivityRepository,
    retentionPolicyRepository: LgpdRetentionPolicyRepository = new SequelizeLgpdRetentionPolicyRepository(),
  ) {
    super();
    this.repository = repository;
    this.retentionPolicyRepository = retentionPolicyRepository;
  }

  /**
   * @throws {ValidationError} `purpose`/`legal_basis`/`data_categories`/`data_subject_categories`/`department_id` ausentes ou `legal_basis` invalido (400).
   * @throws {NotFoundError} `department_id` nao existe (404).
   */
  public async execute(input: CreateProcessingActivityInput): Promise<any> {
    if (!input.purpose || !input.legal_basis || !input.data_categories || !input.data_subject_categories || !input.department_id) {
      throw new ValidationError('purpose, legal_basis, data_categories, data_subject_categories e department_id sao obrigatorios.');
    }
    if (!LEGAL_BASIS_VALUES.includes(input.legal_basis)) {
      throw new ValidationError(`legal_basis deve ser um de: ${LEGAL_BASIS_VALUES.join(', ')}.`);
    }
    if (input.retentionPolicyId === undefined || input.retentionPolicyId === null) {
      throw new ValidationError('retentionPolicyId e obrigatorio para estruturar a retencao por categoria.');
    }

    const { Department } = require('../../../../../models/index');
    const department = await Department.findByPk(input.department_id);
    if (!department) throw new NotFoundError(`Departamento ${input.department_id} nao encontrado.`);

    const retentionPolicy = await this.retentionPolicyRepository.findActiveById(input.retentionPolicyId);
    if (!retentionPolicy) {
      throw new NotFoundError(`Politica de retencao ${input.retentionPolicyId} nao encontrada ou inativa.`);
    }

    const nextReview = new Date();
    nextReview.setFullYear(nextReview.getFullYear() + 1);

    return this.repository.create({
      purpose: input.purpose,
      legal_basis: input.legal_basis,
      data_categories: toText(input.data_categories),
      data_subject_categories: toText(input.data_subject_categories),
      source_system: input.source_system ?? null,
      sharing_description: toText(input.sharing),
      retention_period: retentionPolicy.retention_value,
      retention_policy_id: retentionPolicy.id,
      security_measures: input.security_measures ?? null,
      department_id: input.department_id,
      next_review_due_at: nextReview.toISOString().slice(0, 10),
      created_by: input.createdBy,
    });
  }
}

export = CreateProcessingActivityUseCase;
