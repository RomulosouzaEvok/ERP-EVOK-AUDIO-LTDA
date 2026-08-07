/**
 * Use case: listar inspeções de segurança.
 *
 * @module modules/sst/application/use-cases/safetyRoutine/ListInspectionsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import SafetyRoutineRepository from '../../../domain/repositories/SafetyRoutineRepository';
import { toInspectionDTO } from '../../../infrastructure/mappers/SafetyRoutineMapper';

class ListInspectionsUseCase extends UseCase<Record<string, any>, any> {
  private readonly repository: SafetyRoutineRepository;

  public constructor(repository: SafetyRoutineRepository) {
    super();
    this.repository = repository;
  }

  /** @param input - Filtros (`department_id`, `data`, `tem_nc`) e paginação. */
  public async execute(input: Record<string, any>) {
    const { page = '1', limit = '20', ...filters } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const { count, rows } = await this.repository.findInspectionsAndCount(filters, { limit: l, offset: (p - 1) * l });
    return { rows: rows.map(toInspectionDTO), total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListInspectionsUseCase;
