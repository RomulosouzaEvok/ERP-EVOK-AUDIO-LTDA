/**
 * Testes: cluster Helpdesk de TI — ItTicket/ItTicketComment (UC-49).
 *
 * Cobre o fluxo principal (abertura → SLA calculado → resolução → fechamento)
 * e fluxos de exceção: fechar sem passar por `resolved` (E1), reabrir fora
 * do prazo (E3), comentário `is_internal` negado a quem não tem módulo `ti`
 * (RF-TI-014).
 *
 * @group unit
 */

const CreateTicketUseCase = require('../../src/modules/ti/application/use-cases/ticket/CreateTicketUseCase');
const ResolveTicketUseCase = require('../../src/modules/ti/application/use-cases/ticket/ResolveTicketUseCase');
const ConfirmTicketUseCase = require('../../src/modules/ti/application/use-cases/ticket/ConfirmTicketUseCase');
const ReopenTicketUseCase = require('../../src/modules/ti/application/use-cases/ticket/ReopenTicketUseCase');
const AddTicketCommentUseCase = require('../../src/modules/ti/application/use-cases/ticket/AddTicketCommentUseCase');
const { ValidationError, NotFoundError, BusinessRuleError, ForbiddenError, ConflictError } = require('../../src/errors');

function makeCategory(overrides: Partial<any> = {}) {
  return { id: 4, name: 'Hardware', default_priority: 'medium', active: true, ...overrides };
}

function makeTicket(overrides: Partial<any> = {}) {
  return {
    id: 900,
    ticket_number: 'TI-2026-0001',
    requester_id: 501,
    status: 'open',
    priority: 'medium',
    solution: null,
    closed_at: null,
    updatedAt: new Date(),
    waiting_minutes: 0,
    ...overrides,
  };
}

/**
 * Mock STATEFUL do TicketRepository: `findById` reflete o estado após
 * `update`, para que os testes possam validar o objeto final devolvido
 * pelos use cases (que sempre re-leem via `findById` após persistir).
 */
function makeTicketRepository(overrides: Partial<any> = {}) {
  let state = overrides.initialTicket ?? makeTicket();
  return {
    findCategoryById: jest.fn(async () => makeCategory()),
    findCategoryByName: jest.fn(async () => makeCategory()),
    createCategory: jest.fn(async (data: any) => ({ id: 10, ...data })),
    countByYear: jest.fn(async () => 0),
    create: jest.fn(async (data: any) => { state = { ...state, id: 900, ...data }; return state; }),
    findById: jest.fn(async () => state),
    update: jest.fn(async (id: any, data: any) => { state = { ...state, ...data, id }; return state; }),
    createComment: jest.fn(async (data: any) => ({ id: 1, ...data, created_at: new Date() })),
    listComments: jest.fn(async () => []),
    createPriorityHistory: jest.fn(async (data: any) => data),
    ...overrides,
  };
}

function makeSettingsRepository() {
  return {
    get: jest.fn(async () => ({
      sla_response_minutes_low: 1440, sla_response_minutes_medium: 240, sla_response_minutes_high: 120, sla_response_minutes_urgent: 30,
      sla_resolution_minutes_low: 7200, sla_resolution_minutes_medium: 2880, sla_resolution_minutes_high: 480, sla_resolution_minutes_urgent: 240,
      auto_close_business_days: 3, reopen_window_days: 7,
    })),
  };
}

function makeAssetLookupService(overrides: Partial<any> = {}) {
  return { findById: jest.fn(async () => ({ id: 118, asset_type: 'it', name: 'Notebook' })), ...overrides };
}

describe('CreateTicketUseCase', () => {
  it('abre chamado calculando SLA e numero sequencial (fluxo principal)', async () => {
    const repo = makeTicketRepository();
    const settings = makeSettingsRepository();
    const assetLookup = makeAssetLookupService();

    const result = await new CreateTicketUseCase(repo, settings, assetLookup).execute({
      subject: 'Impressora não imprime', description: 'Erro de driver', category_id: 4,
      requesterId: 501, requesterHasTiOperate: false,
    });

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      ticket_number: 'TI-2026-0001', requester_id: 501, system_generated: false, priority: 'medium', status: 'open',
    }));
    expect(result.id).toBe(900);
  });

  it('rejeita campos obrigatorios ausentes', async () => {
    const repo = makeTicketRepository();
    await expect(
      new CreateTicketUseCase(repo, makeSettingsRepository(), makeAssetLookupService()).execute({ subject: '', description: '', category_id: undefined, requesterId: 1, requesterHasTiOperate: false } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('lanca NotFoundError se a categoria nao existir', async () => {
    const repo = makeTicketRepository({ findCategoryById: jest.fn(async () => null) });
    await expect(
      new CreateTicketUseCase(repo, makeSettingsRepository(), makeAssetLookupService()).execute({
        subject: 'x', description: 'y', category_id: 999, requesterId: 1, requesterHasTiOperate: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('ignora silenciosamente opened_on_behalf_of quando o solicitante nao tem ti:operate (nunca 403)', async () => {
    const repo = makeTicketRepository();
    await new CreateTicketUseCase(repo, makeSettingsRepository(), makeAssetLookupService()).execute({
      subject: 'x', description: 'y', category_id: 4, opened_on_behalf_of: 77, requesterId: 1, requesterHasTiOperate: false,
    });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ opened_on_behalf_of: null }));
  });

  it('system_generated=true dispensa requesterId (chamado automatico de falha de backup, RF-TI-040)', async () => {
    const repo = makeTicketRepository();
    await new CreateTicketUseCase(repo, makeSettingsRepository(), makeAssetLookupService()).execute({
      subject: 'Falha de backup', description: 'x', category_id: 4, requesterId: null, requesterHasTiOperate: false, systemGenerated: true,
    });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ requester_id: null, system_generated: true }));
  });
});

describe('ResolveTicketUseCase', () => {
  it('resolve chamado in_progress com solution preenchida', async () => {
    const repo = makeTicketRepository({ initialTicket: makeTicket({ status: 'in_progress' }) });
    const result = await new ResolveTicketUseCase(repo).execute({ id: 900, solution: 'Reinstalado driver.' });
    expect(repo.update).toHaveBeenCalledWith(900, expect.objectContaining({ status: 'resolved', solution: 'Reinstalado driver.' }));
    expect(result.status).toBe('resolved');
  });

  it('FLUXO DE EXCECAO (BR-TI-004): rejeita resolver sem solution', async () => {
    const repo = makeTicketRepository({ initialTicket: makeTicket({ status: 'in_progress' }) });
    await expect(new ResolveTicketUseCase(repo).execute({ id: 900, solution: '' })).rejects.toBeInstanceOf(BusinessRuleError);
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('ConfirmTicketUseCase (E1 — fechar sem passar por resolved)', () => {
  it('confirma e fecha chamado resolved', async () => {
    const repo = makeTicketRepository({ initialTicket: makeTicket({ status: 'resolved' }) });
    const result = await new ConfirmTicketUseCase(repo).execute({ id: 900, satisfaction_rating: 5 });
    expect(repo.update).toHaveBeenCalledWith(900, expect.objectContaining({ status: 'closed' }));
    expect(result.status).toBe('closed');
  });

  it('FLUXO DE EXCECAO E1: rejeita confirmar chamado ainda in_progress (nao passou por resolved)', async () => {
    const repo = makeTicketRepository({ initialTicket: makeTicket({ status: 'in_progress' }) });
    await expect(new ConfirmTicketUseCase(repo).execute({ id: 900 })).rejects.toBeInstanceOf(ValidationError);
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('ReopenTicketUseCase (E3 — prazo de reabertura)', () => {
  it('reabre chamado closed dentro do prazo parametrizado', async () => {
    const closedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 dias atras
    const repo = makeTicketRepository({ initialTicket: makeTicket({ status: 'closed', closed_at: closedAt }) });
    const result = await new ReopenTicketUseCase(repo, makeSettingsRepository()).execute({ id: 900 });
    expect(repo.update).toHaveBeenCalledWith(900, expect.objectContaining({ status: 'in_progress' }));
    expect(result.status).toBe('in_progress');
  });

  it('FLUXO DE EXCECAO E3: BLOQUEIA reabertura de chamado closed ha mais de reopen_window_days', async () => {
    const closedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dias atras, janela=7
    const repo = makeTicketRepository({ initialTicket: makeTicket({ status: 'closed', closed_at: closedAt }) });
    await expect(new ReopenTicketUseCase(repo, makeSettingsRepository()).execute({ id: 900 })).rejects.toBeInstanceOf(BusinessRuleError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('rejeita reabrir chamado ja in_progress com ConflictError (idempotencia negativa)', async () => {
    const repo = makeTicketRepository({ initialTicket: makeTicket({ status: 'in_progress' }) });
    await expect(new ReopenTicketUseCase(repo, makeSettingsRepository()).execute({ id: 900 })).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('AddTicketCommentUseCase (RF-TI-014 — nota interna)', () => {
  it('aceita comentario publico de qualquer autor', async () => {
    const repo = makeTicketRepository();
    const comment = await new AddTicketCommentUseCase(repo).execute({ ticketId: 900, authorId: 501, body: 'Oi', isInternal: false, authorHasTiModule: false });
    expect(comment.body).toBe('Oi');
  });

  it('FLUXO DE EXCECAO: BLOQUEIA is_internal=true para quem nao tem modulo ti', async () => {
    const repo = makeTicketRepository();
    await expect(
      new AddTicketCommentUseCase(repo).execute({ ticketId: 900, authorId: 501, body: 'nota interna', isInternal: true, authorHasTiModule: false }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repo.createComment).not.toHaveBeenCalled();
  });

  it('aceita is_internal=true de quem TEM modulo ti', async () => {
    const repo = makeTicketRepository();
    const comment = await new AddTicketCommentUseCase(repo).execute({ ticketId: 900, authorId: 12, body: 'nota interna', isInternal: true, authorHasTiModule: true });
    expect(comment.is_internal).toBe(true);
  });
});
