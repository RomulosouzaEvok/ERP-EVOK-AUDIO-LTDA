import CreateEmployeeUseCase = require('../../src/modules/employees/application/use-cases/CreateEmployeeUseCase');
import GetEmployeeByIdUseCase = require('../../src/modules/employees/application/use-cases/GetEmployeeByIdUseCase');
import UpdateEmployeeUseCase = require('../../src/modules/employees/application/use-cases/UpdateEmployeeUseCase');
import { ValidationError, NotFoundError, ConflictError } from '../../src/errors';

describe('Use cases de funcionários', () => {
  it('rejeita criação de funcionário sem nome ou CPF', async () => {
    const employeesRepository = {
      create: jest.fn(),
    };

    const useCase = new CreateEmployeeUseCase(employeesRepository as any);

    await expect(useCase.execute({ name: 'João' })).rejects.toBeInstanceOf(ValidationError);
    expect(employeesRepository.create).not.toHaveBeenCalled();
  });

  it('rejeita criação de funcionário com CPF inválido', async () => {
    const employeesRepository = {
      create: jest.fn(),
    };

    const useCase = new CreateEmployeeUseCase(employeesRepository as any);

    await expect(useCase.execute({ name: 'João', cpf: '111.111.111-11' })).rejects.toBeInstanceOf(ValidationError);
    expect(employeesRepository.create).not.toHaveBeenCalled();
  });

  it('converte violação de unicidade em ConflictError ao criar funcionário com CPF duplicado', async () => {
    const uniqueError: any = new Error('duplicate');
    uniqueError.name = 'SequelizeUniqueConstraintError';
    const employeesRepository = {
      create: jest.fn(async () => { throw uniqueError; }),
    };

    const useCase = new CreateEmployeeUseCase(employeesRepository as any);

    await expect(useCase.execute({ name: 'João', cpf: '529.982.247-25' })).rejects.toBeInstanceOf(ConflictError);
  });

  it('lança NotFoundError ao buscar funcionário inexistente', async () => {
    const employeesRepository = {
      findById: jest.fn(async () => null),
    };

    const useCase = new GetEmployeeByIdUseCase(employeesRepository as any);

    await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lança NotFoundError ao atualizar funcionário inexistente', async () => {
    const employeesRepository = {
      update: jest.fn(async () => 0),
      findById: jest.fn(),
    };

    const useCase = new UpdateEmployeeUseCase(employeesRepository as any);

    await expect(useCase.execute({ id: 999, body: { name: 'Novo' } })).rejects.toBeInstanceOf(NotFoundError);
    expect(employeesRepository.findById).not.toHaveBeenCalled();
  });
});
