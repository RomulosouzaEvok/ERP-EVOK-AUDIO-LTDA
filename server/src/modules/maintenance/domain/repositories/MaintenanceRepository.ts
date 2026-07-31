/**
 * Contrato do repositorio de Ordens de Manutenção.
 *
 * @module modules/maintenance/domain/repositories/MaintenanceRepository
 */

class MaintenanceRepository {
  /**
   * @param filters - Filtros de busca (status, asset_id).
   * @param pagination - Paginacao (limit, offset).
   * @returns Linhas encontradas e contagem total.
   * @throws {Error} Se nao implementado.
   */
  public async findAndCountAll(
    filters: Record<string, unknown>, // eslint-disable-line @typescript-eslint/no-unused-vars
    pagination: { limit: number; offset: number } // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<{ count: number; rows: any[] }> {
    throw new Error('MaintenanceRepository.findAndCountAll não implementado.');
  }

  /** @param id - Id da ordem de manutenção. @returns Ordem ou null. @throws {Error} Se nao implementado. */
  public async findById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('MaintenanceRepository.findById não implementado.');
  }

  /** @param data - Dados da ordem de manutenção. @returns Ordem criada. @throws {Error} Se nao implementado. */
  public async create(data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('MaintenanceRepository.create não implementado.');
  }

  /** @param id - Id da ordem de manutenção. @param data - Campos a atualizar. @returns Linhas afetadas. @throws {Error} Se nao implementado. */
  public async update(id: number | string, data: Record<string, unknown>): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('MaintenanceRepository.update não implementado.');
  }
}

export = MaintenanceRepository;
