/**
 * Contrato de repositório para o domínio de Evento/Feira de Marketing
 * (`MarketingEvent`/`MarketingEventChecklistItem`), módulo Marketing —
 * NOVO no BLOCO 5 MKT (correção), RF-MKT-020 a 025.
 *
 * @module modules/marketing/domain/repositories/EventRepository
 */

class EventRepository {
  /** @abstract */
  async listEvents(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('EventRepository.listEvents não implementado.');
  }

  /** @abstract */
  async findEventById(_id: number): Promise<any | null> {
    throw new Error('EventRepository.findEventById não implementado.');
  }

  /** @abstract */
  async createEvent(_data: Record<string, any>): Promise<any> {
    throw new Error('EventRepository.createEvent não implementado.');
  }

  /** @abstract */
  async updateEvent(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('EventRepository.updateEvent não implementado.');
  }

  /** @abstract */
  async addChecklistItem(_eventId: number, _data: Record<string, any>): Promise<any> {
    throw new Error('EventRepository.addChecklistItem não implementado.');
  }

  /** @abstract */
  async findChecklistItemById(_eventId: number, _itemId: number): Promise<any | null> {
    throw new Error('EventRepository.findChecklistItemById não implementado.');
  }

  /** @abstract */
  async updateChecklistItem(_eventId: number, _itemId: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('EventRepository.updateChecklistItem não implementado.');
  }
}

export = EventRepository;
