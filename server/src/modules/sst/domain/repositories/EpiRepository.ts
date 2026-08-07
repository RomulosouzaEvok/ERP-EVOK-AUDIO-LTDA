/**
 * Contrato do repositório do cluster EPI (NR-6): TipoEPI, MatrizEPI,
 * EntregaEPI e Devolução.
 *
 * @module modules/sst/domain/repositories/EpiRepository
 */

class EpiRepository {
  // ---- TipoEPI ----
  public async findTiposAndCount(filters: Record<string, unknown>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EpiRepository.findTiposAndCount não implementado.');
  }
  public async findTipoById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EpiRepository.findTipoById não implementado.');
  }
  public async findTipoActiveByCa(ca: string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EpiRepository.findTipoActiveByCa não implementado.');
  }
  public async createTipo(data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EpiRepository.createTipo não implementado.');
  }
  public async updateTipo(id: number | string, data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EpiRepository.updateTipo não implementado.');
  }
  public async findItemById(itemId: string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EpiRepository.findItemById não implementado.');
  }

  // ---- MatrizEPI ----
  public async findMatrizAndCount(filters: Record<string, unknown>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EpiRepository.findMatrizAndCount não implementado.');
  }
  public async findMatrizById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EpiRepository.findMatrizById não implementado.');
  }
  public async createMatriz(data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EpiRepository.createMatriz não implementado.');
  }
  public async updateMatriz(id: number | string, data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EpiRepository.updateMatriz não implementado.');
  }
  public async deleteMatriz(id: number | string): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EpiRepository.deleteMatriz não implementado.');
  }
  public async findMatrizAtivaSemEntregaVigente(): Promise<any[]> {
    throw new Error('EpiRepository.findMatrizAtivaSemEntregaVigente não implementado.');
  }

  // ---- EntregaEPI ----
  public async findEntregasAndCount(filters: Record<string, unknown>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EpiRepository.findEntregasAndCount não implementado.');
  }
  public async findEntregaById(id: number | string, transaction?: unknown): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EpiRepository.findEntregaById não implementado.');
  }
  public async createEntrega(data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EpiRepository.createEntrega não implementado.');
  }
  public async updateEntregaRascunho(id: number | string, data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EpiRepository.updateEntregaRascunho não implementado.');
  }
  public async confirmEntrega(id: number | string, data: Record<string, unknown>, transaction: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EpiRepository.confirmEntrega não implementado.');
  }
  public async createDevolucao(data: Record<string, unknown>): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EpiRepository.createDevolucao não implementado.');
  }
  public async findFichaByEmployeeId(employeeId: number): Promise<any[]> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('EpiRepository.findFichaByEmployeeId não implementado.');
  }
}

export = EpiRepository;
