/**
 * Use case: listar PlanoExames (PCMSO).
 *
 * @module modules/sst/application/use-cases/aso/ListExamPlansUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AsoRepository from '../../../domain/repositories/AsoRepository';
import { toExamPlanDTO } from '../../../infrastructure/mappers/AsoMapper';

class ListExamPlansUseCase extends UseCase<Record<string, any>, any> {
  private readonly asoRepository: AsoRepository;

  public constructor(asoRepository: AsoRepository) {
    super();
    this.asoRepository = asoRepository;
  }

  /** @param input - Filtros (`position`, `ges_id`) e paginação. */
  public async execute(input: Record<string, any>) {
    const { page = '1', limit = '20', ...filters } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const { count, rows } = await this.asoRepository.findExamPlansAndCount(filters, { limit: l, offset: (p - 1) * l });
    return { rows: rows.map(toExamPlanDTO), total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListExamPlansUseCase;
