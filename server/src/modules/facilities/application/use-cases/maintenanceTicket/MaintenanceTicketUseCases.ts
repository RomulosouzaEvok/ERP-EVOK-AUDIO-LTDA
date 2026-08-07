/**
 * Casos de uso de Manutenção Predial via `maintenance_orders` estendida
 * (D-1 — RF-FAC-039 a 043, UC-60), cobrindo
 * `/api/facilities/maintenance-tickets`. Reutiliza o model
 * `MaintenanceOrder` via `MaintenanceOrderService` (adapter), nunca
 * Sequelize direto do módulo `facilities`.
 *
 * @module modules/facilities/application/use-cases/maintenanceTicket/MaintenanceTicketUseCases
 */

import UseCase from '../../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError, ValidationError } from '../../../../../errors';
import MaintenanceOrderService from '../../services/MaintenanceOrderService';
import InventoryService from '../../services/InventoryService';
import { sequelize } from '../../../../../config/database';

let ticketSequence = 0;

/** `GET /api/facilities/maintenance-tickets` */
export class ListMaintenanceTicketsUseCase extends UseCase<Record<string, any>, any> {
  constructor(private readonly maintenanceOrderService: MaintenanceOrderService) {
    super();
  }

  async execute({ facility_specialty, priority, status, facility_area_id, page = 1, limit = 20, offset = 0 }: Record<string, any> = {}) {
    const { rows, count } = await this.maintenanceOrderService.listTickets(
      { facility_specialty, priority, status, facility_area_id },
      { limit, offset },
    );
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

/** `GET /api/facilities/maintenance-tickets/:id` */
export class GetMaintenanceTicketByIdUseCase extends UseCase<{ id: number }, any> {
  constructor(private readonly maintenanceOrderService: MaintenanceOrderService) {
    super();
  }

  async execute({ id }: { id: number }) {
    const ticket = await this.maintenanceOrderService.findTicketById(id);
    if (!ticket || !ticket.facility_area_id) throw new NotFoundError('Chamado predial não encontrado.');
    return ticket;
  }
}

/** `POST /api/facilities/maintenance-tickets` — auto-serviço, qualquer autenticado (RF-FAC-040). */
export class CreateMaintenanceTicketUseCase extends UseCase<Record<string, any>, any> {
  constructor(private readonly maintenanceOrderService: MaintenanceOrderService) {
    super();
  }

  /**
   * @throws {ValidationError} Se `facility_area_id`, `facility_specialty` ou `description` ausentes.
   */
  async execute(input: Record<string, any> & { reportedBy: number }) {
    const { facility_area_id, facility_specialty, description, asset_id, reportedBy } = input;
    if (!facility_area_id || !facility_specialty || !description) {
      throw new ValidationError('facility_area_id, facility_specialty e description são obrigatórios.');
    }

    ticketSequence += 1;
    return this.maintenanceOrderService.createTicket({
      order_number: `MO-FAC-${Date.now()}-${ticketSequence}`,
      asset_id: asset_id ?? null,
      facility_area_id,
      facility_specialty,
      maintenance_type: 'corrective',
      priority: 'normal',
      problem_description: description,
      reported_by: reportedBy,
      report_date: new Date().toISOString().slice(0, 10),
      status: 'open',
      created_by: reportedBy,
    });
  }
}

/** `POST /api/facilities/maintenance-tickets/:id/triage` — classifica prioridade. */
export class TriageMaintenanceTicketUseCase extends UseCase<{ id: number; priority: string; personal_safety_risk?: boolean }, any> {
  constructor(private readonly maintenanceOrderService: MaintenanceOrderService) {
    super();
  }

  async execute({ id, priority, personal_safety_risk }: { id: number; priority: string; personal_safety_risk?: boolean }) {
    const ticket = await this.maintenanceOrderService.findTicketById(id);
    if (!ticket || !ticket.facility_area_id) throw new NotFoundError('Chamado predial não encontrado.');

    const notes = personal_safety_risk
      ? `${ticket.notes ?? ''}\n[Triagem] Risco à segurança pessoal identificado — notificação SST necessária antes da execução.`.trim()
      : ticket.notes;

    await this.maintenanceOrderService.updateTicket(id, { priority, notes });
    return this.maintenanceOrderService.findTicketById(id);
  }
}

/**
 * `POST /api/facilities/maintenance-tickets/:id/execute` — registra
 * execução, consome insumo via InventoryService (§7).
 */
export class ExecuteMaintenanceTicketUseCase extends UseCase<Record<string, any>, any> {
  constructor(private readonly maintenanceOrderService: MaintenanceOrderService, private readonly inventoryService: InventoryService) {
    super();
  }

  /** @throws {BusinessRuleError} Se `personal_safety_risk=true` sem notificação SST prévia registrada (E2 do UC-60). */
  async execute(input: { id: number; service_performed: string; parts_cost?: number; labor_cost?: number; supplies_consumed?: { item_id: string; quantity: number }[]; userId: number }) {
    return sequelize.transaction(async (transaction) => {
      const ticket = await this.maintenanceOrderService.findTicketByIdForUpdate(input.id, transaction);
      if (!ticket || !ticket.facility_area_id) throw new NotFoundError('Chamado predial não encontrado.');

      const hasSafetyRisk = (ticket.notes ?? '').includes('Risco à segurança pessoal identificado');
      const sstNotified = (ticket.notes ?? '').includes('[SST notificado]');
      if (hasSafetyRisk && !sstNotified) {
        throw new BusinessRuleError('Chamado com risco à segurança pessoal exige notificação SST prévia antes da execução.', { rule: 'E2' });
      }

      const partsCost = input.parts_cost ?? 0;
      const laborCost = input.labor_cost ?? 0;

      await this.maintenanceOrderService.updateTicket(
        input.id,
        {
          service_performed: input.service_performed,
          parts_cost: partsCost,
          labor_cost: laborCost,
          total_cost: Number(partsCost) + Number(laborCost),
          technician_id: input.userId,
          status: 'in_progress',
        },
        transaction,
      );

      for (const supply of input.supplies_consumed ?? []) {
        await this.inventoryService.registerConsumption({
          item_id: supply.item_id,
          quantity: supply.quantity,
          userId: input.userId,
          referenceType: 'facility_maintenance_ticket',
          referenceId: input.id,
          transaction,
        });
      }

      return this.maintenanceOrderService.findTicketById(input.id);
    });
  }
}

/** `POST /api/facilities/maintenance-tickets/:id/close` — valida execução registrada. */
export class CloseMaintenanceTicketUseCase extends UseCase<{ id: number }, any> {
  constructor(private readonly maintenanceOrderService: MaintenanceOrderService) {
    super();
  }

  /** @throws {BusinessRuleError} Se nenhuma execução (`service_performed`) tiver sido registrada. */
  async execute({ id }: { id: number }) {
    const ticket = await this.maintenanceOrderService.findTicketById(id);
    if (!ticket || !ticket.facility_area_id) throw new NotFoundError('Chamado predial não encontrado.');
    if (!ticket.service_performed) {
      throw new BusinessRuleError('Chamado não pode ser encerrado sem execução registrada (POST .../execute).');
    }

    await this.maintenanceOrderService.updateTicket(id, { status: 'completed', completion_date: new Date().toISOString().slice(0, 10), result: 'completed' });
    return this.maintenanceOrderService.findTicketById(id);
  }
}

/** `POST /api/facilities/maintenance-tickets/:id/generate-preventive` — gera rotina preventiva (RF-FAC-043). */
export class GeneratePreventiveMaintenanceTicketUseCase extends UseCase<{ id: number; frequency_days: number }, any> {
  constructor(private readonly maintenanceOrderService: MaintenanceOrderService) {
    super();
  }

  async execute({ id, frequency_days }: { id: number; frequency_days: number }) {
    const ticket = await this.maintenanceOrderService.findTicketById(id);
    if (!ticket || !ticket.facility_area_id) throw new NotFoundError('Chamado predial não encontrado.');

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + frequency_days);

    ticketSequence += 1;
    return this.maintenanceOrderService.createTicket({
      order_number: `MO-FAC-PREV-${Date.now()}-${ticketSequence}`,
      asset_id: ticket.asset_id ?? null,
      facility_area_id: ticket.facility_area_id,
      facility_specialty: ticket.facility_specialty,
      maintenance_type: 'preventive',
      priority: 'normal',
      problem_description: `Preventiva gerada a partir do chamado #${ticket.id}`,
      reported_by: ticket.reported_by,
      report_date: new Date().toISOString().slice(0, 10),
      scheduled_date: nextDate.toISOString().slice(0, 10),
      frequency_days,
      next_maintenance_date: nextDate.toISOString().slice(0, 10),
      status: 'scheduled',
      created_by: ticket.created_by,
    });
  }
}
