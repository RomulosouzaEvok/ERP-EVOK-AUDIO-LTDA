/**
 * Testes: cluster PGR/GRO + GES (NR-1) do módulo SST — BLOCO 1, passada 2.
 *
 * Cobre o fluxo principal (criação de risco com agente identificado, GES,
 * vínculo GES × funcionário com S-2240) e o fluxo de exceção: tentativa de
 * declarar "ausência de risco identificado" enviando também
 * categoria_agente/agente (incoerência bloqueada antes do CHECK de banco).
 *
 * @group unit
 */

const CreateRiskUseCase = require('../../src/modules/sst/application/use-cases/pgr/CreateRiskUseCase');
const UpdateRiskUseCase = require('../../src/modules/sst/application/use-cases/pgr/UpdateRiskUseCase');
const AddGesMemberUseCase = require('../../src/modules/sst/application/use-cases/pgr/AddGesMemberUseCase');
const { ValidationError, NotFoundError } = require('../../src/errors');

function makePgrRepository(overrides: Partial<any> = {}) {
  return {
    createRisk: jest.fn(async (data: any) => ({ id: 1, ...data })),
    findRiskById: jest.fn(async () => ({ id: 1, department_id: 4 })),
    updateRisk: jest.fn(async (id: any, data: any) => ({ id, ...data })),
    findGesById: jest.fn(async () => ({ id: 3, nome: 'Ruído Injeção' })),
    createGesMember: jest.fn(async (data: any) => ({ id: 55, ...data })),
    ...overrides
  };
}

function makeEsocialRepository(overrides: Partial<any> = {}) {
  return { create: jest.fn(async (data: any) => ({ id: 4001, ...data })), ...overrides };
}

describe('CreateRiskUseCase', () => {
  it('cria risco com agente identificado', async () => {
    const repo = makePgrRepository();
    const result = await new CreateRiskUseCase(repo).execute({
      body: { department_id: 4, categoria_agente: 'fisico', agente: 'ruido', intensidade: '92 dB(A)' },
      createdBy: 20
    });
    expect(repo.createRisk).toHaveBeenCalledWith(expect.objectContaining({ department_id: 4, categoria_agente: 'fisico', intensidade_concentracao: '92 dB(A)', created_by: 20 }));
    expect(result.id).toBe(1);
  });

  it('cria registro de ausencia de risco identificado (BR-SST-026)', async () => {
    const repo = makePgrRepository();
    const result = await new CreateRiskUseCase(repo).execute({
      body: { department_id: 7, ausencia_risco_identificado: true },
      createdBy: 20
    });
    expect(repo.createRisk).toHaveBeenCalledWith(expect.objectContaining({ ausencia_risco_identificado: true }));
    expect(result.id).toBe(1);
  });

  it('FLUXO DE EXCECAO: rejeita ausencia_risco_identificado=true combinado com categoria_agente/agente', async () => {
    const repo = makePgrRepository();
    await expect(
      new CreateRiskUseCase(repo).execute({ body: { department_id: 7, ausencia_risco_identificado: true, agente: 'ruido' }, createdBy: 20 })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.createRisk).not.toHaveBeenCalled();
  });

  it('rejeita risco real (ausencia=false) sem categoria_agente/agente', async () => {
    const repo = makePgrRepository();
    await expect(
      new CreateRiskUseCase(repo).execute({ body: { department_id: 7 }, createdBy: 20 })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita department_id ausente', async () => {
    const repo = makePgrRepository();
    await expect(
      new CreateRiskUseCase(repo).execute({ body: { categoria_agente: 'fisico', agente: 'ruido' }, createdBy: 20 })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('UpdateRiskUseCase', () => {
  it('atualiza data_revisao e medidas_controle', async () => {
    const repo = makePgrRepository();
    await new UpdateRiskUseCase(repo).execute({ id: 1, body: { data_revisao: '2026-08-06', medidas_controle: ['Protetor auricular'] } });
    expect(repo.updateRisk).toHaveBeenCalledWith(1, expect.objectContaining({ data_revisao: '2026-08-06', medidas_controle: 'Protetor auricular' }));
  });

  it('lanca NotFoundError se o risco nao existir', async () => {
    const repo = makePgrRepository({ findRiskById: jest.fn(async () => null) });
    await expect(new UpdateRiskUseCase(repo).execute({ id: 999, body: {} })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('AddGesMemberUseCase', () => {
  it('vincula funcionario ao GES e gera evento S-2240 pendente', async () => {
    const pgrRepo = makePgrRepository();
    const esocialRepo = makeEsocialRepository();
    const result = await new AddGesMemberUseCase(pgrRepo, esocialRepo).execute({ gesId: 3, body: { employee_id: 501 } });

    expect(pgrRepo.createGesMember).toHaveBeenCalledWith(expect.objectContaining({ ges_id: 3, employee_id: 501 }));
    expect(esocialRepo.create).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'S-2240', origem_tipo: 'ges_funcionario', status: 'pendente' }));
    expect(result.esocial_event.id).toBe(4001);
  });

  it('lanca NotFoundError se o GES nao existir', async () => {
    const pgrRepo = makePgrRepository({ findGesById: jest.fn(async () => null) });
    const esocialRepo = makeEsocialRepository();
    await expect(new AddGesMemberUseCase(pgrRepo, esocialRepo).execute({ gesId: 999, body: { employee_id: 501 } })).rejects.toBeInstanceOf(NotFoundError);
  });
});
