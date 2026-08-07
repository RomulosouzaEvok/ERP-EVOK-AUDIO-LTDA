/**
 * Testes: casos de uso de Lead de Marketing, incluindo o funil dedicado
 * `ChangeLeadStatusUseCase` (módulo Marketing, BLOCO 5 MKT correção).
 *
 * @group unit
 */

const CreateLeadUseCase = require('../../src/modules/marketing/application/use-cases/lead/CreateLeadUseCase');
const BulkCreateLeadsUseCase = require('../../src/modules/marketing/application/use-cases/lead/BulkCreateLeadsUseCase');
const UpdateLeadUseCase = require('../../src/modules/marketing/application/use-cases/lead/UpdateLeadUseCase');
const ChangeLeadStatusUseCase = require('../../src/modules/marketing/application/use-cases/lead/ChangeLeadStatusUseCase');
const GetLeadByIdUseCase = require('../../src/modules/marketing/application/use-cases/lead/GetLeadByIdUseCase');
const { NotFoundError, ValidationError, BusinessRuleError, AppError } = require('../../src/errors');

function makeLeadRepository(overrides: Partial<any> = {}) {
  return {
    findLeadById: jest.fn(async () => null),
    createLead: jest.fn(async (data: any) => ({ id: 1, status: 'new', ...data })),
    updateLead: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    listLeads: jest.fn(async () => ({ rows: [], count: 0 })),
    findOpenLeadByContact: jest.fn(async () => null),
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

function makeUserLookupService(overrides: Partial<any> = {}) {
  return {
    findActiveById: jest.fn(async (id: number) => ({ id, active: true })),
    ...overrides,
  };
}

describe('CreateLeadUseCase', () => {
  it('FLUXO PRINCIPAL: cria lead sem campanha', async () => {
    const leadRepo = makeLeadRepository();
    const campaignRepo = makeCampaignRepository();

    const result = await new CreateLeadUseCase(leadRepo, campaignRepo).execute({ name: 'João Comprador', phone: '11999998888' });

    expect(leadRepo.createLead).toHaveBeenCalledWith(expect.objectContaining({ name: 'João Comprador' }));
    expect(campaignRepo.updateCampaign).not.toHaveBeenCalled();
    expect(result.name).toBe('João Comprador');
  });

  it('FLUXO PRINCIPAL: cria lead vinculado a campanha e incrementa leads_generated', async () => {
    const leadRepo = makeLeadRepository();
    const campaignRepo = makeCampaignRepository({
      findCampaignById: jest.fn(async () => ({ id: 10, leads_generated: 3 })),
    });

    await new CreateLeadUseCase(leadRepo, campaignRepo).execute({ name: 'Maria', phone: '11988887777', campaign_id: 10 });

    expect(campaignRepo.updateCampaign).toHaveBeenCalledWith(10, { leads_generated: 4 });
  });

  it('FLUXO DE EXCECAO: rejeita campaign_id inexistente com NotFoundError', async () => {
    const leadRepo = makeLeadRepository();
    const campaignRepo = makeCampaignRepository();

    await expect(
      new CreateLeadUseCase(leadRepo, campaignRepo).execute({ name: 'Maria', phone: '11988887777', campaign_id: 999 }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(leadRepo.createLead).not.toHaveBeenCalled();
  });

  it('FLUXO DE EXCECAO (RF-MKT-016): rejeita payload sem email nem phone', async () => {
    const leadRepo = makeLeadRepository();
    const campaignRepo = makeCampaignRepository();

    await expect(
      new CreateLeadUseCase(leadRepo, campaignRepo).execute({ name: 'Sem contato' }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(leadRepo.createLead).not.toHaveBeenCalled();
  });

  it('FLUXO DE EXCECAO (RF-MKT-018): rejeita lead duplicado (aberto) com o mesmo contato', async () => {
    const leadRepo = makeLeadRepository({
      findOpenLeadByContact: jest.fn(async () => ({ id: 77, name: 'Lead existente' })),
    });
    const campaignRepo = makeCampaignRepository();

    await expect(
      new CreateLeadUseCase(leadRepo, campaignRepo).execute({ name: 'Novo', phone: '11988887777' }),
    ).rejects.toMatchObject({ code: 'DUPLICATE_LEAD' });
    expect(leadRepo.createLead).not.toHaveBeenCalled();
  });

  it('FLUXO DE EXCECAO (RF-MKT-018): rejeita quando já existe cliente cadastrado com o mesmo contato', async () => {
    const leadRepo = makeLeadRepository();
    const campaignRepo = makeCampaignRepository();
    const clientService = {
      search: jest.fn(async () => [{ id: 5, name: 'Cliente Existente', cpf_cnpj: '12345678900', status: 'active' }]),
    };

    await expect(
      new CreateLeadUseCase(leadRepo, campaignRepo, undefined, clientService as any).execute({ name: 'Novo', phone: '11988887777' }),
    ).rejects.toMatchObject({ code: 'CLIENT_ALREADY_EXISTS' });
    expect(leadRepo.createLead).not.toHaveBeenCalled();
  });

  it('FLUXO PRINCIPAL (RF-MKT-022): event_id força lead_source=event', async () => {
    const leadRepo = makeLeadRepository();
    const campaignRepo = makeCampaignRepository();
    const eventRepo = { findEventById: jest.fn(async () => ({ id: 7, name: 'Feira' })) };

    await new CreateLeadUseCase(leadRepo, campaignRepo, eventRepo as any).execute({
      name: 'Maria', phone: '11988887777', event_id: 7, lead_source: 'website',
    });

    expect(leadRepo.createLead).toHaveBeenCalledWith(expect.objectContaining({ event_id: 7, lead_source: 'event' }));
  });

  it('FLUXO DE EXCECAO: rejeita event_id inexistente com NotFoundError', async () => {
    const leadRepo = makeLeadRepository();
    const campaignRepo = makeCampaignRepository();
    const eventRepo = { findEventById: jest.fn(async () => null) };

    await expect(
      new CreateLeadUseCase(leadRepo, campaignRepo, eventRepo as any).execute({ name: 'Maria', phone: '11988887777', event_id: 999 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('BulkCreateLeadsUseCase', () => {
  it('FLUXO PRINCIPAL (RF-MKT-019): processa parcialmente — sucesso e rejeição por item, sem interromper o lote', async () => {
    const leadRepo = makeLeadRepository();
    const campaignRepo = makeCampaignRepository();
    const createLeadUseCase = new CreateLeadUseCase(leadRepo, campaignRepo);

    const result = await new BulkCreateLeadsUseCase(createLeadUseCase).execute({
      event_id: 7,
      leads: [
        { name: 'Maria Silva', phone: '11988887777', lead_source: 'event' },
        { name: 'Sem contato' },
      ],
    });

    expect(result.created).toHaveLength(1);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].error.code).toBe('VALIDATION_ERROR');
    expect(result.created[0].lead.name).toBe('Maria Silva');
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

describe('ChangeLeadStatusUseCase (funil, BLOCO 5 MKT correção)', () => {
  it('FLUXO PRINCIPAL: avança new -> contacted', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 1, status: 'new', campaign_id: null })),
    });
    const campaignRepo = makeCampaignRepository();

    const result = await new ChangeLeadStatusUseCase(leadRepo, campaignRepo).execute({ id: 1, status: 'contacted' });

    expect(leadRepo.updateLead).toHaveBeenCalledWith(1, { status: 'contacted' });
    expect(result.status).toBe('contacted');
  });

  it('FLUXO PRINCIPAL (RF-MKT-005/011/013): qualified com sales_owner_user_id grava qualified_at e handoff_at', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 1, status: 'contacted', campaign_id: null })),
    });
    const campaignRepo = makeCampaignRepository();
    const userLookup = makeUserLookupService();

    const result = await new ChangeLeadStatusUseCase(leadRepo, campaignRepo, userLookup as any).execute({
      id: 1, status: 'qualified', sales_owner_user_id: 34,
    });

    expect(leadRepo.updateLead).toHaveBeenCalledWith(1, expect.objectContaining({
      status: 'qualified', sales_owner_user_id: 34, qualified_at: expect.any(Date), handoff_at: expect.any(Date),
    }));
    expect(result.status).toBe('qualified');
  });

  it('FLUXO PRINCIPAL (RF-MKT-012): in_sales_attendance permitido quando lead já tem sales_owner_user_id', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 1, status: 'qualified', campaign_id: null, sales_owner_user_id: 34 })),
    });
    const campaignRepo = makeCampaignRepository();

    const result = await new ChangeLeadStatusUseCase(leadRepo, campaignRepo).execute({ id: 1, status: 'in_sales_attendance' });

    expect(result.status).toBe('in_sales_attendance');
  });

  it('FLUXO DE EXCECAO (RF-MKT-012): bloqueia in_sales_attendance sem sales_owner_user_id prévio', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 1, status: 'qualified', campaign_id: null, sales_owner_user_id: null })),
    });
    const campaignRepo = makeCampaignRepository();

    await expect(
      new ChangeLeadStatusUseCase(leadRepo, campaignRepo).execute({ id: 1, status: 'in_sales_attendance' }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('FLUXO DE EXCECAO (RF-MKT-001): rejeita status=converted — redireciona para /convert', async () => {
    const leadRepo = makeLeadRepository();
    const campaignRepo = makeCampaignRepository();

    await expect(
      new ChangeLeadStatusUseCase(leadRepo, campaignRepo).execute({ id: 1, status: 'converted' }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(leadRepo.findLeadById).not.toHaveBeenCalled();
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

  it('FLUXO DE EXCECAO: rejeita transição fora do funil (new -> qualified)', async () => {
    const leadRepo = makeLeadRepository({
      findLeadById: jest.fn(async () => ({ id: 1, status: 'new', campaign_id: null })),
    });
    const campaignRepo = makeCampaignRepository();

    await expect(
      new ChangeLeadStatusUseCase(leadRepo, campaignRepo).execute({ id: 1, status: 'qualified' }),
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
