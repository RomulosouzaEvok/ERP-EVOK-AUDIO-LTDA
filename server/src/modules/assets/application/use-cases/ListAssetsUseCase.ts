/**
 * Use case: listar ativos com filtros e paginacao.
 *
 * @module modules/assets/application/use-cases/ListAssetsUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import AssetsRepository from '../../domain/repositories/AssetsRepository';

interface ListAssetsInput {
  page?: string | number;
  limit?: string | number;
  status?: string;
  department_id?: string | number;
}

interface ListAssetsOutput {
  rows: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ListAssetsUseCase extends UseCase<ListAssetsInput, ListAssetsOutput> {
  private readonly assetsRepository: AssetsRepository;

  /** @param assetsRepository - Repositorio de ativos. */
  public constructor(assetsRepository: AssetsRepository) {
    super();
    this.assetsRepository = assetsRepository;
  }

  /**
   * @param input - Filtros e paginacao da listagem.
   * @returns Linhas encontradas, total e dados de paginacao.
   */
  public async execute(input: ListAssetsInput): Promise<ListAssetsOutput> {
    const { page = '1', limit = '10', status, department_id } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const o = (p - 1) * l;

    const { count, rows } = await this.assetsRepository.findAndCountAll(
      { status, department_id },
      { limit: l, offset: o }
    );

    return { rows, total: count, page: p, limit: l, totalPages: Math.ceil(count / l) };
  }
}

export = ListAssetsUseCase;
