/**
 * Caso de uso: busca de um lembrete de prazo contratual por id, cobrindo o
 * fluxo do endpoint `GET /api/legal/contract-reminders/:id`.
 *
 * @module modules/legal/application/use-cases/reminder/GetReminderByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import ContractReminderRepository from '../../../domain/repositories/ContractReminderRepository';

type GetReminderByIdInput = { id: number };

class GetReminderByIdUseCase extends UseCase<GetReminderByIdInput, any> {
  private readonly reminderRepository: ContractReminderRepository;

  constructor(reminderRepository: ContractReminderRepository) {
    super();
    this.reminderRepository = reminderRepository;
  }

  async execute({ id }: GetReminderByIdInput) {
    const reminder = await this.reminderRepository.findReminderById(id);
    if (!reminder) {
      throw new NotFoundError('Lembrete de prazo contratual não encontrado.');
    }
    return reminder;
  }
}

export = GetReminderByIdUseCase;
