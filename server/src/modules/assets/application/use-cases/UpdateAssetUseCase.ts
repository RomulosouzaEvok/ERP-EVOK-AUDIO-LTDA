/**
 * Use case: atualizar um ativo existente.
 *
 * @module modules/assets/application/use-cases/UpdateAssetUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, ConflictError } from '../../../../errors';
import AssetsRepository from '../../domain/repositories/AssetsRepository';

const ALLOWED_FIELDS = [
  'name',
  'description',
  'department_id',
  'responsible_id',
  'location',
  'asset_type',
  'brand',
  'model',
  'serial_number',
  'purchase_date',
  'purchase_value',
  'current_value',
  'useful_life_months',
  'status',
  'notes'
];

interface UpdateAssetInput {
  id: number | string;
  body: Record<string, unknown>;
}

class UpdateAssetUseCase extends UseCase<UpdateAssetInput, any> {
  private readonly assetsRepository: AssetsRepository;

  /** @param assetsRepository - Repositorio de ativos. */
  public constructor(assetsRepository: AssetsRepository) {
    super();
    this.assetsRepository = assetsRepository;
  }

  /**
   * @param input - Id do ativo e campos a atualizar (apenas os permitidos).
   * @returns Ativo atualizado.
   * @throws {NotFoundError} Se o ativo não existir.
   * @throws {ConflictError} Se `tag` já existir (unicidade).
   */
  public async execute({ id, body }: UpdateAssetInput): Promise<any> {
    const updateData: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    try {
      const updated = await this.assetsRepository.update(id, updateData);
      if (!updated) {
        throw new NotFoundError('Ativo não encontrado');
      }
      return this.assetsRepository.findById(id);
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('Tag já existe');
      }
      throw error;
    }
  }
}

export = UpdateAssetUseCase;
