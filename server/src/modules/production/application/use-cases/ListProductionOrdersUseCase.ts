/**
 * Use case: listar OPs com filtros e paginacao.
 *
 * @module modules/production/application/use-cases/ListProductionOrdersUseCase
 */

import UseCase from '../../../../shared/application/UseCase';

interface ListProductionOrdersInput {
  page?: number | string;
  limit?: number | string;
  status?: string;
  product_id?: number;
  priority?: string;
  start_date?: string;
  end_date?: string;
}

class ListProductionOrdersUseCase extends UseCase<ListProductionOrdersInput | undefined, Promise<any>> {
  private readonly productionOrderRepository: any;

  /** @param productionOrderRepository - Repositorio de OP. */
  public constructor(productionOrderRepository: any) {
    super();
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * Lista OPs com resumo por status.
   *
   * @param input - Filtros e paginacao.
   * @returns Resultado paginado com summary.
   */
  public async execute(input: ListProductionOrdersInput = {}): Promise<any> {
    const { page = 1, limit = 10, status, product_id, priority, start_date, end_date } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const offset = (p - 1) * l;

    const { count, rows, totals } = await this.productionOrderRepository.list({
      status, product_id, priority, start_date, end_date, limit: l, offset
    });

    return {
      rows,
      count,
      page: p,
      limit: l,
      totalPages: Math.ceil(count / l),
      summary: { total: totals[0], planned: totals[1], in_progress: totals[2], completed: totals[3], overdue: totals[4] }
    };
  }
}

export = ListProductionOrdersUseCase;

