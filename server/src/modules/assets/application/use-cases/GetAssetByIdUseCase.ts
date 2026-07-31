/**
 * Use case: buscar ativo por id.
 *
 * @module modules/assets/application/use-cases/GetAssetByIdUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import AssetsRepository from '../../domain/repositories/AssetsRepository';

class GetAssetByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly assetsRepository: AssetsRepository;

  /** @param assetsRepository - Repositorio de ativos. */
  public constructor(assetsRepository: AssetsRepository) {
    super();
    this.assetsRepository = assetsRepository;
  }

  /**
   * @param input - Id do ativo.
   * @returns Ativo encontrado.
   * @throws {NotFoundError} Se o ativo não existir.
   */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const asset = await this.assetsRepository.findById(id);
    if (!asset) {
      throw new NotFoundError('Ativo não encontrado');
    }
    return asset;
  }
}

export = GetAssetByIdUseCase;
