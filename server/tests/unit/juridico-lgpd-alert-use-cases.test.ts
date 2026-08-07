/**
 * Testes: cluster LGPD — RoPA, Solicitação de Titular, Incidente (UC-56) —
 * e Alertas transversais (`JurLegalAlert`, §8.1) do módulo Jurídico
 * (`docs/business/BLOCO_3_JUR_API.md` §7-8, passada 2/2).
 *
 * Foco: `identity_verified=true` obrigatório antes de `in_progress`/`resolve`
 * (E1/BR-JUR-041), justificativa dupla obrigatória na decisão de incidente
 * mesmo com booleano `false` (BR-JUR-042), encerramento de incidente
 * bloqueado sem decisão prévia (E4), e alertas de prazo fatal nunca
 * "desativáveis" — `acknowledge` só marca lido/tratado (RNF-JUR-04).
 *
 * @group unit
 */

const CreateProcessingActivityUseCase = require('../../src/modules/juridico/application/use-cases/lgpd/CreateProcessingActivityUseCase');
const ReviewProcessingActivityUseCase = require('../../src/modules/juridico/application/use-cases/lgpd/ReviewProcessingActivityUseCase');

const CreateDataSubjectRequestUseCase = require('../../src/modules/juridico/application/use-cases/lgpd/CreateDataSubjectRequestUseCase');
const VerifyIdentityUseCase = require('../../src/modules/juridico/application/use-cases/lgpd/VerifyIdentityUseCase');
const ResolveDataSubjectRequestUseCase = require('../../src/modules/juridico/application/use-cases/lgpd/ResolveDataSubjectRequestUseCase');
const RejectDataSubjectRequestUseCase = require('../../src/modules/juridico/application/use-cases/lgpd/RejectDataSubjectRequestUseCase');

const CreateIncidentUseCase = require('../../src/modules/juridico/application/use-cases/lgpd/CreateIncidentUseCase');
const DecideIncidentUseCase = require('../../src/modules/juridico/application/use-cases/lgpd/DecideIncidentUseCase');
const CloseIncidentUseCase = require('../../src/modules/juridico/application/use-cases/lgpd/CloseIncidentUseCase');

const AcknowledgeAlertUseCase = require('../../src/modules/juridico/application/use-cases/alert/AcknowledgeAlertUseCase');

const { ValidationError, NotFoundError, BusinessRuleError } = require('../../src/errors');

function makeRequestRepository(overrides: Partial<any> = {}) {
  let state = overrides.initialRequest ?? { id: 40, status: 'received', identity_verified: false };
  return {
    create: jest.fn(async (data: any) => { state = { ...state, id: 40, ...data }; return state; }),
    findById: jest.fn(async () => state),
    update: jest.fn(async (id: any, data: any) => { state = { ...state, ...data, id }; return state; }),
    ...overrides,
  };
}

function makeIncidentRepository(overrides: Partial<any> = {}) {
  let state = overrides.initialIncident ?? { id: 60, status: 'open', communication_decision: null, communication_justification: null };
  return {
    create: jest.fn(async (data: any) => { state = { ...state, id: 60, ...data }; return state; }),
    findById: jest.fn(async () => state),
    update: jest.fn(async (id: any, data: any) => { state = { ...state, ...data, id }; return state; }),
    ...overrides,
  };
}

describe('CreateProcessingActivityUseCase (RoPA)', () => {
  it('rejeita legal_basis invalido', async () => {
    const repo = { create: jest.fn() };
    await expect(
      new CreateProcessingActivityUseCase(repo).execute({
        purpose: 'x', legal_basis: 'invalido', data_categories: ['a'], data_subject_categories: ['b'], department_id: 5, createdBy: 1,
      } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('cadastra atividade com department_id valido (fluxo principal)', async () => {
    const repo = { create: jest.fn(async (data: any) => ({ id: 1, ...data })) };
    const { Department } = require('../../src/models/index');
    jest.spyOn(Department, 'findByPk').mockResolvedValueOnce({ id: 5 });

    const result = await new CreateProcessingActivityUseCase(repo).execute({
      purpose: 'Gestão de folha de pagamento', legal_basis: 'legal_obligation',
      data_categories: ['dados cadastrais'], data_subject_categories: ['funcionários'], department_id: 5, createdBy: 1,
    });

    expect(result.legal_basis).toBe('legal_obligation');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ next_review_due_at: expect.any(String) }));
  });

  it('lanca NotFoundError se department_id nao existir', async () => {
    const repo = { create: jest.fn() };
    const { Department } = require('../../src/models/index');
    jest.spyOn(Department, 'findByPk').mockResolvedValueOnce(null);
    await expect(
      new CreateProcessingActivityUseCase(repo).execute({
        purpose: 'x', legal_basis: 'consent', data_categories: ['a'], data_subject_categories: ['b'], department_id: 999, createdBy: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ReviewProcessingActivityUseCase', () => {
  it('atualiza last_reviewed_at e reagenda next_review_due_at (+1 ano)', async () => {
    const repo = { findById: jest.fn(async () => ({ id: 5 })), update: jest.fn(async (id: any, data: any) => ({ id, ...data })) };
    const result = await new ReviewProcessingActivityUseCase(repo).execute({ id: 5, reviewedAt: '2026-08-07' });
    expect(result.last_reviewed_at).toBe('2026-08-07');
    expect(result.next_review_due_at).toBe('2027-08-07');
  });
});

describe('CreateDataSubjectRequestUseCase', () => {
  it('calcula due_date = received_at + 15 dias (RF-JUR-037)', async () => {
    const repo = makeRequestRepository();
    const result = await new CreateDataSubjectRequestUseCase(repo).execute({
      type: 'access', received_at: '2026-08-01', dpoUserId: 1,
    });
    expect(result.due_date).toBe('2026-08-16');
  });

  it('rejeita type invalido', async () => {
    const repo = makeRequestRepository();
    await expect(
      new CreateDataSubjectRequestUseCase(repo).execute({ type: 'invalido', dpoUserId: 1 } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('VerifyIdentityUseCase — E1/BR-JUR-041', () => {
  it('avanca para in_progress quando identity_verified=true (fluxo principal)', async () => {
    const repo = makeRequestRepository();
    const result = await new VerifyIdentityUseCase(repo).execute({ id: 40, identity_verified: true, verifiedBy: 5 });
    expect(result.status).toBe('in_progress');
  });

  it('rejeita identity_verified=false — nao avanca de estado (E1)', async () => {
    const repo = makeRequestRepository();
    await expect(
      new VerifyIdentityUseCase(repo).execute({ id: 40, identity_verified: false, verifiedBy: 5 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('ResolveDataSubjectRequestUseCase', () => {
  it('rejeita sem identity_verified (CHECK ck_jur_lgpd_dsr_in_progress_requires_verification)', async () => {
    const repo = makeRequestRepository({ initialRequest: { id: 40, status: 'in_progress', identity_verified: false } });
    await expect(
      new ResolveDataSubjectRequestUseCase(repo).execute({ id: 40, resolution_notes: 'x' }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('resolve com identity_verified=true (fluxo principal)', async () => {
    const repo = makeRequestRepository({ initialRequest: { id: 40, status: 'in_progress', identity_verified: true } });
    const result = await new ResolveDataSubjectRequestUseCase(repo).execute({ id: 40, resolution_notes: 'Relatório enviado' });
    expect(result.status).toBe('answered');
  });

  it('rejeita sem resolution_notes', async () => {
    const repo = makeRequestRepository();
    await expect(
      new ResolveDataSubjectRequestUseCase(repo).execute({ id: 40 } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('RejectDataSubjectRequestUseCase — E3/BR-JUR-041', () => {
  it('rejeita sem rejection_justification', async () => {
    const repo = makeRequestRepository();
    await expect(
      new RejectDataSubjectRequestUseCase(repo).execute({ id: 40 } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('recusa com justificativa (fluxo principal)', async () => {
    const repo = makeRequestRepository();
    const result = await new RejectDataSubjectRequestUseCase(repo).execute({ id: 40, rejection_justification: 'Titular não identificado' });
    expect(result.status).toBe('rejected_justified');
  });
});

describe('CreateIncidentUseCase', () => {
  it('rejeita campos obrigatorios ausentes', async () => {
    const repo = makeIncidentRepository();
    await expect(
      new CreateIncidentUseCase(repo).execute({ createdBy: 1 } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('abre incidente (fluxo principal)', async () => {
    const repo = makeIncidentRepository();
    const result = await new CreateIncidentUseCase(repo).execute({
      detected_at: '2026-08-07T08:00:00Z', description: 'Acesso indevido', risk_assessment: 'medio', createdBy: 1,
    });
    expect(result.status).toBe('open');
  });
});

describe('DecideIncidentUseCase — BR-JUR-042', () => {
  it('exige as duas justificativas mesmo com ambos booleanos false', async () => {
    const repo = makeIncidentRepository();
    await expect(
      new DecideIncidentUseCase(repo).execute({
        id: 60, notify_anpd: false, notify_anpd_justification: '', notify_data_subjects: false, notify_data_subjects_justification: 'x',
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('registra decisao not_communicate com ambas justificativas preenchidas (fluxo principal)', async () => {
    const repo = makeIncidentRepository();
    const result = await new DecideIncidentUseCase(repo).execute({
      id: 60, notify_anpd: false, notify_anpd_justification: 'Risco baixo', notify_data_subjects: false, notify_data_subjects_justification: 'Risco baixo',
    });
    expect(result.communication_decision).toBe('not_communicate');
  });

  it('registra decisao communicate_both quando ambos true', async () => {
    const repo = makeIncidentRepository();
    const result = await new DecideIncidentUseCase(repo).execute({
      id: 60, notify_anpd: true, notify_anpd_justification: 'Risco alto', notify_data_subjects: true, notify_data_subjects_justification: 'Risco alto',
    });
    expect(result.communication_decision).toBe('communicate_both');
  });
});

describe('CloseIncidentUseCase — E4/BR-JUR-042', () => {
  it('bloqueia encerramento sem decisao registrada', async () => {
    const repo = makeIncidentRepository();
    await expect(
      new CloseIncidentUseCase(repo).execute({ id: 60 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('encerra apos decisao registrada (fluxo principal)', async () => {
    const repo = makeIncidentRepository({
      initialIncident: { id: 60, status: 'investigating', communication_decision: 'not_communicate', communication_justification: 'x' },
    });
    const result = await new CloseIncidentUseCase(repo).execute({ id: 60 });
    expect(result.status).toBe('closed');
  });
});

describe('AcknowledgeAlertUseCase — RNF-JUR-04 (nunca desativa)', () => {
  it('marca alerta como acknowledged (fluxo principal, inclusive origem is_fatal)', async () => {
    const repo = {
      findById: jest.fn(async () => ({ id: 10, origin_type: 'legal_case_deadline', status: 'pending' })),
      update: jest.fn(async (id: any, data: any) => ({ id, origin_type: 'legal_case_deadline', ...data })),
    };
    const result = await new AcknowledgeAlertUseCase(repo).execute({ id: 10 });
    expect(result.status).toBe('acknowledged');
    expect(repo.update).toHaveBeenCalledWith(10, expect.objectContaining({ status: 'acknowledged' }));
    // nunca seta campo de desativação — a interface nem expõe tal campo.
    expect(repo.update.mock.calls[0][1]).not.toHaveProperty('active');
    expect(repo.update.mock.calls[0][1]).not.toHaveProperty('disabled');
  });

  it('lanca NotFoundError se o alerta nao existir', async () => {
    const repo = { findById: jest.fn(async () => null), update: jest.fn() };
    await expect(new AcknowledgeAlertUseCase(repo).execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});
