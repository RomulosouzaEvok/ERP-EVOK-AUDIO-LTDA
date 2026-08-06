/**
 * Use case: obter demandas em aberto por departamento (painel de TV).
 *
 * @module modules/dashboard/application/use-cases/GetDepartmentDemandsUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import DashboardRepository from '../../domain/repositories/DashboardRepository';

class GetDepartmentDemandsUseCase extends UseCase<void, any> {
  private readonly dashboardRepository: DashboardRepository;

  /** @param dashboardRepository - Repositorio de indicadores do dashboard. */
  public constructor(dashboardRepository: DashboardRepository) {
    super();
    this.dashboardRepository = dashboardRepository;
  }

  /**
   * @returns Lista de grupos por departamento (departamentos ativos, em
   * ordem alfabética, seguidos do grupo agregado "Sem departamento"), cada
   * um com a contagem e a lista resumida de OPs, requisições de compra e
   * contagens de inventário em aberto.
   */
  public async execute(): Promise<any> {
    return this.dashboardRepository.getDepartmentDemands();
  }
}

export = GetDepartmentDemandsUseCase;
