/**
 * Contrato do repositório do cluster ASO/PCMSO (NR-7).
 *
 * @module modules/sst/domain/repositories/AsoRepository
 */

class AsoRepository {
  public async findExamPlansAndCount(filters: Record<string, unknown>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AsoRepository.findExamPlansAndCount não implementado.');
  }
  public async createExamPlan(data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AsoRepository.createExamPlan não implementado.');
  }
  public async updateExamPlan(id: number | string, data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AsoRepository.updateExamPlan não implementado.');
  }
  public async findApplicableExamPlan(position: string | null, gesId: number | null): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AsoRepository.findApplicableExamPlan não implementado.');
  }

  public async findAsosAndCount(filters: Record<string, unknown>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AsoRepository.findAsosAndCount não implementado.');
  }
  public async findAsoById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AsoRepository.findAsoById não implementado.');
  }
  public async findLatestAsoByEmployee(employeeId: number): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AsoRepository.findLatestAsoByEmployee não implementado.');
  }
  public async createAso(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AsoRepository.createAso não implementado.');
  }
  public async createComplementaryExam(data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AsoRepository.createComplementaryExam não implementado.');
  }
  public async findEmployeeById(employeeId: number): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AsoRepository.findEmployeeById não implementado.');
  }
}

export = AsoRepository;
