/**
 * Testes: casos de uso de Veículo de Frota (módulo Facilities, BLOCO 4 FAC
 * — correção, D-2: veículo é extensão 1:1 de `Asset`).
 *
 * @group unit
 */

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (callback?: any) => {
      const transaction = { id: 'tx-vehicle-1', LOCK: { UPDATE: 'UPDATE' } };
      if (callback) return callback(transaction);
      return transaction;
    }),
  },
}));

const CreateVehicleUseCase = require('../../src/modules/facilities/application/use-cases/vehicle/CreateVehicleUseCase');
const ListVehiclesUseCase = require('../../src/modules/facilities/application/use-cases/vehicle/ListVehiclesUseCase');
const GetVehicleByIdUseCase = require('../../src/modules/facilities/application/use-cases/vehicle/GetVehicleByIdUseCase');
const UpdateVehicleUseCase = require('../../src/modules/facilities/application/use-cases/vehicle/UpdateVehicleUseCase');
const { ConflictError, NotFoundError, ValidationError } = require('../../src/errors');

function makeVehicleRepository(overrides: Partial<any> = {}) {
  return {
    findVehicleByPlate: jest.fn(async () => null),
    findVehicleByAssetId: jest.fn(async () => null),
    createVehicleDetail: jest.fn(async (data: any) => ({ id: 1, ...data })),
    updateVehicleDetail: jest.fn(async (id: number, data: any) => ({ asset_id: id, ...data })),
    listVehicles: jest.fn(async () => ({ rows: [], count: 0 })),
    ...overrides,
  };
}

function makeAssetService(overrides: Partial<any> = {}) {
  return {
    create: jest.fn(async (data: any) => ({ id: 501, ...data })),
    findById: jest.fn(async () => ({ id: 501, status: 'active' })),
    ...overrides,
  };
}

describe('CreateVehicleUseCase', () => {
  it('FLUXO PRINCIPAL: cria Asset + FacilityVehicleDetail na mesma transação', async () => {
    const vehicleRepo = makeVehicleRepository();
    const assetService = makeAssetService();

    const result = await new CreateVehicleUseCase(vehicleRepo, assetService).execute({
      plate: ' abc1234 ', brand: 'Fiat', model: 'Fiorino', fuel_type: 'flex',
    });

    expect(assetService.create).toHaveBeenCalledWith(expect.objectContaining({ asset_type: 'vehicle', tag: 'ABC1234' }), expect.anything());
    expect(vehicleRepo.createVehicleDetail).toHaveBeenCalledWith(expect.objectContaining({ asset_id: 501, plate: 'ABC1234' }), expect.anything());
    expect(result.asset_id).toBe(501);
  });

  it('FLUXO DE EXCECAO: rejeita placa duplicada com ConflictError', async () => {
    const vehicleRepo = makeVehicleRepository({ findVehicleByPlate: jest.fn(async () => ({ asset_id: 5, plate: 'ABC1234' })) });
    const assetService = makeAssetService();

    await expect(
      new CreateVehicleUseCase(vehicleRepo, assetService).execute({ plate: 'abc1234', brand: 'Fiat', model: 'Fiorino', fuel_type: 'flex' }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(assetService.create).not.toHaveBeenCalled();
  });

  it('FLUXO DE EXCECAO: rejeita payload sem campos obrigatórios', async () => {
    const vehicleRepo = makeVehicleRepository();
    const assetService = makeAssetService();

    await expect(new CreateVehicleUseCase(vehicleRepo, assetService).execute({ plate: 'ABC1234' })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('ListVehiclesUseCase', () => {
  it('lista veículos paginados repassando filtros', async () => {
    const repo = makeVehicleRepository({
      listVehicles: jest.fn(async () => ({ rows: [{ asset_id: 1, plate: 'ABC1234' }], count: 1 })),
    });

    const result = await new ListVehiclesUseCase(repo).execute({ status: 'active', page: 1, limit: 20, offset: 0 });

    expect(repo.listVehicles).toHaveBeenCalledWith(
      { status: 'active', fuel_type: undefined, document_expiring: undefined, preventive_due: undefined },
      { limit: 20, offset: 0 },
    );
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
    await expect(new UpdateVehicleUseCase(repo).execute({ id: 999, color: 'branco' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('FLUXO DE EXCECAO: rejeita troca de placa que colide com outro veículo', async () => {
    const repo = makeVehicleRepository({
      findVehicleByAssetId: jest.fn(async () => ({ asset_id: 1, plate: 'ABC1234', current_km: 0 })),
      findVehicleByPlate: jest.fn(async () => ({ asset_id: 2, plate: 'XYZ9999' })),
    });

    await expect(new UpdateVehicleUseCase(repo).execute({ id: 1, plate: 'xyz9999' })).rejects.toBeInstanceOf(ConflictError);
  });

  it('RNF-FAC-01: rejeita current_km diferente do atual (só gravável por retorno/abastecimento)', async () => {
    const repo = makeVehicleRepository({
      findVehicleByAssetId: jest.fn(async () => ({ asset_id: 1, plate: 'ABC1234', current_km: 1000 })),
    });

    await expect(new UpdateVehicleUseCase(repo).execute({ id: 1, current_km: 5000 })).rejects.toBeInstanceOf(ValidationError);
  });

  it('aceita current_km igual ao atual (no-op, não é considerado alteração)', async () => {
    const repo = makeVehicleRepository({
      findVehicleByAssetId: jest.fn(async () => ({ asset_id: 1, plate: 'ABC1234', current_km: 1000 })),
    });

    await new UpdateVehicleUseCase(repo).execute({ id: 1, current_km: 1000, color: 'preto' });
    expect(repo.updateVehicleDetail).toHaveBeenCalledWith(1, { color: 'preto' });
  });
});
