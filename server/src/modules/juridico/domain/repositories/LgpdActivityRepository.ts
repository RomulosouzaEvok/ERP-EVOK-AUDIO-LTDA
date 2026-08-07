/**
 * Contrato do repositório de `JurLgpdProcessingActivity` (RoPA — RF-JUR-035/036).
 *
 * @module modules/juridico/domain/repositories/LgpdActivityRepository
 */

class LgpdActivityRepository {
  public async findAndCount(_filters: Record<string, unknown>, _pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    throw new Error('LgpdActivityRepository.findAndCount não implementado.');
  }
  public async findById(_id: number | string): Promise<any | null> {
    throw new Error('LgpdActivityRepository.findById não implementado.');
  }
  public async create(_data: Record<string, unknown>): Promise<any> {
    throw new Error('LgpdActivityRepository.create não implementado.');
  }
  public async update(_id: number | string, _data: Record<string, unknown>): Promise<any | null> {
    throw new Error('LgpdActivityRepository.update não implementado.');
  }
}

export = LgpdActivityRepository;
