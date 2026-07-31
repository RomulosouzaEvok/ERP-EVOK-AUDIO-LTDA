jest.mock('../../src/models/index', () => ({
  Product: { count: jest.fn() },
  Sale: { sum: jest.fn(), count: jest.fn() },
  Purchase: { sum: jest.fn() },
  ProductionOrder: { count: jest.fn() },
  AccountReceivable: { sum: jest.fn() },
  AccountPayable: { sum: jest.fn() },
  Client: { count: jest.fn() },
}));

const { Product, Sale, Purchase, ProductionOrder, AccountReceivable, AccountPayable, Client } = require('../../src/models/index');
import SequelizeDashboardRepository = require('../../src/modules/dashboard/infrastructure/sequelize/SequelizeDashboardRepository');

describe('SequelizeDashboardRepository.getSummary — cobertura da query real (achado de auditoria)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('agrega os indicadores reais de cada model, nao apenas repassa um objeto mockado', async () => {
    Product.count
      .mockResolvedValueOnce(42) // total ativos
      .mockResolvedValueOnce(7); // low_stock
    Sale.sum.mockResolvedValue(15000.5);
    Sale.count.mockResolvedValue(12);
    Purchase.sum.mockResolvedValue(3200);
    Client.count.mockResolvedValue(30);
    ProductionOrder.count.mockResolvedValue(4);
    AccountReceivable.sum.mockResolvedValue(9000);
    AccountPayable.sum.mockResolvedValue(2000);

    const repository = new SequelizeDashboardRepository();
    const summary = await repository.getSummary();

    expect(summary).toEqual({
      products: { total: 42, low_stock: 7 },
      sales: { month_total: 15000.5, month_count: 12 },
      purchases: { pending_total: 3200 },
      clients: { total: 30 },
      production: { open_orders: 4 },
      financial: { pending_receivable: 9000, pending_payable: 2000, projected_balance: 7000 },
    });
  });

  it('trata ausencia de vendas/contas no periodo como zero, nao undefined/NaN', async () => {
    Product.count.mockResolvedValue(0);
    Sale.sum.mockResolvedValue(null); // Sequelize .sum() retorna null quando nao ha linhas
    Sale.count.mockResolvedValue(0);
    Purchase.sum.mockResolvedValue(null);
    Client.count.mockResolvedValue(0);
    ProductionOrder.count.mockResolvedValue(0);
    AccountReceivable.sum.mockResolvedValue(null);
    AccountPayable.sum.mockResolvedValue(null);

    const repository = new SequelizeDashboardRepository();
    const summary = await repository.getSummary();

    expect(summary.sales.month_total).toBe(0);
    expect(summary.purchases.pending_total).toBe(0);
    expect(summary.financial.projected_balance).toBe(0);
  });
});
