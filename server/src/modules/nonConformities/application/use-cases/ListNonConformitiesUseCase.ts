/**
 * Use case: listar não conformidades com filtros e paginacao.
 *
 * @module modules/nonConformities/application/use-cases/ListNonConformitiesUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import NonConformitiesRepository from '../../domain/repositories/NonConformitiesRepository';

interface ListNonConformitiesInput {
  page?: string | number;
  limit?: string | number;
  status?: string;
  severity?: string;
}

interface ListNonConformitiesOutput {
  rows: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ListNonConformitiesUseCase extends UseCase<ListNonConformitiesInput, ListNonConformitiesOutput> {
  private readonly nonConformitiesRepository: NonConformitiesRepository;

  /** @param nonConformitiesRepository - Repositorio de não conformidades. */
  public constructor(nonConformitiesRepository: NonConformitiesRepository) {
    super();
    this.nonConformitiesRepository = nonConformitiesRepository;
  }

  /**
   * @param input - Filtros e paginacao da listagem.
   * @returns Linhas encontradas, total e dados de paginacao.
   */
  public async execute(input: ListNonConformitiesInput): Promise<ListNonConformitiesOutput> {
    const { page = '1', limit = '10', status, severity } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const o = (p - 1) * l;

    const { count, rows } = await this.nonConformitiesRepository.findAndCountAll(
      { status, severity },
      { limit: l, offset: o }
    );

    return { rows, total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListNonConformitiesUseCase;
