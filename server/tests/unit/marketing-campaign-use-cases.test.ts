/**
 * Testes: casos de uso de Campanha de Marketing (módulo Marketing, BLOCO 5
 * MKT correção — orçamento/aprovação, imutabilidade pós-conclusão,
 * recálculo idempotente de métricas).
 *
 * @group unit
 */

const CreateCampaignUseCase = require('../../src/modules/marketing/application/use-cases/campaign/CreateCampaignUseCase');
const UpdateCampaignUseCase = require('../../src/modules/marketing/application/use-cases/campaign/UpdateCampaignUseCase');
const BudgetDecisionUseCase = require('../../src/modules/marketing/application/use-cases/campaign/BudgetDecisionUseCase');
const RecalculateCampaignMetricsUseCase = require('../../src/modules/marketing/application/use-cases/campaign/RecalculateCampaignMetricsUseCase');
const ListCampaignsUseCase = require('../../src/modules/marketing/application/use-cases/campaign/ListCampaignsUseCase');
const GetCampaignByIdUseCase = require('../../src/modules/marketing/application/use-cases/campaign/GetCampaignByIdUseCase');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../src/errors');

function makeCampaignRepository(overrides: Partial<any> = {}) {
  return {
    findCampaignById: jest.fn(async () => null),
    createCampaign: jest.fn(async (data: any) => ({ id: 1, leads_generated: 0, conversions: 0, ...data })),
    updateCampaign: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    listCampaigns: jest.fn(async () => ({ rows: [], count: 0 })),
    ...overrides,
  };
}

function makeLeadRepository(overrides: Partial<any> = {}) {
  return {
    countByCampaignId: jest.fn(async () => 0),
    findConvertedByCampaignId: jest.fn(async () => []),
    ...overrides,
  };
}

function makeSalesRevenueService(overrides: Partial<any> = {}) {
  return {
    getAttributedRevenue: jest.fn(async () => '0.00'),
    ...overrides,
  };
}

describe('CreateCampaignUseCase', () => {
  it('FLUXO PRINCIPAL: cria campanha', async () => {
    const repo = makeCampaignRepository();
    const result = await new CreateCampaignUseCase(repo).execute({
      name: 'Black Friday', campaign_type: 'ads', start_date: '2026-11-01',
    });

    expect(repo.createCampaign).toHaveBeenCalledWith(expect.objectContaining({ name: 'Black Friday' }));
    expect(result.name).toBe('Black Friday');
  });

  it('FLUXO DE EXCECAO: rejeita end_date anterior a start_date', async () => {
    const repo = makeCampaignRepository();

    await expect(
      new CreateCampaignUseCase(repo).execute({
        name: 'Campanha inválida', campaign_type: 'ads', start_date: '2026-11-10', end_date: '2026-11-01',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.createCampaign).not.toHaveBeenCalled();
  });
});

describe('UpdateCampaignUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando a campanha não existe', async () => {
    const repo = makeCampaignRepository();
    await expect(new UpdateCampaignUseCase(repo).execute({ id: 999, status: 'paused' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO DE EXCECAO: rejeita end_date anterior ao start_date atual da campanha', async () => {
    const repo = makeCampaignRepository({
      findCampaignById: jest.fn(async () => ({ id: 1, start_date: '2026-11-10', end_date: null, status: 'planned', budget_approval_status: 'pending' })),
    });

    await expect(
      new UpdateCampaignUseCase(repo).execute({ id: 1, end_date: '2026-11-01' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO PRINCIPAL: atualiza status da campanha para paused (não exige orçamento aprovado)', async () => {
    const repo = makeCampaignRepository({
      findCampaignById: jest.fn(async () => ({ id: 1, start_date: '2026-11-01', end_date: null, status: 'planned', budget_approval_status: 'pending' })),
    });

    const result = await new UpdateCampaignUseCase(repo).execute({ id: 1, status: 'paused' });

    expect(repo.updateCampaign).toHaveBeenCalledWith(1, { status: 'paused' });
    expect(result.status).toBe('paused');
  });

  it('FLUXO DE EXCECAO (RF-MKT-031): bloqueia status=active sem orçamento aprovado', async () => {
    const repo = makeCampaignRepository({
      findCampaignById: jest.fn(async () => ({ id: 1, start_date: '2026-11-01', end_date: null, status: 'planned', budget_approval_status: 'pending' })),
    });

    await expect(
      new UpdateCampaignUseCase(repo).execute({ id: 1, status: 'active' }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('FLUXO PRINCIPAL (RF-MKT-031): permite status=active com orçamento aprovado', async () => {
    const repo = makeCampaignRepository({
      findCampaignById: jest.fn(async () => ({ id: 1, start_date: '2026-11-01', end_date: null, status: 'planned', budget_approval_status: 'approved' })),
    });

    const result = await new UpdateCampaignUseCase(repo).execute({ id: 1, status: 'active' });
    expect(result.status).toBe('active');
  });

  it('FLUXO DE EXCECAO (RF-MKT-034): bloqueia edição de campo além de notes quando completed', async () => {
    const repo = makeCampaignRepository({
      findCampaignById: jest.fn(async () => ({ id: 1, start_date: '2026-11-01', end_date: null, status: 'completed', budget_approval_status: 'approved' })),
    });

    await expect(
      new UpdateCampaignUseCase(repo).execute({ id: 1, target_audience: 'Novo público' }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('FLUXO PRINCIPAL (RF-MKT-034): permite editar apenas notes quando completed', async () => {
    const repo = makeCampaignRepository({
      findCampaignById: jest.fn(async () => ({ id: 1, start_date: '2026-11-01', end_date: null, status: 'completed', budget_approval_status: 'approved' })),
    });

    const result = await new UpdateCampaignUseCase(repo).execute({ id: 1, notes: 'Observação final' });
    expect(result.notes).toBe('Observação final');
  });
});

describe('BudgetDecisionUseCase (RF-MKT-030/031)', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando a campanha não existe', async () => {
    const repo = makeCampaignRepository();
    await expect(
      new BudgetDecisionUseCase(repo).execute({ id: 999, decision: 'approved', budget_approved: 1000, decidedByUserId: 7 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO DE EXCECAO: rejeita budget_approved ausente quando decision=approved', async () => {
    const repo = makeCampaignRepository({
      findCampaignById: jest.fn(async () => ({ id: 1, status: 'planned' })),
    });

    await expect(
      new BudgetDecisionUseCase(repo).execute({ id: 1, decision: 'approved', decidedByUserId: 7 } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO DE EXCECAO: rejeita decisão em campanha já completed', async () => {
    const repo = makeCampaignRepository({
      findCampaignById: jest.fn(async () => ({ id: 1, status: 'completed' })),
    });

    await expect(
      new BudgetDecisionUseCase(repo).execute({ id: 1, decision: 'approved', budget_approved: 1000, decidedByUserId: 7 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('FLUXO PRINCIPAL: aprova orçamento gravando budget_approved_by/at a partir do usuário autenticado', async () => {
    const repo = makeCampaignRepository({
      findCampaignById: jest.fn(async () => ({ id: 1, status: 'planned' })),
    });

    const result = await new BudgetDecisionUseCase(repo).execute({ id: 1, decision: 'approved', budget_approved: 45000, decidedByUserId: 7 });

    expect(repo.updateCampaign).toHaveBeenCalledWith(1, expect.objectContaining({
      budget_approval_status: 'approved', budget_approved: 45000, budget_approved_by: 7, budget_approved_at: expect.any(Date),
    }));
    expect(result.budget_approval_status).toBe('approved');
  });

  it('FLUXO PRINCIPAL: rejeita orçamento sem exigir budget_approved', async () => {
    const repo = makeCampaignRepository({
      findCampaignById: jest.fn(async () => ({ id: 1, status: 'planned', notes: null })),
    });

    const result = await new BudgetDecisionUseCase(repo).execute({ id: 1, decision: 'rejected', reason: 'Acima do teto.', decidedByUserId: 7 });

    expect(result.budget_approval_status).toBe('rejected');
    expect(result.notes).toBe('Acima do teto.');
  });
});

describe('RecalculateCampaignMetricsUseCase (RF-MKT-009, RNF-MKT-001 idempotência)', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando a campanha não existe', async () => {
    const campaignRepo = makeCampaignRepository();
    const leadRepo = makeLeadRepository();
    const salesRevenueService = makeSalesRevenueService();

    await expect(
      new RecalculateCampaignMetricsUseCase(campaignRepo, leadRepo, salesRevenueService).execute({ id: 999 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO PRINCIPAL: recalcula leads_generated/conversions/roi a partir dos vínculos reais', async () => {
    const campaignRepo = makeCampaignRepository({
      findCampaignById: jest.fn(async () => ({ id: 1, actual_cost: 1000 })),
    });
    const leadRepo = makeLeadRepository({
      countByCampaignId: jest.fn(async () => 50),
      findConvertedByCampaignId: jest.fn(async () => [
        { converted_to_customer_id: 5, converted_at: new Date('2026-01-01') },
      ]),
    });
    const salesRevenueService = makeSalesRevenueService({
      getAttributedRevenue: jest.fn(async () => '2000.00'),
    });

    const result = await new RecalculateCampaignMetricsUseCase(campaignRepo, leadRepo, salesRevenueService).execute({ id: 1 });

    expect(result.leads_generated).toBe(50);
    expect(result.conversions).toBe(1);
    expect(result.roi).toBe('1.00'); // (2000 - 1000) / 1000
    expect(campaignRepo.updateCampaign).toHaveBeenCalledWith(1, expect.objectContaining({
      leads_generated: 50, conversions: 1, roi: '1.00', metrics_recalculated_at: expect.any(Date),
    }));
  });

  it('FLUXO PRINCIPAL: idempotente — duas execuções seguidas produzem o mesmo resultado', async () => {
    const campaignRepo = makeCampaignRepository({
      findCampaignById: jest.fn(async () => ({ id: 1, actual_cost: 1000 })),
    });
    const leadRepo = makeLeadRepository({
      countByCampaignId: jest.fn(async () => 10),
      findConvertedByCampaignId: jest.fn(async () => []),
    });
    const salesRevenueService = makeSalesRevenueService();

    const useCase = new RecalculateCampaignMetricsUseCase(campaignRepo, leadRepo, salesRevenueService);
    const first = await useCase.execute({ id: 1 });
    const second = await useCase.execute({ id: 1 });

    expect(first.leads_generated).toBe(second.leads_generated);
    expect(first.conversions).toBe(second.conversions);
    expect(first.roi).toBe(second.roi);
  });

  it('FLUXO PRINCIPAL: roi null quando actual_cost é zero (evita divisão por zero)', async () => {
    const campaignRepo = makeCampaignRepository({
      findCampaignById: jest.fn(async () => ({ id: 1, actual_cost: 0 })),
    });
    const leadRepo = makeLeadRepository();
    const salesRevenueService = makeSalesRevenueService();

    const result = await new RecalculateCampaignMetricsUseCase(campaignRepo, leadRepo, salesRevenueService).execute({ id: 1 });
    expect(result.roi).toBeNull();
  });
});

describe('GetCampaignByIdUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando a campanha não existe', async () => {
    const repo = makeCampaignRepository();
    await expect(new GetCampaignByIdUseCase(repo).execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ListCampaignsUseCase', () => {
  it('lista campanhas paginadas repassando filtros', async () => {
    const repo = makeCampaignRepository({
      listCampaigns: jest.fn(async () => ({ rows: [{ id: 1, name: 'Black Friday' }], count: 1 })),
    });

    const result = await new ListCampaignsUseCase(repo).execute({ status: 'active', page: 1, limit: 20, offset: 0 });

    expect(repo.listCampaigns).toHaveBeenCalledWith({ status: 'active', campaign_type: undefined }, { limit: 20, offset: 0 });
    expect(result.count).toBe(1);
    expect(result.totalPages).toBe(1);
  });
});
