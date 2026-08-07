/**
 * Testes: casos de uso de Evento/Feira de Marketing (módulo Marketing,
 * NOVO no BLOCO 5 MKT correção) — RF-MKT-020 a 025, UC-65.
 *
 * @group unit
 */

const CreateEventUseCase = require('../../src/modules/marketing/application/use-cases/event/CreateEventUseCase');
const UpdateEventUseCase = require('../../src/modules/marketing/application/use-cases/event/UpdateEventUseCase');
const CloseEventUseCase = require('../../src/modules/marketing/application/use-cases/event/CloseEventUseCase');
const GetEventByIdUseCase = require('../../src/modules/marketing/application/use-cases/event/GetEventByIdUseCase');
const AddChecklistItemUseCase = require('../../src/modules/marketing/application/use-cases/event/AddChecklistItemUseCase');
const UpdateChecklistItemUseCase = require('../../src/modules/marketing/application/use-cases/event/UpdateChecklistItemUseCase');
const GetEventsReportUseCase = require('../../src/modules/marketing/application/use-cases/report/GetEventsReportUseCase');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../src/errors');

function makeEventRepository(overrides: Partial<any> = {}) {
  return {
    listEvents: jest.fn(async () => ({ rows: [], count: 0 })),
    findEventById: jest.fn(async () => null),
    createEvent: jest.fn(async (data: any) => ({ id: 1, status: 'planned', ...data })),
    updateEvent: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    addChecklistItem: jest.fn(async (eventId: number, data: any) => ({ id: 1, event_id: eventId, ...data })),
    findChecklistItemById: jest.fn(async () => null),
    updateChecklistItem: jest.fn(async (eventId: number, itemId: number, data: any) => ({ id: itemId, event_id: eventId, ...data })),
    ...overrides,
  };
}

function makeCampaignRepository(overrides: Partial<any> = {}) {
  return {
    findCampaignById: jest.fn(async () => null),
    ...overrides,
  };
}

function makeLeadRepository(overrides: Partial<any> = {}) {
  return {
    findByEventId: jest.fn(async () => []),
    ...overrides,
  };
}

function makeSalesRevenueService(overrides: Partial<any> = {}) {
  return {
    getAttributedRevenue: jest.fn(async () => '0.00'),
    ...overrides,
  };
}

describe('CreateEventUseCase (RF-MKT-020)', () => {
  it('FLUXO PRINCIPAL: cria evento sem campanha', async () => {
    const eventRepo = makeEventRepository();
    const campaignRepo = makeCampaignRepository();

    const result = await new CreateEventUseCase(eventRepo, campaignRepo).execute({
      name: 'Feira Nacional', event_type: 'feira', start_date: '2026-09-15',
    });

    expect(eventRepo.createEvent).toHaveBeenCalledWith(expect.objectContaining({ name: 'Feira Nacional' }));
    expect(result.name).toBe('Feira Nacional');
  });

  it('FLUXO DE EXCECAO: rejeita end_date anterior a start_date', async () => {
    const eventRepo = makeEventRepository();
    const campaignRepo = makeCampaignRepository();

    await expect(
      new CreateEventUseCase(eventRepo, campaignRepo).execute({
        name: 'Feira', event_type: 'feira', start_date: '2026-09-18', end_date: '2026-09-15',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO DE EXCECAO: rejeita campaign_id inexistente', async () => {
    const eventRepo = makeEventRepository();
    const campaignRepo = makeCampaignRepository();

    await expect(
      new CreateEventUseCase(eventRepo, campaignRepo).execute({
        name: 'Feira', event_type: 'feira', start_date: '2026-09-15', campaign_id: 999,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('CloseEventUseCase (RF-MKT-025, UC-65 E1)', () => {
  it('FLUXO PRINCIPAL: encerra o evento com actual_cost informado no payload', async () => {
    const eventRepo = makeEventRepository({
      findEventById: jest.fn(async () => ({ id: 7, status: 'in_progress', actual_cost: null })),
    });

    const result = await new CloseEventUseCase(eventRepo).execute({ id: 7, actual_cost: 28500 });

    expect(eventRepo.updateEvent).toHaveBeenCalledWith(7, { actual_cost: 28500, status: 'completed' });
    expect(result.status).toBe('completed');
  });

  it('FLUXO PRINCIPAL: usa actual_cost já gravado quando payload não o informa', async () => {
    const eventRepo = makeEventRepository({
      findEventById: jest.fn(async () => ({ id: 7, status: 'in_progress', actual_cost: 10000 })),
    });

    await new CloseEventUseCase(eventRepo).execute({ id: 7 });

    expect(eventRepo.updateEvent).toHaveBeenCalledWith(7, { actual_cost: 10000, status: 'completed' });
  });

  it('FLUXO DE EXCECAO E1: rejeita encerramento sem actual_cost (nem payload nem já gravado)', async () => {
    const eventRepo = makeEventRepository({
      findEventById: jest.fn(async () => ({ id: 7, status: 'in_progress', actual_cost: null })),
    });

    await expect(new CloseEventUseCase(eventRepo).execute({ id: 7 })).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO DE EXCECAO: rejeita encerrar evento já completed/canceled', async () => {
    const eventRepo = makeEventRepository({
      findEventById: jest.fn(async () => ({ id: 7, status: 'completed', actual_cost: 1000 })),
    });

    await expect(new CloseEventUseCase(eventRepo).execute({ id: 7, actual_cost: 999 })).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('FLUXO DE EXCECAO: lança NotFoundError quando o evento não existe', async () => {
    const eventRepo = makeEventRepository();
    await expect(new CloseEventUseCase(eventRepo).execute({ id: 999, actual_cost: 100 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('UpdateEventUseCase (imutabilidade pós-conclusão)', () => {
  it('FLUXO DE EXCECAO: bloqueia qualquer edição quando o evento já está completed', async () => {
    const eventRepo = makeEventRepository({
      findEventById: jest.fn(async () => ({ id: 7, status: 'completed', start_date: '2026-09-15', end_date: null })),
    });

    await expect(new UpdateEventUseCase(eventRepo).execute({ id: 7, location: 'Novo local' })).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('FLUXO PRINCIPAL: permite editar evento planned', async () => {
    const eventRepo = makeEventRepository({
      findEventById: jest.fn(async () => ({ id: 7, status: 'planned', start_date: '2026-09-15', end_date: null })),
    });

    const result = await new UpdateEventUseCase(eventRepo).execute({ id: 7, location: 'São Paulo Expo' });
    expect(result.location).toBe('São Paulo Expo');
  });
});

describe('GetEventByIdUseCase (RF-MKT-023/024 — leads_count/cost_per_lead sempre derivados)', () => {
  it('FLUXO PRINCIPAL: calcula leads_count e cost_per_lead a partir dos leads vinculados', async () => {
    const eventRepo = makeEventRepository({
      findEventById: jest.fn(async () => ({ id: 7, name: 'Feira', actual_cost: 28500, toJSON: () => ({ id: 7, name: 'Feira', actual_cost: 28500 }) })),
    });
    const leadRepo = makeLeadRepository({ findByEventId: jest.fn(async () => new Array(95).fill({ id: 1 })) });

    const result = await new GetEventByIdUseCase(eventRepo, leadRepo).execute({ id: 7 });

    expect(result.leads_count).toBe(95);
    expect(result.cost_per_lead).toBe('300.00');
  });

  it('FLUXO PRINCIPAL: cost_per_lead null quando não há leads ou actual_cost', async () => {
    const eventRepo = makeEventRepository({
      findEventById: jest.fn(async () => ({ id: 7, name: 'Feira', actual_cost: null, toJSON: () => ({ id: 7, name: 'Feira', actual_cost: null }) })),
    });
    const leadRepo = makeLeadRepository();

    const result = await new GetEventByIdUseCase(eventRepo, leadRepo).execute({ id: 7 });

    expect(result.leads_count).toBe(0);
    expect(result.cost_per_lead).toBeNull();
  });

  it('FLUXO DE EXCECAO: lança NotFoundError quando o evento não existe', async () => {
    const eventRepo = makeEventRepository();
    const leadRepo = makeLeadRepository();
    await expect(new GetEventByIdUseCase(eventRepo, leadRepo).execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('AddChecklistItemUseCase/UpdateChecklistItemUseCase (RF-MKT-021)', () => {
  it('FLUXO PRINCIPAL: adiciona item de checklist nascendo pending', async () => {
    const eventRepo = makeEventRepository({ findEventById: jest.fn(async () => ({ id: 7 })) });

    const item = await new AddChecklistItemUseCase(eventRepo).execute({ eventId: 7, description: 'Reservar estande' });

    expect(eventRepo.addChecklistItem).toHaveBeenCalledWith(7, expect.objectContaining({ description: 'Reservar estande', status: 'pending' }));
    expect(item.status).toBe('pending');
  });

  it('FLUXO DE EXCECAO: rejeita checklist de evento inexistente', async () => {
    const eventRepo = makeEventRepository();
    await expect(new AddChecklistItemUseCase(eventRepo).execute({ eventId: 999, description: 'X' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO PRINCIPAL: atualiza status do item de checklist', async () => {
    const eventRepo = makeEventRepository({
      findChecklistItemById: jest.fn(async () => ({ id: 1, event_id: 7, status: 'pending' })),
    });

    const item = await new UpdateChecklistItemUseCase(eventRepo).execute({ eventId: 7, itemId: 1, status: 'done' });
    expect(eventRepo.updateChecklistItem).toHaveBeenCalledWith(7, 1, { status: 'done' });
    expect(item.status).toBe('done');
  });

  it('FLUXO DE EXCECAO: rejeita item de checklist inexistente', async () => {
    const eventRepo = makeEventRepository();
    await expect(new UpdateChecklistItemUseCase(eventRepo).execute({ eventId: 7, itemId: 999, status: 'done' })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('GetEventsReportUseCase (RF-MKT-024/027)', () => {
  it('FLUXO PRINCIPAL: agrega ROI/custo por lead por evento', async () => {
    const eventRepo = makeEventRepository({
      listEvents: jest.fn(async () => ({ rows: [{ id: 7, name: 'Feira', actual_cost: 28500 }], count: 1 })),
    });
    const leadRepo = makeLeadRepository({
      findByEventId: jest.fn(async () => [
        { id: 1, status: 'converted', converted_to_customer_id: 55, converted_at: new Date() },
        { id: 2, status: 'new', converted_to_customer_id: null, converted_at: null },
      ]),
    });
    const salesRevenueService = makeSalesRevenueService({ getAttributedRevenue: jest.fn(async () => '34200.00') });

    const report = await new GetEventsReportUseCase(eventRepo, leadRepo, salesRevenueService).execute({});

    expect(report).toHaveLength(1);
    expect(report[0]).toMatchObject({
      event_id: 7, leads_count: 2, conversions: 1, attributed_revenue: '34200.00', cost_per_lead: '14250.00',
    });
  });

  it('FLUXO PRINCIPAL: retorna lista vazia quando não há eventos no filtro', async () => {
    const eventRepo = makeEventRepository();
    const leadRepo = makeLeadRepository();
    const salesRevenueService = makeSalesRevenueService();

    const report = await new GetEventsReportUseCase(eventRepo, leadRepo, salesRevenueService).execute({ event_type: 'workshop' });
    expect(report).toEqual([]);
  });
});
