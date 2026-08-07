/**
 * Testes: cluster Treinamentos de Segurança (NRs) do módulo SST — BLOCO 1,
 * passada 2.
 *
 * Cobre o fluxo principal (matriz de treinamento → treinamento realizado
 * com validade calculada → blocklist) e o fluxo de exceção: matrícula com
 * validade vencida aparecendo na blocklist de bloqueio operacional
 * (RF-SST-046) e criação de item duplicado na matriz (UNIQUE position+norma).
 *
 * @group unit
 */

const CreateTrainingMatrixUseCase = require('../../src/modules/sst/application/use-cases/training/CreateTrainingMatrixUseCase');
const CreateTrainingUseCase = require('../../src/modules/sst/application/use-cases/training/CreateTrainingUseCase');
const GetTrainingBlocklistUseCase = require('../../src/modules/sst/application/use-cases/training/GetTrainingBlocklistUseCase');
const { ValidationError, ConflictError } = require('../../src/errors');

function makeTrainingRepository(overrides: Partial<any> = {}) {
  return {
    findMatrixByPositionAndNorma: jest.fn(async () => null),
    createMatrixItem: jest.fn(async (data: any) => ({ id: 1, ...data })),
    createTraining: jest.fn(async (data: any) => ({ id: 501, ...data })),
    findBlocklist: jest.fn(async () => []),
    ...overrides
  };
}

describe('CreateTrainingMatrixUseCase', () => {
  it('cria item da matriz de treinamento', async () => {
    const repo = makeTrainingRepository();
    const result = await new CreateTrainingMatrixUseCase(repo).execute({ body: { position: 'Operador de Empilhadeira', norma: 'NR-11', periodicidade_meses: 12 } });
    expect(repo.createMatrixItem).toHaveBeenCalledWith(expect.objectContaining({ position: 'Operador de Empilhadeira', norma: 'NR-11', periodicidade_reciclagem_meses: 12 }));
    expect(result.id).toBe(1);
  });

  it('FLUXO DE EXCECAO: rejeita item duplicado para o mesmo par position/norma (UNIQUE)', async () => {
    const repo = makeTrainingRepository({ findMatrixByPositionAndNorma: jest.fn(async () => ({ id: 1 })) });
    await expect(
      new CreateTrainingMatrixUseCase(repo).execute({ body: { position: 'Operador de Empilhadeira', norma: 'NR-11', periodicidade_meses: 12 } })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repo.createMatrixItem).not.toHaveBeenCalled();
  });
});

describe('CreateTrainingUseCase', () => {
  it('registra treinamento e calcula validade pela matriz da funcao', async () => {
    const repo = makeTrainingRepository({ findMatrixByPositionAndNorma: jest.fn(async () => ({ periodicidade_reciclagem_meses: 12 })) });
    const result = await new CreateTrainingUseCase(repo).execute({
      body: { employee_id: 501, norma: 'NR-11', data: '2026-08-06', carga_horaria: 8 },
      createdBy: 20,
      employeePosition: 'Operador de Empilhadeira'
    });
    expect(repo.createTraining).toHaveBeenCalledWith(expect.objectContaining({ validade: '2027-08-06' }));
    expect(result.id).toBe(501);
  });

  it('aplica default bienal (24 meses) para NR-10 mesmo sem matriz cadastrada', async () => {
    const repo = makeTrainingRepository();
    await new CreateTrainingUseCase(repo).execute({ body: { employee_id: 501, norma: 'NR-10', data: '2026-08-06', carga_horaria: 40 }, createdBy: 20 });
    expect(repo.createTraining).toHaveBeenCalledWith(expect.objectContaining({ validade: '2028-08-06' }));
  });

  it('rejeita norma invalida', async () => {
    const repo = makeTrainingRepository();
    await expect(
      new CreateTrainingUseCase(repo).execute({ body: { employee_id: 501, norma: 'NR-99', data: '2026-08-06', carga_horaria: 8 }, createdBy: 20 })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita campos obrigatorios ausentes', async () => {
    const repo = makeTrainingRepository();
    await expect(
      new CreateTrainingUseCase(repo).execute({ body: { employee_id: 501 }, createdBy: 20 })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('GetTrainingBlocklistUseCase', () => {
  it('FLUXO DE EXCECAO (RF-SST-046): retorna funcionarios com matricula/treinamento de validade vencida', async () => {
    const repo = makeTrainingRepository({
      findBlocklist: jest.fn(async () => [
        { employee_id: 501, position: 'Operador de Empilhadeira', norma: 'NR-11', validade_vencida_em: '2026-07-15' }
      ])
    });
    const result = await new GetTrainingBlocklistUseCase(repo).execute();
    expect(result).toHaveLength(1);
    expect(result[0].validade_vencida_em).toBe('2026-07-15');
  });

  it('retorna lista vazia quando ninguem esta bloqueado', async () => {
    const repo = makeTrainingRepository();
    const result = await new GetTrainingBlocklistUseCase(repo).execute();
    expect(result).toEqual([]);
  });
});
