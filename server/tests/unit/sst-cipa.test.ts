/**
 * Testes: cluster CIPA (NR-5, CF/88) do módulo SST — BLOCO 1, passada 2.
 *
 * Cobre o fluxo principal (dimensionamento → mandato → membro eleito →
 * posse → reunião → estabilidade) e os fluxos de exceção: eleger membro
 * com 2 mandatos consecutivos já cumpridos (BR-SST-021), inscrever
 * candidato fora do processo eleitoral aberto (já encerrado), posse sem
 * treinamento CIPA válido (BR-SST-024), reunião ordinária sem ata
 * (BR-SST-023).
 *
 * @group unit
 */

const GetDimensioningUseCase = require('../../src/modules/sst/application/use-cases/cipa/GetDimensioningUseCase');
const CreateMandateUseCase = require('../../src/modules/sst/application/use-cases/cipa/CreateMandateUseCase');
const AddMemberUseCase = require('../../src/modules/sst/application/use-cases/cipa/AddMemberUseCase');
const TakeOfficeUseCase = require('../../src/modules/sst/application/use-cases/cipa/TakeOfficeUseCase');
const AddCandidateUseCase = require('../../src/modules/sst/application/use-cases/cipa/AddCandidateUseCase');
const CreateMeetingUseCase = require('../../src/modules/sst/application/use-cases/cipa/CreateMeetingUseCase');
const GetStabilityUseCase = require('../../src/modules/sst/application/use-cases/cipa/GetStabilityUseCase');
const { ValidationError, NotFoundError, BusinessRuleError } = require('../../src/errors');

function makeMandato(overrides: Partial<any> = {}) {
  return { id: 4, data_inicio: '2026-01-01', data_fim: '2028-01-01', status: 'vigente', ...overrides };
}

function makeCipaRepository(overrides: Partial<any> = {}) {
  return {
    countHeadcount: jest.fn(async () => 120),
    findMandateById: jest.fn(async () => makeMandato()),
    createMandate: jest.fn(async (data: any) => ({ id: 4, ...data })),
    countConsecutiveElectedTerms: jest.fn(async () => 0),
    createMember: jest.fn(async (data: any) => ({ id: 501, ...data })),
    findMemberById: jest.fn(async () => ({ id: 501, employee_id: 501, mandato_id: 4 })),
    updateMember: jest.fn(async (id: any, data: any) => ({ id, ...data })),
    findValidCipaTraining: jest.fn(async () => ({ id: 900 })),
    findElectoralProcessById: jest.fn(async () => ({ id: 12, mandato_id: 4, total_votantes: null })),
    createCandidate: jest.fn(async (data: any) => ({ id: 200, ...data })),
    createMeeting: jest.fn(async (data: any) => ({ id: 700, ...data })),
    createCorrectiveAction: jest.fn(async (data: any) => ({ id: 900, ...data })),
    findActiveMembershipByEmployee: jest.fn(async () => ({ estabilidade_fim: '2029-01-01', papel: 'titular', mandato_id: 4 })),
    ...overrides
  };
}

describe('GetDimensioningUseCase', () => {
  it('calcula o dimensionamento a partir do headcount ativo', async () => {
    const repo = makeCipaRepository();
    const result = await new GetDimensioningUseCase(repo).execute();
    expect(result.headcount).toBe(120);
    expect(result.titulares_empregador).toBeGreaterThan(0);
  });
});

describe('CreateMandateUseCase', () => {
  it('cria o mandato com os dados informados', async () => {
    const repo = makeCipaRepository();
    const result = await new CreateMandateUseCase(repo).execute({
      body: { data_inicio: '2026-01-01', data_fim: '2028-01-01', titulares_empregador: 3, titulares_empregados: 3, suplentes_empregador: 2, suplentes_empregados: 2 }
    });
    expect(repo.createMandate).toHaveBeenCalled();
    expect(result.id).toBe(4);
  });

  it('rejeita data_fim anterior/igual a data_inicio', async () => {
    const repo = makeCipaRepository();
    await expect(new CreateMandateUseCase(repo).execute({
      body: { data_inicio: '2026-01-01', data_fim: '2026-01-01', titulares_empregador: 1, titulares_empregados: 1, suplentes_empregador: 1, suplentes_empregados: 1 }
    })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('AddMemberUseCase', () => {
  it('adiciona membro eleito e calcula fim_estabilidade = data_fim do mandato + 1 ano', async () => {
    const repo = makeCipaRepository();
    const useCase = new AddMemberUseCase(repo);
    await useCase.execute({ mandateId: 4, body: { employee_id: 501, origem: 'eleito', papel: 'titular', votos_recebidos: 87 } });
    expect(repo.createMember).toHaveBeenCalledWith(expect.objectContaining({ mandato_id: 4, estabilidade_fim: '2029-01-01' }));
  });

  it('FLUXO DE EXCECAO (BR-SST-021): rejeita eleger membro que ja cumpriu 2 mandatos consecutivos', async () => {
    const repo = makeCipaRepository({ countConsecutiveElectedTerms: jest.fn(async () => 2) });
    const useCase = new AddMemberUseCase(repo);
    await expect(
      useCase.execute({ mandateId: 4, body: { employee_id: 501, origem: 'eleito', papel: 'titular' } })
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(repo.createMember).not.toHaveBeenCalled();
  });

  it('rejeita papel invalido com ValidationError', async () => {
    const repo = makeCipaRepository();
    await expect(
      new AddMemberUseCase(repo).execute({ mandateId: 4, body: { employee_id: 501, origem: 'eleito', papel: 'vice' } })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('TakeOfficeUseCase', () => {
  it('confirma a posse quando ha treinamento CIPA valido', async () => {
    const repo = makeCipaRepository();
    const result = await new TakeOfficeUseCase(repo).execute({ memberId: 501 });
    expect(repo.updateMember).toHaveBeenCalledWith(501, expect.objectContaining({ treinamento_cipa_id: 900 }));
    expect(result).toBeDefined();
  });

  it('FLUXO DE EXCECAO (BR-SST-024): bloqueia posse sem treinamento CIPA valido', async () => {
    const repo = makeCipaRepository({ findValidCipaTraining: jest.fn(async () => null) });
    await expect(new TakeOfficeUseCase(repo).execute({ memberId: 501 })).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('lanca NotFoundError se o membro nao existir', async () => {
    const repo = makeCipaRepository({ findMemberById: jest.fn(async () => null) });
    await expect(new TakeOfficeUseCase(repo).execute({ memberId: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('AddCandidateUseCase', () => {
  it('inscreve candidato num processo eleitoral aberto', async () => {
    const repo = makeCipaRepository();
    const result = await new AddCandidateUseCase(repo).execute({ processId: 12, body: { employee_id: 501 } });
    expect(repo.createCandidate).toHaveBeenCalledWith({ processo_eleitoral_id: 12, employee_id: 501 });
    expect(result.id).toBe(200);
  });

  it('FLUXO DE EXCECAO: rejeita inscricao em processo eleitoral ja encerrado (fora do processo aberto)', async () => {
    const repo = makeCipaRepository({ findElectoralProcessById: jest.fn(async () => ({ id: 12, mandato_id: 4, total_votantes: 350 })) });
    await expect(
      new AddCandidateUseCase(repo).execute({ processId: 12, body: { employee_id: 501 } })
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(repo.createCandidate).not.toHaveBeenCalled();
  });

  it('FLUXO DE EXCECAO (BR-SST-021): rejeita candidato com 2 mandatos consecutivos eleitos', async () => {
    const repo = makeCipaRepository({ countConsecutiveElectedTerms: jest.fn(async () => 2) });
    await expect(
      new AddCandidateUseCase(repo).execute({ processId: 12, body: { employee_id: 501 } })
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

describe('CreateMeetingUseCase', () => {
  it('registra reuniao ordinaria com ata', async () => {
    const repo = makeCipaRepository();
    const result = await new CreateMeetingUseCase(repo).execute({
      body: { mandate_id: 4, data: '2026-08-10', tipo: 'ordinaria', ata_texto: 'Pauta discutida...' },
      createdBy: 20
    });
    expect(repo.createMeeting).toHaveBeenCalled();
    expect(result.id).toBe(700);
  });

  it('FLUXO DE EXCECAO (BR-SST-023): rejeita reuniao ordinaria sem ata', async () => {
    const repo = makeCipaRepository();
    await expect(
      new CreateMeetingUseCase(repo).execute({ body: { mandate_id: 4, data: '2026-08-10', tipo: 'ordinaria' }, createdBy: 20 })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.createMeeting).not.toHaveBeenCalled();
  });

  it('nao exige ata para reuniao extraordinaria', async () => {
    const repo = makeCipaRepository();
    await expect(
      new CreateMeetingUseCase(repo).execute({ body: { mandate_id: 4, data: '2026-08-10', tipo: 'extraordinaria' }, createdBy: 20 })
    ).resolves.toBeDefined();
  });
});

describe('GetStabilityUseCase', () => {
  it('retorna estavel=true quando ha membresia ativa com fim_estabilidade futuro', async () => {
    const repo = makeCipaRepository();
    const result = await new GetStabilityUseCase(repo).execute({ employeeId: 501 });
    expect(result.estavel).toBe(true);
    expect(result.fim_estabilidade).toBe('2029-01-01');
  });

  it('retorna estavel=false quando nao ha membresia (nao bloqueia desligamento)', async () => {
    const repo = makeCipaRepository({ findActiveMembershipByEmployee: jest.fn(async () => null) });
    const result = await new GetStabilityUseCase(repo).execute({ employeeId: 999 });
    expect(result.estavel).toBe(false);
    expect(result.fim_estabilidade).toBeNull();
  });
});
