/**
 * Testes de Paradas de Máquina/Centro de Trabalho (downtime) — pendência
 * "campo de downtime/paradas para OEE preciso" (docs/governance/TODO.md).
 *
 * Cobre `OpenProductionDowntimeUseCase`, `FinishProductionDowntimeUseCase` e
 * `ListProductionDowntimesUseCase`: abertura/encerramento de parada, bloqueio
 * de 2ª parada aberta simultânea no mesmo centro, validação de
 * `finished_at > started_at`, e filtros de listagem.
 *
 * @group unit
 */

const mockTransaction = { commit: jest.fn(), rollback: jest.fn(), LOCK: { UPDATE: 'UPDATE' } };

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async () => mockTransaction),
  },
}));

const mockWorkCenter = { findByPk: jest.fn() };
const mockProductionOrder = { findByPk: jest.fn() };

jest.mock('../../src/models/index', () => ({
  WorkCenter: mockWorkCenter,
  ProductionOrder: mockProductionOrder,
}));

import OpenProductionDowntimeUseCase = require('../../src/modules/production/application/use-cases/OpenProductionDowntimeUseCase');
import FinishProductionDowntimeUseCase = require('../../src/modules/production/application/use-cases/FinishProductionDowntimeUseCase');
import ListProductionDowntimesUseCase = require('../../src/modules/production/application/use-cases/ListProductionDowntimesUseCase');
const { ValidationError, NotFoundError, BusinessRuleError } = require('../../src/errors');

function buildDowntimeRepository(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    findOpenByWorkCenter: jest.fn(async () => null),
    findById: jest.fn(async (id: number) => ({ id, reason: 'setup', finished_at: null })),
    findByIdForUpdate: jest.fn(async () => null),
    create: jest.fn(async (data: any) => ({ id: 100, ...data })),
    update: jest.fn(async () => 1),
    list: jest.fn(async () => ({ rows: [], count: 0 })),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockWorkCenter.findByPk.mockResolvedValue({ id: 1, code: 'MONT' });
  mockProductionOrder.findByPk.mockResolvedValue({ id: 5, order_number: 'OP-2026-0001' });
});

describe('OpenProductionDowntimeUseCase', () => {
  it('abre uma parada geral do centro (sem OP vinculada)', async () => {
    const repository = buildDowntimeRepository();
    const useCase = new OpenProductionDowntimeUseCase(repository);

    const result = await useCase.execute({ work_center_id: 1, reason: 'setup', created_by: 9 });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ work_center_id: 1, production_order_id: null, reason: 'setup', created_by: 9, finished_at: null }),
      mockTransaction,
    );
    expect(mockTransaction.commit).toHaveBeenCalled();
    expect(result.id).toBe(100);
  });

  it('abre uma parada vinculada a uma OP existente', async () => {
    const repository = buildDowntimeRepository();
    const useCase = new OpenProductionDowntimeUseCase(repository);

    await useCase.execute({ work_center_id: 1, production_order_id: 5, reason: 'falta_material', created_by: 9 });

    expect(mockProductionOrder.findByPk).toHaveBeenCalledWith(5, { transaction: mockTransaction });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ production_order_id: 5, reason: 'falta_material' }),
      mockTransaction,
    );
  });

  it('rejeita work_center_id inválido com ValidationError, sem abrir transação de negócio', async () => {
    const repository = buildDowntimeRepository();
    const useCase = new OpenProductionDowntimeUseCase(repository);

    await expect(useCase.execute({ work_center_id: 0, reason: 'setup', created_by: 9 })).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute({ work_center_id: -1, reason: 'setup', created_by: 9 })).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita reason inválido com ValidationError', async () => {
    const repository = buildDowntimeRepository();
    const useCase = new OpenProductionDowntimeUseCase(repository);

    await expect(useCase.execute({ work_center_id: 1, reason: 'motivo_inexistente', created_by: 9 })).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita quando o centro de trabalho não existe (NotFoundError) e faz rollback', async () => {
    mockWorkCenter.findByPk.mockResolvedValue(null);
    const repository = buildDowntimeRepository();
    const useCase = new OpenProductionDowntimeUseCase(repository);

    await expect(useCase.execute({ work_center_id: 999, reason: 'setup', created_by: 9 })).rejects.toBeInstanceOf(NotFoundError);
    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejeita quando a OP informada não existe (NotFoundError)', async () => {
    mockProductionOrder.findByPk.mockResolvedValue(null);
    const repository = buildDowntimeRepository();
    const useCase = new OpenProductionDowntimeUseCase(repository);

    await expect(useCase.execute({ work_center_id: 1, production_order_id: 999, reason: 'setup', created_by: 9 })).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('bloqueia 2ª parada aberta simultânea no mesmo centro (BusinessRuleError 422)', async () => {
    const repository = buildDowntimeRepository({
      findOpenByWorkCenter: jest.fn(async () => ({ id: 42, started_at: new Date('2026-08-05T08:00:00Z') })),
    });
    const useCase = new OpenProductionDowntimeUseCase(repository);

    const error = await useCase.execute({ work_center_id: 1, reason: 'setup', created_by: 9 }).catch((e: any) => e);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.statusCode).toBe(422);
    expect(repository.create).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).toHaveBeenCalled();
  });
});

describe('FinishProductionDowntimeUseCase', () => {
  it('encerra uma parada em aberto', async () => {
    const repository = buildDowntimeRepository({
      findByIdForUpdate: jest.fn(async () => ({ id: 1, started_at: new Date('2026-08-05T08:00:00Z'), finished_at: null })),
    });
    const useCase = new FinishProductionDowntimeUseCase(repository);

    await useCase.execute({ id: 1, finished_at: '2026-08-05T10:00:00Z' });

    expect(repository.update).toHaveBeenCalledWith(1, { finished_at: new Date('2026-08-05T10:00:00Z') }, mockTransaction);
    expect(mockTransaction.commit).toHaveBeenCalled();
  });

  it('usa a hora atual quando finished_at não é informado', async () => {
    const repository = buildDowntimeRepository({
      findByIdForUpdate: jest.fn(async () => ({ id: 1, started_at: new Date(Date.now() - 60_000), finished_at: null })),
    });
    const useCase = new FinishProductionDowntimeUseCase(repository);

    await useCase.execute({ id: 1 });

    expect(repository.update).toHaveBeenCalled();
  });

  it('rejeita parada inexistente com NotFoundError', async () => {
    const repository = buildDowntimeRepository({ findByIdForUpdate: jest.fn(async () => null) });
    const useCase = new FinishProductionDowntimeUseCase(repository);

    await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita parada já encerrada com BusinessRuleError', async () => {
    const repository = buildDowntimeRepository({
      findByIdForUpdate: jest.fn(async () => ({ id: 1, started_at: new Date('2026-08-05T08:00:00Z'), finished_at: new Date('2026-08-05T09:00:00Z') })),
    });
    const useCase = new FinishProductionDowntimeUseCase(repository);

    const error = await useCase.execute({ id: 1 }).catch((e: any) => e);
    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejeita finished_at <= started_at com BusinessRuleError', async () => {
    const repository = buildDowntimeRepository({
      findByIdForUpdate: jest.fn(async () => ({ id: 1, started_at: new Date('2026-08-05T08:00:00Z'), finished_at: null })),
    });
    const useCase = new FinishProductionDowntimeUseCase(repository);

    const error = await useCase.execute({ id: 1, finished_at: '2026-08-05T07:00:00Z' }).catch((e: any) => e);
    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejeita finished_at não parseável com ValidationError', async () => {
    const repository = buildDowntimeRepository({
      findByIdForUpdate: jest.fn(async () => ({ id: 1, started_at: new Date('2026-08-05T08:00:00Z'), finished_at: null })),
    });
    const useCase = new FinishProductionDowntimeUseCase(repository);

    const error = await useCase.execute({ id: 1, finished_at: 'data-invalida' }).catch((e: any) => e);
    expect(error).toBeInstanceOf(ValidationError);
  });
});

describe('ListProductionDowntimesUseCase', () => {
  it('lista com filtros repassados ao repositório (work_center_id, from, to, open)', async () => {
    const repository = buildDowntimeRepository({
      list: jest.fn(async () => ({ rows: [{ id: 1 }], count: 1 })),
    });
    const useCase = new ListProductionDowntimesUseCase(repository);

    const result = await useCase.execute({ work_center_id: '1', from: '2026-08-01', to: '2026-08-05', open: 'true', page: '2', limit: '10' });

    expect(repository.list).toHaveBeenCalledWith({
      work_center_id: 1,
      from: '2026-08-01',
      to: '2026-08-05',
      open: true,
      limit: 10,
      offset: 10,
    });
    expect(result.count).toBe(1);
    expect(result.page).toBe(2);
  });

  it('rejeita work_center_id inválido com ValidationError', async () => {
    const repository = buildDowntimeRepository();
    const useCase = new ListProductionDowntimesUseCase(repository);

    await expect(useCase.execute({ work_center_id: 'abc' })).rejects.toBeInstanceOf(ValidationError);
    expect(repository.list).not.toHaveBeenCalled();
  });

  it('usa página/limite padrão quando não informados', async () => {
    const repository = buildDowntimeRepository();
    const useCase = new ListProductionDowntimesUseCase(repository);

    await useCase.execute({});

    expect(repository.list).toHaveBeenCalledWith(expect.objectContaining({ limit: 50, offset: 0 }));
  });
});
