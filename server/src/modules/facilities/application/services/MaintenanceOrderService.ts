/**
 * Interface de serviço para criação/leitura/atualização de
 * `MaintenanceOrder` a partir do módulo `facilities` (D-1 — chamado
 * predial reaproveita a mesma tabela de manutenção de máquina, nunca
 * `MaintenanceOrder.create()` direto do módulo `facilities`). Implementada
 * por `MaintenanceOrderServiceAdapter`, que delega ao repositório real do
 * módulo `server/src/modules/maintenance/` (mesmo precedente de
 * `server/src/modules/ti/application/services/MaintenanceOrderService.ts`,
 * que este contrato pede para replicar — ver `BLOCO_4_FAC_API.md` §0.3).
 *
 * @module modules/facilities/application/services/MaintenanceOrderService
 */

class MaintenanceOrderService {
  public async createTicket(_data: Record<string, unknown>): Promise<any> {
    throw new Error('MaintenanceOrderService.createTicket não implementado.');
  }

  public async listTickets(_filters: Record<string, unknown>, _pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    throw new Error('MaintenanceOrderService.listTickets não implementado.');
  }

  public async findTicketById(_id: number): Promise<any | null> {
    throw new Error('MaintenanceOrderService.findTicketById não implementado.');
  }

  public async findTicketByIdForUpdate(_id: number, _transaction: unknown): Promise<any | null> {
    throw new Error('MaintenanceOrderService.findTicketByIdForUpdate não implementado.');
  }

  public async updateTicket(_id: number, _data: Record<string, unknown>, _transaction?: unknown): Promise<number> {
    throw new Error('MaintenanceOrderService.updateTicket não implementado.');
  }
}

export = MaintenanceOrderService;
