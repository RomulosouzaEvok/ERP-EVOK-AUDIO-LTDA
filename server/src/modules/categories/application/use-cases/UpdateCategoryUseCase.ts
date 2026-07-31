/**
 * Use case: atualizar categoria.
 *
 * @module modules/categories/application/use-cases/UpdateCategoryUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, ConflictError } from '../../../../errors';
import CategoriesRepository from '../../domain/repositories/CategoriesRepository';

type UpdateCategoryInput = {
  id: number | string;
  body: { name?: string; description?: string; active?: boolean };
};

class UpdateCategoryUseCase extends UseCase<UpdateCategoryInput, any> {
  private readonly categoriesRepository: CategoriesRepository;

  /** @param categoriesRepository - Repositorio de categorias. */
  public constructor(categoriesRepository: CategoriesRepository) {
    super();
    this.categoriesRepository = categoriesRepository;
  }

  /**
   * @param input - Id da categoria e campos a atualizar.
   * @returns Categoria atualizada.
   * @throws {NotFoundError} Se a categoria não existir.
   * @throws {ConflictError} Se o novo nome já existir (unique constraint).
   */
  public async execute({ id, body }: UpdateCategoryInput): Promise<any> {
    const { name, description, active } = body;
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (active !== undefined) updateData.active = active;

    try {
      const updated = await this.categoriesRepository.update(id as number, updateData);
      if (!updated) {
        throw new NotFoundError('Categoria não encontrada');
      }
      return this.categoriesRepository.findById(id as number);
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('Categoria já existe');
      }
      throw error;
    }
  }
}

export = UpdateCategoryUseCase;
