/**
 * Contrato de repositório para `FacilityCleaningExecution` (RF-FAC-050).
 *
 * @module modules/facilities/domain/repositories/CleaningExecutionRepository
 */

class CleaningExecutionRepository {
  async list(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('CleaningExecutionRepository.list não implementado.');
  }

  async create(_data: Record<string, any>): Promise<any> {
    throw new Error('CleaningExecutionRepository.create não implementado.');
  }

  async countByPlanInPeriod(_planId: number, _from: Date, _to: Date): Promise<number> {
    throw new Error('CleaningExecutionRepository.countByPlanInPeriod não implementado.');
  }
}

export = CleaningExecutionRepository;
