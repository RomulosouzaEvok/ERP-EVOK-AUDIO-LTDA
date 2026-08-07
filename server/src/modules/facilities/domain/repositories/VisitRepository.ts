/**
 * Contrato de repositório para `FacilityVisit` (check-in/check-out,
 * RF-FAC-044 a 046).
 *
 * @module modules/facilities/domain/repositories/VisitRepository
 */

class VisitRepository {
  async list(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('VisitRepository.list não implementado.');
  }

  async findById(_id: number): Promise<any | null> {
    throw new Error('VisitRepository.findById não implementado.');
  }

  async create(_data: Record<string, any>): Promise<any> {
    throw new Error('VisitRepository.create não implementado.');
  }

  async update(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('VisitRepository.update não implementado.');
  }

  async listOnsite(): Promise<any[]> {
    throw new Error('VisitRepository.listOnsite não implementado.');
  }
}

export = VisitRepository;
