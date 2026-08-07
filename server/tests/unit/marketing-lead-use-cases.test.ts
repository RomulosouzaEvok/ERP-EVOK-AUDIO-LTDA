/**
 * Testes: casos de uso de Lead de Marketing, incluindo o funil dedicado
 * `ChangeLeadStatusUseCase` (módulo Marketing).
 *
 * @group unit
 */

const CreateLeadUseCase = require('../../src/modules/marketing/application/use-cases/lead/CreateLeadUseCase');
const UpdateLeadUseCase = require('../../src/modules/marketing/application/use-cases/lead/UpdateLeadUseCase');
const ChangeLeadStatusUseCase = require('../../src/modules/marketing/application/use-cases/lead/ChangeLeadStatusUseCase');
const GetLeadByIdUseCase = require('../../src/modules/marketing/application/use-cases/lead/GetLeadByIdUseCase');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../src/errors');

function makeLeadRepository(overrides: Partial<any> = {}) {
  return {
    findLeadById: jest.fn(async () => null),
    createLead: jest.fn(async (data: any) => ({ id: 1, status: 'new', ...data })),
    updateLead: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    listLeads: jest.fn(async () => ({ rows: [], count: 0 })),
    ...overrides,
  };
}

function makeCampaignRepository(overrides: Partial<any> = {}) {
  return {
    findCampaignById: jest.fn(async () => null),
    updateCampaign: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    ...overrides,
  };
}

describe('CreateLeadUseCase', () => {
  it('FLUXO PRINCIPAL: cria lead sem campanha', async () => {
    const leadRepo = makeLeadRepository();
    const campaignRepo = makeCampaignRepository();

    const result = await new CreateLeadUseCase(leadRepo, campaignRepo).execute({ name: 'João Comprador' });

    expect(leadRepo.createLead).toHaveBeenCalledWith(expect.objectContaining({ name: 'João Comprador' }));
    expect(campaignRepo.updateCampaign).not.toHaveBeenCalled();
    expect(result.name).toBe('João Comprador');
  });

  it('FLUXO PRINCIPAL: cria lead vinculado a campanha e incrementa leads_generated', async () => {
    const leadRepo = makeLeadRepository();
    const campaignRepo = makeCampaignRepository({
      findCampaignById: jest.fn(async () => ({ id: 10, leads_generated: 3 })),
    });

    await new CreateLeadUseCase(leadRepo, campaignRepo).execute({ name: 'Maria', campaign_id: 10 });

    expect(campaignRepo.updateCampaign).toHaveBeenCalledWith(10, { leads_generated: 4 });
  });

  it('FLUXO DE EXCECAO: rejeita campaign_id inexistente com NotFoundError', async () => {
    const leadRepo = makeLeadRepository();
    const campaignRepo = makeCampaignRepository();

    await expect(
      new CreateLeadUseCase(leadRepo, campaignRepo).execute({ name: 'Maria', campaign_id: 999 }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(leadRepo.createLead).not.toHaveBeenCalled();
  });
});

describe('UpdateLeadUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando o lead não existe', async () => {
    const repo = makeLeadRepository();
    await expect(new UpdateLeadUseCase(repo).execute({ id: 999, name: 'X' })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('GetLeadByIdUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando o lead não existe', async () => {
    const repo = makeLeadRepository();
    await expect(new GetLeadByIdUseCase(repo).execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ChangeLeadStatusUseCase (funil)', () => {
  it('FLUXO PRINCIPAL: avança new -> contacted', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 1, status: 'new', campaign_id: null })),
    });
    const campaignRepo = makeCampaignRepository();

    const result = await new ChangeLeadStatusUseCase(leadRepo, campaignRepo).execute({ id: 1, status: 'contacted' });

    expect(leadRepo.updateLead).toHaveBeenCalledWith(1, { status: 'contacted' });
    expect(result.status).toBe('contacted');
  });

  it('FLUXO PRINCIPAL: converted incrementa conversions da campanha vinculada', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 1, status: 'qualified', campaign_id: 10 })),
    });
    const campaignRepo = makeCampaignRepository({
      findCampaignById: jest.fn(async () => ({ id: 10, conversions: 2 })),
    });

    await new ChangeLeadStatusUseCase(leadRepo, campaignRepo).execute({
      id: 1, status: 'converted', converted_to_customer_id: 55,
    });

    expect(leadRepo.updateLead).toHaveBeenCalledWith(1, { status: 'converted', converted_to_customer_id: 55 });
    expect(campaignRepo.updateCampaign).toHaveBeenCalledWith(10, { conversions: 3 });
  });

  it('FLUXO DE EXCECAO: lança NotFoundError quando o lead não existe', async () => {
    const leadRepo = makeLeadRepository();
    const campaignRepo = makeCampaignRepository();

    await expect(
      new ChangeLeadStatusUseCase(leadRepo, campaignRepo).execute({ id: 999, status: 'contacted' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO DE EXCECAO: rejeita status ausente com ValidationError', async () => {
    const leadRepo = makeLeadRepository();
    const campaignRepo = makeCampaignRepository();

    await expect(
      new ChangeLeadStatusUseCase(leadRepo, campaignRepo).execute({ id: 1, status: '' as any }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO DE EXCECAO: rejeita transição fora do funil (new -> converted) com BusinessRuleError', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 1, status: 'new', campaign_id: null })),
    });
    const campaignRepo = makeCampaignRepository();

    await expect(
      new ChangeLeadStatusUseCase(leadRepo, campaignRepo).execute({ id: 1, status: 'converted' }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('FLUXO DE EXCECAO: bloqueia transição a partir de estado terminal (converted)', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 1, status: 'converted', campaign_id: null })),
    });
    const campaignRepo = makeCampaignRepository();

    await expect(
      new ChangeLeadStatusUseCase(leadRepo, campaignRepo).execute({ id: 1, status: 'contacted' }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('FLUXO DE EXCECAO: rejeita status igual ao atual', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 1, status: 'new', campaign_id: null })),
    });
    const campaignRepo = makeCampaignRepository();

    await expect(
      new ChangeLeadStatusUseCase(leadRepo, campaignRepo).execute({ id: 1, status: 'new' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO PRINCIPAL: "lost" pode ser atingido de qualquer etapa aberta', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 1, status: 'contacted', campaign_id: null })),
    });
    const campaignRepo = makeCampaignRepository();

    const result = await new ChangeLeadStatusUseCase(leadRepo, campaignRepo).execute({ id: 1, status: 'lost' });

    expect(result.status).toBe('lost');
  });
});
