/**
 * Contrato do repositório do cluster Acidente/CAT (Lei 8.213/91).
 *
 * @module modules/sst/domain/repositories/AccidentRepository
 */

class AccidentRepository {
  public async findAccidentsAndCount(filters: Record<string, unknown>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AccidentRepository.findAccidentsAndCount não implementado.');
  }
  public async findAccidentById(id: number | string, transaction?: unknown): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AccidentRepository.findAccidentById não implementado.');
  }
  public async createAccident(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AccidentRepository.createAccident não implementado.');
  }
  public async createWitnesses(accidentId: number, employeeIds: number[], transaction?: unknown): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AccidentRepository.createWitnesses não implementado.');
  }
  public async createComplement(data: Record<string, unknown>, transaction: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AccidentRepository.createComplement não implementado.');
  }
  public async updateAccidentConsolidated(id: number | string, data: Record<string, unknown>, transaction: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AccidentRepository.updateAccidentConsolidated não implementado.');
  }
  public async closeAccident(id: number | string, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AccidentRepository.closeAccident não implementado.');
  }

  public async findInvestigationByAccidentId(accidentId: number): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AccidentRepository.findInvestigationByAccidentId não implementado.');
  }
  public async createInvestigation(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AccidentRepository.createInvestigation não implementado.');
  }
  public async createCorrectiveAction(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AccidentRepository.createCorrectiveAction não implementado.');
  }
  public async countCorrectiveActionsByOrigin(origemTipo: string, origemId: number): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AccidentRepository.countCorrectiveActionsByOrigin não implementado.');
  }

  public async findCatsByAccidentId(accidentId: number): Promise<any[]> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AccidentRepository.findCatsByAccidentId não implementado.');
  }
  public async findCatById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AccidentRepository.findCatById não implementado.');
  }
  public async createCat(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('AccidentRepository.createCat não implementado.');
  }
}

export = AccidentRepository;
