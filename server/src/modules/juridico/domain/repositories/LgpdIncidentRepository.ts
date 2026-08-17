/**
 * Contrato do repositório de `JurLgpdIncident` (RF-JUR-040, LGPD art. 48).
 *
 * @module modules/juridico/domain/repositories/LgpdIncidentRepository
 */

class LgpdIncidentRepository {
  public async findAndCount(_filters: Record<string, unknown>, _pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    throw new Error('LgpdIncidentRepository.findAndCount não implementado.');
  }
  public async listPendingCritical(): Promise<any[]> {
    throw new Error('LgpdIncidentRepository.listPendingCritical não implementado.');
  }
  public async findById(_id: number | string): Promise<any | null> {
    throw new Error('LgpdIncidentRepository.findById não implementado.');
  }
  public async create(_data: Record<string, unknown>): Promise<any> {
    throw new Error('LgpdIncidentRepository.create não implementado.');
  }
  public async update(_id: number | string, _data: Record<string, unknown>): Promise<any | null> {
    throw new Error('LgpdIncidentRepository.update não implementado.');
  }
}

export = LgpdIncidentRepository;
