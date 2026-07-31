/**
 * Use case: obter indicadores agregados do dashboard principal.
 *
 * @module modules/dashboard/application/use-cases/GetDashboardSummaryUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import DashboardRepository from '../../domain/repositories/DashboardRepository';

class GetDashboardSummaryUseCase extends UseCase<void, any> {
  private readonly dashboardRepository: DashboardRepository;

  /** @param dashboardRepository - Repositorio de indicadores do dashboard. */
  public constructor(dashboardRepository: DashboardRepository) {
    super();
    this.dashboardRepository = dashboardRepository;
  }

  /** @returns Indicadores agregados (produtos, vendas, compras, clientes, produção, financeiro). */
  public async execute(): Promise<any> {
    return this.dashboardRepository.getSummary();
  }
}

export = GetDashboardSummaryUseCase;
