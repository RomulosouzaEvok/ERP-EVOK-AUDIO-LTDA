/**
 * Use case: listar itens do inventário de riscos ocupacionais (PGR/GRO).
 *
 * @module modules/sst/application/use-cases/pgr/ListRisksUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import PgrRepository from '../../../domain/repositories/PgrRepository';
import { toRiskDTO } from '../../../infrastructure/mappers/PgrMapper';

class ListRisksUseCase extends UseCase<Record<string, any>, any> {
  private readonly pgrRepository: PgrRepository;

  public constructor(pgrRepository: PgrRepository) {
    super();
    this.pgrRepository = pgrRepository;
  }

  /** @param input - Filtros (`department_id`, `categoria_agente`, `revisao_vencida`) e paginação. */
  public async execute(input: Record<string, any>) {
    const { page = '1', limit = '20', ...filters } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const { count, rows } = await this.pgrRepository.findRisksAndCount(filters, { limit: l, offset: (p - 1) * l });
    return { rows: rows.map(toRiskDTO), total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListRisksUseCase;
