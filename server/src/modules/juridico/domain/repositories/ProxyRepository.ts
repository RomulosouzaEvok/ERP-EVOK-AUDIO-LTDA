/**
 * Contrato do repositório de `JurProxy` (Procuração — UC-55).
 *
 * @module modules/juridico/domain/repositories/ProxyRepository
 */

class ProxyRepository {
  public async findAndCount(_filters: Record<string, unknown>, _pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    throw new Error('ProxyRepository.findAndCount não implementado.');
  }
  public async findById(_id: number | string): Promise<any | null> {
    throw new Error('ProxyRepository.findById não implementado.');
  }
  public async create(_data: Record<string, unknown>): Promise<any> {
    throw new Error('ProxyRepository.create não implementado.');
  }
  public async update(_id: number | string, _data: Record<string, unknown>): Promise<any | null> {
    throw new Error('ProxyRepository.update não implementado.');
  }
}

export = ProxyRepository;
