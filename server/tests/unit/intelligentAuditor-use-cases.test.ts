import AuditStockUseCase = require('../../src/modules/intelligentAuditor/application/use-cases/AuditStockUseCase');
import AuditFinancialUseCase = require('../../src/modules/intelligentAuditor/application/use-cases/AuditFinancialUseCase');

describe('Use cases do auditor inteligente', () => {
  it('delega a auditoria de estoque ao repositório e retorna o resultado', async () => {
    const result = { negative_stock: [], no_movement: [], summary: { total_negative: 0, total_no_movement: 0, products_audited: 10 } };
    const intelligentAuditorRepository = {
      auditStock: jest.fn(async () => result),
    };

    const useCase = new AuditStockUseCase(intelligentAuditorRepository as any);

    const data = await useCase.execute();

    expect(intelligentAuditorRepository.auditStock).toHaveBeenCalledTimes(1);
    expect(data).toEqual(result);
  });

  it('delega a auditoria financeira ao repositório e retorna o resultado', async () => {
    const result = {
      overdue_receivable: { count: 2, total: 500 },
      overdue_payable: { count: 1, total: 100 },
      receivable_by_status: [],
      payable_by_status: []
    };
    const intelligentAuditorRepository = {
      auditFinancial: jest.fn(async () => result),
    };

    const useCase = new AuditFinancialUseCase(intelligentAuditorRepository as any);

    const data = await useCase.execute();

    expect(intelligentAuditorRepository.auditFinancial).toHaveBeenCalledTimes(1);
    expect(data).toEqual(result);
  });
});
