/**
 * Testes: relatório de KPIs de funil de marketing (`GetFunnelReportUseCase`,
 * RF-MKT-026 a 029, UC-66) — cálculo com dados e cenário "sem dados"
 * (UC-66 E1, nunca divisão por zero).
 *
 * @group unit
 */

const GetFunnelReportUseCase = require('../../src/modules/marketing/application/use-cases/report/GetFunnelReportUseCase');

function makeLeadRepository(overrides: Partial<any> = {}) {
  return {
    findForFunnelReport: jest.fn(async () => []),
    ...overrides,
  };
}

function makeCampaignRepository(overrides: Partial<any> = {}) {
  return {
    findCampaignById: jest.fn(async () => null),
    ...overrides,
  };
}

function makeSalesRevenueService(overrides: Partial<any> = {}) {
  return {
    getAttributedRevenue: jest.fn(async () => '0.00'),
    ...overrides,
  };
}

describe('GetFunnelReportUseCase (RF-MKT-026 a 029, UC-66)', () => {
  it('FLUXO DE EXCECAO E1 (sem dados): retorna has_data=false e todos os KPIs null, nunca divisão por zero', async () => {
    const leadRepo = makeLeadRepository();
    const campaignRepo = makeCampaignRepository();
    const salesRevenueService = makeSalesRevenueService();

    const result = await new GetFunnelReportUseCase(leadRepo, campaignRepo, salesRevenueService).execute({ campaign_id: 999 });

    expect(result.has_data).toBe(false);
    expect(result.cost_per_lead).toBeNull();
    expect(result.qualification_rate).toBeNull();
    expect(result.conversion_rate).toBeNull();
    expect(result.roi).toBeNull();
    expect(result.handoff_sla_compliance_rate).toBeNull();
    expect(result.median_lead_cycle_days).toBeNull();
    expect(result.budget_vs_actual).toBeNull();
  });

  it('FLUXO PRINCIPAL: calcula qualification_rate/conversion_rate a partir dos leads no período', async () => {
    const now = new Date();
    const leadRepo = makeLeadRepository({
      findForFunnelReport: jest.fn(async () => [
        { id: 1, status: 'new', campaign_id: null, qualified_at: null, handoff_at: null, converted_at: null, converted_to_customer_id: null, created_at: now },
        { id: 2, status: 'qualified', campaign_id: null, qualified_at: now, handoff_at: now, converted_at: null, converted_to_customer_id: null, created_at: now },
        { id: 3, status: 'converted', campaign_id: null, qualified_at: now, handoff_at: now, converted_at: now, converted_to_customer_id: 55, created_at: now },
        { id: 4, status: 'lost', campaign_id: null, qualified_at: null, handoff_at: null, converted_at: null, converted_to_customer_id: null, created_at: now },
      ]),
    });
    const campaignRepo = makeCampaignRepository();
    const salesRevenueService = makeSalesRevenueService({ getAttributedRevenue: jest.fn(async () => '1000.00') });

    const result = await new GetFunnelReportUseCase(leadRepo, campaignRepo, salesRevenueService).execute({});

    expect(result.has_data).toBe(true);
    expect(result.qualification_rate).toBe('0.50'); // 2 de 4 têm qualified_at
    expect(result.conversion_rate).toBe('0.25'); // 1 de 4 converted
    expect(result.attributed_revenue).toBe('1000.00');
    expect(result.handoff_sla_compliance_rate).toBe('1.00'); // ambos qualified têm handoff no mesmo instante (0 dias <= SLA)
  });

  it('FLUXO PRINCIPAL: cost_per_lead e budget_vs_actual usam actual_cost/budget das campanhas referenciadas pelos leads filtrados', async () => {
    const now = new Date();
    const leadRepo = makeLeadRepository({
      findForFunnelReport: jest.fn(async () => [
        { id: 1, status: 'qualified', campaign_id: 10, qualified_at: now, handoff_at: null, converted_at: null, converted_to_customer_id: null, created_at: now },
      ]),
    });
    const campaignRepo = makeCampaignRepository({
      findCampaignById: jest.fn(async () => ({ id: 10, actual_cost: 500, budget_requested: 1000, budget_approved: 800 })),
    });
    const salesRevenueService = makeSalesRevenueService();

    const result = await new GetFunnelReportUseCase(leadRepo, campaignRepo, salesRevenueService).execute({ campaign_id: 10 });

    expect(result.cost_per_lead).toBe('500.00');
    expect(result.budget_vs_actual).toEqual({ requested: '1000.00', approved: '800.00', actual: '500.00' });
  });
});
