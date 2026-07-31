/**
 * Contrato do repositorio de Não Conformidades.
 *
 * @module modules/nonConformities/domain/repositories/NonConformitiesRepository
 */

class NonConformitiesRepository {
  /**
   * @param filters - Filtros de busca (status, severity).
   * @param pagination - Paginacao (limit, offset).
   * @returns Linhas encontradas e contagem total.
   * @throws {Error} Se nao implementado.
   */
  public async findAndCountAll(
    filters: Record<string, unknown>, // eslint-disable-line @typescript-eslint/no-unused-vars
    pagination: { limit: number; offset: number } // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<{ count: number; rows: any[] }> {
    throw new Error('NonConformitiesRepository.findAndCountAll não implementado.');
  }

  /** @param id - Id da não conformidade. @returns Registro ou null. @throws {Error} Se nao implementado. */
  public async findById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('NonConformitiesRepository.findById não implementado.');
  }

  /** @param data - Dados da não conformidade. @returns Registro criado. @throws {Error} Se nao implementado. */
  public async create(data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('NonConformitiesRepository.create não implementado.');
  }

  /** @param id - Id da não conformidade. @param data - Campos a atualizar. @returns Linhas afetadas. @throws {Error} Se nao implementado. */
  public async update(id: number | string, data: Record<string, unknown>): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('NonConformitiesRepository.update não implementado.');
  }
}

export = NonConformitiesRepository;
