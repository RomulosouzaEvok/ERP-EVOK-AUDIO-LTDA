/**
 * Testes: casos de uso de Multa (módulo Facilities, BLOCO 4 FAC) — foco em
 * prazo de indicação de condutor (RF-FAC-028 a 035).
 *
 * @group unit
 */

const { CreateFineUseCase, IndicateFineDriverUseCase, PayFineUseCase } = require('../../src/modules/facilities/application/use-cases/fine/FineUseCases');
const { BusinessRuleError, NotFoundError, ValidationError } = require('../../src/errors');

function makeFineRepository(overrides: Partial<any> = {}) {
  return {
    create: jest.fn(async (data: any) => ({ id: 1, ...data, toJSON: () => ({ id: 1, ...data }) })),
    findById: jest.fn(async () => ({ id: 1, asset_id: 10, indication_status: 'pending', indication_deadline: null, amount: '195.23', infraction_code: '7455-0' })),
    update: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    ...overrides,
  };
}

function makeVehicleRepository(overrides: Partial<any> = {}) {
  return { findVehicleByAssetId: jest.fn(async () => ({ asset_id: 10, plate: 'ABC1234' })), ...overrides };
}

function makeTripRepository(overrides: Partial<any> = {}) {
  return { list: jest.fn(async () => ({ rows: [], count: 0 })), ...overrides };
}

describe('CreateFineUseCase', () => {
  it('RF-FAC-029: calcula indication_deadline = notice_received_at + 30 dias (default)', async () => {
    const fineRepo = makeFineRepository();
    const vehicleRepo = makeVehicleRepository();
    const tripRepo = makeTripRepository();

    await new CreateFineUseCase(fineRepo, vehicleRepo, tripRepo).execute({
      asset_id: 10, infraction_at: '2026-07-15T14:32:00Z', infraction_code: '7455-0', amount: 195.23, notice_received_at: '2026-08-01',
    });

    expect(fineRepo.create).toHaveBeenCalledWith(expect.objectContaining({ indication_deadline: '2026-08-31' }));
  });

  it('FLUXO DE EXCECAO: rejeita payload sem campos obrigatórios', async () => {
    const fineRepo = makeFineRepository();
    const vehicleRepo = makeVehicleRepository();
    const tripRepo = makeTripRepository();

    await expect(new CreateFineUseCase(fineRepo, vehicleRepo, tripRepo).execute({ asset_id: 10 })).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO DE EXCECAO: lança NotFoundError quando o veículo não existe', async () => {
    const fineRepo = makeFineRepository();
    const vehicleRepo = makeVehicleRepository({ findVehicleByAssetId: jest.fn(async () => null) });
    const tripRepo = makeTripRepository();

    await expect(
      new CreateFineUseCase(fineRepo, vehicleRepo, tripRepo).execute({ asset_id: 999, infraction_at: '2026-07-15', infraction_code: 'X', amount: 100 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('IndicateFineDriverUseCase (RF-FAC-031/032)', () => {
  it('E1: rejeita indicação quando prazo já expirou (expired_nic)', async () => {
    const fineRepo = makeFineRepository({
      findById: jest.fn(async () => ({ id: 1, indication_status: 'pending', indication_deadline: '2020-01-01' })),
    });

    await expect(
      new IndicateFineDriverUseCase(fineRepo).execute({ id: 1, identified_driver_id: 12, indicated_at: '2026-08-20', indicatedBy: 9 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    // Verifica que a transição automática expired_nic foi persistida.
    expect(fineRepo.update).toHaveBeenCalledWith(1, { indication_status: 'expired_nic' });
  });

  it('FLUXO PRINCIPAL: confirma indicação dentro do prazo', async () => {
    const fineRepo = makeFineRepository({
      findById: jest.fn(async () => ({ id: 1, indication_status: 'pending', indication_deadline: '2099-01-01' })),
    });

    const result = await new IndicateFineDriverUseCase(fineRepo).execute({ id: 1, identified_driver_id: 12, indicated_at: '2026-08-20', indicatedBy: 9 });

    expect(fineRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({ indication_status: 'indicated', identified_driver_id: 12 }));
    expect(result.indication_status).toBe('indicated');
  });
});

describe('PayFineUseCase (RF-FAC-034/058)', () => {
  it('FLUXO PRINCIPAL: gera título via AccountPayableService, nunca Sequelize direto', async () => {
    const fineRepo = makeFineRepository();
    const accountPayableService = { create: jest.fn(async () => ({ id: 777 })) };

    const result = await new PayFineUseCase(fineRepo, accountPayableService).execute({ id: 1, payment_date: '2026-08-25' });

    expect(accountPayableService.create).toHaveBeenCalledWith(expect.objectContaining({ category: 'Frota' }));
    expect(fineRepo.update).toHaveBeenCalledWith(1, { status: 'paid', accounts_payable_id: 777 });
    expect(result.accounts_payable_id).toBe(777);
  });
});
