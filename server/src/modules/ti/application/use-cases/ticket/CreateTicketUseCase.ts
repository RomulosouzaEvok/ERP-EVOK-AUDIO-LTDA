/**
 * `POST /api/ti/tickets` — abre um chamado de TI (UC-49, RF-TI-002/003/009).
 *
 * @module modules/ti/application/use-cases/ticket/CreateTicketUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import TiSettingsRepository from '../../../domain/repositories/TiSettingsRepository';
import AssetLookupService from '../../../application/services/AssetLookupService';
import { ValidationError, NotFoundError } from '../../../../../errors';
import { calcSlaDueDates } from '../../../domain/services/ticketPolicyService';
import type { CreateTicketInput, TicketPriority } from '../../../domain/entities/TicketTypes';

const PRIORITY_ORDER: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];

function higherPriority(a: TicketPriority, b: TicketPriority): TicketPriority {
  return PRIORITY_ORDER.indexOf(a) >= PRIORITY_ORDER.indexOf(b) ? a : b;
}

class CreateTicketUseCase extends UseCase<CreateTicketInput, any> {
  private readonly repository: TicketRepository;
  private readonly settingsRepository: TiSettingsRepository;
  private readonly assetLookupService: AssetLookupService;

  public constructor(repository: TicketRepository, settingsRepository: TiSettingsRepository, assetLookupService: AssetLookupService) {
    super();
    this.repository = repository;
    this.settingsRepository = settingsRepository;
    this.assetLookupService = assetLookupService;
  }

  /**
   * @throws {ValidationError} `subject`, `description` ou `category_id` ausentes (400).
   * @throws {NotFoundError} `category_id` ou `asset_id` informado não existe (404).
   */
  public async execute(input: CreateTicketInput): Promise<any> {
    if (!input.subject || !input.description || !input.category_id) {
      throw new ValidationError('subject, description e category_id são obrigatórios.');
    }
    if (!input.requesterId && !input.systemGenerated) {
      throw new ValidationError('requesterId é obrigatório para chamados abertos por usuário.');
    }

    const category = await this.repository.findCategoryById(input.category_id);
    if (!category) throw new NotFoundError(`Categoria de chamado ${input.category_id} não encontrada.`);

    if (input.asset_id) {
      const asset = await this.assetLookupService.findById(input.asset_id);
      if (!asset) throw new NotFoundError(`Ativo ${input.asset_id} não encontrado.`);
    }

    let priority: TicketPriority = category.default_priority;
    if (input.urgency_perceived) priority = higherPriority(priority, input.urgency_perceived);

    // RF-TI-003/BR-TI-002: `opened_on_behalf_of` só é aceito de quem tem
    // módulo ti:operate — do contrário a API ignora silenciosamente o
    // campo (nunca 403 aqui, para não travar abertura de chamado).
    const openedOnBehalfOf = input.requesterHasTiOperate ? (input.opened_on_behalf_of ?? null) : null;

    const year = new Date().getFullYear();
    const sequence = (await this.repository.countByYear(year)) + 1;
    const ticketNumber = `TI-${year}-${String(sequence).padStart(4, '0')}`;

    const settings = await this.settingsRepository.get();
    const { responseDueAt, resolutionDueAt } = calcSlaDueDates(settings, priority, new Date());

    const created = await this.repository.create({
      ticket_number: ticketNumber,
      requester_id: input.systemGenerated ? null : input.requesterId,
      system_generated: Boolean(input.systemGenerated),
      opened_on_behalf_of: openedOnBehalfOf,
      category_id: input.category_id,
      priority,
      subject: input.subject,
      description: input.description,
      asset_id: input.asset_id ?? null,
      status: 'open',
      sla_response_due_at: responseDueAt,
      sla_resolution_due_at: resolutionDueAt,
    });

    return this.repository.findById(created.id);
  }
}

export = CreateTicketUseCase;
