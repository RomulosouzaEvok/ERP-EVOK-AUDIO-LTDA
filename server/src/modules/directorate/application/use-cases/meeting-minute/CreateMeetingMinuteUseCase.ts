/**
 * Caso de uso: criação de uma ata de reunião, cobrindo
 * `POST /api/directorate/meeting-minutes`.
 *
 * Registro de governança **imutável após criação**: este é o ÚNICO caso de
 * uso de escrita de `meeting_minutes` no módulo — não existe
 * Update/DeleteMeetingMinuteUseCase. Se a ata está errada, registra-se uma
 * ata retificadora nova (ver `docs/administrativo/01-DIRETORIA.md`).
 *
 * @module modules/directorate/application/use-cases/meeting-minute/CreateMeetingMinuteUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { ValidationError } from '../../../../../errors';
import DirectorateRepository from '../../../domain/repositories/DirectorateRepository';

type MeetingType = 'directors' | 'commercial' | 'industrial' | 'financial' | 'board' | 'general';

type CreateMeetingMinuteInput = {
  meeting_date: string;
  meeting_type: MeetingType;
  title: string;
  participants?: string | null;
  summary?: string | null;
  decisions?: unknown[];
  action_items?: unknown[];
  file_path?: string | null;
  createdBy: number;
};

class CreateMeetingMinuteUseCase extends UseCase<CreateMeetingMinuteInput, any> {
  private readonly directorateRepository: DirectorateRepository;

  constructor(directorateRepository: DirectorateRepository) {
    super();
    this.directorateRepository = directorateRepository;
  }

  /** @throws {ValidationError} `meeting_date` no futuro distante (>1 dia) — ata registra reunião que já ocorreu. */
  async execute(input: CreateMeetingMinuteInput) {
    const meetingDate = new Date(`${input.meeting_date}T00:00:00Z`);
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    if (Number.isNaN(meetingDate.getTime())) {
      throw new ValidationError('meeting_date inválida.');
    }
    if (meetingDate.getTime() > tomorrow.getTime()) {
      throw new ValidationError('meeting_date não pode estar no futuro — a ata registra uma reunião que já ocorreu.');
    }

    return this.directorateRepository.createMeetingMinute({
      meeting_date: input.meeting_date,
      meeting_type: input.meeting_type,
      title: input.title,
      participants: input.participants ?? null,
      summary: input.summary ?? null,
      decisions: input.decisions ?? [],
      action_items: input.action_items ?? [],
      file_path: input.file_path ?? null,
      created_by: input.createdBy,
    });
  }
}

export = CreateMeetingMinuteUseCase;
