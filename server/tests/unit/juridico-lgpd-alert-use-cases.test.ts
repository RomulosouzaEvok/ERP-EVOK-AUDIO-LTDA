/**
 * Testes: cluster LGPD - RoPA, Solicitacao de Titular, Incidente (UC-56) -
 * e Alertas transversais (`JurLegalAlert`, §8.1) do modulo Juridico
 * (`docs/business/BLOCO_3_JUR_API.md` §7-8, passada 2/2).
 *
 * Foco: identity_verified=true obrigatorio antes de in_progress/resolve
 * (E1/BR-JUR-041), justificativa dupla obrigatoria na decisao de incidente
 * mesmo com booleano false (BR-JUR-042), encerramento de incidente
 * bloqueado sem decisao previa (E4), e alertas de prazo fatal nunca
 * "desativaveis" - acknowledge so marca lido/tratado (RNF-JUR-04).
 */

const CreateProcessingActivityUseCase = require('../../src/modules/juridico/application/use-cases/lgpd/CreateProcessingActivityUseCase');
const CreateRetentionPolicyUseCase = require('../../src/modules/juridico/application/use-cases/lgpd/CreateRetentionPolicyUseCase');
const ReviewProcessingActivityUseCase = require('../../src/modules/juridico/application/use-cases/lgpd/ReviewProcessingActivityUseCase');
const PendingCriticalIncidentsUseCase = require('../../src/modules/juridico/application/use-cases/lgpd/PendingCriticalIncidentsUseCase');

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
  let state = overrides.initialIncident ?? {
    id: 60,
    status: 'open',
    communication_decision: null,
    communication_justification: null,
    assessment_due_at: '2026-08-18T08:00:00.000Z',
  };
  return {
    create: jest.fn(async (data: any) => { state = { ...state, id: 60, ...data }; return state; }),
    findById: jest.fn(async () => state),
    update: jest.fn(async (id: any, data: any) => { state = { ...state, ...data, id }; return state; }),
    ...overrides,
  };
}

function makeDpoDesignationRepository(activeUserId = 77) {
  return {
    findActive: jest.fn(async () => ({ id: 10, user_id: activeUserId })),
  };
}

function makeRetentionPolicyRepository(retentionValue = '12 meses') {
  return {
    findActiveById: jest.fn(async (id: number) => ({ id, retention_value: retentionValue })),
  };
}

function makeOperationalRetentionPolicyRepository() {
  const policies = new Map<number, any>();
  let nextId = 1;

  return {
    create: jest.fn(async (data: any) => {
      const policy = { id: nextId++, status: 'active', auto_delete_enabled: false, ...data };
      policies.set(policy.id, policy);
      return policy;
    }),
    findActiveById: jest.fn(async (id: number) => policies.get(Number(id)) ?? null),
  };
}

function makeManualTaskRepository() {
  return {
    create: jest.fn(async (data: any) => ({ id: 900, ...data })),
  };
}

describe('CreateProcessingActivityUseCase (RoPA)', () => {
  it('rejeita legal_basis invalido', async () => {
    const repo = { create: jest.fn() };
    await expect(
      new CreateProcessingActivityUseCase(repo, makeRetentionPolicyRepository()).execute({
        purpose: 'x', legal_basis: 'invalido', data_categories: ['a'], data_subject_categories: ['b'], department_id: 5, createdBy: 1, retentionPolicyId: 1,
      } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('cadastra atividade com department_id valido e retencao estruturada', async () => {
    const repo = { create: jest.fn(async (data: any) => ({ id: 1, ...data })) };
    const { Department } = require('../../src/models/index');
    jest.spyOn(Department, 'findByPk').mockResolvedValueOnce({ id: 5 });
    const retentionRepo = makeRetentionPolicyRepository('24 meses');

    const result = await new CreateProcessingActivityUseCase(repo, retentionRepo).execute({
      purpose: 'Gestao de folha de pagamento', legal_basis: 'legal_obligation',
      data_categories: ['dados cadastrais'], data_subject_categories: ['funcionarios'], department_id: 5, createdBy: 1, retentionPolicyId: 11,
    });

    expect(result.legal_basis).toBe('legal_obligation');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      next_review_due_at: expect.any(String),
      retention_period: '24 meses',
      retention_policy_id: 11,
    }));
    expect(retentionRepo.findActiveById).toHaveBeenCalledWith(11);
  });

  it('lanca NotFoundError se department_id nao existir', async () => {
    const repo = { create: jest.fn() };
    const { Department } = require('../../src/models/index');
    jest.spyOn(Department, 'findByPk').mockResolvedValueOnce(null);
    await expect(
      new CreateProcessingActivityUseCase(repo, makeRetentionPolicyRepository()).execute({
        purpose: 'x', legal_basis: 'consent', data_categories: ['a'], data_subject_categories: ['b'], department_id: 999, createdBy: 1, retentionPolicyId: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita sem retentionPolicyId', async () => {
    const repo = { create: jest.fn() };
    const { Department } = require('../../src/models/index');
    jest.spyOn(Department, 'findByPk').mockResolvedValueOnce({ id: 5 });
    await expect(
      new CreateProcessingActivityUseCase(repo, makeRetentionPolicyRepository()).execute({
        purpose: 'x', legal_basis: 'consent', data_categories: ['a'], data_subject_categories: ['b'], department_id: 5, createdBy: 1,
      } as any),
    ).rejects.toBeInstanceOf(ValidationError);
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
    const result = await new CreateDataSubjectRequestUseCase(repo, makeDpoDesignationRepository()).execute({
      type: 'access', received_at: '2026-08-01', dpoUserId: 77,
    });
    expect(result.due_date).toBe('2026-08-16');
  });

  it('usa o DPO ativo quando o payload nao traz dpoUserId', async () => {
    const repo = makeRequestRepository();
    const dpoRepo = makeDpoDesignationRepository(123);
    const result = await new CreateDataSubjectRequestUseCase(repo, dpoRepo).execute({
      type: 'access', received_at: '2026-08-01',
    } as any);

    expect(result.dpo_user_id).toBe(123);
    expect(dpoRepo.findActive).toHaveBeenCalledTimes(1);
  });

  it('falha claramente quando nao ha DPO ativo configurado', async () => {
    const repo = makeRequestRepository();
    const dpoRepo = { findActive: jest.fn(async () => null) };
    await expect(
      new CreateDataSubjectRequestUseCase(repo, dpoRepo as any).execute({
        type: 'access', received_at: '2026-08-01',
      } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita dpoUserId do payload diferente do DPO ativo', async () => {
    const repo = makeRequestRepository();
    await expect(
      new CreateDataSubjectRequestUseCase(repo, makeDpoDesignationRepository(123)).execute({
        type: 'access', received_at: '2026-08-01', dpoUserId: 999,
      }),
    ).rejects.toThrow('dpoUserId deve corresponder ao DPO ativo configurado.');
  });

  it('rejeita type invalido', async () => {
    const repo = makeRequestRepository();
    await expect(
      new CreateDataSubjectRequestUseCase(repo, makeDpoDesignationRepository()).execute({ type: 'invalido', dpoUserId: 1 } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('VerifyIdentityUseCase - E1/BR-JUR-041', () => {
  it('avanca para in_progress quando identity_verified=true (fluxo principal)', async () => {
    const repo = makeRequestRepository();
    const result = await new VerifyIdentityUseCase(repo).execute({ id: 40, identity_verified: true, verifiedBy: 5 });
    expect(result.status).toBe('in_progress');
  });

  it('rejeita identity_verified=false - nao avanca de estado (E1)', async () => {
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
    const result = await new ResolveDataSubjectRequestUseCase(repo).execute({ id: 40, resolution_notes: 'Relatorio enviado' });
    expect(result.status).toBe('answered');
  });

  it('cria tarefa manual para deletion/anonymization e grava manual_review_task_id', async () => {
    const repo = makeRequestRepository({
      initialRequest: {
        id: 40,
        request_type: 'deletion',
        status: 'in_progress',
        identity_verified: true,
        dpo_user_id: 77,
        manual_review_task_id: null,
      },
    });
    const manualTaskRepo = makeManualTaskRepository();
    const result = await new ResolveDataSubjectRequestUseCase(repo, manualTaskRepo as any).execute({
      id: 40,
      resolution_notes: 'Encaminhado para revisao manual',
    });

    expect(manualTaskRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      task_type: 'deletion_review',
      data_subject_request_id: 40,
      assigned_to_user_id: 77,
    }));
    expect(result.manual_review_task_id).toBe(900);
    expect(result.status).toBe('answered');
  });

  it('rejeita sem resolution_notes', async () => {
    const repo = makeRequestRepository();
    await expect(
      new ResolveDataSubjectRequestUseCase(repo).execute({ id: 40 } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('CreateIncidentUseCase', () => {
  it('rejeita campos obrigatorios ausentes', async () => {
    const repo = makeIncidentRepository();
    await expect(
      new CreateIncidentUseCase(repo, makeDpoDesignationRepository()).execute({ createdBy: 1 } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('abre incidente usando o DPO ativo e calcula prazo operacional de 72h', async () => {
    const repo = makeIncidentRepository();
    const dpoRepo = makeDpoDesignationRepository(222);
    const result = await new CreateIncidentUseCase(repo, dpoRepo).execute({
      detected_at: '2026-08-07T08:00:00Z', description: 'Acesso indevido', risk_assessment: 'medio', createdBy: 1,
    });
    expect(result.status).toBe('open');
    expect(result.dpo_user_id).toBe(222);
    expect(new Date(result.assessment_due_at).toISOString()).toBe('2026-08-10T08:00:00.000Z');
    expect(dpoRepo.findActive).toHaveBeenCalledTimes(1);
  });

  it('rejeita quando nao existe DPO ativo e o payload nao informa dpoUserId', async () => {
    const repo = makeIncidentRepository();
    const dpoRepo = { findActive: jest.fn(async () => null) };
    await expect(
      new CreateIncidentUseCase(repo, dpoRepo as any).execute({
        detected_at: '2026-08-07T08:00:00Z', description: 'Acesso indevido', risk_assessment: 'medio', createdBy: 1,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita dpoUserId do payload diferente do DPO ativo', async () => {
    const repo = makeIncidentRepository();
    await expect(
      new CreateIncidentUseCase(repo, makeDpoDesignationRepository(222)).execute({
        detected_at: '2026-08-07T08:00:00Z', description: 'Acesso indevido', risk_assessment: 'medio', createdBy: 1, dpoUserId: 999,
      }),
    ).rejects.toThrow('dpoUserId deve corresponder ao DPO ativo configurado.');
  });
});

describe('CreateRetentionPolicyUseCase (RoPA operacional)', () => {
  it('cria politica usando somente os campos fornecidos pelo payload', async () => {
    const retentionRepo = makeOperationalRetentionPolicyRepository();
    const result = await new CreateRetentionPolicyUseCase(retentionRepo).execute({
      category: 'Dados de RH', retention_value: 'prazo definido pela organizacao', retention_basis: 'revisao interna pendente', createdBy: 7,
    });

    expect(result).toMatchObject({ category: 'Dados de RH', retention_value: 'prazo definido pela organizacao', created_by: 7 });
    expect(retentionRepo.create).toHaveBeenCalledWith(expect.not.objectContaining({ auto_delete_enabled: expect.anything() }));
  });

  it('rejeita politica sem categoria ou valor de retencao', async () => {
    const retentionRepo = makeOperationalRetentionPolicyRepository();
    await expect(
      new CreateRetentionPolicyUseCase(retentionRepo).execute({ category: '', retention_value: '', createdBy: 7 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('permite criar atividade depois de cadastrar politica de retencao', async () => {
    const retentionRepo = makeOperationalRetentionPolicyRepository();
    const policy = await new CreateRetentionPolicyUseCase(retentionRepo).execute({
      category: 'Dados de RH', retention_value: 'prazo definido pela organizacao', createdBy: 7,
    });
    const activityRepo = { create: jest.fn(async (data: any) => ({ id: 50, ...data })) };
    const { Department } = require('../../src/models/index');
    jest.spyOn(Department, 'findByPk').mockResolvedValueOnce({ id: 5 });

    const activity = await new CreateProcessingActivityUseCase(activityRepo, retentionRepo).execute({
      purpose: 'Gestao de folha', legal_basis: 'legal_obligation', data_categories: ['dados cadastrais'], data_subject_categories: ['funcionarios'], department_id: 5, createdBy: 7, retentionPolicyId: policy.id,
    });

    expect(activity.retention_policy_id).toBe(policy.id);
    expect(activity.retention_period).toBe('prazo definido pela organizacao');
  });
});

describe('DecideIncidentUseCase - BR-JUR-042', () => {
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

describe('CloseIncidentUseCase - E4/BR-JUR-042', () => {
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

describe('PendingCriticalIncidentsUseCase', () => {
  it('marca horas_restantes e vencido a partir de assessment_due_at', async () => {
    const repo = {
      listPendingCritical: jest.fn(async () => [
        { toJSON: () => ({ id: 1, assessment_due_at: new Date(Date.now() - 3600000).toISOString() }) },
        { toJSON: () => ({ id: 2, assessment_due_at: new Date(Date.now() + 7200000).toISOString() }) },
      ]),
    };

    const result = await new PendingCriticalIncidentsUseCase(repo).execute();
    expect(result[0].vencido).toBe(true);
    expect(result[1].vencido).toBe(false);
    expect(result[0]).toHaveProperty('horas_restantes');
    expect(result[1]).toHaveProperty('horas_restantes');
  });
});

describe('AcknowledgeAlertUseCase - RNF-JUR-04 (nunca desativa)', () => {
  it('marca alerta como acknowledged (fluxo principal, inclusive origem is_fatal)', async () => {
    const repo = {
      findById: jest.fn(async () => ({ id: 10, origin_type: 'legal_case_deadline', status: 'pending' })),
      update: jest.fn(async (id: any, data: any) => ({ id, origin_type: 'legal_case_deadline', ...data })),
    };
    const result = await new AcknowledgeAlertUseCase(repo).execute({ id: 10 });
    expect(result.status).toBe('acknowledged');
    expect(repo.update).toHaveBeenCalledWith(10, expect.objectContaining({ status: 'acknowledged' }));
    expect(repo.update.mock.calls[0][1]).not.toHaveProperty('active');
    expect(repo.update.mock.calls[0][1]).not.toHaveProperty('disabled');
  });

  it('lanca NotFoundError se o alerta nao existir', async () => {
    const repo = { findById: jest.fn(async () => null), update: jest.fn() };
    await expect(new AcknowledgeAlertUseCase(repo).execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});
