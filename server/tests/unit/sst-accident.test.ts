/**
 * Testes: cluster Acidente/CAT (Lei 8.213/91) do módulo SST — BLOCO 1.
 *
 * Cobre o fluxo principal (registro do acidente → emissão de CAT →
 * encerramento) e os fluxos de exceção de UC-46: emissão de 2ª CAT
 * `inicial`, encerramento de acidente grave sem investigação/ação
 * corretiva, complemento de `dias_perdidos` com trilha de auditoria.
 *
 * @group unit
 */

const CreateAccidentUseCase = require('../../src/modules/sst/application/use-cases/accident/CreateAccidentUseCase');
const CreateAccidentComplementUseCase = require('../../src/modules/sst/application/use-cases/accident/CreateAccidentComplementUseCase');
const CloseAccidentUseCase = require('../../src/modules/sst/application/use-cases/accident/CloseAccidentUseCase');
const EmitCatUseCase = require('../../src/modules/sst/application/use-cases/accident/EmitCatUseCase');
const CreateAccidentInvestigationUseCase = require('../../src/modules/sst/application/use-cases/accident/CreateAccidentInvestigationUseCase');
const { ValidationError, NotFoundError, BusinessRuleError, ConflictError } = require('../../src/errors');

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async () => ({
      commit: jest.fn(async () => undefined),
      rollback: jest.fn(async () => undefined),
      LOCK: { UPDATE: 'UPDATE' }
    }))
  }
}));

function makeAcidente(overrides: Partial<any> = {}) {
  return {
    id: 77,
    employee_id: 501,
    data_hora: '2026-08-06T14:30:00Z',
    tipo: 'tipico',
    gravidade: 'com_afastamento',
    dias_perdidos: 0,
    houve_cat: false,
    confirmado: true,
    testemunhas: [],
    complementos: [],
    cats: [],
    investigacao: null,
    ...overrides
  };
}

function makeAccidentRepository(overrides: Partial<any> = {}) {
  return {
    createAccident: jest.fn(async (data: any) => ({ id: 77, ...data })),
    createWitnesses: jest.fn(async () => undefined),
    findAccidentById: jest.fn(async () => makeAcidente()),
    createComplement: jest.fn(async (data: any) => ({ id: 1, ...data })),
    updateAccidentConsolidated: jest.fn(async (id: any, data: any) => ({ ...makeAcidente(), ...data, id })),
    findInvestigationByAccidentId: jest.fn(async () => null),
    createInvestigation: jest.fn(async (data: any) => ({ id: 501, ...data })),
    createCorrectiveAction: jest.fn(async (data: any) => ({ id: 900, ...data })),
    countCorrectiveActionsByOrigin: jest.fn(async () => 0),
    findCatsByAccidentId: jest.fn(async () => []),
    createCat: jest.fn(async (data: any) => ({ id: 200, ...data })),
    closeAccident: jest.fn(async () => makeAcidente()),
    ...overrides
  };
}

function makeEsocialRepository(overrides: Partial<any> = {}) {
  return {
    create: jest.fn(async (data: any) => ({ id: 3001, ...data })),
    findActiveByOrigin: jest.fn(async () => null),
    ...overrides
  };
}

describe('CreateAccidentUseCase', () => {
  it('registra o acidente ja "confirmado" (imutavel a partir da criacao)', async () => {
    const repo = makeAccidentRepository();
    const useCase = new CreateAccidentUseCase(repo);

    const result = await useCase.execute({
      body: {
        employee_id: 501, data_hora: '2026-08-06T14:30:00Z', tipo: 'tipico', gravidade: 'com_afastamento',
        local_setor: 'Injecao', descricao: 'Queimadura leve', testemunhas: [502, 503]
      },
      registradoPor: 20
    });

    expect(repo.createAccident).toHaveBeenCalledWith(expect.objectContaining({ confirmado: true, registrado_por: 20 }), expect.anything());
    expect(repo.createWitnesses).toHaveBeenCalledWith(77, [502, 503], expect.anything());
    expect(result.id).toBe(77);
  });

  it('rejeita campos obrigatorios ausentes com ValidationError', async () => {
    const repo = makeAccidentRepository();
    const useCase = new CreateAccidentUseCase(repo);
    await expect(
      useCase.execute({ body: { employee_id: 501 }, registradoPor: 20 })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('CreateAccidentComplementUseCase', () => {
  it('grava a trilha de auditoria E atualiza a coluna consolidada na mesma transacao', async () => {
    const repo = makeAccidentRepository({ findAccidentById: jest.fn(async () => makeAcidente({ dias_perdidos: 5 })) });
    const useCase = new CreateAccidentComplementUseCase(repo);

    await useCase.execute({ accidentId: 77, body: { campo: 'dias_perdidos', valor: 12, motivo: 'atestado atualizado' }, registradoPor: 20 });

    expect(repo.createComplement).toHaveBeenCalledWith(
      expect.objectContaining({ acidente_id: 77, campo: 'dias_perdidos', valor_anterior: '5', valor_novo: '12', motivo: 'atestado atualizado' }),
      expect.anything()
    );
    expect(repo.updateAccidentConsolidated).toHaveBeenCalledWith(77, { dias_perdidos: 12 }, expect.anything());
  });

  it('rejeita campo invalido com ValidationError', async () => {
    const repo = makeAccidentRepository();
    const useCase = new CreateAccidentComplementUseCase(repo);
    await expect(
      useCase.execute({ accidentId: 77, body: { campo: 'descricao', valor: 'x', motivo: 'y' }, registradoPor: 20 })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('lanca NotFoundError se o acidente nao existir', async () => {
    const repo = makeAccidentRepository({ findAccidentById: jest.fn(async () => null) });
    const useCase = new CreateAccidentComplementUseCase(repo);
    await expect(
      useCase.execute({ accidentId: 999, body: { campo: 'dias_perdidos', valor: 1, motivo: 'x' }, registradoPor: 20 })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('CloseAccidentUseCase', () => {
  it('FLUXO DE EXCECAO (E2/UC-46): bloqueia encerramento de acidente grave sem investigacao+acao corretiva', async () => {
    const repo = makeAccidentRepository({
      findAccidentById: jest.fn(async () => makeAcidente({ gravidade: 'com_afastamento' })),
      findInvestigationByAccidentId: jest.fn(async () => null)
    });
    const useCase = new CloseAccidentUseCase(repo);

    await expect(useCase.execute({ id: 77 })).rejects.toBeInstanceOf(BusinessRuleError);
    expect(repo.closeAccident).not.toHaveBeenCalled();
  });

  it('FLUXO DE EXCECAO: bloqueia mesmo com investigacao SEM nenhuma acao corretiva', async () => {
    const repo = makeAccidentRepository({
      findAccidentById: jest.fn(async () => makeAcidente({ gravidade: 'obito' })),
      findInvestigationByAccidentId: jest.fn(async () => ({ id: 501 })),
      countCorrectiveActionsByOrigin: jest.fn(async () => 0)
    });
    const useCase = new CloseAccidentUseCase(repo);
    await expect(useCase.execute({ id: 77 })).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('permite encerrar quando ha investigacao COM ao menos 1 acao corretiva', async () => {
    const repo = makeAccidentRepository({
      findAccidentById: jest.fn(async () => makeAcidente({ gravidade: 'com_afastamento' })),
      findInvestigationByAccidentId: jest.fn(async () => ({ id: 501 })),
      countCorrectiveActionsByOrigin: jest.fn(async () => 1)
    });
    const useCase = new CloseAccidentUseCase(repo);
    await expect(useCase.execute({ id: 77 })).resolves.toBeDefined();
    expect(repo.closeAccident).toHaveBeenCalledWith(77);
  });

  it('nao exige investigacao para acidente sem_afastamento', async () => {
    const repo = makeAccidentRepository({ findAccidentById: jest.fn(async () => makeAcidente({ gravidade: 'sem_afastamento' })) });
    const useCase = new CloseAccidentUseCase(repo);
    await expect(useCase.execute({ id: 77 })).resolves.toBeDefined();
    expect(repo.findInvestigationByAccidentId).not.toHaveBeenCalled();
  });
});

describe('EmitCatUseCase', () => {
  it('emite a CAT inicial, enfileira o evento S-2210 e marca houve_cat=true', async () => {
    const accidentRepo = makeAccidentRepository();
    const esocialRepo = makeEsocialRepository();
    const useCase = new EmitCatUseCase(accidentRepo, esocialRepo);

    const result = await useCase.execute({ accidentId: 77, emitenteId: 20, body: { tipo: 'inicial', emitente: 'Tecnico SST' } });

    expect(accidentRepo.createCat).toHaveBeenCalledWith(expect.objectContaining({ acidente_id: 77, tipo: 'inicial' }), expect.anything());
    expect(esocialRepo.create).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'S-2210', origem_tipo: 'cat', origem_id: 200 }), expect.anything());
    expect(accidentRepo.updateAccidentConsolidated).toHaveBeenCalledWith(77, { houve_cat: true }, expect.anything());
    expect(result.cat.tipo).toBe('inicial');
  });

  it('FLUXO DE EXCECAO: rejeita emitir uma 2a CAT inicial para o mesmo acidente', async () => {
    const accidentRepo = makeAccidentRepository({ findCatsByAccidentId: jest.fn(async () => [{ id: 199, tipo: 'inicial' }]) });
    const esocialRepo = makeEsocialRepository();
    const useCase = new EmitCatUseCase(accidentRepo, esocialRepo);

    await expect(useCase.execute({ accidentId: 77, emitenteId: 20, body: { tipo: 'inicial' } })).rejects.toBeInstanceOf(BusinessRuleError);
    expect(accidentRepo.createCat).not.toHaveBeenCalled();
  });

  it('calcula prazo_limite imediato (mesmo dia) para gravidade obito', async () => {
    const accidentRepo = makeAccidentRepository({ findAccidentById: jest.fn(async () => makeAcidente({ gravidade: 'obito', data_hora: '2026-08-06T10:00:00Z' })) });
    const esocialRepo = makeEsocialRepository();
    const useCase = new EmitCatUseCase(accidentRepo, esocialRepo);

    const result = await useCase.execute({ accidentId: 77, emitenteId: 20, body: { tipo: 'inicial' } });
    expect(result.prazo_limite).toBe('2026-08-06');
  });

  it('nao bloqueia a criacao mesmo com prazo_limite ja vencido (E1) — evento nasce pendente', async () => {
    const accidentRepo = makeAccidentRepository({ findAccidentById: jest.fn(async () => makeAcidente({ gravidade: 'sem_afastamento', data_hora: '2020-01-01T10:00:00Z' })) });
    const esocialRepo = makeEsocialRepository();
    const useCase = new EmitCatUseCase(accidentRepo, esocialRepo);

    const result = await useCase.execute({ accidentId: 77, emitenteId: 20, body: { tipo: 'inicial' } });
    expect(result.cat).toBeDefined();
    expect(esocialRepo.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'pendente' }), expect.anything());
  });
});

describe('CreateAccidentInvestigationUseCase', () => {
  it('cria a investigacao e as acoes corretivas informadas no payload', async () => {
    const repo = makeAccidentRepository();
    const useCase = new CreateAccidentInvestigationUseCase(repo);

    const result = await useCase.execute({
      accidentId: 77,
      body: {
        participantes: [10, 15, 501],
        causas: ['Piso escorregadio'],
        evidencias: ['https://x/foto1.jpg'],
        acoes_corretivas: [{ descricao: 'Instalar sinalizacao', responsavel_id: 20, prazo: '2026-08-20' }]
      },
      createdBy: 20
    });

    expect(repo.createInvestigation).toHaveBeenCalledWith(expect.objectContaining({ acidente_id: 77, created_by: 20 }), expect.anything());
    expect(repo.createCorrectiveAction).toHaveBeenCalledWith(
      expect.objectContaining({ origem_tipo: 'investigacao_acidente', origem_id: 501, descricao: 'Instalar sinalizacao' }),
      expect.anything()
    );
    expect(result.acoes_corretivas).toHaveLength(1);
  });

  it('FLUXO DE EXCECAO: rejeita 2a investigacao do mesmo acidente com ConflictError (acidente_id UNIQUE)', async () => {
    const repo = makeAccidentRepository({ findInvestigationByAccidentId: jest.fn(async () => ({ id: 1 })) });
    const useCase = new CreateAccidentInvestigationUseCase(repo);
    await expect(
      useCase.execute({ accidentId: 77, body: {}, createdBy: 20 })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repo.createInvestigation).not.toHaveBeenCalled();
  });
});
