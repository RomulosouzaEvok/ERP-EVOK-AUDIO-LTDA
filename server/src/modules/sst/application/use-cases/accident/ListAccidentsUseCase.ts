/**
 * Use case: listar acidentes de trabalho.
 *
 * @module modules/sst/application/use-cases/accident/ListAccidentsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AccidentRepository from '../../../domain/repositories/AccidentRepository';
import { toAccidentDTO } from '../../../infrastructure/mappers/AccidentMapper';

class ListAccidentsUseCase extends UseCase<Record<string, any>, any> {
  private readonly accidentRepository: AccidentRepository;

  public constructor(accidentRepository: AccidentRepository) {
    super();
    this.accidentRepository = accidentRepository;
  }

  /** @param input - Filtros (`employee_id`, `tipo`, `gravidade`, `status`, `com_cat`, `start_date`, `end_date`) e paginação. */
  public async execute(input: Record<string, any>) {
    const { page = '1', limit = '20', ...filters } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const { count, rows } = await this.accidentRepository.findAccidentsAndCount(filters, { limit: l, offset: (p - 1) * l });
    return { rows: rows.map(toAccidentDTO), total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListAccidentsUseCase;
