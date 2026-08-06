import CreateAssetUseCase = require('../../src/modules/assets/application/use-cases/CreateAssetUseCase');
import GetAssetByIdUseCase = require('../../src/modules/assets/application/use-cases/GetAssetByIdUseCase');
import UpdateAssetUseCase = require('../../src/modules/assets/application/use-cases/UpdateAssetUseCase');
import DeactivateAssetUseCase = require('../../src/modules/assets/application/use-cases/DeactivateAssetUseCase');
import Asset = require('../../src/models/Asset');
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

  describe('DeactivateAssetUseCase (regressão: bug de 500 em DELETE /api/assets/:id)', () => {
    it('grava status="decommissioned" — um valor valido do ENUM enum_assets_status do model Asset', async () => {
      // Guard-rail: se algum dia o ENUM do model mudar e 'decommissioned' for
      // removido sem atualizar o use case, este teste falha primeiro.
      const validStatusValues = (Asset.rawAttributes.status as any).values;
      expect(validStatusValues).toContain('decommissioned');
      // Reproduz o bug real corrigido pela auditoria de 2026-08-06: 'inactive'
      // NUNCA existiu no enum e derrubava DELETE /api/assets/:id com 500.
      expect(validStatusValues).not.toContain('inactive');

      const assetsRepository = {
        update: jest.fn(async () => 1),
      };

      const useCase = new DeactivateAssetUseCase(assetsRepository as any);

      const result = await useCase.execute({ id: 42 });

      expect(assetsRepository.update).toHaveBeenCalledWith(42, { status: 'decommissioned' });
      const [, updatePayload] = assetsRepository.update.mock.calls[0];
      expect(validStatusValues).toContain(updatePayload.status);
      expect(result).toEqual({ message: 'Ativo inativado' });
    });

    it('lança NotFoundError ao inativar ativo inexistente', async () => {
      const assetsRepository = {
        update: jest.fn(async () => 0),
      };

      const useCase = new DeactivateAssetUseCase(assetsRepository as any);

      await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
