/**
 * Contrato do repositório de `JurExternalLawyer` (UC-53, RF-JUR-013).
 *
 * @module modules/juridico/domain/repositories/ExternalLawyerRepository
 */

class ExternalLawyerRepository {
  public async findAndCount(_filters: Record<string, unknown>, _pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    throw new Error('ExternalLawyerRepository.findAndCount não implementado.');
  }
  public async findById(_id: number | string): Promise<any | null> {
    throw new Error('ExternalLawyerRepository.findById não implementado.');
  }
  public async create(_data: Record<string, unknown>): Promise<any> {
    throw new Error('ExternalLawyerRepository.create não implementado.');
  }
  public async update(_id: number | string, _data: Record<string, unknown>): Promise<any | null> {
    throw new Error('ExternalLawyerRepository.update não implementado.');
  }
}

export = ExternalLawyerRepository;
