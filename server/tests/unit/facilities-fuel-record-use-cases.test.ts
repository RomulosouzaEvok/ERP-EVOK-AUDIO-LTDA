/**
 * Testes: casos de uso de Abastecimento (módulo Facilities).
 *
 * @group unit
 */

const CreateFuelRecordUseCase = require('../../src/modules/facilities/application/use-cases/fuelRecord/CreateFuelRecordUseCase');
const { NotFoundError } = require('../../src/errors');

function makeFuelRecordRepository(overrides: Partial<any> = {}) {
  return {
    createFuelRecord: jest.fn(async (data: any) => ({ id: 1, ...data })),
    ...overrides,
  };
}

function makeVehicleRepository(overrides: Partial<any> = {}) {
  return {
    findVehicleById: jest.fn(async () => ({ id: 10, plate: 'ABC1234' })),
    ...overrides,
  };
}

describe('CreateFuelRecordUseCase', () => {
  it('FLUXO PRINCIPAL: calcula total_cost automaticamente quando não informado', async () => {
    const fuelRecordRepo = makeFuelRecordRepository();
    const vehicleRepo = makeVehicleRepository();

    const result = await new CreateFuelRecordUseCase(fuelRecordRepo, vehicleRepo).execute({
      vehicle_id: 10, record_date: '2026-08-07T10:00:00Z', liters: 40, price_per_liter: 5.5,
    });

    expect(fuelRecordRepo.createFuelRecord).toHaveBeenCalledWith(expect.objectContaining({ total_cost: 220 }));
    expect(result.total_cost).toBe(220);
  });

  it('respeita total_cost explícito quando informado', async () => {
    const fuelRecordRepo = makeFuelRecordRepository();
    const vehicleRepo = makeVehicleRepository();

    await new CreateFuelRecordUseCase(fuelRecordRepo, vehicleRepo).execute({
      vehicle_id: 10, record_date: '2026-08-07T10:00:00Z', liters: 40, price_per_liter: 5.5, total_cost: 200,
    });

    expect(fuelRecordRepo.createFuelRecord).toHaveBeenCalledWith(expect.objectContaining({ total_cost: 200 }));
  });

  it('FLUXO DE EXCECAO: lança NotFoundError quando o veículo não existe', async () => {
    const fuelRecordRepo = makeFuelRecordRepository();
    const vehicleRepo = makeVehicleRepository({ findVehicleById: jest.fn(async () => null) });

    await expect(
      new CreateFuelRecordUseCase(fuelRecordRepo, vehicleRepo).execute({
        vehicle_id: 999, record_date: '2026-08-07T10:00:00Z', liters: 40, price_per_liter: 5.5,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(fuelRecordRepo.createFuelRecord).not.toHaveBeenCalled();
  });
});
