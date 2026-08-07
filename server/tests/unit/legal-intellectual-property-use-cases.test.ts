/**
 * Testes: casos de uso de Propriedade Intelectual (módulo Jurídico).
 *
 * @group unit
 */

const CreateIntellectualPropertyUseCase = require('../../src/modules/legal/application/use-cases/intellectualProperty/CreateIntellectualPropertyUseCase');
const ListIntellectualPropertyUseCase = require('../../src/modules/legal/application/use-cases/intellectualProperty/ListIntellectualPropertyUseCase');
const GetIntellectualPropertyByIdUseCase = require('../../src/modules/legal/application/use-cases/intellectualProperty/GetIntellectualPropertyByIdUseCase');
const UpdateIntellectualPropertyUseCase = require('../../src/modules/legal/application/use-cases/intellectualProperty/UpdateIntellectualPropertyUseCase');
const ListExpiringIntellectualPropertyUseCase = require('../../src/modules/legal/application/use-cases/intellectualProperty/ListExpiringIntellectualPropertyUseCase');
const { NotFoundError } = require('../../src/errors');

function makeIpRepository(overrides: Partial<any> = {}) {
  return {
    findIntellectualPropertyById: jest.fn(async () => null),
    createIntellectualProperty: jest.fn(async (data: any) => ({ id: 1, ...data })),
    updateIntellectualProperty: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    listIntellectualProperty: jest.fn(async () => ({ rows: [], count: 0 })),
    listExpiringIntellectualProperty: jest.fn(async () => []),
    ...overrides,
  };
}

describe('CreateIntellectualPropertyUseCase', () => {
  it('FLUXO PRINCIPAL: cria ativo de PI', async () => {
    const repo = makeIpRepository();
    const result = await new CreateIntellectualPropertyUseCase(repo).execute({ ip_type: 'trademark', title: 'EVOK ÁUDIO' });

    expect(repo.createIntellectualProperty).toHaveBeenCalledWith(expect.objectContaining({ title: 'EVOK ÁUDIO' }));
    expect(result.title).toBe('EVOK ÁUDIO');
  });
});

describe('ListIntellectualPropertyUseCase', () => {
  it('lista ativos de PI paginados repassando filtros de ip_type/status', async () => {
    const repo = makeIpRepository({
      listIntellectualProperty: jest.fn(async () => ({ rows: [{ id: 1 }], count: 1 })),
    });

    const result = await new ListIntellectualPropertyUseCase(repo).execute({ ip_type: 'patent', status: 'granted', page: 1, limit: 20, offset: 0 });

    expect(repo.listIntellectualProperty).toHaveBeenCalledWith({ ip_type: 'patent', status: 'granted' }, { limit: 20, offset: 0 });
    expect(result.count).toBe(1);
  });
});

describe('GetIntellectualPropertyByIdUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando o ativo não existe', async () => {
    const repo = makeIpRepository();
    await expect(new GetIntellectualPropertyByIdUseCase(repo).execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('UpdateIntellectualPropertyUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando o ativo não existe', async () => {
    const repo = makeIpRepository();
    await expect(new UpdateIntellectualPropertyUseCase(repo).execute({ id: 999, status: 'granted' })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ListExpiringIntellectualPropertyUseCase', () => {
  it('FLUXO PRINCIPAL: repassa o parâmetro days (default 30) ao repositório', async () => {
    const repo = makeIpRepository({ listExpiringIntellectualProperty: jest.fn(async () => [{ id: 1 }]) });

    const result = await new ListExpiringIntellectualPropertyUseCase(repo).execute();

    expect(repo.listExpiringIntellectualProperty).toHaveBeenCalledWith(30);
    expect(result).toHaveLength(1);
  });

  it('FLUXO PRINCIPAL: repassa days customizado', async () => {
    const repo = makeIpRepository();
    await new ListExpiringIntellectualPropertyUseCase(repo).execute({ days: 90 });
    expect(repo.listExpiringIntellectualProperty).toHaveBeenCalledWith(90);
  });
});
