/**
 * Caso de uso: criação de lembrete de prazo contratual, cobrindo o fluxo do
 * endpoint `POST /api/legal/contract-reminders`.
 *
 * @module modules/legal/application/use-cases/reminder/CreateReminderUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import ContractReminderRepository from '../../../domain/repositories/ContractReminderRepository';
import ContractRepository from '../../../domain/repositories/ContractRepository';

type CreateReminderInput = Record<string, any>;

class CreateReminderUseCase extends UseCase<CreateReminderInput, any> {
  private readonly reminderRepository: ContractReminderRepository;
  private readonly contractRepository: ContractRepository;

  constructor(reminderRepository: ContractReminderRepository, contractRepository: ContractRepository) {
    super();
    this.reminderRepository = reminderRepository;
    this.contractRepository = contractRepository;
  }

  /**
   * @throws {NotFoundError} Se `contract_id` não corresponder a um contrato existente.
   */
  async execute(input: CreateReminderInput) {
    const contract = await this.contractRepository.findContractById(input.contract_id);
    if (!contract) {
      throw new NotFoundError('Contrato não encontrado.');
    }

    return this.reminderRepository.createReminder(input);
  }
}

export = CreateReminderUseCase;
