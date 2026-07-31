import GetDashboardSummaryUseCase = require('../../src/modules/dashboard/application/use-cases/GetDashboardSummaryUseCase');

describe('Use cases de dashboard', () => {
  it('delega a obtenção do resumo ao repositório e retorna os indicadores agregados', async () => {
    const summary = {
      products: { total: 10, low_stock: 2 },
      sales: { month_total: 1000, month_count: 5 },
      purchases: { pending_total: 500 },
      clients: { total: 3 },
      production: { open_orders: 1 },
      financial: { pending_receivable: 200, pending_payable: 100, projected_balance: 100 }
    };
    const dashboardRepository = {
      getSummary: jest.fn(async () => summary),
    };

    const useCase = new GetDashboardSummaryUseCase(dashboardRepository as any);

    const result = await useCase.execute();

    expect(dashboardRepository.getSummary).toHaveBeenCalledTimes(1);
    expect(result).toEqual(summary);
  });
});
