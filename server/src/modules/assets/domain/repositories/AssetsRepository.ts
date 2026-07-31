/**
 * Contrato do repositorio de Ativos (patrimônio).
 *
 * @module modules/assets/domain/repositories/AssetsRepository
 */

class AssetsRepository {
  /**
   * @param filters - Filtros de busca (status, department_id).
   * @param pagination - Paginacao (limit, offset).
   * @returns Linhas encontradas e contagem total.
   * @throws {Error} Se nao implementado.
   */
  public async findAndCountAll(
    filters: Record<string, unknown>, // eslint-disable-line @typescript-eslint/no-unused-vars
    pagination: { limit: number; offset: number } // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<{ count: number; rows: any[] }> {
    throw new Error('AssetsRepository.findAndCountAll não implementado.');
  }

  /** @param id - Id do ativo. @returns Ativo ou null. @throws {Error} Se nao implementado. */
  public async findById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AssetsRepository.findById não implementado.');
  }

  /** @param data - Dados do ativo. @returns Ativo criado. @throws {Error} Se nao implementado. */
  public async create(data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AssetsRepository.create não implementado.');
  }

  /** @param id - Id do ativo. @param data - Campos a atualizar. @returns Linhas afetadas. @throws {Error} Se nao implementado. */
  public async update(id: number | string, data: Record<string, unknown>): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AssetsRepository.update não implementado.');
  }
}

export = AssetsRepository;
