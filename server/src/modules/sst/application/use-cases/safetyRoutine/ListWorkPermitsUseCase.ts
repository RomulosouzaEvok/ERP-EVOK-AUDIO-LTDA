/**
 * Use case: listar Permissões de Trabalho (PT).
 *
 * @module modules/sst/application/use-cases/safetyRoutine/ListWorkPermitsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import SafetyRoutineRepository from '../../../domain/repositories/SafetyRoutineRepository';
import { toWorkPermitDTO } from '../../../infrastructure/mappers/SafetyRoutineMapper';

class ListWorkPermitsUseCase extends UseCase<Record<string, any>, any> {
  private readonly repository: SafetyRoutineRepository;

  public constructor(repository: SafetyRoutineRepository) {
    super();
    this.repository = repository;
  }

  public async execute(input: Record<string, any>) {
    const { page = '1', limit = '20', ...filters } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const { count, rows } = await this.repository.findWorkPermitsAndCount(filters, { limit: l, offset: (p - 1) * l });
    return { rows: rows.map(toWorkPermitDTO), total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListWorkPermitsUseCase;
