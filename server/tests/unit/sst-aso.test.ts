/**
 * Testes: cluster ASO/PCMSO (NR-7) do módulo SST — BLOCO 1.
 *
 * Cobre o registro de ASO com cálculo de vencimento + efeito colateral de
 * fila eSocial (fluxo principal) e o fluxo de exceção de ASO periódico sem
 * PlanoExames aplicável (BR-SST-011). Cobre também `GetAsoStatusUseCase`
 * (RF-SST-021), que NUNCA deve incluir dado clínico na resposta.
 *
 * @group unit
 */

const CreateAsoUseCase = require('../../src/modules/sst/application/use-cases/aso/CreateAsoUseCase');
const GetAsoStatusUseCase = require('../../src/modules/sst/application/use-cases/aso/GetAsoStatusUseCase');
const { ValidationError, NotFoundError, BusinessRuleError } = require('../../src/errors');

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async () => ({
      commit: jest.fn(async () => undefined),
      rollback: jest.fn(async () => undefined)
    }))
  }
}));

function makeAsoRepository(overrides: Partial<any> = {}) {
  return {
    findEmployeeById: jest.fn(async () => ({ id: 501, position: 'Operador de Injetora' })),
    findApplicableExamPlan: jest.fn(async () => ({ id: 3, periodicidade_meses: 12 })),
    createAso: jest.fn(async (data: any) => ({ id: 900, ...data, exames_complementares: [] })),
    findLatestAsoByEmployee: jest.fn(async () => null),
    ...overrides
  };
}

function makeEsocialRepository(overrides: Partial<any> = {}) {
  return { create: jest.fn(async (data: any) => ({ id: 3001, ...data })), ...overrides };
}

describe('CreateAsoUseCase', () => {
  it('registra o ASO periodico, calcula data_vencimento e enfileira S-2220', async () => {
    const asoRepo = makeAsoRepository();
    const esocialRepo = makeEsocialRepository();
    const useCase = new CreateAsoUseCase(asoRepo, esocialRepo);

    const result = await useCase.execute({
      body: { employee_id: 501, tipo: 'periodico', data_realizacao: '2026-08-06', resultado: 'apto', medico_examinador: 'Dr. Joao - CRM 1' },
      registradoPor: 20
    });

    expect(asoRepo.createAso).toHaveBeenCalledWith(expect.objectContaining({ employee_id: 501, data_vencimento: '2027-08-06' }));
    expect(esocialRepo.create).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'S-2220', origem_tipo: 'aso', origem_id: 900 }), expect.anything());
    expect(result.resultado).toBe('apto');
  });

  it('registra ASO admissional SEM exigir PlanoExames (so periodico exige)', async () => {
    const asoRepo = makeAsoRepository({ findApplicableExamPlan: jest.fn(async () => null) });
    const esocialRepo = makeEsocialRepository();
    const useCase = new CreateAsoUseCase(asoRepo, esocialRepo);

    await expect(
      useCase.execute({ body: { employee_id: 501, tipo: 'admissional', data_realizacao: '2026-08-06', resultado: 'apto', medico_examinador: 'Dr. Joao' }, registradoPor: 20 })
    ).resolves.toBeDefined();
  });

  it('FLUXO DE EXCECAO (BR-SST-011): rejeita ASO periodico sem PlanoExames aplicavel', async () => {
    const asoRepo = makeAsoRepository({ findApplicableExamPlan: jest.fn(async () => null) });
    const esocialRepo = makeEsocialRepository();
    const useCase = new CreateAsoUseCase(asoRepo, esocialRepo);

    await expect(
      useCase.execute({ body: { employee_id: 501, tipo: 'periodico', data_realizacao: '2026-08-06', resultado: 'apto', medico_examinador: 'Dr. Joao' }, registradoPor: 20 })
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(asoRepo.createAso).not.toHaveBeenCalled();
  });

  it('rejeita funcionario inexistente com NotFoundError', async () => {
    const asoRepo = makeAsoRepository({ findEmployeeById: jest.fn(async () => null) });
    const esocialRepo = makeEsocialRepository();
    const useCase = new CreateAsoUseCase(asoRepo, esocialRepo);

    await expect(
      useCase.execute({ body: { employee_id: 999, tipo: 'admissional', data_realizacao: '2026-08-06', resultado: 'apto', medico_examinador: 'Dr. Joao' }, registradoPor: 20 })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita resultado invalido com ValidationError', async () => {
    const asoRepo = makeAsoRepository();
    const esocialRepo = makeEsocialRepository();
    const useCase = new CreateAsoUseCase(asoRepo, esocialRepo);

    await expect(
      useCase.execute({ body: { employee_id: 501, tipo: 'admissional', data_realizacao: '2026-08-06', resultado: 'invalido', medico_examinador: 'Dr. Joao' }, registradoPor: 20 })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('GetAsoStatusUseCase (RF-SST-021 — leitura enxuta, sem dado clinico)', () => {
  it('retorna apenas status/tipo/data/vencimento (sem restricoes/medico/arquivo)', async () => {
    const asoRepo = makeAsoRepository({
      findLatestAsoByEmployee: jest.fn(async () => ({
        resultado: 'apto_com_restricoes', tipo: 'periodico', data_realizacao: '2026-08-06', data_vencimento: '2027-08-06',
        restricoes: 'Nao levantar peso acima de 10kg', medico_examinador: 'Dr. Joao', arquivo_url: 'https://x/laudo.pdf'
      }))
    });
    const useCase = new GetAsoStatusUseCase(asoRepo);

    const result = await useCase.execute({ employeeId: 501 });

    expect(result).toEqual({ employee_id: 501, status: 'apto_com_restricoes', tipo_ultimo_aso: 'periodico', data_ultimo_aso: '2026-08-06', vencimento: '2027-08-06' });
    expect(result.restricoes).toBeUndefined();
    expect(result.medico_examinador).toBeUndefined();
    expect(result.arquivo_url).toBeUndefined();
  });

  it('retorna status "pendente" quando o funcionario nao tem nenhum ASO registrado', async () => {
    const asoRepo = makeAsoRepository({ findLatestAsoByEmployee: jest.fn(async () => null) });
    const useCase = new GetAsoStatusUseCase(asoRepo);

    const result = await useCase.execute({ employeeId: 777 });
    expect(result.status).toBe('pendente');
  });
});
