/**
 * Testes: `JurLegalCaseDeadline` — fluxo mais crítico do módulo Jurídico
 * (UC-54, `docs/business/BLOCO_3_JUR_API.md` §4, dupla confirmação).
 *
 * Foco obrigatório do bloco (mesmo mandato da auditoria cruzada,
 * `docs/business/BLOCO_3_JUR_AUDITORIA.md` §4): responsible_user_id
 * NOT NULL sem exceção (RF-JUR-021), baixa com evidência obrigatória
 * (RF-JUR-024), justificativa retroativa obrigatória quando `missed`
 * (RF-JUR-025/BR-JUR-014), e a regra central de dupla confirmação —
 * `fulfilled_by !== confirmed_by`, inclusive o mesmo usuário tentando
 * confirmar a própria baixa (E2/BR-JUR-013).
 *
 * @group unit
 */

const CreateDeadlineUseCase = require('../../src/modules/juridico/application/use-cases/deadline/CreateDeadlineUseCase');
const AcknowledgeDeadlineUseCase = require('../../src/modules/juridico/application/use-cases/deadline/AcknowledgeDeadlineUseCase');
const FulfillDeadlineUseCase = require('../../src/modules/juridico/application/use-cases/deadline/FulfillDeadlineUseCase');
const ConfirmDeadlineUseCase = require('../../src/modules/juridico/application/use-cases/deadline/ConfirmDeadlineUseCase');
const { ValidationError, NotFoundError, ConflictError, BusinessRuleError, ForbiddenError } = require('../../src/errors');

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function makeDeadline(overrides: Partial<any> = {}) {
  return {
    id: 800,
    legal_case_id: 500,
    description: 'Contestação',
    due_date: futureDate(10),
    is_fatal: true,
    responsible_user_id: 12,
    backup_user_id: 15,
    escalation_user_id: 3,
    status: 'pending',
    fulfilled_by: null,
    confirmed_by: null,
    retroactive_justification: null,
    ...overrides,
  };
}

function makeDeadlineRepository(overrides: Partial<any> = {}) {
  let state = overrides.initialDeadline ?? makeDeadline();
  return {
    create: jest.fn(async (data: any) => { state = { ...state, id: 800, ...data }; return state; }),
    findById: jest.fn(async () => state),
    update: jest.fn(async (id: any, data: any) => { state = { ...state, ...data, id }; return state; }),
    ...overrides,
  };
}

function makeLegalCaseRepository(overrides: Partial<any> = {}) {
  return { findById: jest.fn(async () => ({ id: 500, case_number: 'LC-2026-0031' })), ...overrides };
}

describe('CreateDeadlineUseCase', () => {
  it('cria prazo fatal com escalation_user_id (fluxo principal)', async () => {
    const repo = makeDeadlineRepository();
    const legalCaseRepo = makeLegalCaseRepository();

    const result = await new CreateDeadlineUseCase(repo, legalCaseRepo).execute({
      legalCaseId: 500, description: 'Contestação', due_date: futureDate(15), is_fatal: true,
      responsible_user_id: 12, escalation_user_id: 3, createdBy: 1,
    });

    expect(result.status).toBe('pending');
    expect(result.alerts_scheduled).toEqual(['D-7', 'D-3', 'D-1', 'D0']);
  });

  it('rejeita prazo sem responsible_user_id — sem excecao (RF-JUR-021/BR-JUR-010)', async () => {
    const repo = makeDeadlineRepository();
    const legalCaseRepo = makeLegalCaseRepository();

    await expect(
      new CreateDeadlineUseCase(repo, legalCaseRepo).execute({
        legalCaseId: 500, description: 'Contestação', due_date: futureDate(15), createdBy: 1,
      } as any),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('rejeita prazo fatal sem escalation_user_id (BR-JUR-011)', async () => {
    const repo = makeDeadlineRepository();
    const legalCaseRepo = makeLegalCaseRepository();

    await expect(
      new CreateDeadlineUseCase(repo, legalCaseRepo).execute({
        legalCaseId: 500, description: 'Contestação', due_date: futureDate(15), is_fatal: true, responsible_user_id: 12, createdBy: 1,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('lanca NotFoundError se o processo nao existir', async () => {
    const repo = makeDeadlineRepository();
    const legalCaseRepo = makeLegalCaseRepository({ findById: jest.fn(async () => null) });

    await expect(
      new CreateDeadlineUseCase(repo, legalCaseRepo).execute({
        legalCaseId: 999, description: 'x', due_date: futureDate(5), responsible_user_id: 12, escalation_user_id: 3, createdBy: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('AcknowledgeDeadlineUseCase', () => {
  it('permite o proprio responsavel reconhecer (fluxo principal)', async () => {
    const repo = makeDeadlineRepository();
    const result = await new AcknowledgeDeadlineUseCase(repo).execute({ id: 800, requestingUserId: 12 });
    expect(result.acknowledged_at).toBeInstanceOf(Date);
  });

  it('permite o backup reconhecer quando as_backup=true', async () => {
    const repo = makeDeadlineRepository();
    const result = await new AcknowledgeDeadlineUseCase(repo).execute({ id: 800, requestingUserId: 15, asBackup: true });
    expect(result.acknowledged_at).toBeInstanceOf(Date);
  });

  it('rejeita usuario diferente do responsavel/backup (403)', async () => {
    const repo = makeDeadlineRepository();
    await expect(
      new AcknowledgeDeadlineUseCase(repo).execute({ id: 800, requestingUserId: 99 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('FulfillDeadlineUseCase — 1ª confirmação (RF-JUR-024)', () => {
  it('registra cumprimento com evidencia (fluxo principal)', async () => {
    const repo = makeDeadlineRepository();
    const result = await new FulfillDeadlineUseCase(repo).execute({
      id: 800, evidence_file_path: 'https://.../protocolo.pdf', fulfilledBy: 12,
    });
    expect(result.status).toBe('fulfilled_pending_confirmation');
    expect(result.fulfilled_by).toBe(12);
  });

  it('rejeita sem evidence_file_path (400)', async () => {
    const repo = makeDeadlineRepository();
    await expect(
      new FulfillDeadlineUseCase(repo).execute({ id: 800, fulfilledBy: 12 } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita prazo ja fulfilled_pending_confirmation (409, idempotencia negativa)', async () => {
    const repo = makeDeadlineRepository({ initialDeadline: makeDeadline({ status: 'fulfilled_pending_confirmation', fulfilled_by: 12 }) });
    await expect(
      new FulfillDeadlineUseCase(repo).execute({ id: 800, evidence_file_path: 'x', fulfilledBy: 15 }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('rejeita prazo ja confirmed (409)', async () => {
    const repo = makeDeadlineRepository({ initialDeadline: makeDeadline({ status: 'confirmed' }) });
    await expect(
      new FulfillDeadlineUseCase(repo).execute({ id: 800, evidence_file_path: 'x', fulfilledBy: 15 }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('exige retroactive_justification quando o prazo esta vencido/missed (E3/BR-JUR-014)', async () => {
    const repo = makeDeadlineRepository({ initialDeadline: makeDeadline({ status: 'missed', due_date: futureDate(-5) }) });
    await expect(
      new FulfillDeadlineUseCase(repo).execute({ id: 800, evidence_file_path: 'x', fulfilledBy: 12 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('aceita baixa retroativa com justificativa (fluxo alternativo)', async () => {
    const repo = makeDeadlineRepository({ initialDeadline: makeDeadline({ status: 'missed', due_date: futureDate(-5) }) });
    const result = await new FulfillDeadlineUseCase(repo).execute({
      id: 800, evidence_file_path: 'x', retroactive_justification: 'Protocolo enviado com atraso justificado', fulfilledBy: 12,
    });
    expect(result.retroactive_justification).toBeTruthy();
  });

  it('detecta vencimento mesmo quando status ainda nao foi marcado missed (due_date no passado)', async () => {
    const repo = makeDeadlineRepository({ initialDeadline: makeDeadline({ status: 'pending', due_date: futureDate(-1) }) });
    await expect(
      new FulfillDeadlineUseCase(repo).execute({ id: 800, evidence_file_path: 'x', fulfilledBy: 12 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

describe('ConfirmDeadlineUseCase — 2ª confirmação, regra central BR-JUR-013', () => {
  it('confirma com usuario distinto de quem fez fulfill (fluxo principal)', async () => {
    const repo = makeDeadlineRepository({ initialDeadline: makeDeadline({ status: 'fulfilled_pending_confirmation', fulfilled_by: 12 }) });
    const result = await new ConfirmDeadlineUseCase(repo).execute({ id: 800, confirmedBy: 15 });
    expect(result.status).toBe('confirmed');
    expect(result.confirmed_by).toBe(15);
  });

  it('rejeita o MESMO usuario tentando confirmar a propria baixa (E2/BR-JUR-013, teste central do bloco)', async () => {
    const repo = makeDeadlineRepository({ initialDeadline: makeDeadline({ status: 'fulfilled_pending_confirmation', fulfilled_by: 12 }) });
    let caught: any;
    try {
      await new ConfirmDeadlineUseCase(repo).execute({ id: 800, confirmedBy: 12 });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(BusinessRuleError);
    expect(caught.details).toEqual(expect.objectContaining({ rule: 'BR-JUR-013', fulfilled_by: 12, attempted_confirm_by: 12 }));
  });

  it('rejeita confirmacao fora do status fulfilled_pending_confirmation (400)', async () => {
    const repo = makeDeadlineRepository({ initialDeadline: makeDeadline({ status: 'pending' }) });
    await expect(
      new ConfirmDeadlineUseCase(repo).execute({ id: 800, confirmedBy: 15 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita confirmacao de prazo ja confirmed (idempotencia negativa)', async () => {
    const repo = makeDeadlineRepository({ initialDeadline: makeDeadline({ status: 'confirmed', fulfilled_by: 12, confirmed_by: 15 }) });
    await expect(
      new ConfirmDeadlineUseCase(repo).execute({ id: 800, confirmedBy: 20 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('resulta em confirmed_late quando ha retroactive_justification (baixa retroativa apos missed)', async () => {
    const repo = makeDeadlineRepository({
      initialDeadline: makeDeadline({ status: 'fulfilled_pending_confirmation', fulfilled_by: 12, retroactive_justification: 'Atraso justificado' }),
    });
    const result = await new ConfirmDeadlineUseCase(repo).execute({ id: 800, confirmedBy: 15 });
    expect(result.status).toBe('confirmed_late');
  });

  it('lanca NotFoundError se o prazo nao existir', async () => {
    const repo = makeDeadlineRepository({ findById: jest.fn(async () => null) });
    await expect(
      new ConfirmDeadlineUseCase(repo).execute({ id: 999, confirmedBy: 15 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
