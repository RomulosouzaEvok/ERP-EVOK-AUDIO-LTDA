/**
 * Testes: casos de uso de Área Física (módulo Facilities).
 *
 * @group unit
 */

const CreateAreaUseCase = require('../../src/modules/facilities/application/use-cases/area/CreateAreaUseCase');
const GetAreaByIdUseCase = require('../../src/modules/facilities/application/use-cases/area/GetAreaByIdUseCase');
const { NotFoundError } = require('../../src/errors');

function makeAreaRepository(overrides: Partial<any> = {}) {
  return {
    createArea: jest.fn(async (data: any) => ({ id: 1, ...data })),
    findAreaById: jest.fn(async () => null),
    ...overrides,
  };
}

describe('CreateAreaUseCase', () => {
  it('FLUXO PRINCIPAL: cria área física', async () => {
    const repo = makeAreaRepository();
    const result = await new CreateAreaUseCase(repo).execute({ name: 'Galpão 1', area_type: 'warehouse', square_meters: 500 });

    expect(repo.createArea).toHaveBeenCalledWith(expect.objectContaining({ name: 'Galpão 1', area_type: 'warehouse' }));
    expect(result.id).toBe(1);
  });
});

describe('GetAreaByIdUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando a área não existe', async () => {
    const repo = makeAreaRepository();
    await expect(new GetAreaByIdUseCase(repo).execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});
