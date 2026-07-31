/**
 * Use case: criar categoria.
 *
 * @module modules/categories/application/use-cases/CreateCategoryUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError, ConflictError } from '../../../../errors';
import CategoriesRepository from '../../domain/repositories/CategoriesRepository';

class CreateCategoryUseCase extends UseCase<{ name?: string; description?: string }, any> {
  private readonly categoriesRepository: CategoriesRepository;

  /** @param categoriesRepository - Repositorio de categorias. */
  public constructor(categoriesRepository: CategoriesRepository) {
    super();
    this.categoriesRepository = categoriesRepository;
  }

  /**
   * @param input - Dados da categoria a criar.
   * @returns Categoria criada.
   * @throws {ValidationError} Se `name` estiver ausente.
   * @throws {ConflictError} Se a categoria já existir (unique constraint).
   */
  public async execute({ name, description }: { name?: string; description?: string }): Promise<any> {
    if (!name) {
      throw new ValidationError('Nome é obrigatório');
    }
    try {
      return await this.categoriesRepository.create({ name, description, active: true });
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('Categoria já existe');
      }
      throw error;
    }
  }
}

export = CreateCategoryUseCase;
