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

  /**
   * Busca a ordem de manutenção travando a linha (`SELECT ... FOR UPDATE`)
   * dentro de uma transação — usado sempre que a atualização da ordem tem
   * efeito colateral no `Asset.status` vinculado (leitura-antes-de-escrita).
   *
   * @param id - Id da ordem de manutenção.
   * @param transaction - Transação Sequelize ativa.
   * @returns Ordem ou null.
   * @throws {Error} Se nao implementado.
   */
  public async findByIdForUpdate(id: number | string, transaction: unknown): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('MaintenanceRepository.findByIdForUpdate não implementado.');
  }

  /** @param data - Dados da ordem de manutenção. @returns Ordem criada. @throws {Error} Se nao implementado. */
  public async create(data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('MaintenanceRepository.create não implementado.');
  }

  /**
   * @param id - Id da ordem de manutenção.
   * @param data - Campos a atualizar.
   * @param transaction - Transação Sequelize ativa (opcional).
   * @returns Linhas afetadas.
   * @throws {Error} Se nao implementado.
   */
  public async update(id: number | string, data: Record<string, unknown>, transaction?: unknown): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('MaintenanceRepository.update não implementado.');
  }

  /**
   * Marca o ativo vinculado (`Asset.status`) como `in_maintenance`.
   * Gatilho: transição da ordem de manutenção para `in_progress` (início
   * efetivo do serviço — ver `UpdateMaintenanceOrderUseCase`).
   *
   * @param assetId - Id do ativo (`assets.id`).
   * @param transaction - Transação Sequelize ativa.
   * @returns void
   * @throws {Error} Se nao implementado.
   */
  public async markAssetInMaintenance(assetId: number, transaction: unknown): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('MaintenanceRepository.markAssetInMaintenance não implementado.');
  }

  /**
   * Reverte o ativo vinculado (`Asset.status`) para `active` ao concluir ou
   * cancelar uma ordem de manutenção — mas apenas quando:
   *  1. o status atual do ativo for `in_maintenance` (nunca sobrescreve
   *     `decommissioned`/`lost`/`returned_to_supplier` — uma OM concluída
   *     não pode "ressuscitar" um ativo baixado); e
   *  2. não existir nenhuma outra ordem de manutenção **aberta**
   *     (`open`/`scheduled`/`in_progress`/`waiting_parts`) para o mesmo
   *     ativo, excluindo a ordem informada em `excludeOrderId`.
   *
   * @param assetId - Id do ativo (`assets.id`).
   * @param excludeOrderId - Id da ordem de manutenção que está sendo
   *   concluída/cancelada (excluída da contagem de "outras OMs abertas").
   * @param transaction - Transação Sequelize ativa.
   * @returns void
   * @throws {Error} Se nao implementado.
   */
  public async releaseAssetFromMaintenanceIfNoOtherOpenOrders( // eslint-disable-line @typescript-eslint/no-unused-vars
    assetId: number, // eslint-disable-line @typescript-eslint/no-unused-vars
    excludeOrderId: number | string, // eslint-disable-line @typescript-eslint/no-unused-vars
    transaction: unknown // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<void> {
    throw new Error('MaintenanceRepository.releaseAssetFromMaintenanceIfNoOtherOpenOrders não implementado.');
  }
}

export = MaintenanceRepository;
