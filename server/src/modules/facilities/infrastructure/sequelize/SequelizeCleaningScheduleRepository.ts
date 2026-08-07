/**
 * Implementação Sequelize/PostgreSQL do {@link CleaningScheduleRepository}.
 *
 * @module modules/facilities/infrastructure/sequelize/SequelizeCleaningScheduleRepository
 */

const CleaningScheduleRepository = require('../../domain/repositories/CleaningScheduleRepository');
const { FacilityCleaningSchedule } = require('../../../../models/index');

class SequelizeCleaningScheduleRepository extends CleaningScheduleRepository {
  async listCleaningSchedules(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.frequency) where.frequency = filters.frequency;

    const { count, rows } = await FacilityCleaningSchedule.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['next_cleaning', 'ASC']],
    });

    return { rows, count };
  }

  async findCleaningScheduleById(id: number) {
    return FacilityCleaningSchedule.findByPk(id);
  }

  async createCleaningSchedule(data: Record<string, unknown>) {
    return FacilityCleaningSchedule.create(data);
  }

  async updateCleaningSchedule(id: number, data: Record<string, unknown>) {
    const schedule = await FacilityCleaningSchedule.findByPk(id);
    if (!schedule) return null;
    await schedule.update(data);
    return schedule;
  }
}

export = SequelizeCleaningScheduleRepository;
