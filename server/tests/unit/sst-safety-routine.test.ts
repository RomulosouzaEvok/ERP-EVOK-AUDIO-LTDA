/**
 * Testes: cluster Rotina Preventiva (Inspeções, PT, Brigada, DDS) do
 * módulo SST — BLOCO 1, passada 2.
 *
 * Cobre o fluxo principal (inspeção com item não-conforme gerando ação
 * corretiva automática, PT emitida/encerrada, brigadista, DDS) e o fluxo
 * de exceção: tentar encerrar uma Permissão de Trabalho sem os campos
 * obrigatórios (`inicio_validade`/`fim_validade` ausentes ou invertidos) e
 * encerrar uma PT já encerrada.
 *
 * @group unit
 */

const CreateInspectionUseCase = require('../../src/modules/sst/application/use-cases/safetyRoutine/CreateInspectionUseCase');
const CreateWorkPermitUseCase = require('../../src/modules/sst/application/use-cases/safetyRoutine/CreateWorkPermitUseCase');
const CloseWorkPermitUseCase = require('../../src/modules/sst/application/use-cases/safetyRoutine/CloseWorkPermitUseCase');
const CreateBrigadeMemberUseCase = require('../../src/modules/sst/application/use-cases/safetyRoutine/CreateBrigadeMemberUseCase');
const CreateDdsUseCase = require('../../src/modules/sst/application/use-cases/safetyRoutine/CreateDdsUseCase');
const { ValidationError, NotFoundError, BusinessRuleError } = require('../../src/errors');

function makeRepository(overrides: Partial<any> = {}) {
  return {
    createInspection: jest.fn(async (data: any) => ({ id: 1, ...data })),
    createInspectionItem: jest.fn(async (data: any) => ({ id: 10, ...data })),
    createCorrectiveAction: jest.fn(async (data: any) => ({ id: 900, ...data })),
    findInspectionById: jest.fn(async () => ({ id: 1, itens: [] })),
    createWorkPermit: jest.fn(async (data: any) => ({ id: 20, ...data })),
    createWorkPermitExecutants: jest.fn(async () => undefined),
    findWorkPermitById: jest.fn(async () => ({ id: 20, status: 'emitida' })),
    updateWorkPermitStatus: jest.fn(async (id: any, status: any) => ({ id, status })),
    createBrigadeMember: jest.fn(async (data: any) => ({ id: 30, ...data })),
    createDds: jest.fn(async (data: any) => ({ id: 40, ...data })),
    createDdsAttendees: jest.fn(async () => undefined),
    ...overrides
  };
}

describe('CreateInspectionUseCase', () => {
  it('cria a inspecao e gera acao corretiva automatica para item nao conforme', async () => {
    const repo = makeRepository();
    const result = await new CreateInspectionUseCase(repo).execute({
      body: {
        department_id: 18, checklist_modelo: 'armazenagem_nr11',
        itens: [
          { item: 'Empilhamento maximo respeitado', conforme: true },
          { item: 'Sinalizacao de corredor visivel', conforme: false, risco_grave_iminente: false }
        ]
      },
      inspetorId: 20
    });
    expect(repo.createCorrectiveAction).toHaveBeenCalledWith(expect.objectContaining({ origem_tipo: 'inspecao_seguranca', origem_id: 1 }));
    expect(result.acoes_corretivas_criadas).toHaveLength(1);
  });

  it('nao gera acao corretiva quando todos os itens sao conformes', async () => {
    const repo = makeRepository();
    const result = await new CreateInspectionUseCase(repo).execute({
      body: { department_id: 18, itens: [{ item: 'Extintor no prazo', conforme: true }] },
      inspetorId: 20
    });
    expect(repo.createCorrectiveAction).not.toHaveBeenCalled();
    expect(result.acoes_corretivas_criadas).toHaveLength(0);
  });

  it('rejeita checklist vazio', async () => {
    const repo = makeRepository();
    await expect(
      new CreateInspectionUseCase(repo).execute({ body: { department_id: 18, itens: [] }, inspetorId: 20 })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('CreateWorkPermitUseCase', () => {
  it('emite a PT com executantes', async () => {
    const repo = makeRepository();
    const result = await new CreateWorkPermitUseCase(repo).execute({
      body: { atividade: 'Solda em tanque', tipo_risco: 'trabalho a quente', department_id: 4, inicio_validade: '2026-08-10T08:00:00Z', fim_validade: '2026-08-10T12:00:00Z', executantes: [501, 502] },
      autorizanteId: 20
    });
    expect(repo.createWorkPermitExecutants).toHaveBeenCalledWith(20, [501, 502]);
    expect(result.id).toBe(20);
  });

  it('FLUXO DE EXCECAO: rejeita PT sem os campos obrigatorios', async () => {
    const repo = makeRepository();
    await expect(
      new CreateWorkPermitUseCase(repo).execute({ body: { atividade: 'Solda em tanque' }, autorizanteId: 20 })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO DE EXCECAO: rejeita fim_validade anterior/igual a inicio_validade', async () => {
    const repo = makeRepository();
    await expect(
      new CreateWorkPermitUseCase(repo).execute({
        body: { atividade: 'Solda', tipo_risco: 'quente', department_id: 4, inicio_validade: '2026-08-10T12:00:00Z', fim_validade: '2026-08-10T08:00:00Z' },
        autorizanteId: 20
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('CloseWorkPermitUseCase', () => {
  it('encerra a PT emitida', async () => {
    const repo = makeRepository();
    const result = await new CloseWorkPermitUseCase(repo).execute({ id: 20 });
    expect(repo.updateWorkPermitStatus).toHaveBeenCalledWith(20, 'encerrada');
    expect(result.status).toBe('encerrada');
  });

  it('FLUXO DE EXCECAO: rejeita encerrar PT ja encerrada', async () => {
    const repo = makeRepository({ findWorkPermitById: jest.fn(async () => ({ id: 20, status: 'encerrada' })) });
    await expect(new CloseWorkPermitUseCase(repo).execute({ id: 20 })).rejects.toBeInstanceOf(BusinessRuleError);
    expect(repo.updateWorkPermitStatus).not.toHaveBeenCalled();
  });

  it('lanca NotFoundError se a PT nao existir', async () => {
    const repo = makeRepository({ findWorkPermitById: jest.fn(async () => null) });
    await expect(new CloseWorkPermitUseCase(repo).execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('CreateBrigadeMemberUseCase', () => {
  it('cadastra brigadista', async () => {
    const repo = makeRepository();
    const result = await new CreateBrigadeMemberUseCase(repo).execute({ body: { employee_id: 501, data_formacao: '2026-01-01' } });
    expect(result.id).toBe(30);
  });

  it('rejeita campos obrigatorios ausentes', async () => {
    const repo = makeRepository();
    await expect(new CreateBrigadeMemberUseCase(repo).execute({ body: { employee_id: 501 } })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('CreateDdsUseCase', () => {
  it('registra DDS com presencas', async () => {
    const repo = makeRepository();
    const result = await new CreateDdsUseCase(repo).execute({ body: { department_id: 4, tema: 'Uso de EPI', condutor_id: 20, presentes: [501, 502] } });
    expect(repo.createDdsAttendees).toHaveBeenCalledWith(40, [501, 502]);
    expect(result.id).toBe(40);
  });

  it('rejeita campos obrigatorios ausentes', async () => {
    const repo = makeRepository();
    await expect(new CreateDdsUseCase(repo).execute({ body: { department_id: 4 } })).rejects.toBeInstanceOf(ValidationError);
  });
});
