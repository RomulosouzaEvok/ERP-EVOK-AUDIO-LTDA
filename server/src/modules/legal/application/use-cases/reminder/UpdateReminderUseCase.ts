/**
 * Caso de uso: atualização de um lembrete de prazo contratual (tipicamente
 * marcar `notified: true`), cobrindo o fluxo do endpoint
 * `PUT /api/legal/contract-reminders/:id`.
 *
 * @module modules/legal/application/use-cases/reminder/UpdateReminderUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import ContractReminderRepository from '../../../domain/repositories/ContractReminderRepository';

type UpdateReminderInput = { id: number } & Record<string, any>;

class UpdateReminderUseCase extends UseCase<UpdateReminderInput, any> {
  private readonly reminderRepository: ContractReminderRepository;

  constructor(reminderRepository: ContractReminderRepository) {
    super();
    this.reminderRepository = reminderRepository;
  }

  /**
   * @throws {NotFoundError} Se o lembrete não existir.
   */
  async execute({ id, ...rest }: UpdateReminderInput) {
    const current = await this.reminderRepository.findReminderById(id);
    if (!current) {
      throw new NotFoundError('Lembrete de prazo contratual não encontrado.');
    }

    return this.reminderRepository.updateReminder(id, rest);
  }
}

export = UpdateReminderUseCase;
