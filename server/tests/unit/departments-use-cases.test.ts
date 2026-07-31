import CreateDepartmentUseCase = require('../../src/modules/departments/application/use-cases/CreateDepartmentUseCase');
import GetDepartmentByIdUseCase = require('../../src/modules/departments/application/use-cases/GetDepartmentByIdUseCase');
import UpdateDepartmentUseCase = require('../../src/modules/departments/application/use-cases/UpdateDepartmentUseCase');
import { ValidationError, NotFoundError, ConflictError } from '../../src/errors';

describe('Use cases de departamentos', () => {
  it('rejeita criação de departamento sem código ou nome', async () => {
    const departmentsRepository = {
      create: jest.fn(),
    };

    const useCase = new CreateDepartmentUseCase(departmentsRepository as any);

    await expect(useCase.execute({ name: 'Produção' })).rejects.toBeInstanceOf(ValidationError);
    expect(departmentsRepository.create).not.toHaveBeenCalled();
  });

  it('converte violação de unicidade em ConflictError ao criar departamento duplicado', async () => {
    const uniqueError: any = new Error('duplicate');
    uniqueError.name = 'SequelizeUniqueConstraintError';
    const departmentsRepository = {
      create: jest.fn(async () => { throw uniqueError; }),
    };

    const useCase = new CreateDepartmentUseCase(departmentsRepository as any);

    await expect(useCase.execute({ code: 'PRD', name: 'Produção' })).rejects.toBeInstanceOf(ConflictError);
  });

  it('lança NotFoundError ao buscar departamento inexistente', async () => {
    const departmentsRepository = {
      findById: jest.fn(async () => null),
    };

    const useCase = new GetDepartmentByIdUseCase(departmentsRepository as any);

    await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lança NotFoundError ao atualizar departamento inexistente', async () => {
    const departmentsRepository = {
      update: jest.fn(async () => 0),
      findById: jest.fn(),
    };

    const useCase = new UpdateDepartmentUseCase(departmentsRepository as any);

    await expect(useCase.execute({ id: 999, body: { name: 'Novo' } })).rejects.toBeInstanceOf(NotFoundError);
    expect(departmentsRepository.findById).not.toHaveBeenCalled();
  });
});
