/**
 * Contrato de repositório para o domínio de Abastecimento
 * (`FacilityFuelRecord`), módulo Facilities. Desde o BLOCO 4 FAC
 * (correção, D-2), filtra/relaciona por `asset_id` (antes `vehicle_id`).
 *
 * @module modules/facilities/domain/repositories/FuelRecordRepository
 */

class FuelRecordRepository {
  /** Lista registros de abastecimento paginados, com filtros (`asset_id`, `full_tank`). @abstract */
  async listFuelRecords(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('FuelRecordRepository.listFuelRecords não implementado.');
  }

  /** Busca um registro de abastecimento por id. @abstract */
  async findFuelRecordById(_id: number): Promise<any | null> {
    throw new Error('FuelRecordRepository.findFuelRecordById não implementado.');
  }

  /** Cria um registro de abastecimento. @abstract */
  async createFuelRecord(_data: Record<string, any>): Promise<any> {
    throw new Error('FuelRecordRepository.createFuelRecord não implementado.');
  }

  /** Atualiza um registro de abastecimento existente (nunca `km_at_refuel`/`liters` — RNF-FAC-01). @abstract */
  async updateFuelRecord(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('FuelRecordRepository.updateFuelRecord não implementado.');
  }

  /** Últimos N abastecimentos `full_tank=true` de um veículo, mais recente primeiro (RF-FAC-025/026). @abstract */
  async listRecentFullTank(_assetId: number, _limit: number): Promise<any[]> {
    throw new Error('FuelRecordRepository.listRecentFullTank não implementado.');
  }
}

export = FuelRecordRepository;
