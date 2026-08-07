/**
 * Testes: casos de uso de Diário de Uso (módulo Facilities, BLOCO 4 FAC) —
 * foco em odômetro (RF-FAC-017/018) e elegibilidade de condutor/veículo
 * (E1-E4 do UC-58).
 *
 * @group unit
 */

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async (callback?: any) => {
      const transaction = { id: 'tx-trip-1', LOCK: { UPDATE: 'UPDATE' } };
      if (callback) return callback(transaction);
      return transaction;
    }),
  },
}));

const { DepartTripUseCase, ReturnTripUseCase, CancelTripUseCase } = require('../../src/modules/facilities/application/use-cases/trip/TripUseCases');
const { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError, ValidationError } = require('../../src/errors');

function makeTripRepository(overrides: Partial<any> = {}) {
  return {
    findById: jest.fn(async () => ({ id: 1, asset_id: 10, driver_id: 20, status: 'scheduled' })),
    findByIdForUpdate: jest.fn(async () => ({ id: 1, asset_id: 10, driver_id: 20, status: 'out', departure_km: 1000 })),
    update: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    findMaxReturnKm: jest.fn(async () => null),
    findOpenTrip: jest.fn(async () => null),
    ...overrides,
  };
}

function makeDriverRepository(overrides: Partial<any> = {}) {
  return {
    findById: jest.fn(async () => ({ id: 20, authorized: true, cnh_valid_until: '2099-01-01' })),
    ...overrides,
  };
}

function makeDocumentRepository(overrides: Partial<any> = {}) {
  return {
    findLatestByAssetAndType: jest.fn(async () => null),
    ...overrides,
  };
}

function makeAssetService(overrides: Partial<any> = {}) {
  return {
    findById: jest.fn(async () => ({ id: 10, status: 'active' })),
    ...overrides,
  };
}

function makeVehicleRepository(overrides: Partial<any> = {}) {
  return {
    updateVehicleDetail: jest.fn(async () => ({})),
    ...overrides,
  };
}

describe('DepartTripUseCase', () => {
  it('FLUXO PRINCIPAL: registra saída quando tudo está elegível', async () => {
    const tripRepo = makeTripRepository();
    const driverRepo = makeDriverRepository();
    const docRepo = makeDocumentRepository();
    const assetService = makeAssetService();

    const result = await new DepartTripUseCase(tripRepo, driverRepo, docRepo, assetService).execute({
      id: 1, departure_km: 1500, hasApproveLevel: false,
    });

    expect(tripRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'out', departure_km: 1500 }));
    expect(result.status).toBe('out');
  });

  it('E4: rejeita saída com veículo em manutenção', async () => {
    const tripRepo = makeTripRepository();
    const driverRepo = makeDriverRepository();
    const docRepo = makeDocumentRepository();
    const assetService = makeAssetService({ findById: jest.fn(async () => ({ id: 10, status: 'in_maintenance' })) });

    await expect(
      new DepartTripUseCase(tripRepo, driverRepo, docRepo, assetService).execute({ id: 1, hasApproveLevel: false }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('E2 (condutor): rejeita CNH vencida', async () => {
    const tripRepo = makeTripRepository();
    const driverRepo = makeDriverRepository({ findById: jest.fn(async () => ({ id: 20, authorized: true, cnh_valid_until: '2020-01-01' })) });
    const docRepo = makeDocumentRepository();
    const assetService = makeAssetService();

    await expect(
      new DepartTripUseCase(tripRepo, driverRepo, docRepo, assetService).execute({ id: 1, hasApproveLevel: false }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('E2 (condutor): rejeita condutor não autorizado', async () => {
    const tripRepo = makeTripRepository();
    const driverRepo = makeDriverRepository({ findById: jest.fn(async () => ({ id: 20, authorized: false, cnh_valid_until: '2099-01-01' })) });
    const docRepo = makeDocumentRepository();
    const assetService = makeAssetService();

    await expect(
      new DepartTripUseCase(tripRepo, driverRepo, docRepo, assetService).execute({ id: 1, hasApproveLevel: false }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('E1: rejeita CRLV vencido', async () => {
    const tripRepo = makeTripRepository();
    const driverRepo = makeDriverRepository();
    const docRepo = makeDocumentRepository({
      findLatestByAssetAndType: jest.fn(async (assetId: number, type: string) =>
        type === 'crlv_licenciamento' ? { valid_until: '2020-01-01' } : null,
      ),
    });
    const assetService = makeAssetService();

    await expect(
      new DepartTripUseCase(tripRepo, driverRepo, docRepo, assetService).execute({ id: 1, hasApproveLevel: false }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('E2 (seguro): rejeita saída com seguro vencido sem liberação (ForbiddenError)', async () => {
    const tripRepo = makeTripRepository();
    const driverRepo = makeDriverRepository();
    const docRepo = makeDocumentRepository({
      findLatestByAssetAndType: jest.fn(async (assetId: number, type: string) =>
        type === 'seguro' ? { valid_until: '2020-01-01', released_by: null } : null,
      ),
    });
    const assetService = makeAssetService();

    await expect(
      new DepartTripUseCase(tripRepo, driverRepo, docRepo, assetService).execute({ id: 1, hasApproveLevel: false }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('E3: rejeita saída quando já há uso em aberto para o veículo', async () => {
    const tripRepo = makeTripRepository({ findOpenTrip: jest.fn(async ({ asset_id }: any) => (asset_id ? { id: 99 } : null)) });
    const driverRepo = makeDriverRepository();
    const docRepo = makeDocumentRepository();
    const assetService = makeAssetService();

    await expect(
      new DepartTripUseCase(tripRepo, driverRepo, docRepo, assetService).execute({ id: 1, hasApproveLevel: false }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('A1/RF-FAC-017: rejeita departure_km retroativo sem justificativa+approve', async () => {
    const tripRepo = makeTripRepository({ findMaxReturnKm: jest.fn(async () => 2000) });
    const driverRepo = makeDriverRepository();
    const docRepo = makeDocumentRepository();
    const assetService = makeAssetService();

    await expect(
      new DepartTripUseCase(tripRepo, driverRepo, docRepo, assetService).execute({ id: 1, departure_km: 1000, hasApproveLevel: false }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('A1/RF-FAC-017: aceita departure_km retroativo com justificativa+approve', async () => {
    const tripRepo = makeTripRepository({ findMaxReturnKm: jest.fn(async () => 2000) });
    const driverRepo = makeDriverRepository();
    const docRepo = makeDocumentRepository();
    const assetService = makeAssetService();

    const result = await new DepartTripUseCase(tripRepo, driverRepo, docRepo, assetService).execute({
      id: 1, departure_km: 1000, hasApproveLevel: true, approvedBy: 5, divergence_justification: 'Veículo emprestado a outra filial',
    });

    expect(tripRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({ odometer_override_reason: expect.any(String) }));
    expect(result).toBeDefined();
  });
});

describe('ReturnTripUseCase', () => {
  it('RF-FAC-018: rejeita return_km menor que departure_km', async () => {
    const tripRepo = makeTripRepository();
    const vehicleRepo = makeVehicleRepository();

    await expect(new ReturnTripUseCase(tripRepo, vehicleRepo).execute({ id: 1, return_km: 500 })).rejects.toBeInstanceOf(BusinessRuleError);
    expect(vehicleRepo.updateVehicleDetail).not.toHaveBeenCalled();
  });

  it('FLUXO PRINCIPAL: registra retorno e atualiza current_km', async () => {
    const tripRepo = makeTripRepository();
    const vehicleRepo = makeVehicleRepository();

    await new ReturnTripUseCase(tripRepo, vehicleRepo).execute({ id: 1, return_km: 1500 });

    expect(vehicleRepo.updateVehicleDetail).toHaveBeenCalledWith(10, { current_km: 1500 }, expect.anything());
  });
});

describe('CancelTripUseCase', () => {
  it('FLUXO DE EXCECAO: exige cancel_reason', async () => {
    const tripRepo = makeTripRepository();
    await expect(new CancelTripUseCase(tripRepo).execute({ id: 1, cancel_reason: '' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO DE EXCECAO: lança NotFoundError quando o uso não existe', async () => {
    const tripRepo = makeTripRepository({ findById: jest.fn(async () => null) });
    await expect(new CancelTripUseCase(tripRepo).execute({ id: 999, cancel_reason: 'Erro de agendamento' })).rejects.toBeInstanceOf(NotFoundError);
  });
});
