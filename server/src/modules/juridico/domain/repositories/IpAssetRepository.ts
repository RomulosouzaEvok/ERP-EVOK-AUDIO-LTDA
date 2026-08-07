/**
 * Contrato do repositório de `JurIntellectualProperty`/`JurIpContractLink`
 * (Propriedade Intelectual — RF-JUR-031 a 034).
 *
 * @module modules/juridico/domain/repositories/IpAssetRepository
 */

class IpAssetRepository {
  public async findAndCount(_filters: Record<string, unknown>, _pagination: { limit: number; offset: number }, _excludeTradeSecret: boolean): Promise<{ count: number; rows: any[] }> {
    throw new Error('IpAssetRepository.findAndCount não implementado.');
  }
  public async findById(_id: number | string): Promise<any | null> {
    throw new Error('IpAssetRepository.findById não implementado.');
  }
  public async create(_data: Record<string, unknown>): Promise<any> {
    throw new Error('IpAssetRepository.create não implementado.');
  }
  public async update(_id: number | string, _data: Record<string, unknown>): Promise<any | null> {
    throw new Error('IpAssetRepository.update não implementado.');
  }
  public async linkContract(_data: Record<string, unknown>): Promise<any> {
    throw new Error('IpAssetRepository.linkContract não implementado.');
  }
  public async listContractLinks(_ipId: number | string): Promise<any[]> {
    throw new Error('IpAssetRepository.listContractLinks não implementado.');
  }
}

export = IpAssetRepository;
