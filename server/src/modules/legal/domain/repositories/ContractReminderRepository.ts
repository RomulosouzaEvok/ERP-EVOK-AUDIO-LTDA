/**
 * Contrato de repositório para o domínio de Lembrete de Prazo Contratual
 * (`LegalContractReminder`), módulo Jurídico.
 *
 * @module modules/legal/domain/repositories/ContractReminderRepository
 */

class ContractReminderRepository {
  /**
   * Lista lembretes paginados, com filtro opcional de `contract_id`.
   *
   * @abstract
   */
  async listReminders(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('ContractReminderRepository.listReminders não implementado.');
  }

  /**
   * Busca um lembrete por id.
   *
   * @abstract
   */
  async findReminderById(_id: number): Promise<any | null> {
    throw new Error('ContractReminderRepository.findReminderById não implementado.');
  }

  /**
   * Cria um lembrete.
   *
   * @abstract
   */
  async createReminder(_data: Record<string, any>): Promise<any> {
    throw new Error('ContractReminderRepository.createReminder não implementado.');
  }

  /**
   * Atualiza um lembrete existente.
   *
   * @abstract
   */
  async updateReminder(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('ContractReminderRepository.updateReminder não implementado.');
  }
}

export = ContractReminderRepository;
