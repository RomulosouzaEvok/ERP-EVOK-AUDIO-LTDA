import CreateMaintenanceOrderUseCase = require('../../src/modules/maintenance/application/use-cases/CreateMaintenanceOrderUseCase');
import GetMaintenanceOrderByIdUseCase = require('../../src/modules/maintenance/application/use-cases/GetMaintenanceOrderByIdUseCase');
import UpdateMaintenanceOrderUseCase = require('../../src/modules/maintenance/application/use-cases/UpdateMaintenanceOrderUseCase');
import { ValidationError, NotFoundError } from '../../src/errors';

describe('Use cases de ordens de manutenção', () => {
  it('rejeita criação de ordem sem asset_id ou description', async () => {
    const maintenanceRepository = {
      create: jest.fn(),
    };

    const useCase = new CreateMaintenanceOrderUseCase(maintenanceRepository as any);

    await expect(useCase.execute({ reportedBy: 1 })).rejects.toBeInstanceOf(ValidationError);
    expect(maintenanceRepository.create).not.toHaveBeenCalled();
  });

  it('aplica valores default de priority e maintenance_type na criação', async () => {
    const maintenanceRepository = {
      create: jest.fn(async (data: any) => ({ id: 1, ...data })),
    };

    const useCase = new CreateMaintenanceOrderUseCase(maintenanceRepository as any);

    await useCase.execute({ asset_id: 5, description: 'Correia rompida', reportedBy: 10 });

    expect(maintenanceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'medium', maintenance_type: 'corrective', reported_by: 10, status: 'open' })
    );
  });

  it('lança NotFoundError ao buscar ordem de manutenção inexistente', async () => {
    const maintenanceRepository = {
      findById: jest.fn(async () => null),
    };

    const useCase = new GetMaintenanceOrderByIdUseCase(maintenanceRepository as any);

    await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lança NotFoundError ao atualizar ordem de manutenção inexistente', async () => {
    const maintenanceRepository = {
      update: jest.fn(async () => 0),
      findById: jest.fn(),
    };

    const useCase = new UpdateMaintenanceOrderUseCase(maintenanceRepository as any);

    await expect(useCase.execute({ id: 999, body: { status: 'completed' } })).rejects.toBeInstanceOf(NotFoundError);
  });
});
