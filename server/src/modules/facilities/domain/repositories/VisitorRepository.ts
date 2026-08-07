/**
 * Contrato de repositório para `FacilityVisitor`/`FacilityVisit`
 * (RF-FAC-044 a 047).
 *
 * @module modules/facilities/domain/repositories/VisitorRepository
 */

class VisitorRepository {
  async list(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('VisitorRepository.list não implementado.');
  }

  async findByDocument(_document: string): Promise<any | null> {
    throw new Error('VisitorRepository.findByDocument não implementado.');
  }

  async findById(_id: number): Promise<any | null> {
    throw new Error('VisitorRepository.findById não implementado.');
  }

  async create(_data: Record<string, any>): Promise<any> {
    throw new Error('VisitorRepository.create não implementado.');
  }
}

export = VisitorRepository;
