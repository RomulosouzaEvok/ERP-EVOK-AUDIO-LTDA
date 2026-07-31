import CreateAssetUseCase = require('../../src/modules/assets/application/use-cases/CreateAssetUseCase');
import GetAssetByIdUseCase = require('../../src/modules/assets/application/use-cases/GetAssetByIdUseCase');
import UpdateAssetUseCase = require('../../src/modules/assets/application/use-cases/UpdateAssetUseCase');
import { ValidationError, NotFoundError, ConflictError } from '../../src/errors';

describe('Use cases de ativos (assets)', () => {
  it('rejeita criação de ativo sem tag ou nome', async () => {
    const assetsRepository = {
      create: jest.fn(),
    };

    const useCase = new CreateAssetUseCase(assetsRepository as any);

    await expect(useCase.execute({ name: 'Empilhadeira' })).rejects.toBeInstanceOf(ValidationError);
    expect(assetsRepository.create).not.toHaveBeenCalled();
  });

  it('converte violação de unicidade em ConflictError ao criar ativo com tag duplicada', async () => {
    const uniqueError: any = new Error('duplicate');
    uniqueError.name = 'SequelizeUniqueConstraintError';
    const assetsRepository = {
      create: jest.fn(async () => { throw uniqueError; }),
    };

    const useCase = new CreateAssetUseCase(assetsRepository as any);

    await expect(useCase.execute({ tag: 'AT-001', name: 'Empilhadeira' })).rejects.toBeInstanceOf(ConflictError);
  });

  it('lança NotFoundError ao buscar ativo inexistente', async () => {
    const assetsRepository = {
      findById: jest.fn(async () => null),
    };

    const useCase = new GetAssetByIdUseCase(assetsRepository as any);

    await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lança NotFoundError ao atualizar ativo inexistente', async () => {
    const assetsRepository = {
      update: jest.fn(async () => 0),
      findById: jest.fn(),
    };

    const useCase = new UpdateAssetUseCase(assetsRepository as any);

    await expect(useCase.execute({ id: 999, body: { name: 'Novo' } })).rejects.toBeInstanceOf(NotFoundError);
    expect(assetsRepository.findById).not.toHaveBeenCalled();
  });
});
