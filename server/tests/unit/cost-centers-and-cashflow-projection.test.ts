/**
 * Test: módulo Financeiro — Centros de Custo + Projeção de Fluxo de Caixa Diária
 *
 * Cobre (gap "fluxo projetado, centros de custo" de
 * docs/LEVANTAMENTO_ERP_2026-08-02.md):
 * - CreateCostCenterUseCase / UpdateCostCenterUseCase: CRUD com normalização
 *   de `code` e 409 (ConflictError) em código duplicado.
 * - UpdatePayableCostCenterUseCase / UpdateReceivableCostCenterUseCase:
 *   atribuição de centro de custo a conta a pagar/receber existente, com 404
 *   (NotFoundError) quando a conta ou o centro não existem.
 * - CreatePayableUseCase: `cost_center_id` opcional flui até a persistência.
 * - GetCostCenterReportUseCase: agregação por centro de custo, sempre
 *   incluindo o grupo "Sem centro de custo".
 * - GetDailyCashFlowProjectionUseCase: série diária com saldo acumulado,
 *   menor saldo do período e horizontes 30/60/90 dias.
 */

import CreateCostCenterUseCase = require('../../src/modules/financial/application/use-cases/CreateCostCenterUseCase');
import UpdateCostCenterUseCase = require('../../src/modules/financial/application/use-cases/UpdateCostCenterUseCase');
import ListCostCentersUseCase = require('../../src/modules/financial/application/use-cases/ListCostCentersUseCase');
import UpdatePayableCostCenterUseCase = require('../../src/modules/financial/application/use-cases/UpdatePayableCostCenterUseCase');
import UpdateReceivableCostCenterUseCase = require('../../src/modules/financial/application/use-cases/UpdateReceivableCostCenterUseCase');
import CreatePayableUseCase = require('../../src/modules/financial/application/use-cases/CreatePayableUseCase');
import GetCostCenterReportUseCase = require('../../src/modules/financial/application/use-cases/GetCostCenterReportUseCase');
import GetDailyCashFlowProjectionUseCase = require('../../src/modules/financial/application/use-cases/GetDailyCashFlowProjectionUseCase');
import { ConflictError, NotFoundError } from '../../src/errors';

describe('CreateCostCenterUseCase', () => {
  it('normaliza o code (uppercase/trim) e cria o centro de custo', async () => {
    const costCenterRepository = {
      findCostCenterByCode: jest.fn(async () => null),
      createCostCenter: jest.fn(async (data: any) => ({ id: 1, ...data })),
    };

    const useCase = new CreateCostCenterUseCase(costCenterRepository as any);
    const result = await useCase.execute({ code: '  producao  ', name: 'Produção' });

    expect(costCenterRepository.findCostCenterByCode).toHaveBeenCalledWith('PRODUCAO');
    expect(costCenterRepository.createCostCenter).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Produção', description: null })
    );
    expect(result).toMatchObject({ id: 1, name: 'Produção' });
  });

  it('rejeita code duplicado com ConflictError (409)', async () => {
    const costCenterRepository = {
      findCostCenterByCode: jest.fn(async () => ({ id: 9, code: 'ADM' })),
      createCostCenter: jest.fn(),
    };

    const useCase = new CreateCostCenterUseCase(costCenterRepository as any);

    await expect(useCase.execute({ code: 'adm', name: 'Administrativo' })).rejects.toBeInstanceOf(ConflictError);
    expect(costCenterRepository.createCostCenter).not.toHaveBeenCalled();
  });
});

describe('UpdateCostCenterUseCase', () => {
  it('lança NotFoundError (404) se o centro de custo não existir', async () => {
    const costCenterRepository = {
      findCostCenterById: jest.fn(async () => null),
      findCostCenterByCode: jest.fn(),
      updateCostCenter: jest.fn(),
    };

    const useCase = new UpdateCostCenterUseCase(costCenterRepository as any);

    await expect(useCase.execute({ id: 999, name: 'Novo nome' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita code duplicado de outro centro com ConflictError (409)', async () => {
    const costCenterRepository = {
      findCostCenterById: jest.fn(async (id: number) => ({ id, code: 'ADM' })),
      findCostCenterByCode: jest.fn(async () => ({ id: 999, code: 'VENDAS' })),
      updateCostCenter: jest.fn(),
    };

    const useCase = new UpdateCostCenterUseCase(costCenterRepository as any);

    await expect(useCase.execute({ id: 1, code: 'vendas' })).rejects.toBeInstanceOf(ConflictError);
    expect(costCenterRepository.updateCostCenter).not.toHaveBeenCalled();
  });

  it('permite desativação lógica via active: false, sem delete físico', async () => {
    const costCenterRepository = {
      findCostCenterById: jest.fn(async (id: number) => ({ id, code: 'ADM' })),
      findCostCenterByCode: jest.fn(),
      updateCostCenter: jest.fn(async (id: number, data: any) => ({ id, code: 'ADM', ...data })),
    };

    const useCase = new UpdateCostCenterUseCase(costCenterRepository as any);
    const result = await useCase.execute({ id: 1, active: false });

    expect(costCenterRepository.updateCostCenter).toHaveBeenCalledWith(1, { active: false });
    expect(result).toMatchObject({ active: false });
  });
});

describe('ListCostCentersUseCase', () => {
  it('calcula paginação a partir de count/limit', async () => {
    const costCenterRepository = {
      listCostCenters: jest.fn(async () => ({ rows: [{ id: 1 }, { id: 2 }], count: 25 })),
    };

    const useCase = new ListCostCentersUseCase(costCenterRepository as any);
    const result = await useCase.execute({ page: 1, limit: 20, offset: 0 });

    expect(result.totalPages).toBe(2);
    expect(result.count).toBe(25);
  });
});

describe('UpdatePayableCostCenterUseCase', () => {
  it('atribui o centro de custo a uma conta a pagar existente', async () => {
    const financialRepository = {
      findPayableById: jest.fn(async (id: number) => ({ id, description: 'Fornecedor X' })),
      updatePayableCostCenter: jest.fn(async (id: number, costCenterId: number | null) => ({ id, cost_center_id: costCenterId })),
    };
    const costCenterRepository = {
      findCostCenterById: jest.fn(async (id: number) => ({ id, code: 'ADM' })),
    };

    const useCase = new UpdatePayableCostCenterUseCase(financialRepository as any, costCenterRepository as any);
    const result = await useCase.execute({ id: 1, cost_center_id: 5 });

    expect(costCenterRepository.findCostCenterById).toHaveBeenCalledWith(5);
    expect(financialRepository.updatePayableCostCenter).toHaveBeenCalledWith(1, 5);
    expect(result).toMatchObject({ cost_center_id: 5 });
  });

  it('permite remover o centro de custo com cost_center_id: null (sem checar existência de centro)', async () => {
    const financialRepository = {
      findPayableById: jest.fn(async (id: number) => ({ id })),
      updatePayableCostCenter: jest.fn(async (id: number, costCenterId: number | null) => ({ id, cost_center_id: costCenterId })),
    };
    const costCenterRepository = { findCostCenterById: jest.fn() };

    const useCase = new UpdatePayableCostCenterUseCase(financialRepository as any, costCenterRepository as any);
    await useCase.execute({ id: 1, cost_center_id: null });

    expect(costCenterRepository.findCostCenterById).not.toHaveBeenCalled();
    expect(financialRepository.updatePayableCostCenter).toHaveBeenCalledWith(1, null);
  });

  it('lança NotFoundError (404) se a conta a pagar não existir', async () => {
    const financialRepository = { findPayableById: jest.fn(async () => null), updatePayableCostCenter: jest.fn() };
    const costCenterRepository = { findCostCenterById: jest.fn() };

    const useCase = new UpdatePayableCostCenterUseCase(financialRepository as any, costCenterRepository as any);

    await expect(useCase.execute({ id: 999, cost_center_id: 1 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lança NotFoundError (404) se o centro de custo informado não existir', async () => {
    const financialRepository = { findPayableById: jest.fn(async (id: number) => ({ id })), updatePayableCostCenter: jest.fn() };
    const costCenterRepository = { findCostCenterById: jest.fn(async () => null) };

    const useCase = new UpdatePayableCostCenterUseCase(financialRepository as any, costCenterRepository as any);

    await expect(useCase.execute({ id: 1, cost_center_id: 999 })).rejects.toBeInstanceOf(NotFoundError);
    expect(financialRepository.updatePayableCostCenter).not.toHaveBeenCalled();
  });
});

describe('UpdateReceivableCostCenterUseCase', () => {
  it('atribui o centro de custo a uma conta a receber existente', async () => {
    const financialRepository = {
      findReceivableById: jest.fn(async (id: number) => ({ id })),
      updateReceivableCostCenter: jest.fn(async (id: number, costCenterId: number | null) => ({ id, cost_center_id: costCenterId })),
    };
    const costCenterRepository = { findCostCenterById: jest.fn(async (id: number) => ({ id })) };

    const useCase = new UpdateReceivableCostCenterUseCase(financialRepository as any, costCenterRepository as any);
    const result = await useCase.execute({ id: 3, cost_center_id: 7 });

    expect(financialRepository.updateReceivableCostCenter).toHaveBeenCalledWith(3, 7);
    expect(result).toMatchObject({ cost_center_id: 7 });
  });

  it('lança NotFoundError (404) se a conta a receber não existir', async () => {
    const financialRepository = { findReceivableById: jest.fn(async () => null), updateReceivableCostCenter: jest.fn() };
    const costCenterRepository = { findCostCenterById: jest.fn() };

    const useCase = new UpdateReceivableCostCenterUseCase(financialRepository as any, costCenterRepository as any);

    await expect(useCase.execute({ id: 999, cost_center_id: 1 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('CreatePayableUseCase (cost_center_id opcional)', () => {
  it('persiste cost_center_id quando informado', async () => {
    const financialRepository = { createPayable: jest.fn(async (data: any) => ({ id: 1, ...data })) };

    const useCase = new CreatePayableUseCase(financialRepository as any);
    await useCase.execute({
      description: 'Aluguel', amount: 1000, due_date: '2026-09-01', cost_center_id: 4,
    });

    expect(financialRepository.createPayable).toHaveBeenCalledWith(
      expect.objectContaining({ cost_center_id: 4 })
    );
  });

  it('persiste cost_center_id null quando omitido ("Sem centro de custo")', async () => {
    const financialRepository = { createPayable: jest.fn(async (data: any) => ({ id: 1, ...data })) };

    const useCase = new CreatePayableUseCase(financialRepository as any);
    await useCase.execute({ description: 'Água', amount: 200, due_date: '2026-09-01' });

    expect(financialRepository.createPayable).toHaveBeenCalledWith(
      expect.objectContaining({ cost_center_id: null })
    );
  });
});

describe('GetCostCenterReportUseCase', () => {
  it('agrega aberto/realizado por centro de custo e sempre inclui "Sem centro de custo"', async () => {
    const costCenterRepository = {
      getCostCenterTotalsByReceivable: jest.fn(async () => ([
        { cost_center_id: 1, code: 'PROD', name: 'Produção', open_amount: '500.00', realized_amount: '1500.00' },
        { cost_center_id: null, code: null, name: null, open_amount: '300.00', realized_amount: '0.00' },
      ])),
      getCostCenterTotalsByPayable: jest.fn(async () => ([
        { cost_center_id: 1, code: 'PROD', name: 'Produção', open_amount: '200.00', realized_amount: '800.00' },
      ])),
    };

    const useCase = new GetCostCenterReportUseCase(costCenterRepository as any);
    const result = await useCase.execute({ from: '2026-08-01', to: '2026-08-31' });

    const producao = result.groups.find((g: any) => g.cost_center_id === 1);
    expect(producao).toMatchObject({
      receivable: { open: 500, realized: 1500 },
      payable: { open: 200, realized: 800 },
    });

    const semCentro = result.groups.find((g: any) => g.cost_center_id === null);
    expect(semCentro).toMatchObject({
      name: 'Sem centro de custo',
      receivable: { open: 300, realized: 0 },
      payable: { open: 0, realized: 0 },
    });

    expect(result.totals.receivable.open).toBe(800);
    expect(result.totals.payable.open).toBe(200);
  });

  it('inclui o grupo "Sem centro de custo" com zeros mesmo sem nenhum lançamento no período', async () => {
    const costCenterRepository = {
      getCostCenterTotalsByReceivable: jest.fn(async () => ([])),
      getCostCenterTotalsByPayable: jest.fn(async () => ([])),
    };

    const useCase = new GetCostCenterReportUseCase(costCenterRepository as any);
    const result = await useCase.execute({ from: '2026-08-01', to: '2026-08-31' });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      cost_center_id: null,
      name: 'Sem centro de custo',
      receivable: { open: 0, realized: 0 },
      payable: { open: 0, realized: 0 },
    });
  });
});

describe('GetDailyCashFlowProjectionUseCase', () => {
  // Mesma lógica de `toDateOnly` do use case (baseada em componentes de data
  // LOCAIS, nunca `toISOString()` — que pode voltar um dia por causa do UTC).
  function isoDaysFromToday(offsetDays: number): string {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offsetDays);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  it('gera série diária de horizon_days + 1 pontos e acumula o saldo a partir do opening_balance', async () => {
    const financialRepository = {
      getOpenTitlesForProjection: jest.fn(async () => ({
        receivableRows: [{ due_date: isoDaysFromToday(2), amount: '1000.00' }],
        payableRows: [{ due_date: isoDaysFromToday(5), amount: '400.00' }],
        overdueReceivable: 0,
        overduePayable: 0,
      })),
    };

    const useCase = new GetDailyCashFlowProjectionUseCase(financialRepository as any);
    const result = await useCase.execute({ days: 30, opening_balance: 1000 });

    expect(result.series).toHaveLength(31);
    expect(result.series[0].balance).toBe(1000); // dia 0, sem movimento
    expect(result.series[2].balance).toBe(2000); // +1000 no dia 2
    expect(result.series[5].balance).toBe(1600); // -400 no dia 5
    expect(result.summary.final_balance).toBe(1600);
  });

  it('soma títulos vencidos (overdue) ao dia 0 e considera o opening_balance informado', async () => {
    const financialRepository = {
      getOpenTitlesForProjection: jest.fn(async () => ({
        receivableRows: [],
        payableRows: [],
        overdueReceivable: 0,
        overduePayable: 500,
      })),
    };

    const useCase = new GetDailyCashFlowProjectionUseCase(financialRepository as any);
    const result = await useCase.execute({ days: 30, opening_balance: 1000 });

    expect(result.series[0].payable).toBe(500);
    expect(result.series[0].balance).toBe(500); // 1000 - 500 (vencido)
  });

  it('identifica corretamente o menor saldo do período e o dia em que ocorre', async () => {
    const financialRepository = {
      getOpenTitlesForProjection: jest.fn(async () => ({
        receivableRows: [{ due_date: isoDaysFromToday(10), amount: '2000.00' }],
        payableRows: [{ due_date: isoDaysFromToday(3), amount: '5000.00' }],
        overdueReceivable: 0,
        overduePayable: 0,
      })),
    };

    const useCase = new GetDailyCashFlowProjectionUseCase(financialRepository as any);
    const result = await useCase.execute({ days: 30, opening_balance: 1000 });

    // Saldo despenca no dia 3 (1000 - 5000 = -4000) e só se recupera no dia 10.
    expect(result.summary.lowest_balance).toMatchObject({ date: isoDaysFromToday(3), balance: -4000 });
    // 1000 (opening) - 5000 (dia 3) + 2000 (dia 10) = -2000.
    expect(result.summary.final_balance).toBe(-2000);
  });

  it('aceita os três horizontes suportados (30/60/90) repassando o parametro ao repositório', async () => {
    const financialRepository = {
      getOpenTitlesForProjection: jest.fn(async () => ({
        receivableRows: [], payableRows: [], overdueReceivable: 0, overduePayable: 0,
      })),
    };

    const useCase = new GetDailyCashFlowProjectionUseCase(financialRepository as any);

    for (const days of [30, 60, 90]) {
      const result = await useCase.execute({ days, opening_balance: 0 });
      expect(financialRepository.getOpenTitlesForProjection).toHaveBeenCalledWith(days);
      expect(result.horizon_days).toBe(days);
      expect(result.series).toHaveLength(days + 1);
    }
  });

  it('usa opening_balance = 0 quando omitido', async () => {
    const financialRepository = {
      getOpenTitlesForProjection: jest.fn(async () => ({
        receivableRows: [], payableRows: [], overdueReceivable: 0, overduePayable: 0,
      })),
    };

    const useCase = new GetDailyCashFlowProjectionUseCase(financialRepository as any);
    const result = await useCase.execute({ days: 30 });

    expect(result.opening_balance).toBe(0);
    expect(result.series[0].balance).toBe(0);
  });
});
