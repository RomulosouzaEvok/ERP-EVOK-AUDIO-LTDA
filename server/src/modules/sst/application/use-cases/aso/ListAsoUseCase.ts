/**
 * Use case: listar ASOs — shape RESUMIDO (sem dado clínico na lista,
 * BLOCO_1_SST_API.md §2.2).
 *
 * @module modules/sst/application/use-cases/aso/ListAsoUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AsoRepository from '../../../domain/repositories/AsoRepository';
import { toAsoSummaryDTO } from '../../../infrastructure/mappers/AsoMapper';

class ListAsoUseCase extends UseCase<Record<string, any>, any> {
  private readonly asoRepository: AsoRepository;

  public constructor(asoRepository: AsoRepository) {
    super();
    this.asoRepository = asoRepository;
  }

  /** @param input - Filtros (`employee_id`, `tipo`, `resultado`, `vencendo_em_dias`) e paginação. */
  public async execute(input: Record<string, any>) {
    const { page = '1', limit = '20', ...filters } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const { count, rows } = await this.asoRepository.findAsosAndCount(filters, { limit: l, offset: (p - 1) * l });
    return { rows: rows.map(toAsoSummaryDTO), total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListAsoUseCase;
