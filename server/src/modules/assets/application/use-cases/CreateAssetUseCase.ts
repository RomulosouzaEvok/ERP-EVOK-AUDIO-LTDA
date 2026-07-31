/**
 * Use case: criar um novo ativo (patrimônio).
 *
 * @module modules/assets/application/use-cases/CreateAssetUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError, ConflictError } from '../../../../errors';
import AssetsRepository from '../../domain/repositories/AssetsRepository';

interface CreateAssetInput {
  tag?: string;
  name?: string;
  description?: string;
  department_id?: number;
  responsible_id?: number;
  location?: string;
  asset_type?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_value?: number;
  useful_life_months?: number;
  notes?: string;
}

class CreateAssetUseCase extends UseCase<CreateAssetInput, any> {
  private readonly assetsRepository: AssetsRepository;

  /** @param assetsRepository - Repositorio de ativos. */
  public constructor(assetsRepository: AssetsRepository) {
    super();
    this.assetsRepository = assetsRepository;
  }

  /**
   * @param input - Dados do ativo (tag e name obrigatórios).
   * @returns Ativo criado.
   * @throws {ValidationError} Se `tag` ou `name` estiverem ausentes.
   * @throws {ConflictError} Se `tag` já existir (unicidade).
   */
  public async execute(input: CreateAssetInput): Promise<any> {
    const {
      tag,
      name,
      description,
      department_id,
      responsible_id,
      location,
      asset_type,
      brand,
      model,
      serial_number,
      purchase_date,
      purchase_value,
      useful_life_months,
      notes
    } = input;

    if (!tag || !name) {
      throw new ValidationError('Tag e nome são obrigatórios');
    }

    try {
      return await this.assetsRepository.create({
        tag,
        name,
        description,
        department_id,
        responsible_id,
        location,
        asset_type,
        brand,
        model,
        serial_number,
        purchase_date,
        purchase_value,
        useful_life_months,
        current_value: purchase_value,
        status: 'active',
        notes
      });
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('Tag já existe');
      }
      throw error;
    }
  }
}

export = CreateAssetUseCase;
