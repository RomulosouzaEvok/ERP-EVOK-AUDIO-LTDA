/**
 * Contrato do repositorio de persistencia MRP.
 *
 * @module modules/mrp/domain/repositories/MrpRepository
 */

class MrpRepository {
  /**
   * Lista arestas ativas da estrutura de produto vigente (G1: a MESMA que a
   * producao consome e custeia — `bill_of_materials`, projetada em UUID).
   */
  public async listActiveEdges(): Promise<any[]> {
    throw new Error('MrpRepository.listActiveEdges nao implementado.');
  }

  /**
   * Lista lacunas de catalogo: arestas de BOM ativa invisiveis ao MRP porque
   * o produto nao tem item canonico correspondente (`products.code` sem
   * `items.codigo`). Ver `services/bomStructureProjection`.
   */
  public async listStructureGaps(): Promise<any[]> {
    throw new Error('MrpRepository.listStructureGaps nao implementado.');
  }

  /** Persiste ordens planejadas. */
  public async upsertPlannedOrders(_orders: Record<string, unknown>[], _transaction?: any): Promise<any[]> {
    throw new Error('MrpRepository.upsertPlannedOrders nao implementado.');
  }

  /** Lista ordens planejadas. */
  public async listPlannedOrders(): Promise<any[]> {
    throw new Error('MrpRepository.listPlannedOrders nao implementado.');
  }

  /** Busca ordens planejadas por ids com lock pessimista (SELECT FOR UPDATE), dentro de uma transacao. */
  public async findPlannedOrdersByIdsForUpdate(_ids: string[], _transaction: any): Promise<any[]> {
    throw new Error('MrpRepository.findPlannedOrdersByIdsForUpdate nao implementado.');
  }

  /** Atualiza o status de um conjunto de ordens planejadas, dentro de uma transacao. */
  public async updatePlannedOrdersStatus(_ids: string[], _status: string, _transaction: any): Promise<void> {
    throw new Error('MrpRepository.updatePlannedOrdersStatus nao implementado.');
  }
}

export = MrpRepository;
