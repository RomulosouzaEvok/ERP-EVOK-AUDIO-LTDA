/**
 * Use case: listar EntregaEPI (Ficha de EPI).
 *
 * @module modules/sst/application/use-cases/epi/ListEpiDeliveriesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EpiRepository from '../../../domain/repositories/EpiRepository';
import { toEntregaDTO } from '../../../infrastructure/mappers/EpiMapper';

class ListEpiDeliveriesUseCase extends UseCase<Record<string, any>, any> {
  private readonly epiRepository: EpiRepository;

  public constructor(epiRepository: EpiRepository) {
    super();
    this.epiRepository = epiRepository;
  }

  /**
   * @param input - Filtros (`employee_id`, `epi_type_id`, `status`, `motivo`, `vencendo_em_dias`) e paginação.
   * @returns Página de EntregaEPI.
   */
  public async execute(input: Record<string, any>) {
    const { page = '1', limit = '20', ...filters } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const { count, rows } = await this.epiRepository.findEntregasAndCount(filters, { limit: l, offset: (p - 1) * l });
    return { rows: rows.map(toEntregaDTO), total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListEpiDeliveriesUseCase;
