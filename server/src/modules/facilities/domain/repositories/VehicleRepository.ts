/**
 * Contrato de repositório para o domínio de Veículos de Frota (BLOCO 4 FAC
 * — correção, D-2: veículo é extensão 1:1 de `Asset`,
 * `FacilityVehicleDetail`), módulo Facilities.
 *
 * @module modules/facilities/domain/repositories/VehicleRepository
 */

class VehicleRepository {
  /** Lista veículos (join Asset+FacilityVehicleDetail) paginados, com filtros. @abstract */
  async listVehicles(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('VehicleRepository.listVehicles não implementado.');
  }

  /** Busca um veículo (detalhe da extensão) por `asset_id`. @abstract */
  async findVehicleByAssetId(_assetId: number): Promise<any | null> {
    throw new Error('VehicleRepository.findVehicleByAssetId não implementado.');
  }

  /** Busca a extensão pela placa (única). @abstract */
  async findVehicleByPlate(_plate: string): Promise<any | null> {
    throw new Error('VehicleRepository.findVehicleByPlate não implementado.');
  }

  /** Cria a extensão `FacilityVehicleDetail` para um `asset_id` já criado. @abstract */
  async createVehicleDetail(_data: Record<string, any>, _transaction?: unknown): Promise<any> {
    throw new Error('VehicleRepository.createVehicleDetail não implementado.');
  }

  /** Atualiza a extensão de um veículo existente (nunca `current_km` diretamente — RNF-FAC-01). @abstract */
  async updateVehicleDetail(_assetId: number, _data: Record<string, any>, _transaction?: unknown): Promise<any | null> {
    throw new Error('VehicleRepository.updateVehicleDetail não implementado.');
  }
}

export = VehicleRepository;
