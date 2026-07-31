/**
 * Contrato do repositorio de Ordens de Serviço.
 *
 * @module modules/serviceOrders/domain/repositories/ServiceOrdersRepository
 */

class ServiceOrdersRepository {
  /**
   * @param filters - Filtros de busca (status, client_id).
   * @param pagination - Paginacao (limit, offset).
   * @returns Linhas encontradas e contagem total.
   * @throws {Error} Se nao implementado.
   */
  public async findAndCountAll(
    filters: Record<string, unknown>, // eslint-disable-line @typescript-eslint/no-unused-vars
    pagination: { limit: number; offset: number } // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<{ count: number; rows: any[] }> {
    throw new Error('ServiceOrdersRepository.findAndCountAll não implementado.');
  }

  /** @param id - Id da ordem de serviço. @returns Ordem ou null. @throws {Error} Se nao implementado. */
  public async findById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('ServiceOrdersRepository.findById não implementado.');
  }

  /** @param data - Dados da ordem de serviço. @returns Ordem criada. @throws {Error} Se nao implementado. */
  public async create(data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('ServiceOrdersRepository.create não implementado.');
  }

  /** @param id - Id da ordem de serviço. @param data - Campos a atualizar. @returns Linhas afetadas. @throws {Error} Se nao implementado. */
  public async update(id: number | string, data: Record<string, unknown>): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('ServiceOrdersRepository.update não implementado.');
  }
}

export = ServiceOrdersRepository;
