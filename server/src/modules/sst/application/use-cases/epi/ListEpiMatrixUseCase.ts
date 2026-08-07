/**
 * Use case: listar a MatrizEPI (função/setor × EPI).
 *
 * @module modules/sst/application/use-cases/epi/ListEpiMatrixUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EpiRepository from '../../../domain/repositories/EpiRepository';
import { toMatrizDTO } from '../../../infrastructure/mappers/EpiMapper';

class ListEpiMatrixUseCase extends UseCase<Record<string, any>, any> {
  private readonly epiRepository: EpiRepository;

  public constructor(epiRepository: EpiRepository) {
    super();
    this.epiRepository = epiRepository;
  }

  /**
   * @param input - Filtros (`position`, `department_id`, `epi_type_id`) e paginação.
   * @returns Página de vínculos da matriz.
   */
  public async execute(input: Record<string, any>) {
    const { page = '1', limit = '20', ...filters } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const { count, rows } = await this.epiRepository.findMatrizAndCount(filters, { limit: l, offset: (p - 1) * l });
    return { rows: rows.map(toMatrizDTO), total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListEpiMatrixUseCase;
