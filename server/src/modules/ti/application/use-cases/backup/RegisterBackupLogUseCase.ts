/**
 * `POST /api/ti/backup-logs` — registra execução de backup/teste de
 * restore (RF-TI-039). Se `success: false`, cria automaticamente um
 * `ItTicket` `urgent` na categoria "Sistema ERP", com `requester_id: null`
 * e `system_generated: true` (RF-TI-040/BR-TI-017).
 *
 * @module modules/ti/application/use-cases/backup/RegisterBackupLogUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import BackupLogRepository from '../../../domain/repositories/BackupLogRepository';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import TiSettingsRepository from '../../../domain/repositories/TiSettingsRepository';
import { ValidationError } from '../../../../../errors';
import type { RegisterBackupLogInput } from '../../../domain/entities/BackupLogTypes';
import { toBackupLogDTO } from '../../../infrastructure/mappers/BackupLogMapper';
import { calcSlaDueDates } from '../../../domain/services/ticketPolicyService';

class RegisterBackupLogUseCase extends UseCase<RegisterBackupLogInput, any> {
  private readonly repository: BackupLogRepository;
  private readonly ticketRepository: TicketRepository;
  private readonly settingsRepository: TiSettingsRepository;

  public constructor(repository: BackupLogRepository, ticketRepository: TicketRepository, settingsRepository: TiSettingsRepository) {
    super();
    this.repository = repository;
    this.ticketRepository = ticketRepository;
    this.settingsRepository = settingsRepository;
  }

  /** @throws {ValidationError} `executed_at`/`backup_type`/`target`/`success` ausentes. */
  public async execute(input: RegisterBackupLogInput): Promise<any> {
    if (!input.executed_at || !input.backup_type || !input.target || input.success === undefined) {
      throw new ValidationError('executed_at, backup_type, target e success são obrigatórios.');
    }

    let generatedTicketId: number | null = null;

    if (!input.success) {
      let category = await this.ticketRepository.findCategoryByName('Sistema ERP');
      if (!category) {
        category = await this.ticketRepository.createCategory({ name: 'Sistema ERP', default_priority: 'urgent', active: true });
      }
      const settings = await this.settingsRepository.get();
      const { responseDueAt, resolutionDueAt } = calcSlaDueDates(settings, 'urgent', new Date());
      const year = new Date().getFullYear();
      const sequence = (await this.ticketRepository.countByYear(year)) + 1;

      const ticket = await this.ticketRepository.create({
        ticket_number: `TI-${year}-${String(sequence).padStart(4, '0')}`,
        requester_id: null,
        system_generated: true,
        category_id: category.id,
        priority: 'urgent',
        subject: `Falha de backup (${input.backup_type}) — ${input.target}`,
        description: input.error_message ?? 'Falha registrada automaticamente pelo script de backup.',
        status: 'open',
        sla_response_due_at: responseDueAt,
        sla_resolution_due_at: resolutionDueAt,
      });
      generatedTicketId = ticket.id;
    }

    const log = await this.repository.create({
      executed_at: input.executed_at,
      backup_type: input.backup_type,
      target: input.target,
      destination: input.destination ?? null,
      size_bytes: input.size_bytes ?? null,
      success: input.success,
      error_message: input.error_message ?? null,
      generated_ticket_id: generatedTicketId,
      verified_by: input.verified_by ?? null,
      notes: input.notes ?? null,
    });

    return { ...toBackupLogDTO(log), generated_ticket_id: generatedTicketId };
  }
}

export = RegisterBackupLogUseCase;
