/**
 * Testes: recurso Ações Corretivas (CRUD dedicado, polimórfico
 * multi-origem) do módulo SST — BLOCO 1, passada 2.
 *
 * Cobre o fluxo principal (criação direta para origem `reuniao_cipa`,
 * listagem, atualização de status para `concluida`) e o fluxo de exceção:
 * tentar definir manualmente `status: atrasada` (é sempre derivado por
 * leitura, nunca setado pela API).
 *
 * @group unit
 */

const ListCorrectiveActionsUseCase = require('../../src/modules/sst/application/use-cases/correctiveAction/ListCorrectiveActionsUseCase');
const CreateCorrectiveActionUseCase = require('../../src/modules/sst/application/use-cases/correctiveAction/CreateCorrectiveActionUseCase');
const UpdateCorrectiveActionUseCase = require('../../src/modules/sst/application/use-cases/correctiveAction/UpdateCorrectiveActionUseCase');
const { ValidationError, NotFoundError } = require('../../src/errors');

function makeAcao(overrides: Partial<any> = {}) {
  return { id: 900, origem_tipo: 'reuniao_cipa', origem_id: 12, descricao: 'x', responsavel_id: 20, prazo: '2099-01-01', status: 'aberta', ...overrides };
}

function makeRepository(overrides: Partial<any> = {}) {
  return {
    findAndCount: jest.fn(async () => ({ count: 1, rows: [makeAcao()] })),
    findById: jest.fn(async () => makeAcao()),
    create: jest.fn(async (data: any) => ({ id: 900, ...data })),
    update: jest.fn(async (id: any, data: any) => ({ ...makeAcao(), ...data, id })),
    ...overrides
  };
}

describe('ListCorrectiveActionsUseCase', () => {
  it('lista acoes corretivas paginadas', async () => {
    const repo = makeRepository();
    const result = await new ListCorrectiveActionsUseCase(repo).execute({});
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].origem).toBe('reuniao_cipa');
  });
});

describe('CreateCorrectiveActionUseCase', () => {
  it('cria acao corretiva diretamente para origem reuniao_cipa', async () => {
    const repo = makeRepository();
    const result = await new CreateCorrectiveActionUseCase(repo).execute({
      body: { origem: 'reuniao_cipa', origem_id: 12, descricao: 'Revisar sinalizacao', responsavel_id: 20, prazo: '2026-09-01' },
      createdBy: 20
    });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ origem_tipo: 'reuniao_cipa', origem_id: 12, status: 'aberta', created_by: 20 }));
    expect(result.id).toBe(900);
  });

  it('rejeita origem invalida', async () => {
    const repo = makeRepository();
    await expect(
      new CreateCorrectiveActionUseCase(repo).execute({ body: { origem: 'invalida', origem_id: 1, descricao: 'x', responsavel_id: 1, prazo: '2026-09-01' }, createdBy: 20 })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita campos obrigatorios ausentes', async () => {
    const repo = makeRepository();
    await expect(
      new CreateCorrectiveActionUseCase(repo).execute({ body: { origem: 'pgr' }, createdBy: 20 })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('UpdateCorrectiveActionUseCase', () => {
  it('atualiza status para concluida com evidencia', async () => {
    const repo = makeRepository();
    const result = await new UpdateCorrectiveActionUseCase(repo).execute({ id: 900, body: { status: 'concluida', evidencia_conclusao_url: 'https://x/evidencia.jpg' } });
    expect(repo.update).toHaveBeenCalledWith(900, expect.objectContaining({ status: 'concluida', concluida_em: expect.any(Date) }));
    expect(result.status).toBe('concluida');
  });

  it('FLUXO DE EXCECAO: rejeita definir manualmente status=atrasada (e sempre derivado)', async () => {
    const repo = makeRepository();
    await expect(
      new UpdateCorrectiveActionUseCase(repo).execute({ id: 900, body: { status: 'atrasada' } })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('lanca NotFoundError se a acao nao existir', async () => {
    const repo = makeRepository({ findById: jest.fn(async () => null) });
    await expect(new UpdateCorrectiveActionUseCase(repo).execute({ id: 999, body: { status: 'em_andamento' } })).rejects.toBeInstanceOf(NotFoundError);
  });
});
