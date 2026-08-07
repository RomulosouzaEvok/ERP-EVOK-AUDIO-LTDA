/**
 * Use case: listar TipoEPI do catálogo (NR-6).
 *
 * @module modules/sst/application/use-cases/epi/ListEpiTypesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EpiRepository from '../../../domain/repositories/EpiRepository';
import { toTipoEpiDTO } from '../../../infrastructure/mappers/EpiMapper';

interface ListEpiTypesInput {
  page?: string | number;
  limit?: string | number;
  active?: string | boolean;
  ca_valido?: string;
  item_id?: string;
}

class ListEpiTypesUseCase extends UseCase<ListEpiTypesInput, { rows: any[]; total: number; page: number; limit: number; totalPages: number }> {
  private readonly epiRepository: EpiRepository;

  /** @param epiRepository - Repositório do cluster EPI. */
  public constructor(epiRepository: EpiRepository) {
    super();
    this.epiRepository = epiRepository;
  }

  /**
   * @param input - Filtros (`active`, `ca_valido`, `item_id`) e paginação.
   * @returns Página de TipoEPI já mapeados para o contrato de API (inglês).
   */
  public async execute(input: ListEpiTypesInput) {
    const { page = '1', limit = '10', ...filters } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const { count, rows } = await this.epiRepository.findTiposAndCount(filters, { limit: l, offset: (p - 1) * l });
    return { rows: rows.map(toTipoEpiDTO), total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListEpiTypesUseCase;
