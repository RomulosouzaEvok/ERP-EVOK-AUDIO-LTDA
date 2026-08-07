/**
 * Contrato do repositório de `JurLegalCase`/`JurLegalCaseEvent`/
 * `JurLegalCaseProvision` (UC-53).
 *
 * @module modules/juridico/domain/repositories/LegalCaseRepository
 */

class LegalCaseRepository {
  public async findAndCount(_filters: Record<string, unknown>, _pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    throw new Error('LegalCaseRepository.findAndCount não implementado.');
  }
  public async findById(_id: number | string): Promise<any | null> {
    throw new Error('LegalCaseRepository.findById não implementado.');
  }
  public async findByCaseNumber(_caseNumber: string): Promise<any | null> {
    throw new Error('LegalCaseRepository.findByCaseNumber não implementado.');
  }
  public async create(_data: Record<string, unknown>): Promise<any> {
    throw new Error('LegalCaseRepository.create não implementado.');
  }
  public async update(_id: number | string, _data: Record<string, unknown>): Promise<any | null> {
    throw new Error('LegalCaseRepository.update não implementado.');
  }
  public async listActiveWithoutCurrentProvision(): Promise<any[]> {
    throw new Error('LegalCaseRepository.listActiveWithoutCurrentProvision não implementado.');
  }

  // ---- andamentos (append-only) ----
  public async addEvent(_data: Record<string, unknown>): Promise<any> {
    throw new Error('LegalCaseRepository.addEvent não implementado.');
  }
  public async listEvents(_legalCaseId: number | string): Promise<any[]> {
    throw new Error('LegalCaseRepository.listEvents não implementado.');
  }

  // ---- provisões (append-only) ----
  public async addProvision(_data: Record<string, unknown>): Promise<any> {
    throw new Error('LegalCaseRepository.addProvision não implementado.');
  }
  public async listProvisions(_legalCaseId: number | string): Promise<any[]> {
    throw new Error('LegalCaseRepository.listProvisions não implementado.');
  }
  public async getCurrentProvision(_legalCaseId: number | string): Promise<any | null> {
    throw new Error('LegalCaseRepository.getCurrentProvision não implementado.');
  }
  public async listAllCurrentProvisions(): Promise<any[]> {
    throw new Error('LegalCaseRepository.listAllCurrentProvisions não implementado.');
  }
}

export = LegalCaseRepository;
