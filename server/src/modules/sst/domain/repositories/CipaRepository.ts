/**
 * Contrato do repositório do cluster CIPA (NR-5, CF/88) — UC-48.
 *
 * @module modules/sst/domain/repositories/CipaRepository
 */

class CipaRepository {
  public async findMandatesAndCount(filters: Record<string, unknown>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CipaRepository.findMandatesAndCount não implementado.');
  }
  public async findMandateById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CipaRepository.findMandateById não implementado.');
  }
  public async createMandate(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CipaRepository.createMandate não implementado.');
  }
  public async countHeadcount(): Promise<number> {
    throw new Error('CipaRepository.countHeadcount não implementado.');
  }

  public async countConsecutiveElectedTerms(employeeId: number): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CipaRepository.countConsecutiveElectedTerms não implementado.');
  }
  public async createMember(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CipaRepository.createMember não implementado.');
  }
  public async findMemberById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CipaRepository.findMemberById não implementado.');
  }
  public async updateMember(id: number | string, data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CipaRepository.updateMember não implementado.');
  }
  public async findValidCipaTraining(employeeId: number): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CipaRepository.findValidCipaTraining não implementado.');
  }

  public async findElectoralProcessById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CipaRepository.findElectoralProcessById não implementado.');
  }
  public async createElectoralProcess(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CipaRepository.createElectoralProcess não implementado.');
  }
  public async updateElectoralProcess(id: number | string, data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CipaRepository.updateElectoralProcess não implementado.');
  }
  public async createCandidate(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CipaRepository.createCandidate não implementado.');
  }
  public async findCandidatesByProcessId(processId: number): Promise<any[]> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CipaRepository.findCandidatesByProcessId não implementado.');
  }
  public async updateCandidate(id: number | string, data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CipaRepository.updateCandidate não implementado.');
  }

  public async findMeetingsAndCount(filters: Record<string, unknown>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CipaRepository.findMeetingsAndCount não implementado.');
  }
  public async createMeeting(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CipaRepository.createMeeting não implementado.');
  }
  public async createCorrectiveAction(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CipaRepository.createCorrectiveAction não implementado.');
  }

  public async findActiveMembershipByEmployee(employeeId: number): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CipaRepository.findActiveMembershipByEmployee não implementado.');
  }
}

export = CipaRepository;
