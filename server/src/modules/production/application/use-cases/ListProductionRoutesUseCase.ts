/**
 * Use case: listar roteiros de producao (gap G5).
 *
 * @module modules/production/application/use-cases/ListProductionRoutesUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import type ProductionRouteRepository from '../../domain/repositories/ProductionRouteRepository';

/** Entrada da listagem de roteiros. */
interface ListProductionRoutesInput {
  product_id?: number;
  status?: string;
  route_code?: string;
  search?: string;
  page: number;
  limit: number;
  offset: number;
}

class ListProductionRoutesUseCase extends UseCase<ListProductionRoutesInput, any> {
  private readonly productionRouteRepository: ProductionRouteRepository;

  /** @param productionRouteRepository - Repositorio de roteiro. */
  public constructor(productionRouteRepository: ProductionRouteRepository) {
    super();
    this.productionRouteRepository = productionRouteRepository;
  }

  /**
   * Lista roteiros paginados.
   *
   * @param input - Filtros e paginacao ja normalizados pelo controller.
   * @returns `{ rows, count, page, limit, totalPages }`.
   */
  public async execute(input: ListProductionRoutesInput): Promise<any> {
    const { rows, count } = await this.productionRouteRepository.listRoutes(
      {
        product_id: input.product_id,
        status: input.status,
        route_code: input.route_code,
        search: input.search,
      },
      { limit: input.limit, offset: input.offset },
    );

    return {
      rows,
      count,
      page: input.page,
      limit: input.limit,
      totalPages: Math.ceil(count / input.limit) || 0,
    };
  }
}

export = ListProductionRoutesUseCase;
