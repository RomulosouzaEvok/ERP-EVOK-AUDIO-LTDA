/**
 * Testes: casos de uso de Contrato (módulo Jurídico).
 *
 * @group unit
 */

const CreateContractUseCase = require('../../src/modules/legal/application/use-cases/contract/CreateContractUseCase');
const ListContractsUseCase = require('../../src/modules/legal/application/use-cases/contract/ListContractsUseCase');
const GetContractByIdUseCase = require('../../src/modules/legal/application/use-cases/contract/GetContractByIdUseCase');
const UpdateContractUseCase = require('../../src/modules/legal/application/use-cases/contract/UpdateContractUseCase');
const ListExpiringContractsUseCase = require('../../src/modules/legal/application/use-cases/contract/ListExpiringContractsUseCase');
const { ConflictError, NotFoundError } = require('../../src/errors');

function makeContractRepository(overrides: Partial<any> = {}) {
  return {
    findContractByNumber: jest.fn(async () => null),
    findContractById: jest.fn(async () => null),
    createContract: jest.fn(async (data: any) => ({ id: 1, ...data })),
    updateContract: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    listContracts: jest.fn(async () => ({ rows: [], count: 0 })),
    listExpiringContracts: jest.fn(async () => []),
    ...overrides,
  };
}

describe('CreateContractUseCase', () => {
  it('FLUXO PRINCIPAL: cria contrato quando o número não colide', async () => {
    const repo = makeContractRepository();
    const result = await new CreateContractUseCase(repo).execute({ contract_number: 'CTR-001', title: 'Locação de galpão' });

    expect(repo.createContract).toHaveBeenCalledWith(expect.objectContaining({ contract_number: 'CTR-001' }));
    expect(result.contract_number).toBe('CTR-001');
  });

  it('FLUXO DE EXCECAO: rejeita contract_number duplicado com ConflictError', async () => {
    const repo = makeContractRepository({ findContractByNumber: jest.fn(async () => ({ id: 5, contract_number: 'CTR-001' })) });

    await expect(new CreateContractUseCase(repo).execute({ contract_number: 'CTR-001' })).rejects.toBeInstanceOf(ConflictError);
    expect(repo.createContract).not.toHaveBeenCalled();
  });
});

describe('ListContractsUseCase', () => {
  it('lista contratos paginados repassando filtros de status/tipo', async () => {
    const repo = makeContractRepository({
      listContracts: jest.fn(async () => ({ rows: [{ id: 1, contract_number: 'CTR-001' }], count: 1 })),
    });

    const result = await new ListContractsUseCase(repo).execute({ status: 'active', contract_type: 'fornecimento', page: 1, limit: 20, offset: 0 });

    expect(repo.listContracts).toHaveBeenCalledWith({ status: 'active', contract_type: 'fornecimento' }, { limit: 20, offset: 0 });
    expect(result.count).toBe(1);
    expect(result.totalPages).toBe(1);
  });
});

describe('GetContractByIdUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando o contrato não existe', async () => {
    const repo = makeContractRepository();
    await expect(new GetContractByIdUseCase(repo).execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('UpdateContractUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando o contrato não existe', async () => {
    const repo = makeContractRepository();
    await expect(new UpdateContractUseCase(repo).execute({ id: 999, status: 'active' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO DE EXCECAO: rejeita troca de contract_number que colide com outro contrato', async () => {
    const repo = makeContractRepository({
      findContractById: jest.fn(async () => ({ id: 1, contract_number: 'CTR-001' })),
      findContractByNumber: jest.fn(async () => ({ id: 2, contract_number: 'CTR-002' })),
    });

    await expect(new UpdateContractUseCase(repo).execute({ id: 1, contract_number: 'CTR-002' })).rejects.toBeInstanceOf(ConflictError);
  });

  it('FLUXO PRINCIPAL: permite manter o mesmo contract_number sem checagem de colisão', async () => {
    const repo = makeContractRepository({
      findContractById: jest.fn(async () => ({ id: 1, contract_number: 'CTR-001' })),
    });

    await new UpdateContractUseCase(repo).execute({ id: 1, contract_number: 'CTR-001', status: 'signed' });

    expect(repo.findContractByNumber).not.toHaveBeenCalled();
    expect(repo.updateContract).toHaveBeenCalledWith(1, { contract_number: 'CTR-001', status: 'signed' });
  });
});

describe('ListExpiringContractsUseCase', () => {
  it('FLUXO PRINCIPAL: repassa o parâmetro days (default 30) ao repositório', async () => {
    const repo = makeContractRepository({ listExpiringContracts: jest.fn(async () => [{ id: 1 }]) });

    const result = await new ListExpiringContractsUseCase(repo).execute();

    expect(repo.listExpiringContracts).toHaveBeenCalledWith(30);
    expect(result).toHaveLength(1);
  });

  it('FLUXO PRINCIPAL: repassa days customizado', async () => {
    const repo = makeContractRepository();
    await new ListExpiringContractsUseCase(repo).execute({ days: 90 });
    expect(repo.listExpiringContracts).toHaveBeenCalledWith(90);
  });
});
