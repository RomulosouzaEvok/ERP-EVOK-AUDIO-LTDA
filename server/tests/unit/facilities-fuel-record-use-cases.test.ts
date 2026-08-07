/**
 * Testes: casos de uso de Abastecimento (módulo Facilities, BLOCO 4 FAC —
 * correção: `vehicle_id` → `asset_id`, validação de km/tanque).
 *
 * @group unit
 */

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (callback?: any) => {
      const transaction = { id: 'tx-fuel-1', LOCK: { UPDATE: 'UPDATE' } };
      if (callback) return callback(transaction);
      return transaction;
    }),
  },
}));

const CreateFuelRecordUseCase = require('../../src/modules/facilities/application/use-cases/fuelRecord/CreateFuelRecordUseCase');
const UpdateFuelRecordUseCase = require('../../src/modules/facilities/application/use-cases/fuelRecord/UpdateFuelRecordUseCase');
const { NotFoundError, BusinessRuleError, ValidationError } = require('../../src/errors');

function makeFuelRecordRepository(overrides: Partial<any> = {}) {
  return {
    createFuelRecord: jest.fn(async (data: any) => ({ id: 1, ...data, toJSON: () => ({ id: 1, ...data }) })),
    findFuelRecordById: jest.fn(async () => ({ id: 1, asset_id: 10 })),
    updateFuelRecord: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    listRecentFullTank: jest.fn(async () => []),
    ...overrides,
  };
}

function makeVehicleRepository(overrides: Partial<any> = {}) {
  return {
    findVehicleByAssetId: jest.fn(async () => ({ asset_id: 10, plate: 'ABC1234', current_km: 1000, tank_capacity_liters: 60 })),
    updateVehicleDetail: jest.fn(async () => ({})),
    ...overrides,
  };
}

describe('CreateFuelRecordUseCase', () => {
  it('FLUXO PRINCIPAL: calcula total_cost automaticamente quando não informado', async () => {
    const fuelRecordRepo = makeFuelRecordRepository();
    const vehicleRepo = makeVehicleRepository();

    const result = await new CreateFuelRecordUseCase(fuelRecordRepo, vehicleRepo).execute({
      asset_id: 10, liters: 40, unit_price: 5.5,
    });

    expect(fuelRecordRepo.createFuelRecord).toHaveBeenCalledWith(expect.objectContaining({ total_cost: 220 }));
    expect(result.total_cost).toBe(220);
  });

  it('FLUXO DE EXCECAO: lança NotFoundError quando o veículo não existe', async () => {
    const fuelRecordRepo = makeFuelRecordRepository();
    const vehicleRepo = makeVehicleRepository({ findVehicleByAssetId: jest.fn(async () => null) });

    await expect(
      new CreateFuelRecordUseCase(fuelRecordRepo, vehicleRepo).execute({ asset_id: 999, liters: 40, unit_price: 5.5 }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(fuelRecordRepo.createFuelRecord).not.toHaveBeenCalled();
  });

  it('RF-FAC-022: rejeita km_at_refuel menor que o km atual conhecido', async () => {
    const fuelRecordRepo = makeFuelRecordRepository();
    const vehicleRepo = makeVehicleRepository();

    await expect(
      new CreateFuelRecordUseCase(fuelRecordRepo, vehicleRepo).execute({ asset_id: 10, km_at_refuel: 500, liters: 40, unit_price: 5.5 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('RF-FAC-024: rejeita liters acima da capacidade do tanque', async () => {
    const fuelRecordRepo = makeFuelRecordRepository();
    const vehicleRepo = makeVehicleRepository();

    await expect(
      new CreateFuelRecordUseCase(fuelRecordRepo, vehicleRepo).execute({ asset_id: 10, liters: 100, unit_price: 5.5 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('RF-FAC-023: atualiza current_km para max(current_km, km_at_refuel)', async () => {
    const fuelRecordRepo = makeFuelRecordRepository();
    const vehicleRepo = makeVehicleRepository();

    await new CreateFuelRecordUseCase(fuelRecordRepo, vehicleRepo).execute({ asset_id: 10, km_at_refuel: 1200, liters: 40, unit_price: 5.5 });

    expect(vehicleRepo.updateVehicleDetail).toHaveBeenCalledWith(10, { current_km: 1200 }, expect.anything());
  });
});

describe('UpdateFuelRecordUseCase', () => {
  it('RNF-FAC-01: rejeita alteração de km_at_refuel/liters após criado', async () => {
    const fuelRecordRepo = makeFuelRecordRepository();

    await expect(new UpdateFuelRecordUseCase(fuelRecordRepo).execute({ id: 1, km_at_refuel: 2000 })).rejects.toBeInstanceOf(ValidationError);
    await expect(new UpdateFuelRecordUseCase(fuelRecordRepo).execute({ id: 1, liters: 10 })).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO DE EXCECAO: lança NotFoundError quando o registro não existe', async () => {
    const fuelRecordRepo = makeFuelRecordRepository({ findFuelRecordById: jest.fn(async () => null) });
    await expect(new UpdateFuelRecordUseCase(fuelRecordRepo).execute({ id: 999, invoice_ref: 'NF-1' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('permite corrigir campos não recalculáveis', async () => {
    const fuelRecordRepo = makeFuelRecordRepository();
    await new UpdateFuelRecordUseCase(fuelRecordRepo).execute({ id: 1, invoice_ref: 'NF-1' });
    expect(fuelRecordRepo.updateFuelRecord).toHaveBeenCalledWith(1, { invoice_ref: 'NF-1' });
  });
});
