/**
 * Contrato de repositório para `FacilityDriver` (RF-FAC-011 a 015).
 *
 * @module modules/facilities/domain/repositories/DriverRepository
 */

class DriverRepository {
  async list(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('DriverRepository.list não implementado.');
  }

  async findById(_id: number): Promise<any | null> {
    throw new Error('DriverRepository.findById não implementado.');
  }

  async findByEmployeeId(_employeeId: number): Promise<any | null> {
    throw new Error('DriverRepository.findByEmployeeId não implementado.');
  }

  async create(_data: Record<string, any>): Promise<any> {
    throw new Error('DriverRepository.create não implementado.');
  }

  async update(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('DriverRepository.update não implementado.');
  }
}

export = DriverRepository;
