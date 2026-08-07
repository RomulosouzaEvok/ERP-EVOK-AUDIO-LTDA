/**
 * Contrato de repositório para `FacilityVehicleTrip` — diário de uso
 * (RF-FAC-016 a 021, RNF-FAC-01).
 *
 * @module modules/facilities/domain/repositories/TripRepository
 */

class TripRepository {
  async list(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('TripRepository.list não implementado.');
  }

  async findById(_id: number): Promise<any | null> {
    throw new Error('TripRepository.findById não implementado.');
  }

  async findByIdForUpdate(_id: number, _transaction: unknown): Promise<any | null> {
    throw new Error('TripRepository.findByIdForUpdate não implementado.');
  }

  async create(_data: Record<string, any>): Promise<any> {
    throw new Error('TripRepository.create não implementado.');
  }

  async update(_id: number, _data: Record<string, any>, _transaction?: unknown): Promise<any | null> {
    throw new Error('TripRepository.update não implementado.');
  }

  /** Maior `return_km` já registrado para o veículo (histórico), para validar divergência de odômetro (RF-FAC-017). */
  async findMaxReturnKm(_assetId: number): Promise<number | null> {
    throw new Error('TripRepository.findMaxReturnKm não implementado.');
  }

  /** Uso `status='out'` aberto para o veículo ou condutor, se houver (RF-FAC-019). */
  async findOpenTrip(_filters: { asset_id?: number; driver_id?: number }): Promise<any | null> {
    throw new Error('TripRepository.findOpenTrip não implementado.');
  }
}

export = TripRepository;
