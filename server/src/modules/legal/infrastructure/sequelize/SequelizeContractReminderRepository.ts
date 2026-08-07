/**
 * Implementação Sequelize/PostgreSQL do {@link ContractReminderRepository}.
 *
 * @module modules/legal/infrastructure/sequelize/SequelizeContractReminderRepository
 */

const ContractReminderRepository = require('../../domain/repositories/ContractReminderRepository');
const { LegalContractReminder } = require('../../../../models/index');

class SequelizeContractReminderRepository extends ContractReminderRepository {
  async listReminders(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.contract_id) where.contract_id = filters.contract_id;

    const { count, rows } = await LegalContractReminder.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['reminder_date', 'ASC']],
    });

    return { rows, count };
  }

  async findReminderById(id: number) {
    return LegalContractReminder.findByPk(id);
  }

  async createReminder(data: Record<string, unknown>) {
    return LegalContractReminder.create(data);
  }

  async updateReminder(id: number, data: Record<string, unknown>) {
    const reminder = await LegalContractReminder.findByPk(id);
    if (!reminder) return null;
    await reminder.update(data);
    return reminder;
  }
}

export = SequelizeContractReminderRepository;
