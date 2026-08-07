/**
 * Contrato do repositório do cluster Rotina Preventiva (Inspeções, PT,
 * Brigada, DDS) — RF-SST-048 a 053.
 *
 * @module modules/sst/domain/repositories/SafetyRoutineRepository
 */

class SafetyRoutineRepository {
  public async findInspectionsAndCount(filters: Record<string, unknown>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SafetyRoutineRepository.findInspectionsAndCount não implementado.');
  }
  public async findInspectionById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SafetyRoutineRepository.findInspectionById não implementado.');
  }
  public async createInspection(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SafetyRoutineRepository.createInspection não implementado.');
  }
  public async createInspectionItem(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SafetyRoutineRepository.createInspectionItem não implementado.');
  }
  public async createCorrectiveAction(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SafetyRoutineRepository.createCorrectiveAction não implementado.');
  }
  public async updateInspectionItem(id: number | string, data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SafetyRoutineRepository.updateInspectionItem não implementado.');
  }

  public async findWorkPermitsAndCount(filters: Record<string, unknown>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SafetyRoutineRepository.findWorkPermitsAndCount não implementado.');
  }
  public async findWorkPermitById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SafetyRoutineRepository.findWorkPermitById não implementado.');
  }
  public async createWorkPermit(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SafetyRoutineRepository.createWorkPermit não implementado.');
  }
  public async createWorkPermitExecutants(permissaoTrabalhoId: number, employeeIds: number[], transaction?: unknown): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SafetyRoutineRepository.createWorkPermitExecutants não implementado.');
  }
  public async updateWorkPermitStatus(id: number | string, status: string, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SafetyRoutineRepository.updateWorkPermitStatus não implementado.');
  }

  public async findBrigadeAndCount(filters: Record<string, unknown>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SafetyRoutineRepository.findBrigadeAndCount não implementado.');
  }
  public async findBrigadeMemberById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SafetyRoutineRepository.findBrigadeMemberById não implementado.');
  }
  public async createBrigadeMember(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SafetyRoutineRepository.createBrigadeMember não implementado.');
  }
  public async updateBrigadeMember(id: number | string, data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SafetyRoutineRepository.updateBrigadeMember não implementado.');
  }

  public async findDdsAndCount(filters: Record<string, unknown>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SafetyRoutineRepository.findDdsAndCount não implementado.');
  }
  public async createDds(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SafetyRoutineRepository.createDds não implementado.');
  }
  public async createDdsAttendees(registroDdsId: number, employeeIds: number[], transaction?: unknown): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('SafetyRoutineRepository.createDdsAttendees não implementado.');
  }
}

export = SafetyRoutineRepository;
