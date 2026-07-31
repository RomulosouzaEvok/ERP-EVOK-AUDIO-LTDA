/**
 * Use case: buscar categoria por id.
 *
 * @module modules/categories/application/use-cases/GetCategoryByIdUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import CategoriesRepository from '../../domain/repositories/CategoriesRepository';

class GetCategoryByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly categoriesRepository: CategoriesRepository;

  /** @param categoriesRepository - Repositorio de categorias. */
  public constructor(categoriesRepository: CategoriesRepository) {
    super();
    this.categoriesRepository = categoriesRepository;
  }

  /**
   * @param input - Id da categoria.
   * @returns Categoria encontrada.
   * @throws {NotFoundError} Se a categoria não existir.
   */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const category = await this.categoriesRepository.findById(id as number);
    if (!category) {
      throw new NotFoundError('Categoria não encontrada');
    }
    return category;
  }
}

export = GetCategoryByIdUseCase;
