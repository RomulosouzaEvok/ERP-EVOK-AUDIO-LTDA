/**
 * Testes: casos de uso de Visitante (módulo Facilities, BLOCO 4 FAC) —
 * foco em mascaramento de dado pessoal em listagem (LGPD, RNF-FAC-04).
 *
 * @group unit
 */

const { ListVisitorsUseCase, CreateVisitorUseCase } = require('../../src/modules/facilities/application/use-cases/visitor/VisitorUseCases');

function makeVisitorRepository(overrides: Partial<any> = {}) {
  return {
    list: jest.fn(async () => ({
      rows: [{ id: 1, name: 'Maria Souza', document: '123.456.789-00', phone: '(11) 98765-4321', toJSON() { return this; } }],
      count: 1,
    })),
    findByDocument: jest.fn(async () => null),
    create: jest.fn(async (data: any) => ({ id: 1, ...data })),
    ...overrides,
  };
}

describe('ListVisitorsUseCase (LGPD — RNF-FAC-04)', () => {
  it('mascara document e phone na listagem, mantém name legível', async () => {
    const repo = makeVisitorRepository();
    const result = await new ListVisitorsUseCase(repo).execute({ page: 1, limit: 20, offset: 0 });

    expect(result.rows[0].name).toBe('Maria Souza');
    expect(result.rows[0].document).not.toBe('123.456.789-00');
    expect(result.rows[0].document).toMatch(/^\*\*\*/);
    expect(result.rows[0].phone).toMatch(/^\*\*\*/);
  });
});

describe('CreateVisitorUseCase', () => {
  it('reaproveita cadastro existente pelo document ao invés de duplicar', async () => {
    const existing = { id: 5, name: 'Maria Souza', document: '123.456.789-00' };
    const repo = makeVisitorRepository({ findByDocument: jest.fn(async () => existing) });

    const result = await new CreateVisitorUseCase(repo).execute({ name: 'Maria Souza', document: '123.456.789-00' });

    expect(result).toBe(existing);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('cria novo cadastro quando document ainda não existe', async () => {
    const repo = makeVisitorRepository();
    const result = await new CreateVisitorUseCase(repo).execute({ name: 'João', document: '999.999.999-99' });

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'João', document: '999.999.999-99' }));
    expect(result.id).toBe(1);
  });
});
