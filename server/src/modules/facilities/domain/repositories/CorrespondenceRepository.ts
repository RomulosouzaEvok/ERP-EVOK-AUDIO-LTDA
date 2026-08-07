/**
 * Contrato de repositório para `FacilityCorrespondence` (RF-FAC-048).
 *
 * @module modules/facilities/domain/repositories/CorrespondenceRepository
 */

class CorrespondenceRepository {
  async list(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('CorrespondenceRepository.list não implementado.');
  }

  async findById(_id: number): Promise<any | null> {
    throw new Error('CorrespondenceRepository.findById não implementado.');
  }

  async create(_data: Record<string, any>): Promise<any> {
    throw new Error('CorrespondenceRepository.create não implementado.');
  }

  async update(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('CorrespondenceRepository.update não implementado.');
  }
}

export = CorrespondenceRepository;
