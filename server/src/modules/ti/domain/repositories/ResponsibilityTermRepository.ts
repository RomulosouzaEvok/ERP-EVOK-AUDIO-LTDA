/**
 * Contrato do repositório de ItResponsibilityTerm (UC-50).
 *
 * @module modules/ti/domain/repositories/ResponsibilityTermRepository
 */

class ResponsibilityTermRepository {
  public async findAndCount(_filters: Record<string, unknown>, _pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    throw new Error('ResponsibilityTermRepository.findAndCount não implementado.');
  }
  public async findById(_id: number | string): Promise<any | null> {
    throw new Error('ResponsibilityTermRepository.findById não implementado.');
  }
  public async findActiveByAsset(_assetId: number | string): Promise<any | null> {
    throw new Error('ResponsibilityTermRepository.findActiveByAsset não implementado.');
  }
  public async findActiveByEmployee(_employeeId: number | string): Promise<any[]> {
    throw new Error('ResponsibilityTermRepository.findActiveByEmployee não implementado.');
  }
  public async listByEmployee(_employeeId: number | string): Promise<any[]> {
    throw new Error('ResponsibilityTermRepository.listByEmployee não implementado.');
  }
  public async countAll(): Promise<number> {
    throw new Error('ResponsibilityTermRepository.countAll não implementado.');
  }
  public async create(_data: Record<string, unknown>, _transaction?: unknown): Promise<any> {
    throw new Error('ResponsibilityTermRepository.create não implementado.');
  }
  public async update(_id: number | string, _data: Record<string, unknown>, _transaction?: unknown): Promise<any | null> {
    throw new Error('ResponsibilityTermRepository.update não implementado.');
  }
}

export = ResponsibilityTermRepository;
