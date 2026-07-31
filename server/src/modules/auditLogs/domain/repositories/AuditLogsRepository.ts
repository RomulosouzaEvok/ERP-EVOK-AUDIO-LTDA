/**
 * Contrato do repositorio de Logs de Auditoria.
 *
 * @module modules/auditLogs/domain/repositories/AuditLogsRepository
 */

class AuditLogsRepository {
  /**
   * @param filters - Filtros de busca (entity_type, entity_id, action, start_date, end_date).
   * @param pagination - Paginacao (limit, offset).
   * @returns Linhas encontradas e contagem total.
   * @throws {Error} Se nao implementado.
   */
  public async findAndCountAll(
    filters: Record<string, unknown>, // eslint-disable-line @typescript-eslint/no-unused-vars
    pagination: { limit: number; offset: number } // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<{ count: number; rows: any[] }> {
    throw new Error('AuditLogsRepository.findAndCountAll não implementado.');
  }

  /** @param id - Id do log de auditoria. @returns Log encontrado ou null. @throws {Error} Se nao implementado. */
  public async findById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AuditLogsRepository.findById não implementado.');
  }
}

export = AuditLogsRepository;
