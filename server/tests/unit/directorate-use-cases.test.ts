/**
 * Testes: casos de uso do módulo Diretoria (Organograma Executivo,
 * Planejamento Estratégico, Atas de Reunião, Riscos Corporativos).
 *
 * @group unit
 */

const GetExecutiveOrgChartUseCase = require('../../src/modules/directorate/application/use-cases/org-chart/GetExecutiveOrgChartUseCase');
const AssignDirectorateManagerUseCase = require('../../src/modules/directorate/application/use-cases/org-chart/AssignDirectorateManagerUseCase');
const CreateStrategicPlanningUseCase = require('../../src/modules/directorate/application/use-cases/strategic-planning/CreateStrategicPlanningUseCase');
const UpdateStrategicPlanningUseCase = require('../../src/modules/directorate/application/use-cases/strategic-planning/UpdateStrategicPlanningUseCase');
const UpdateStrategicPlanningActualUseCase = require('../../src/modules/directorate/application/use-cases/strategic-planning/UpdateStrategicPlanningActualUseCase');
const GetStrategicPlanningByIdUseCase = require('../../src/modules/directorate/application/use-cases/strategic-planning/GetStrategicPlanningByIdUseCase');
const CreateMeetingMinuteUseCase = require('../../src/modules/directorate/application/use-cases/meeting-minute/CreateMeetingMinuteUseCase');
const CreateBusinessRiskUseCase = require('../../src/modules/directorate/application/use-cases/business-risk/CreateBusinessRiskUseCase');
const UpdateBusinessRiskUseCase = require('../../src/modules/directorate/application/use-cases/business-risk/UpdateBusinessRiskUseCase');
const { calculateRiskScore } = require('../../src/modules/directorate/domain/services/riskScore');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../../src/errors');

function makeRepo(overrides: Partial<any> = {}) {
  return {
    listDirectoratesWithDepartments: jest.fn(async () => []),
    findDirectorateById: jest.fn(async () => null),
    updateDirectorateManager: jest.fn(async (id: number, managerId: number | null) => ({ id, manager_id: managerId })),
    findEmployeeById: jest.fn(async () => null),
    listStrategicPlannings: jest.fn(async () => ({ rows: [], count: 0 })),
    findStrategicPlanningById: jest.fn(async () => null),
    createStrategicPlanning: jest.fn(async (data: any) => ({ id: 1, ...data })),
    updateStrategicPlanning: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    createMeetingMinute: jest.fn(async (data: any) => ({ id: 1, ...data })),
    listMeetingMinutes: jest.fn(async () => ({ rows: [], count: 0 })),
    findMeetingMinuteById: jest.fn(async () => null),
    createBusinessRisk: jest.fn(async (data: any) => ({ id: 1, ...data })),
    updateBusinessRisk: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    listBusinessRisks: jest.fn(async () => ({ rows: [], count: 0 })),
    findBusinessRiskById: jest.fn(async () => null),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// risk_score
// ---------------------------------------------------------------------------

describe('calculateRiskScore', () => {
  it.each([
    ['low', 'low', 1],
    ['low', 'critical', 4],
    ['high', 'high', 9],
    ['critical', 'critical', 16],
    ['medium', 'high', 6],
  ])('probability=%s impact=%s => score=%i', (probability: any, impact: any, expected: number) => {
    expect(calculateRiskScore(probability, impact)).toBe(expected);
  });
});

describe('CreateBusinessRiskUseCase', () => {
  it('FLUXO PRINCIPAL: calcula risk_score no servidor e ignora qualquer valor externo', async () => {
    const repo = makeRepo();
    const result = await new CreateBusinessRiskUseCase(repo).execute({
      risk_category: 'operational',
      description: 'Falta de energia na linha 2',
      probability: 'high',
      impact: 'critical',
      createdBy: 7,
    } as any);

    expect(repo.createBusinessRisk).toHaveBeenCalledWith(expect.objectContaining({ risk_score: 12, created_by: 7 }));
    expect(result.risk_score).toBe(12);
  });

  it('FLUXO PRINCIPAL: status default é "active"', async () => {
    const repo = makeRepo();
    await new CreateBusinessRiskUseCase(repo).execute({
      risk_category: 'financial', description: 'x', probability: 'low', impact: 'low', createdBy: 1,
    } as any);
    expect(repo.createBusinessRisk).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
  });
});

describe('UpdateBusinessRiskUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando o risco não existe', async () => {
    const repo = makeRepo();
    await expect(new UpdateBusinessRiskUseCase(repo).execute({ id: 999, status: 'closed' } as any))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO PRINCIPAL: recalcula risk_score quando probability muda, usando o impact existente', async () => {
    const repo = makeRepo({
      findBusinessRiskById: jest.fn(async () => ({ id: 1, probability: 'low', impact: 'high', risk_score: 3 })),
    });

    const result = await new UpdateBusinessRiskUseCase(repo).execute({ id: 1, probability: 'critical' } as any);

    expect(repo.updateBusinessRisk).toHaveBeenCalledWith(1, expect.objectContaining({ risk_score: 12 }));
    expect(result.risk_score).toBe(12);
  });

  it('FLUXO DE BORDA: não recalcula risk_score quando nem probability nem impact mudam', async () => {
    const repo = makeRepo({
      findBusinessRiskById: jest.fn(async () => ({ id: 1, probability: 'low', impact: 'high', risk_score: 3 })),
    });

    await new UpdateBusinessRiskUseCase(repo).execute({ id: 1, status: 'mitigated' } as any);

    const patch = repo.updateBusinessRisk.mock.calls[0][1];
    expect(patch.risk_score).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Planejamento Estratégico
// ---------------------------------------------------------------------------

describe('CreateStrategicPlanningUseCase', () => {
  it('FLUXO PRINCIPAL: cria objetivo válido', async () => {
    const repo = makeRepo();
    const result = await new CreateStrategicPlanningUseCase(repo).execute({
      year: 2026, objective: 'Reduzir CPV em 8%', directorate_id: 2, createdBy: 1,
    } as any);
    expect(result.year).toBe(2026);
    expect(repo.createStrategicPlanning).toHaveBeenCalledWith(expect.objectContaining({ status: 'not_started' }));
  });

  it('FLUXO DE EXCECAO: ano fora da faixa aceita', async () => {
    const repo = makeRepo();
    await expect(new CreateStrategicPlanningUseCase(repo).execute({
      year: 1999, objective: 'x', createdBy: 1,
    } as any)).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO DE EXCECAO: directorate_id e department_id ao mesmo tempo é rejeitado', async () => {
    const repo = makeRepo();
    await expect(new CreateStrategicPlanningUseCase(repo).execute({
      year: 2026, objective: 'x', directorate_id: 1, department_id: 2, createdBy: 1,
    } as any)).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO DE EXCECAO: weight fora de 0-100', async () => {
    const repo = makeRepo();
    await expect(new CreateStrategicPlanningUseCase(repo).execute({
      year: 2026, objective: 'x', weight: 150, createdBy: 1,
    } as any)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('UpdateStrategicPlanningUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando o objetivo não existe', async () => {
    const repo = makeRepo();
    await expect(new UpdateStrategicPlanningUseCase(repo).execute({ id: 999, kpi: 'x' } as any))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO DE EXCECAO: rejeita mudar para os dois donos ao mesmo tempo', async () => {
    const repo = makeRepo({
      findStrategicPlanningById: jest.fn(async () => ({ id: 1, directorate_id: 2, department_id: null })),
    });
    await expect(new UpdateStrategicPlanningUseCase(repo).execute({ id: 1, department_id: 5 } as any))
      .rejects.toBeInstanceOf(ValidationError);
  });
});

describe('GetStrategicPlanningByIdUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando o objetivo não existe', async () => {
    const repo = makeRepo();
    await expect(new GetStrategicPlanningByIdUseCase(repo).execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('UpdateStrategicPlanningActualUseCase', () => {
  it('FLUXO PRINCIPAL: realizado >= meta muda status para "achieved"', async () => {
    const repo = makeRepo({
      findStrategicPlanningById: jest.fn(async () => ({ id: 1, target_value: 100 })),
    });
    const result = await new UpdateStrategicPlanningActualUseCase(repo).execute({ id: 1, actual_value: 120 });
    expect(repo.updateStrategicPlanning).toHaveBeenCalledWith(1, { actual_value: 120, status: 'achieved' });
    expect(result.status).toBe('achieved');
  });

  it('FLUXO PRINCIPAL: realizado < meta muda status para "in_progress"', async () => {
    const repo = makeRepo({
      findStrategicPlanningById: jest.fn(async () => ({ id: 1, target_value: 100 })),
    });
    await new UpdateStrategicPlanningActualUseCase(repo).execute({ id: 1, actual_value: 40 });
    expect(repo.updateStrategicPlanning).toHaveBeenCalledWith(1, { actual_value: 40, status: 'in_progress' });
  });

  it('FLUXO DE BORDA: sem target_value, não altera status', async () => {
    const repo = makeRepo({
      findStrategicPlanningById: jest.fn(async () => ({ id: 1, target_value: null })),
    });
    await new UpdateStrategicPlanningActualUseCase(repo).execute({ id: 1, actual_value: 40 });
    expect(repo.updateStrategicPlanning).toHaveBeenCalledWith(1, { actual_value: 40 });
  });
});

// ---------------------------------------------------------------------------
// Atas de Reunião
// ---------------------------------------------------------------------------

describe('CreateMeetingMinuteUseCase', () => {
  it('FLUXO PRINCIPAL: cria ata com data passada', async () => {
    const repo = makeRepo();
    const result = await new CreateMeetingMinuteUseCase(repo).execute({
      meeting_date: '2026-08-01', meeting_type: 'directors', title: 'Reunião de diretoria', createdBy: 1,
    } as any);
    expect(result.title).toBe('Reunião de diretoria');
    expect(repo.createMeetingMinute).toHaveBeenCalledWith(expect.objectContaining({ decisions: [], action_items: [] }));
  });

  it('FLUXO DE EXCECAO: rejeita meeting_date no futuro', async () => {
    const repo = makeRepo();
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const futureIso = future.toISOString().slice(0, 10);

    await expect(new CreateMeetingMinuteUseCase(repo).execute({
      meeting_date: futureIso, meeting_type: 'board', title: 'x', createdBy: 1,
    } as any)).rejects.toBeInstanceOf(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// Organograma Executivo
// ---------------------------------------------------------------------------

describe('GetExecutiveOrgChartUseCase', () => {
  it('FLUXO PRINCIPAL: monta a árvore com manager e departamentos, marcando cargo vago', async () => {
    const repo = makeRepo({
      listDirectoratesWithDepartments: jest.fn(async () => [
        {
          id: 1, code: 'CEO', name: 'Diretoria', position_title: 'CEO', manager_id: 5,
          manager: { id: 5, name: 'Fulano', position: 'CEO' },
          departments: [{ id: 10, code: '01', name: 'Diretoria', sigla: 'DIR' }],
        },
        {
          id: 2, code: 'SUP', name: 'Suprimentos & Logística', position_title: 'Diretor', manager_id: null,
          manager: null,
          departments: [],
        },
      ]),
    });

    const result = await new GetExecutiveOrgChartUseCase(repo).execute();

    expect(result.directorates).toHaveLength(2);
    expect(result.directorates[0].vacant).toBe(false);
    expect(result.directorates[0].manager?.name).toBe('Fulano');
    expect(result.directorates[0].departments).toHaveLength(1);
    expect(result.directorates[1].vacant).toBe(true);
    expect(result.directorates[1].manager).toBeNull();
  });
});

describe('AssignDirectorateManagerUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando a diretoria não existe', async () => {
    const repo = makeRepo();
    await expect(new AssignDirectorateManagerUseCase(repo).execute({ directorateId: 999, managerId: null }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO PRINCIPAL: vaga o cargo com managerId null (sem consultar funcionário)', async () => {
    const repo = makeRepo({ findDirectorateById: jest.fn(async () => ({ id: 2, code: 'SUP' })) });
    await new AssignDirectorateManagerUseCase(repo).execute({ directorateId: 2, managerId: null });
    expect(repo.findEmployeeById).not.toHaveBeenCalled();
    expect(repo.updateDirectorateManager).toHaveBeenCalledWith(2, null);
  });

  it('FLUXO DE EXCECAO: funcionário inexistente é recusado com NotFoundError', async () => {
    const repo = makeRepo({
      findDirectorateById: jest.fn(async () => ({ id: 2, code: 'SUP' })),
      findEmployeeById: jest.fn(async () => null),
    });
    await expect(new AssignDirectorateManagerUseCase(repo).execute({ directorateId: 2, managerId: 999 }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO DE EXCECAO: funcionário INATIVO é recusado com BusinessRuleError (não pode dirigir a área)', async () => {
    const repo = makeRepo({
      findDirectorateById: jest.fn(async () => ({ id: 2, code: 'SUP' })),
      findEmployeeById: jest.fn(async () => ({ id: 8, name: 'Ciclano', status: 'inactive' })),
    });
    await expect(new AssignDirectorateManagerUseCase(repo).execute({ directorateId: 2, managerId: 8 }))
      .rejects.toBeInstanceOf(BusinessRuleError);
    expect(repo.updateDirectorateManager).not.toHaveBeenCalled();
  });

  it('FLUXO PRINCIPAL: funcionário ATIVO é provido no cargo', async () => {
    const repo = makeRepo({
      findDirectorateById: jest.fn(async () => ({ id: 2, code: 'SUP' })),
      findEmployeeById: jest.fn(async () => ({ id: 8, name: 'Ciclano', status: 'active' })),
    });
    await new AssignDirectorateManagerUseCase(repo).execute({ directorateId: 2, managerId: 8 });
    expect(repo.updateDirectorateManager).toHaveBeenCalledWith(2, 8);
  });
});
