/**
 * Contrato do repositorio de Categorias.
 *
 * @module modules/categories/domain/repositories/CategoriesRepository
 */

class CategoriesRepository {
  /** @returns Categorias ativas ordenadas por nome. @throws {Error} Se nao implementado. */
  public async listActive(): Promise<any[]> {
    throw new Error('CategoriesRepository.listActive não implementado.');
  }

  /** @param id - Id da categoria. @returns Categoria ou null. @throws {Error} Se nao implementado. */
  public async findById(id: number): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CategoriesRepository.findById não implementado.');
  }

  /** @param data - Dados da categoria. @returns Categoria criada. @throws {Error} Se nao implementado. */
  public async create(data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CategoriesRepository.create não implementado.');
  }

  /** @param id - Id da categoria. @param data - Campos a atualizar. @returns Linhas afetadas. @throws {Error} Se nao implementado. */
  public async update(id: number, data: Record<string, unknown>): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CategoriesRepository.update não implementado.');
  }
}

export = CategoriesRepository;
