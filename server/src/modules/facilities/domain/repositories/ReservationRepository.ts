/**
 * Contrato de repositório para `FacilityResourceReservation` (RF-FAC-054 a
 * 056, P2).
 *
 * @module modules/facilities/domain/repositories/ReservationRepository
 */

class ReservationRepository {
  async list(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('ReservationRepository.list não implementado.');
  }

  async findById(_id: number): Promise<any | null> {
    throw new Error('ReservationRepository.findById não implementado.');
  }

  async create(_data: Record<string, any>): Promise<any> {
    throw new Error('ReservationRepository.create não implementado.');
  }

  async update(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('ReservationRepository.update não implementado.');
  }

  /** Reserva `confirmed` que colide com o intervalo informado para o mesmo recurso (validação amigável antes do EXCLUDE do banco). */
  async findOverlapping(_filters: { facility_area_id?: number | null; asset_id?: number | null; starts_at: Date; ends_at: Date }): Promise<any | null> {
    throw new Error('ReservationRepository.findOverlapping não implementado.');
  }
}

export = ReservationRepository;
