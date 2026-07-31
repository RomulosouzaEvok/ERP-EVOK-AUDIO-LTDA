/**
 * Use case: inativar (soft delete) um ativo.
 *
 * @module modules/assets/application/use-cases/DeactivateAssetUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import AssetsRepository from '../../domain/repositories/AssetsRepository';

class DeactivateAssetUseCase extends UseCase<{ id: number | string }, { message: string }> {
  private readonly assetsRepository: AssetsRepository;

  /** @param assetsRepository - Repositorio de ativos. */
  public constructor(assetsRepository: AssetsRepository) {
    super();
    this.assetsRepository = assetsRepository;
  }

  /**
   * @param input - Id do ativo.
   * @returns Mensagem de confirmação.
   * @throws {NotFoundError} Se o ativo não existir.
   */
  public async execute({ id }: { id: number | string }): Promise<{ message: string }> {
    const updated = await this.assetsRepository.update(id, { status: 'inactive' });
    if (!updated) {
      throw new NotFoundError('Ativo não encontrado');
    }
    return { message: 'Ativo inativado' };
  }
}

export = DeactivateAssetUseCase;
