/**
 * `POST /api/ti/responsibility-terms/:id/return` — registra devolução
 * (UC-50, RF-TI-020/021). Se `condition_on_return='damaged'`, abre um
 * `ItTicket` de categoria "Hardware" referenciando o asset (A1/RF-TI-021).
 *
 * @module modules/ti/application/use-cases/term/ReturnResponsibilityTermUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ResponsibilityTermRepository from '../../../domain/repositories/ResponsibilityTermRepository';
import AssetLookupService from '../../../application/services/AssetLookupService';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import TiSettingsRepository from '../../../domain/repositories/TiSettingsRepository';
import { NotFoundError, ValidationError } from '../../../../../errors';
import type { ReturnResponsibilityTermInput } from '../../../domain/entities/TermTypes';
import { toTermDTO } from '../../../infrastructure/mappers/TermMapper';
import { calcSlaDueDates } from '../../../domain/services/ticketPolicyService';

const { sequelize } = require('../../../../../config/database');

class ReturnResponsibilityTermUseCase extends UseCase<ReturnResponsibilityTermInput, any> {
  private readonly repository: ResponsibilityTermRepository;
  private readonly assetLookupService: AssetLookupService;
  private readonly ticketRepository: TicketRepository;
  private readonly settingsRepository: TiSettingsRepository;

  public constructor(
    repository: ResponsibilityTermRepository,
    assetLookupService: AssetLookupService,
    ticketRepository: TicketRepository,
    settingsRepository: TiSettingsRepository,
  ) {
    super();
    this.repository = repository;
    this.assetLookupService = assetLookupService;
    this.ticketRepository = ticketRepository;
    this.settingsRepository = settingsRepository;
  }

  /**
   * @throws {NotFoundError} Termo não encontrado.
   * @throws {ValidationError} Termo não está `active`.
   */
  public async execute(input: ReturnResponsibilityTermInput): Promise<any> {
    const term = await this.repository.findById(input.id);
    if (!term) throw new NotFoundError(`Termo de responsabilidade ${input.id} não encontrado.`);
    if (term.status !== 'active') {
      throw new ValidationError('Só é possível devolver um termo em status "active".');
    }

    const t = await sequelize.transaction();
    try {
      let relatedTicketId: number | null = null;

      if (input.condition_on_return === 'damaged') {
        const hardwareCategory = await this.ticketRepository.findCategoryByName('Hardware');
        if (hardwareCategory) {
          const settings = await this.settingsRepository.get();
          const priority = 'medium' as const;
          const { responseDueAt, resolutionDueAt } = calcSlaDueDates(settings, priority, new Date());
          const year = new Date().getFullYear();
          const sequence = (await this.ticketRepository.countByYear(year)) + 1;
          const ticket = await this.ticketRepository.create({
            ticket_number: `TI-${year}-${String(sequence).padStart(4, '0')}`,
            requester_id: input.receivedBy,
            system_generated: false,
            category_id: hardwareCategory.id,
            priority,
            subject: `Equipamento devolvido com avaria — termo ${term.term_number}`,
            description: input.return_notes ?? 'Equipamento devolvido em condição "damaged" — abrir avaliação técnica.',
            asset_id: term.asset_id,
            status: 'open',
            sla_response_due_at: responseDueAt,
            sla_resolution_due_at: resolutionDueAt,
          }, t);
          relatedTicketId = ticket.id;
        }
      }

      await this.repository.update(input.id, {
        status: 'returned',
        returned_at: new Date(),
        received_by: input.receivedBy,
        condition_on_return: input.condition_on_return,
        return_notes: input.return_notes ?? null,
        related_ticket_id: relatedTicketId,
      }, t);

      await this.assetLookupService.updateResponsible(term.asset_id, { responsible_id: null }, t);
      await t.commit();

      return toTermDTO(await this.repository.findById(input.id));
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = ReturnResponsibilityTermUseCase;
