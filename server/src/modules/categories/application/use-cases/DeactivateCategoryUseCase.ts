/**
 * Use case: inativar (soft delete) categoria.
 *
 * @module modules/categories/application/use-cases/DeactivateCategoryUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import CategoriesRepository from '../../domain/repositories/CategoriesRepository';

class DeactivateCategoryUseCase extends UseCase<{ id: number | string }, { message: string }> {
  private readonly categoriesRepository: CategoriesRepository;

  /** @param categoriesRepository - Repositorio de categorias. */
  public constructor(categoriesRepository: CategoriesRepository) {
    super();
    this.categoriesRepository = categoriesRepository;
  }

  /**
   * @param input - Id da categoria.
   * @returns Mensagem de confirmação.
   * @throws {NotFoundError} Se a categoria não existir.
   */
  public async execute({ id }: { id: number | string }): Promise<{ message: string }> {
    const updated = await this.categoriesRepository.update(id as number, { active: false });
    if (!updated) {
      throw new NotFoundError('Categoria não encontrada');
    }
    return { message: 'Categoria inativada com sucesso' };
  }
}

export = DeactivateCategoryUseCase;
