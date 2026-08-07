/**
 * Testes: casos de uso do módulo Controladoria (Linhas de Orçamento +
 * relatório Orçado × Realizado).
 *
 * @group unit
 */

const CreateBudgetLineUseCase = require('../../src/modules/budget/application/use-cases/budget-line/CreateBudgetLineUseCase');
const ListBudgetLinesUseCase = require('../../src/modules/budget/application/use-cases/budget-line/ListBudgetLinesUseCase');
const GetBudgetLineByIdUseCase = require('../../src/modules/budget/application/use-cases/budget-line/GetBudgetLineByIdUseCase');
const UpdateBudgetLineUseCase = require('../../src/modules/budget/application/use-cases/budget-line/UpdateBudgetLineUseCase');
const DeleteBudgetLineUseCase = require('../../src/modules/budget/application/use-cases/budget-line/DeleteBudgetLineUseCase');
const GetBudgetVsActualReportUseCase = require('../../src/modules/budget/application/use-cases/report/GetBudgetVsActualReportUseCase');
const { ConflictError, NotFoundError } = require('../../src/errors');

function makeBudgetRepository(overrides: Partial<any> = {}) {
  return {
    listBudgetLines: jest.fn(async () => ({ rows: [], count: 0 })),
    findBudgetLineById: jest.fn(async () => null),
    findBudgetLineByKey: jest.fn(async () => null),
    createBudgetLine: jest.fn(async (data: any) => ({ id: 1, ...data })),
    updateBudgetLine: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    deleteBudgetLine: jest.fn(async () => undefined),
    getBudgetTotalsByCostCenter: jest.fn(async () => []),
    ...overrides,
  };
}

function makeCostCenterRepository(overrides: Partial<any> = {}) {
  return {
    getCostCenterTotalsByPayable: jest.fn(async () => []),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Linhas de Orçamento — Criação
// ---------------------------------------------------------------------------

describe('CreateBudgetLineUseCase', () => {
  it('FLUXO PRINCIPAL: cria linha mensal quando a chave (cost_center_id, year, month, category) não colide', async () => {
    const repo = makeBudgetRepository();

    const result = await new CreateBudgetLineUseCase(repo).execute({
      cost_center_id: 1, year: 2026, month: 8, category: 'custo_fixo', planned_amount: 5000,
    });

    expect(repo.findBudgetLineByKey).toHaveBeenCalledWith(1, 2026, 8, 'custo_fixo');
    expect(repo.createBudgetLine).toHaveBeenCalledWith(expect.objectContaining({
      cost_center_id: 1, year: 2026, month: 8, category: 'custo_fixo', planned_amount: 5000,
    }));
    expect(result.month).toBe(8);
  });

  it('FLUXO PRINCIPAL: cria linha anual quando month é omitido (month vira null, categoria default "outro")', async () => {
    const repo = makeBudgetRepository();

    const result = await new CreateBudgetLineUseCase(repo).execute({
      cost_center_id: 1, year: 2026, planned_amount: 60000,
    });

    expect(repo.findBudgetLineByKey).toHaveBeenCalledWith(1, 2026, null, 'outro');
    expect(result.month).toBeNull();
    expect(result.category).toBe('outro');
  });

  it('FLUXO DE EXCECAO: rejeita chave duplicada com ConflictError', async () => {
    const repo = makeBudgetRepository({
      findBudgetLineByKey: jest.fn(async () => ({ id: 9, cost_center_id: 1, year: 2026, month: 8, category: 'custo_fixo' })),
    });

    await expect(
      new CreateBudgetLineUseCase(repo).execute({ cost_center_id: 1, year: 2026, month: 8, category: 'custo_fixo', planned_amount: 100 }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('FLUXO DE BORDA: linha anual (month null) e linha mensal (month 8) para o mesmo centro/ano/categoria NÃO colidem', async () => {
    // A linha anual já existe; a checagem para a linha MENSAL não deve encontrá-la
    // porque findBudgetLineByKey é chamado com month=8, não null.
    const repo = makeBudgetRepository({
      findBudgetLineByKey: jest.fn(async (_cc: number, _year: number, month: number | null) => (month === null ? { id: 1 } : null)),
    });

    const result = await new CreateBudgetLineUseCase(repo).execute({
      cost_center_id: 1, year: 2026, month: 8, category: 'outro', planned_amount: 100,
    });

    expect(result).toBeDefined();
    expect(repo.createBudgetLine).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Linhas de Orçamento — Listagem/Busca
// ---------------------------------------------------------------------------

describe('ListBudgetLinesUseCase', () => {
  it('FLUXO PRINCIPAL: repassa filtros e calcula paginação', async () => {
    const repo = makeBudgetRepository({
      listBudgetLines: jest.fn(async () => ({ rows: [{ id: 1 }, { id: 2 }], count: 25 })),
    });

    const result = await new ListBudgetLinesUseCase(repo).execute({ year: 2026, page: 2, limit: 10, offset: 10 });

    expect(repo.listBudgetLines).toHaveBeenCalledWith(
      { year: 2026, month: undefined, cost_center_id: undefined, category: undefined },
      { limit: 10, offset: 10 },
    );
    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(2);
  });
});

describe('GetBudgetLineByIdUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando a linha não existe', async () => {
    const repo = makeBudgetRepository();
    await expect(new GetBudgetLineByIdUseCase(repo).execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO PRINCIPAL: retorna a linha encontrada', async () => {
    const repo = makeBudgetRepository({ findBudgetLineById: jest.fn(async () => ({ id: 1, planned_amount: 100 })) });
    const result = await new GetBudgetLineByIdUseCase(repo).execute({ id: 1 });
    expect(result.id).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Linhas de Orçamento — Atualização/Exclusão
// ---------------------------------------------------------------------------

describe('UpdateBudgetLineUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando a linha não existe', async () => {
    const repo = makeBudgetRepository();
    await expect(new UpdateBudgetLineUseCase(repo).execute({ id: 999, planned_amount: 100 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO PRINCIPAL: atualiza valor sem mudar a chave (não reconsulta unicidade)', async () => {
    const repo = makeBudgetRepository({
      findBudgetLineById: jest.fn(async () => ({ id: 1, cost_center_id: 1, year: 2026, month: 8, category: 'outro' })),
    });

    await new UpdateBudgetLineUseCase(repo).execute({ id: 1, planned_amount: 999 });

    expect(repo.findBudgetLineByKey).not.toHaveBeenCalled();
    expect(repo.updateBudgetLine).toHaveBeenCalledWith(1, { planned_amount: 999 });
  });

  it('FLUXO DE EXCECAO: rejeita nova chave já usada por outra linha', async () => {
    const repo = makeBudgetRepository({
      findBudgetLineById: jest.fn(async () => ({ id: 1, cost_center_id: 1, year: 2026, month: 8, category: 'outro' })),
      findBudgetLineByKey: jest.fn(async () => ({ id: 2, cost_center_id: 1, year: 2026, month: 9, category: 'outro' })),
    });

    await expect(new UpdateBudgetLineUseCase(repo).execute({ id: 1, month: 9 })).rejects.toBeInstanceOf(ConflictError);
  });

  it('FLUXO PRINCIPAL: permite manter a própria chave ao editar outros campos junto com a chave', async () => {
    const repo = makeBudgetRepository({
      findBudgetLineById: jest.fn(async () => ({ id: 1, cost_center_id: 1, year: 2026, month: 8, category: 'outro' })),
      findBudgetLineByKey: jest.fn(async () => ({ id: 1, cost_center_id: 1, year: 2026, month: 8, category: 'outro' })),
    });

    await new UpdateBudgetLineUseCase(repo).execute({ id: 1, month: 8, planned_amount: 500 });

    expect(repo.updateBudgetLine).toHaveBeenCalledWith(1, { month: 8, planned_amount: 500 });
  });
});

describe('DeleteBudgetLineUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando a linha não existe', async () => {
    const repo = makeBudgetRepository();
    await expect(new DeleteBudgetLineUseCase(repo).execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO PRINCIPAL: exclui fisicamente a linha existente', async () => {
    const repo = makeBudgetRepository({ findBudgetLineById: jest.fn(async () => ({ id: 1 })) });
    await new DeleteBudgetLineUseCase(repo).execute({ id: 1 });
    expect(repo.deleteBudgetLine).toHaveBeenCalledWith(1);
  });
});

// ---------------------------------------------------------------------------
// Relatório Orçado × Realizado
// ---------------------------------------------------------------------------

describe('GetBudgetVsActualReportUseCase', () => {
  it('FLUXO PRINCIPAL: calcula variação absoluta e percentual por centro de custo (ano inteiro)', async () => {
    const budgetRepo = makeBudgetRepository({
      getBudgetTotalsByCostCenter: jest.fn(async () => [
        { cost_center_id: 1, code: 'CC-01', name: 'Produção', planned_amount: 100000 },
        { cost_center_id: 2, code: 'CC-02', name: 'Comercial', planned_amount: 50000 },
      ]),
    });
    const costCenterRepo = makeCostCenterRepository({
      getCostCenterTotalsByPayable: jest.fn(async () => [
        { cost_center_id: 1, code: 'CC-01', name: 'Produção', open_amount: 0, realized_amount: 120000 },
        { cost_center_id: 2, code: 'CC-02', name: 'Comercial', open_amount: 0, realized_amount: 40000 },
      ]),
    });

    const result = await new GetBudgetVsActualReportUseCase(budgetRepo, costCenterRepo).execute({ year: 2026 });

    expect(budgetRepo.getBudgetTotalsByCostCenter).toHaveBeenCalledWith(2026, null, null);
    expect(costCenterRepo.getCostCenterTotalsByPayable).toHaveBeenCalledWith('2026-01-01', '2026-12-31');

    const cc1 = result.groups.find((g: any) => g.cost_center_id === 1);
    expect(cc1.planned_amount).toBe(100000);
    expect(cc1.realized_amount).toBe(120000);
    expect(cc1.variance).toBe(20000);
    expect(cc1.variance_percent).toBeCloseTo(20);

    const cc2 = result.groups.find((g: any) => g.cost_center_id === 2);
    expect(cc2.variance).toBe(-10000);
    expect(cc2.variance_percent).toBeCloseTo(-20);

    expect(result.totals.planned_amount).toBe(150000);
    expect(result.totals.realized_amount).toBe(160000);
    expect(result.totals.variance).toBe(10000);
  });

  it('FLUXO PRINCIPAL: usa intervalo do mês (from/to) quando month é informado', async () => {
    const budgetRepo = makeBudgetRepository();
    const costCenterRepo = makeCostCenterRepository();

    await new GetBudgetVsActualReportUseCase(budgetRepo, costCenterRepo).execute({ year: 2026, month: 2 });

    expect(budgetRepo.getBudgetTotalsByCostCenter).toHaveBeenCalledWith(2026, 2, null);
    expect(costCenterRepo.getCostCenterTotalsByPayable).toHaveBeenCalledWith('2026-02-01', '2026-02-28');
  });

  it('FLUXO DE BORDA: variance_percent é null quando o orçado é zero (evita divisão por zero)', async () => {
    const budgetRepo = makeBudgetRepository({ getBudgetTotalsByCostCenter: jest.fn(async () => []) });
    const costCenterRepo = makeCostCenterRepository({
      getCostCenterTotalsByPayable: jest.fn(async () => [
        { cost_center_id: 1, code: 'CC-01', name: 'Produção', open_amount: 0, realized_amount: 5000 },
      ]),
    });

    const result = await new GetBudgetVsActualReportUseCase(budgetRepo, costCenterRepo).execute({ year: 2026 });

    const cc1 = result.groups.find((g: any) => g.cost_center_id === 1);
    expect(cc1.planned_amount).toBe(0);
    expect(cc1.realized_amount).toBe(5000);
    expect(cc1.variance_percent).toBeNull();
  });

  it('FLUXO DE BORDA: filtra por cost_center_id quando informado', async () => {
    const budgetRepo = makeBudgetRepository({
      getBudgetTotalsByCostCenter: jest.fn(async () => [
        { cost_center_id: 1, code: 'CC-01', name: 'Produção', planned_amount: 1000 },
      ]),
    });
    const costCenterRepo = makeCostCenterRepository({
      getCostCenterTotalsByPayable: jest.fn(async () => [
        { cost_center_id: 1, code: 'CC-01', name: 'Produção', open_amount: 0, realized_amount: 900 },
        { cost_center_id: 2, code: 'CC-02', name: 'Comercial', open_amount: 0, realized_amount: 500 },
      ]),
    });

    const result = await new GetBudgetVsActualReportUseCase(budgetRepo, costCenterRepo).execute({ year: 2026, cost_center_id: 1 });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].cost_center_id).toBe(1);
  });
});
