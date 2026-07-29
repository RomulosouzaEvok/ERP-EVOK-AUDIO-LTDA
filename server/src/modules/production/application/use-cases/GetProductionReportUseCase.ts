/**
 * Use case: relatorio de producao.
 *
 * @module modules/production/application/use-cases/GetProductionReportUseCase
 */

import UseCase from '../../../../shared/application/UseCase';

class GetProductionReportUseCase extends UseCase<{ start_date?: string; end_date?: string } | undefined, Promise<any>> {
  private readonly productionOrderRepository: any;

  /** @param productionOrderRepository - Repositorio de OP. */
  public constructor(productionOrderRepository: any) {
    super();
    this.productionOrderRepository = productionOrderRepository;
  }

  /**
   * Gera relatorio de producao por periodo.
   *
   * @param input - Periodo opcional.
   * @returns Resumo, distribuicao por status e detalhes.
   */
  public async execute(input: { start_date?: string; end_date?: string } = {}): Promise<any> {
    const { start_date, end_date } = input;
    const orders = await this.productionOrderRepository.listForReport({ start_date, end_date });
    const totalPlanned = orders.reduce((sum: number, order: any) => sum + Number(order.quantity || 0), 0);
    const totalProduced = orders.reduce((sum: number, order: any) => sum + Number(order.quantity_produced || 0), 0);
    const completionRate = totalPlanned > 0 ? (totalProduced / totalPlanned) * 100 : 0;
    const byStatus: Record<string, number> = { planned: 0, released: 0, in_progress: 0, completed: 0, paused: 0, canceled: 0 };
    orders.forEach((order: any) => { if (byStatus[order.status] !== undefined) byStatus[order.status] += 1; });

    return {
      period: { start_date, end_date },
      summary: {
        total_orders: orders.length,
        total_planned: totalPlanned,
        total_produced: totalProduced,
        completion_rate: `${completionRate.toFixed(2)}%`
      },
      by_status: byStatus,
      details: orders
    };
  }
}

export = GetProductionReportUseCase;
