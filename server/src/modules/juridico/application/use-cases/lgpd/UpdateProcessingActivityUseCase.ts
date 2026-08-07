/**
 * `PUT /api/jur/lgpd/processing-activities/:id` — atualiza atividade de
 * tratamento (RF-JUR-035).
 *
 * @module modules/juridico/application/use-cases/lgpd/UpdateProcessingActivityUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdActivityRepository from '../../../domain/repositories/LgpdActivityRepository';
import { NotFoundError } from '../../../../../errors';
import type { UpdateProcessingActivityInput } from '../../../domain/entities/LgpdTypes';

function toText(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value.join(', ') : (value as string);
}

class UpdateProcessingActivityUseCase extends UseCase<UpdateProcessingActivityInput, any> {
  private readonly repository: LgpdActivityRepository;

  public constructor(repository: LgpdActivityRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Atividade não encontrada (404). */
  public async execute(input: UpdateProcessingActivityInput): Promise<any> {
    const { id, ...rest } = input;
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundError(`Atividade de tratamento ${id} não encontrada.`);

    const data: Record<string, unknown> = {};
    if ('purpose' in rest) data.purpose = rest.purpose;
    if ('legal_basis' in rest) data.legal_basis = rest.legal_basis;
    if ('data_categories' in rest) data.data_categories = toText(rest.data_categories);
    if ('data_subject_categories' in rest) data.data_subject_categories = toText(rest.data_subject_categories);
    if ('source_system' in rest) data.source_system = rest.source_system;
    if ('sharing' in rest) data.sharing_description = toText(rest.sharing);
    if ('retention_period' in rest) data.retention_period = rest.retention_period;
    if ('security_measures' in rest) data.security_measures = rest.security_measures;
    if ('department_id' in rest) data.department_id = rest.department_id;

    return this.repository.update(id, data);
  }
}

export = UpdateProcessingActivityUseCase;
