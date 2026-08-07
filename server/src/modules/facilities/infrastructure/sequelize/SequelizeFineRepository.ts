/**
 * Implementação Sequelize do {@link FineRepository}.
 *
 * @module modules/facilities/infrastructure/sequelize/SequelizeFineRepository
 */

import { Op } from 'sequelize';
import FineRepository from '../../domain/repositories/FineRepository';

const { FacilityFine, Asset, FacilityDriver, Employee }: any = require('../../../../models/index');

class SequelizeFineRepository extends FineRepository {
  async list(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.asset_id) where.asset_id = filters.asset_id;
    if (filters.indication_status) where.indication_status = filters.indication_status;
    if (filters.status) where.status = filters.status;
    if (filters.deadline_expiring_days) {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() + Number(filters.deadline_expiring_days));
      where.indication_deadline = { [Op.ne]: null, [Op.lte]: limitDate.toISOString().slice(0, 10) };
      where.indication_status = 'pending';
    }

    return FacilityFine.findAndCountAll({
      where,
      include: [
        { model: Asset, as: 'asset', attributes: ['id', 'name', 'tag'] },
        { model: FacilityDriver, as: 'identifiedDriver', include: [{ model: Employee, as: 'employee', attributes: ['id', 'name'] }], required: false },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['infraction_at', 'DESC']],
    });
  }

  async findById(id: number) {
    return FacilityFine.findByPk(id, {
      include: [
        { model: Asset, as: 'asset' },
        { model: FacilityDriver, as: 'identifiedDriver', include: [{ model: Employee, as: 'employee', attributes: ['id', 'name'] }], required: false },
      ],
    });
  }

  async create(data: Record<string, unknown>) {
    return FacilityFine.create(data);
  }

  async update(id: number, data: Record<string, unknown>) {
    const fine = await FacilityFine.findByPk(id);
    if (!fine) return null;
    await fine.update(data);
    return fine;
  }
}

export = SequelizeFineRepository;
