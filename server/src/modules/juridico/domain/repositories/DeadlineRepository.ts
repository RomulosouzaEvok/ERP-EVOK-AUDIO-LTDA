/**
 * Contrato do repositório de `JurLegalCaseDeadline` — fluxo mais crítico do
 * módulo (UC-54).
 *
 * @module modules/juridico/domain/repositories/DeadlineRepository
 */

class DeadlineRepository {
  public async findAndCount(_filters: Record<string, unknown>, _pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    throw new Error('DeadlineRepository.findAndCount não implementado.');
  }
  public async findById(_id: number | string): Promise<any | null> {
    throw new Error('DeadlineRepository.findById não implementado.');
  }
  public async create(_data: Record<string, unknown>): Promise<any> {
    throw new Error('DeadlineRepository.create não implementado.');
  }
  public async update(_id: number | string, _data: Record<string, unknown>): Promise<any | null> {
    throw new Error('DeadlineRepository.update não implementado.');
  }
  public async listCritical(): Promise<any[]> {
    throw new Error('DeadlineRepository.listCritical não implementado.');
  }
}

export = DeadlineRepository;
