/**
 * Contrato de repositório para `FacilityFine` (RF-FAC-028 a 035).
 *
 * @module modules/facilities/domain/repositories/FineRepository
 */

class FineRepository {
  async list(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('FineRepository.list não implementado.');
  }

  async findById(_id: number): Promise<any | null> {
    throw new Error('FineRepository.findById não implementado.');
  }

  async create(_data: Record<string, any>): Promise<any> {
    throw new Error('FineRepository.create não implementado.');
  }

  async update(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('FineRepository.update não implementado.');
  }
}

export = FineRepository;
