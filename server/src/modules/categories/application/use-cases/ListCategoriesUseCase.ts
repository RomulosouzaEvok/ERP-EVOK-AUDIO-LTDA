/**
 * Use case: listar categorias ativas.
 *
 * @module modules/categories/application/use-cases/ListCategoriesUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import CategoriesRepository from '../../domain/repositories/CategoriesRepository';

class ListCategoriesUseCase extends UseCase<void, any[]> {
  private readonly categoriesRepository: CategoriesRepository;

  /** @param categoriesRepository - Repositorio de categorias. */
  public constructor(categoriesRepository: CategoriesRepository) {
    super();
    this.categoriesRepository = categoriesRepository;
  }

  /** @returns Categorias ativas ordenadas por nome. */
  public async execute(): Promise<any[]> {
    return this.categoriesRepository.listActive();
  }
}

export = ListCategoriesUseCase;
