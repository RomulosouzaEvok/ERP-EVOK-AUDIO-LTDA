/**
 * Caso de uso: listagem paginada de lembretes de prazo contratual, cobrindo
 * o fluxo do endpoint `GET /api/legal/contract-reminders`.
 *
 * @module modules/legal/application/use-cases/reminder/ListRemindersUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractReminderRepository from '../../../domain/repositories/ContractReminderRepository';

type ListRemindersInput = { contract_id?: number; page?: number; limit?: number; offset?: number };

class ListRemindersUseCase extends UseCase<ListRemindersInput, any> {
  private readonly reminderRepository: ContractReminderRepository;

  constructor(reminderRepository: ContractReminderRepository) {
    super();
    this.reminderRepository = reminderRepository;
  }

  async execute({ contract_id, page = 1, limit = 20, offset = 0 }: ListRemindersInput = {}) {
    const { rows, count } = await this.reminderRepository.listReminders({ contract_id }, { limit, offset });
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListRemindersUseCase;
