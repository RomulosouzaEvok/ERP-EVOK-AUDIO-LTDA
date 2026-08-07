/**
 * `POST /api/ti/tickets/:id/link-maintenance-order` — gera/vincula
 * `MaintenanceOrder`, chamado vai a `waiting` (UC-49, RF-TI-007/BR-TI-009).
 *
 * @module modules/ti/application/use-cases/ticket/LinkMaintenanceOrderUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import MaintenanceOrderService from '../../../application/services/MaintenanceOrderService';
import { NotFoundError, ValidationError } from '../../../../../errors';

interface LinkMaintenanceOrderInput {
  id: number;
  reportedBy: number;
  priority?: string;
}

class LinkMaintenanceOrderUseCase extends UseCase<LinkMaintenanceOrderInput, any> {
  private readonly repository: TicketRepository;
  private readonly maintenanceOrderService: MaintenanceOrderService;

  public constructor(repository: TicketRepository, maintenanceOrderService: MaintenanceOrderService) {
    super();
    this.repository = repository;
    this.maintenanceOrderService = maintenanceOrderService;
  }

  /**
   * @throws {NotFoundError} Chamado não encontrado.
   * @throws {ValidationError} Chamado sem `asset_id` vinculado.
   */
  public async execute({ id, reportedBy, priority }: LinkMaintenanceOrderInput): Promise<any> {
    const ticket = await this.repository.findById(id);
    if (!ticket) throw new NotFoundError(`Chamado ${id} não encontrado.`);
    if (!ticket.asset_id) {
      throw new ValidationError('O chamado não tem um ativo (asset_id) vinculado — não é possível gerar ordem de manutenção.');
    }

    const order = await this.maintenanceOrderService.createFromAsset({
      asset_id: ticket.asset_id,
      problem_description: ticket.description ?? ticket.subject,
      reported_by: reportedBy,
      priority,
    });

    await this.repository.update(id, { maintenance_order_id: order.id, status: 'waiting' });
    return this.repository.findById(id);
  }
}

export = LinkMaintenanceOrderUseCase;
