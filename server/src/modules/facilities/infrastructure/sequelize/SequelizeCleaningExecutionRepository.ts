/**
 * Implementação Sequelize do {@link CleaningExecutionRepository}.
 *
 * @module modules/facilities/infrastructure/sequelize/SequelizeCleaningExecutionRepository
 */

import { Op } from 'sequelize';
import CleaningExecutionRepository from '../../domain/repositories/CleaningExecutionRepository';

const { FacilityCleaningExecution, Employee }: any = require('../../../../models/index');

class SequelizeCleaningExecutionRepository extends CleaningExecutionRepository {
  async list(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.plan_id) where.plan_id = filters.plan_id;
    if (filters.ok !== undefined) where.ok = filters.ok;
    if (filters.from || filters.to) {
      where.executed_at = {};
      if (filters.from) where.executed_at[Op.gte] = filters.from;
      if (filters.to) where.executed_at[Op.lte] = filters.to;
    }

    return FacilityCleaningExecution.findAndCountAll({
      where,
      include: [{ model: Employee, as: 'executedByEmployee', attributes: ['id', 'name'], required: false }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['executed_at', 'DESC']],
    });
  }

  async create(data: Record<string, unknown>) {
    return FacilityCleaningExecution.create(data);
  }

  async countByPlanInPeriod(planId: number, from: Date, to: Date) {
    return FacilityCleaningExecution.count({ where: { plan_id: planId, executed_at: { [Op.gte]: from, [Op.lte]: to } } });
  }
}

export = SequelizeCleaningExecutionRepository;
