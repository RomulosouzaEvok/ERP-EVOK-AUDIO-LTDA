/**
 * Use case: listar Registros de DDS (Diálogo Diário/Semanal de Segurança).
 *
 * @module modules/sst/application/use-cases/safetyRoutine/ListDdsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import SafetyRoutineRepository from '../../../domain/repositories/SafetyRoutineRepository';
import { toDdsDTO } from '../../../infrastructure/mappers/SafetyRoutineMapper';

class ListDdsUseCase extends UseCase<Record<string, any>, any> {
  private readonly repository: SafetyRoutineRepository;

  public constructor(repository: SafetyRoutineRepository) {
    super();
    this.repository = repository;
  }

  public async execute(input: Record<string, any>) {
    const { page = '1', limit = '20', ...filters } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const { count, rows } = await this.repository.findDdsAndCount(filters, { limit: l, offset: (p - 1) * l });
    return { rows: rows.map(toDdsDTO), total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListDdsUseCase;
