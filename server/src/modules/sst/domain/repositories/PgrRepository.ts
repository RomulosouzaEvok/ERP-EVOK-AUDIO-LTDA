/**
 * Contrato do repositório do cluster PGR/GRO + GES (NR-1).
 *
 * @module modules/sst/domain/repositories/PgrRepository
 */

class PgrRepository {
  public async findRisksAndCount(filters: Record<string, unknown>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('PgrRepository.findRisksAndCount não implementado.');
  }
  public async findRiskById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('PgrRepository.findRiskById não implementado.');
  }
  public async createRisk(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('PgrRepository.createRisk não implementado.');
  }
  public async updateRisk(id: number | string, data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('PgrRepository.updateRisk não implementado.');
  }

  public async findGesAndCount(filters: Record<string, unknown>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('PgrRepository.findGesAndCount não implementado.');
  }
  public async findGesById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('PgrRepository.findGesById não implementado.');
  }
  public async createGes(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('PgrRepository.createGes não implementado.');
  }
  public async createGesMember(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('PgrRepository.createGesMember não implementado.');
  }
}

export = PgrRepository;
