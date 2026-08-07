/**
 * Contrato do repositório de ItTicket/ItTicketCategory/ItTicketComment/
 * ItTicketPriorityHistory (helpdesk, UC-49).
 *
 * @module modules/ti/domain/repositories/TicketRepository
 */

class TicketRepository {
  // ---- categorias ----
  public async findAndCountCategories(_filters: Record<string, unknown>, _pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    throw new Error('TicketRepository.findAndCountCategories não implementado.');
  }
  public async listActiveCategories(): Promise<any[]> {
    throw new Error('TicketRepository.listActiveCategories não implementado.');
  }
  public async findCategoryById(_id: number | string): Promise<any | null> {
    throw new Error('TicketRepository.findCategoryById não implementado.');
  }
  public async findCategoryByName(_name: string): Promise<any | null> {
    throw new Error('TicketRepository.findCategoryByName não implementado.');
  }
  public async createCategory(_data: Record<string, unknown>): Promise<any> {
    throw new Error('TicketRepository.createCategory não implementado.');
  }
  public async updateCategory(_id: number | string, _data: Record<string, unknown>): Promise<any | null> {
    throw new Error('TicketRepository.updateCategory não implementado.');
  }

  // ---- tickets ----
  public async findAndCount(_filters: Record<string, unknown>, _pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    throw new Error('TicketRepository.findAndCount não implementado.');
  }
  public async findById(_id: number | string): Promise<any | null> {
    throw new Error('TicketRepository.findById não implementado.');
  }
  public async countByYear(_year: number): Promise<number> {
    throw new Error('TicketRepository.countByYear não implementado.');
  }
  public async create(_data: Record<string, unknown>, _transaction?: unknown): Promise<any> {
    throw new Error('TicketRepository.create não implementado.');
  }
  public async update(_id: number | string, _data: Record<string, unknown>, _transaction?: unknown): Promise<any | null> {
    throw new Error('TicketRepository.update não implementado.');
  }

  // ---- comentários ----
  public async listComments(_ticketId: number | string): Promise<any[]> {
    throw new Error('TicketRepository.listComments não implementado.');
  }
  public async createComment(_data: Record<string, unknown>): Promise<any> {
    throw new Error('TicketRepository.createComment não implementado.');
  }

  // ---- histórico de prioridade ----
  public async createPriorityHistory(_data: Record<string, unknown>): Promise<any> {
    throw new Error('TicketRepository.createPriorityHistory não implementado.');
  }
}

export = TicketRepository;
