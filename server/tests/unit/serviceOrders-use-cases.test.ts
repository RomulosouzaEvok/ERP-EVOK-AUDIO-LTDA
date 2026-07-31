import CreateServiceOrderUseCase = require('../../src/modules/serviceOrders/application/use-cases/CreateServiceOrderUseCase');
import GetServiceOrderByIdUseCase = require('../../src/modules/serviceOrders/application/use-cases/GetServiceOrderByIdUseCase');
import UpdateServiceOrderUseCase = require('../../src/modules/serviceOrders/application/use-cases/UpdateServiceOrderUseCase');
import { ValidationError, NotFoundError } from '../../src/errors';

describe('Use cases de ordens de serviço', () => {
  it('rejeita criação de ordem de serviço sem cliente', async () => {
    const serviceOrdersRepository = {
      create: jest.fn(),
    };

    const useCase = new CreateServiceOrderUseCase(serviceOrdersRepository as any);

    await expect(useCase.execute({ equipment_desc: 'Caixa de som' })).rejects.toBeInstanceOf(ValidationError);
    expect(serviceOrdersRepository.create).not.toHaveBeenCalled();
  });

  it('gera order_number e aplica priority default na criação', async () => {
    const serviceOrdersRepository = {
      create: jest.fn(async (data: any) => ({ id: 1, ...data })),
    };

    const useCase = new CreateServiceOrderUseCase(serviceOrdersRepository as any);

    await useCase.execute({ client_id: 3 });

    expect(serviceOrdersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 3, priority: 'normal', status: 'open' })
    );
    const createdData = serviceOrdersRepository.create.mock.calls[0][0];
    expect(createdData.order_number).toMatch(/^OS-\d+$/);
  });

  it('lança NotFoundError ao buscar ordem de serviço inexistente', async () => {
    const serviceOrdersRepository = {
      findById: jest.fn(async () => null),
    };

    const useCase = new GetServiceOrderByIdUseCase(serviceOrdersRepository as any);

    await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lança NotFoundError ao atualizar ordem de serviço inexistente', async () => {
    const serviceOrdersRepository = {
      update: jest.fn(async () => 0),
      findById: jest.fn(),
    };

    const useCase = new UpdateServiceOrderUseCase(serviceOrdersRepository as any);

    await expect(useCase.execute({ id: 999, body: { status: 'completed' } })).rejects.toBeInstanceOf(NotFoundError);
  });
});
