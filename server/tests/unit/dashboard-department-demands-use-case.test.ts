/**
 * Test: `GetDepartmentDemandsUseCase` — delega a agregacao do painel de TV
 * ao repositório do dashboard.
 *
 * @group unit
 */

import GetDepartmentDemandsUseCase = require('../../src/modules/dashboard/application/use-cases/GetDepartmentDemandsUseCase');

describe('GetDepartmentDemandsUseCase', () => {
  it('delega a obtenção das demandas por departamento ao repositório e retorna a lista de grupos', async () => {
    const groups = [
      {
        department_id: 1,
        department_name: 'Producao',
        open_production_orders: { count: 1, items: [] },
        open_purchase_requisitions: { count: 0, items: [] },
        open_inventory_counts: { count: 0, items: [] },
      },
      {
        department_id: null,
        department_name: 'Sem departamento',
        open_production_orders: { count: 0, items: [] },
        open_purchase_requisitions: { count: 0, items: [] },
        open_inventory_counts: { count: 0, items: [] },
      },
    ];
    const dashboardRepository = {
      getDepartmentDemands: jest.fn(async () => groups),
    };

    const useCase = new GetDepartmentDemandsUseCase(dashboardRepository as any);
    const result = await useCase.execute();

    expect(dashboardRepository.getDepartmentDemands).toHaveBeenCalledTimes(1);
    expect(result).toEqual(groups);
  });
});
