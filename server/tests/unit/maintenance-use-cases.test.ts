/**
 * Testes de use cases do módulo `maintenance`, incluindo a sincronização de
 * `Asset.status` com o ciclo de vida da ordem de manutenção (OM):
 *  - Transição da OM para `in_progress` → `Asset.status = 'in_maintenance'`.
 *  - Conclusão/cancelamento da OM → `Asset.status = 'active'`, mas só se
 *    (a) não houver outra OM aberta para o mesmo ativo, e
 *    (b) o ativo não tiver sido baixado (`decommissioned`/etc.) durante a
 *        manutenção.
 *
 * @group unit
 */

const mockTransaction = { commit: jest.fn(), rollback: jest.fn(), LOCK: { UPDATE: 'UPDATE' } };

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn(async () => mockTransaction),
  },
}));

import CreateMaintenanceOrderUseCase = require('../../src/modules/maintenance/application/use-cases/CreateMaintenanceOrderUseCase');
import GetMaintenanceOrderByIdUseCase = require('../../src/modules/maintenance/application/use-cases/GetMaintenanceOrderByIdUseCase');
import UpdateMaintenanceOrderUseCase = require('../../src/modules/maintenance/application/use-cases/UpdateMaintenanceOrderUseCase');
import CancelMaintenanceOrderUseCase = require('../../src/modules/maintenance/application/use-cases/CancelMaintenanceOrderUseCase');
import { ValidationError, NotFoundError } from '../../src/errors';

function buildMaintenanceRepository(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    create: jest.fn(async (data: any) => ({ id: 1, ...data })),
    findById: jest.fn(async (id: number) => ({ id, status: 'in_progress', asset_id: 5 })),
    findByIdForUpdate: jest.fn(async (id: number) => ({ id, status: 'in_progress', asset_id: 5 })),
    update: jest.fn(async () => 1),
    markAssetInMaintenance: jest.fn(async () => undefined),
    releaseAssetFromMaintenanceIfNoOtherOpenOrders: jest.fn(async () => undefined),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Use cases de ordens de manutenção', () => {
  it('rejeita criação de ordem sem asset_id ou description', async () => {
    const maintenanceRepository = buildMaintenanceRepository();
    const useCase = new CreateMaintenanceOrderUseCase(maintenanceRepository as any);

    await expect(useCase.execute({ reportedBy: 1 })).rejects.toBeInstanceOf(ValidationError);
    expect(maintenanceRepository.create).not.toHaveBeenCalled();
  });

  it('aplica valores default de priority e maintenance_type na criação', async () => {
    const maintenanceRepository = buildMaintenanceRepository();
    const useCase = new CreateMaintenanceOrderUseCase(maintenanceRepository as any);

    await useCase.execute({ asset_id: 5, description: 'Correia rompida', reportedBy: 10 });

    expect(maintenanceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'medium', maintenance_type: 'corrective', reported_by: 10, status: 'open' })
    );
  });

  it('lança NotFoundError ao buscar ordem de manutenção inexistente', async () => {
    const maintenanceRepository = buildMaintenanceRepository({ findById: jest.fn(async () => null) });
    const useCase = new GetMaintenanceOrderByIdUseCase(maintenanceRepository as any);

    await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });

  describe('UpdateMaintenanceOrderUseCase — sincronização de Asset.status', () => {
    it('lança NotFoundError ao atualizar ordem de manutenção inexistente', async () => {
      const maintenanceRepository = buildMaintenanceRepository({ findByIdForUpdate: jest.fn(async () => null) });
      const useCase = new UpdateMaintenanceOrderUseCase(maintenanceRepository as any);

      await expect(useCase.execute({ id: 999, body: { status: 'completed' } })).rejects.toBeInstanceOf(NotFoundError);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('abre/inicia OM (status → in_progress): marca o ativo como in_maintenance', async () => {
      const maintenanceRepository = buildMaintenanceRepository({
        findByIdForUpdate: jest.fn(async () => ({ id: 7, status: 'open', asset_id: 42 })),
      });
      const useCase = new UpdateMaintenanceOrderUseCase(maintenanceRepository as any);

      await useCase.execute({ id: 7, body: { status: 'in_progress' } });

      expect(maintenanceRepository.markAssetInMaintenance).toHaveBeenCalledWith(42, mockTransaction);
      expect(maintenanceRepository.releaseAssetFromMaintenanceIfNoOtherOpenOrders).not.toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('conclui OM (status → completed): tenta liberar o ativo para active', async () => {
      const maintenanceRepository = buildMaintenanceRepository({
        findByIdForUpdate: jest.fn(async () => ({ id: 7, status: 'in_progress', asset_id: 42 })),
      });
      const useCase = new UpdateMaintenanceOrderUseCase(maintenanceRepository as any);

      await useCase.execute({ id: 7, body: { status: 'completed' } });

      expect(maintenanceRepository.releaseAssetFromMaintenanceIfNoOtherOpenOrders).toHaveBeenCalledWith(42, 7, mockTransaction);
      expect(maintenanceRepository.markAssetInMaintenance).not.toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('atualização sem mudança de status não sincroniza Asset.status', async () => {
      const maintenanceRepository = buildMaintenanceRepository({
        findByIdForUpdate: jest.fn(async () => ({ id: 7, status: 'in_progress', asset_id: 42 })),
      });
      const useCase = new UpdateMaintenanceOrderUseCase(maintenanceRepository as any);

      await useCase.execute({ id: 7, body: { notes: 'Aguardando peça' } });

      expect(maintenanceRepository.markAssetInMaintenance).not.toHaveBeenCalled();
      expect(maintenanceRepository.releaseAssetFromMaintenanceIfNoOtherOpenOrders).not.toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('faz rollback e propaga erro se a sincronização do ativo falhar', async () => {
      const maintenanceRepository = buildMaintenanceRepository({
        findByIdForUpdate: jest.fn(async () => ({ id: 7, status: 'open', asset_id: 42 })),
        markAssetInMaintenance: jest.fn(async () => { throw new Error('falha de banco'); }),
      });
      const useCase = new UpdateMaintenanceOrderUseCase(maintenanceRepository as any);

      await expect(useCase.execute({ id: 7, body: { status: 'in_progress' } })).rejects.toThrow('falha de banco');
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });

  describe('CancelMaintenanceOrderUseCase — sincronização de Asset.status', () => {
    it('lança NotFoundError ao cancelar ordem de manutenção inexistente', async () => {
      const maintenanceRepository = buildMaintenanceRepository({ findByIdForUpdate: jest.fn(async () => null) });
      const useCase = new CancelMaintenanceOrderUseCase(maintenanceRepository as any);

      await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('cancela a OM e tenta liberar o ativo para active', async () => {
      const maintenanceRepository = buildMaintenanceRepository({
        findByIdForUpdate: jest.fn(async () => ({ id: 7, status: 'in_progress', asset_id: 42 })),
      });
      const useCase = new CancelMaintenanceOrderUseCase(maintenanceRepository as any);

      const result = await useCase.execute({ id: 7 });

      expect(maintenanceRepository.update).toHaveBeenCalledWith(7, { status: 'canceled' }, mockTransaction);
      expect(maintenanceRepository.releaseAssetFromMaintenanceIfNoOtherOpenOrders).toHaveBeenCalledWith(42, 7, mockTransaction);
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Ordem de manutenção cancelada' });
    });
  });

  describe('SequelizeMaintenanceRepository — regra de negócio de liberação do ativo', () => {
    // Estes três testes exercitam o comportamento real (não mockado) de
    // `releaseAssetFromMaintenanceIfNoOtherOpenOrders`, usando um mock leve
    // do model Sequelize para validar a query de contagem e o WHERE
    // condicional do UPDATE, sem precisar de Postgres.
    function loadRepositoryWithModelMocks(maintenanceOrderCountResult: number, assetUpdateSpy: jest.Mock) {
      jest.resetModules();
      const MaintenanceOrderMock = { count: jest.fn(async () => maintenanceOrderCountResult), findByPk: jest.fn(), update: jest.fn(), create: jest.fn() };
      const AssetMock = { update: assetUpdateSpy };
      const UserMock = {};
      jest.doMock('../../src/models/index', () => ({ MaintenanceOrder: MaintenanceOrderMock, Asset: AssetMock, User: UserMock }));
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const SequelizeMaintenanceRepository = require('../../src/modules/maintenance/infrastructure/sequelize/SequelizeMaintenanceRepository');
      return { repository: new SequelizeMaintenanceRepository(), MaintenanceOrderMock, AssetMock };
    }

    afterEach(() => {
      jest.dontMock('../../src/models/index');
      jest.resetModules();
    });

    it('conclui uma OM enquanto outra ainda está aberta: NÃO libera o ativo (nenhum UPDATE)', async () => {
      const assetUpdateSpy = jest.fn(async () => [0]);
      const { repository, MaintenanceOrderMock } = loadRepositoryWithModelMocks(1, assetUpdateSpy);

      await repository.releaseAssetFromMaintenanceIfNoOtherOpenOrders(42, 7, mockTransaction);

      expect(MaintenanceOrderMock.count).toHaveBeenCalled();
      expect(assetUpdateSpy).not.toHaveBeenCalled();
    });

    it('conclui a última OM aberta: libera o ativo (UPDATE condicional a status=in_maintenance)', async () => {
      const assetUpdateSpy = jest.fn(async () => [1]);
      const { repository } = loadRepositoryWithModelMocks(0, assetUpdateSpy);

      await repository.releaseAssetFromMaintenanceIfNoOtherOpenOrders(42, 7, mockTransaction);

      expect(assetUpdateSpy).toHaveBeenCalledWith(
        { status: 'active' },
        { where: { id: 42, status: 'in_maintenance' }, transaction: mockTransaction }
      );
    });

    it('ativo decommissioned durante a manutenção: o UPDATE condicional não o ressuscita (WHERE não casa)', async () => {
      // O WHERE {status: 'in_maintenance'} garante isso no Postgres real —
      // aqui validamos que o repositório sempre emite esse WHERE, não um
      // UPDATE incondicional.
      const assetUpdateSpy = jest.fn(async () => [0]); // 0 linhas afetadas: ativo não estava mais em in_maintenance
      const { repository } = loadRepositoryWithModelMocks(0, assetUpdateSpy);

      await repository.releaseAssetFromMaintenanceIfNoOtherOpenOrders(42, 7, mockTransaction);

      expect(assetUpdateSpy).toHaveBeenCalledWith(
        { status: 'active' },
        { where: { id: 42, status: 'in_maintenance' }, transaction: mockTransaction }
      );
    });
  });
});
