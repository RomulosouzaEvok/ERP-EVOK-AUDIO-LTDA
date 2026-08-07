/**
 * Testes: casos de uso de Veículo de Frota (módulo Facilities).
 *
 * @group unit
 */

const CreateVehicleUseCase = require('../../src/modules/facilities/application/use-cases/vehicle/CreateVehicleUseCase');
const ListVehiclesUseCase = require('../../src/modules/facilities/application/use-cases/vehicle/ListVehiclesUseCase');
const GetVehicleByIdUseCase = require('../../src/modules/facilities/application/use-cases/vehicle/GetVehicleByIdUseCase');
const UpdateVehicleUseCase = require('../../src/modules/facilities/application/use-cases/vehicle/UpdateVehicleUseCase');
const { ConflictError, NotFoundError } = require('../../src/errors');

function makeVehicleRepository(overrides: Partial<any> = {}) {
  return {
    findVehicleByPlate: jest.fn(async () => null),
    findVehicleById: jest.fn(async () => null),
    createVehicle: jest.fn(async (data: any) => ({ id: 1, ...data })),
    updateVehicle: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    listVehicles: jest.fn(async () => ({ rows: [], count: 0 })),
    ...overrides,
  };
}

describe('CreateVehicleUseCase', () => {
  it('FLUXO PRINCIPAL: cria veículo com placa normalizada (uppercase/trim)', async () => {
    const repo = makeVehicleRepository();
    const result = await new CreateVehicleUseCase(repo).execute({ plate: ' abc1234 ', brand: 'Fiat' });

    expect(repo.createVehicle).toHaveBeenCalledWith(expect.objectContaining({ plate: 'ABC1234', brand: 'Fiat' }));
    expect(result.plate).toBe('ABC1234');
  });

  it('FLUXO DE EXCECAO: rejeita placa duplicada com ConflictError', async () => {
    const repo = makeVehicleRepository({ findVehicleByPlate: jest.fn(async () => ({ id: 5, plate: 'ABC1234' })) });

    await expect(new CreateVehicleUseCase(repo).execute({ plate: 'abc1234' })).rejects.toBeInstanceOf(ConflictError);
    expect(repo.createVehicle).not.toHaveBeenCalled();
  });
});

describe('ListVehiclesUseCase', () => {
  it('lista veículos paginados repassando filtro de status', async () => {
    const repo = makeVehicleRepository({
      listVehicles: jest.fn(async () => ({ rows: [{ id: 1, plate: 'ABC1234' }], count: 1 })),
    });

    const result = await new ListVehiclesUseCase(repo).execute({ status: 'active', page: 1, limit: 20, offset: 0 });

    expect(repo.listVehicles).toHaveBeenCalledWith({ status: 'active' }, { limit: 20, offset: 0 });
    expect(result.count).toBe(1);
    expect(result.totalPages).toBe(1);
  });
});

describe('GetVehicleByIdUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando o veículo não existe', async () => {
    const repo = makeVehicleRepository();
    await expect(new GetVehicleByIdUseCase(repo).execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('UpdateVehicleUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando o veículo não existe', async () => {
    const repo = makeVehicleRepository();
    await expect(new UpdateVehicleUseCase(repo).execute({ id: 999, status: 'maintenance' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO DE EXCECAO: rejeita troca de placa que colide com outro veículo', async () => {
    const repo = makeVehicleRepository({
      findVehicleById: jest.fn(async () => ({ id: 1, plate: 'ABC1234' })),
      findVehicleByPlate: jest.fn(async () => ({ id: 2, plate: 'XYZ9999' })),
    });

    await expect(new UpdateVehicleUseCase(repo).execute({ id: 1, plate: 'xyz9999' })).rejects.toBeInstanceOf(ConflictError);
  });
});
