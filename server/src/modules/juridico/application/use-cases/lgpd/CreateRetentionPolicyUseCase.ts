/**
 * Cria uma politica de retencao configuravel para o RoPA sem habilitar
 * qualquer exclusao automatica de dados pessoais.
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdRetentionPolicyRepository from '../../../domain/repositories/LgpdRetentionPolicyRepository';
import { ValidationError } from '../../../../../errors';
import type { CreateRetentionPolicyInput } from '../../../domain/entities/LgpdTypes';

const SequelizeLgpdRetentionPolicyRepository = require('../../../infrastructure/sequelize/SequelizeLgpdRetentionPolicyRepository');

class CreateRetentionPolicyUseCase extends UseCase<CreateRetentionPolicyInput, any> {
  private readonly repository: LgpdRetentionPolicyRepository;

  public constructor(repository: LgpdRetentionPolicyRepository = new SequelizeLgpdRetentionPolicyRepository()) {
    super();
    this.repository = repository;
  }

  public async execute(input: CreateRetentionPolicyInput): Promise<any> {
    if (!input.category?.trim() || !input.retention_value?.trim()) {
      throw new ValidationError('category e retention_value sao obrigatorios para criar uma politica de retencao.');
    }

    return this.repository.create({
      category: input.category.trim(),
      retention_value: input.retention_value.trim(),
      ...(input.retention_basis !== undefined ? { retention_basis: input.retention_basis } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.legal_guidance_status !== undefined ? { legal_guidance_status: input.legal_guidance_status } : {}),
      created_by: input.createdBy,
    });
  }
}

export = CreateRetentionPolicyUseCase;
