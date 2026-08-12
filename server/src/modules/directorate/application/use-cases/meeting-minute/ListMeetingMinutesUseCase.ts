/**
 * Caso de uso: listagem paginada de atas de reunião, cobrindo
 * `GET /api/directorate/meeting-minutes`.
 *
 * @module modules/directorate/application/use-cases/meeting-minute/ListMeetingMinutesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import DirectorateRepository from '../../../domain/repositories/DirectorateRepository';

type ListMeetingMinutesInput = {
  meeting_type?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  offset: number;
};

class ListMeetingMinutesUseCase extends UseCase<ListMeetingMinutesInput, any> {
  private readonly directorateRepository: DirectorateRepository;

  constructor(directorateRepository: DirectorateRepository) {
    super();
    this.directorateRepository = directorateRepository;
  }

  async execute(input: ListMeetingMinutesInput) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 100;

    const { rows, count } = await this.directorateRepository.listMeetingMinutes(
      { meeting_type: input.meeting_type, from: input.from, to: input.to },
      { limit, offset: input.offset },
    );

    return { rows, count, page, limit, totalPages: Math.max(1, Math.ceil(count / limit)) };
  }
}

export = ListMeetingMinutesUseCase;
