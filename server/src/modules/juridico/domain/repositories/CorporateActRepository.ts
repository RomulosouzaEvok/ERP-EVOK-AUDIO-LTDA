/**
 * Contrato do repositório de `JurCorporateAct` (Ato Societário — RF-JUR-030).
 *
 * @module modules/juridico/domain/repositories/CorporateActRepository
 */

class CorporateActRepository {
  public async findAndCount(_filters: Record<string, unknown>, _pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    throw new Error('CorporateActRepository.findAndCount não implementado.');
  }
  public async findById(_id: number | string): Promise<any | null> {
    throw new Error('CorporateActRepository.findById não implementado.');
  }
  public async create(_data: Record<string, unknown>): Promise<any> {
    throw new Error('CorporateActRepository.create não implementado.');
  }
  public async update(_id: number | string, _data: Record<string, unknown>): Promise<any | null> {
    throw new Error('CorporateActRepository.update não implementado.');
  }
}

export = CorporateActRepository;
