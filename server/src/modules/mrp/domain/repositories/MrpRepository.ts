/**
 * Contrato do repositorio de persistencia MRP.
 *
 * @module modules/mrp/domain/repositories/MrpRepository
 */

class MrpRepository {
  /** Lista arestas ativas da estrutura canonica. */
  public async listActiveEdges(): Promise<any[]> {
    throw new Error('MrpRepository.listActiveEdges nao implementado.');
  }

  /** Persiste ordens planejadas. */
  public async upsertPlannedOrders(_orders: Record<string, unknown>[], _transaction?: any): Promise<any[]> {
    throw new Error('MrpRepository.upsertPlannedOrders nao implementado.');
  }

  /** Lista ordens planejadas. */
  public async listPlannedOrders(): Promise<any[]> {
    throw new Error('MrpRepository.listPlannedOrders nao implementado.');
  }
}

export = MrpRepository;
