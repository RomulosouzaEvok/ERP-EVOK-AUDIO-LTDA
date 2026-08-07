/**
 * Contrato do repositório de `JurLgpdDataSubjectRequest` (Solicitação de
 * Titular — RF-JUR-037 a 039, LGPD art. 18).
 *
 * @module modules/juridico/domain/repositories/LgpdRequestRepository
 */

class LgpdRequestRepository {
  public async findAndCount(_filters: Record<string, unknown>, _pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    throw new Error('LgpdRequestRepository.findAndCount não implementado.');
  }
  public async findById(_id: number | string): Promise<any | null> {
    throw new Error('LgpdRequestRepository.findById não implementado.');
  }
  public async create(_data: Record<string, unknown>): Promise<any> {
    throw new Error('LgpdRequestRepository.create não implementado.');
  }
  public async update(_id: number | string, _data: Record<string, unknown>): Promise<any | null> {
    throw new Error('LgpdRequestRepository.update não implementado.');
  }
  public async listPendingCritical(): Promise<any[]> {
    throw new Error('LgpdRequestRepository.listPendingCritical não implementado.');
  }
}

export = LgpdRequestRepository;
