import CreateCategoryUseCase = require('../../src/modules/categories/application/use-cases/CreateCategoryUseCase');
import GetCategoryByIdUseCase = require('../../src/modules/categories/application/use-cases/GetCategoryByIdUseCase');
import UpdateCategoryUseCase = require('../../src/modules/categories/application/use-cases/UpdateCategoryUseCase');
import { ValidationError, NotFoundError, ConflictError } from '../../src/errors';

describe('Use cases de categorias', () => {
  it('rejeita criação de categoria sem nome', async () => {
    const categoriesRepository = {
      create: jest.fn(),
    };

    const useCase = new CreateCategoryUseCase(categoriesRepository as any);

    await expect(useCase.execute({ description: 'sem nome' })).rejects.toBeInstanceOf(ValidationError);
    expect(categoriesRepository.create).not.toHaveBeenCalled();
  });

  it('converte violação de unicidade em ConflictError ao criar categoria duplicada', async () => {
    const uniqueError: any = new Error('duplicate');
    uniqueError.name = 'SequelizeUniqueConstraintError';
    const categoriesRepository = {
      create: jest.fn(async () => { throw uniqueError; }),
    };

    const useCase = new CreateCategoryUseCase(categoriesRepository as any);

    await expect(useCase.execute({ name: 'Cabos' })).rejects.toBeInstanceOf(ConflictError);
  });

  it('lança NotFoundError ao buscar categoria inexistente', async () => {
    const categoriesRepository = {
      findById: jest.fn(async () => null),
    };

    const useCase = new GetCategoryByIdUseCase(categoriesRepository as any);

    await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lança NotFoundError ao atualizar categoria inexistente', async () => {
    const categoriesRepository = {
      update: jest.fn(async () => 0),
      findById: jest.fn(),
    };

    const useCase = new UpdateCategoryUseCase(categoriesRepository as any);

    await expect(useCase.execute({ id: 999, body: { name: 'Nova' } })).rejects.toBeInstanceOf(NotFoundError);
    expect(categoriesRepository.findById).not.toHaveBeenCalled();
  });
});
