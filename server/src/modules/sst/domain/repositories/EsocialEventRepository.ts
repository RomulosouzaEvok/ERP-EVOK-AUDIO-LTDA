/**
 * Contrato do repositório da fila de eventos eSocial SST (S-2210/S-2220/S-2240).
 *
 * @module modules/sst/domain/repositories/EsocialEventRepository
 */

class EsocialEventRepository {
  public async findAndCount(filters: Record<string, unknown>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EsocialEventRepository.findAndCount não implementado.');
  }
  public async findById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EsocialEventRepository.findById não implementado.');
  }
  public async findActiveByOrigin(origemTipo: string, origemId: number, transaction?: unknown): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EsocialEventRepository.findActiveByOrigin não implementado.');
  }
  public async create(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EsocialEventRepository.create não implementado.');
  }
}

export = EsocialEventRepository;
