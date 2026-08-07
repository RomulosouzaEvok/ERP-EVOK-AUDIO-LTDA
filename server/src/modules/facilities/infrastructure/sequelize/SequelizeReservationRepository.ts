/**
 * Implementação Sequelize do {@link ReservationRepository}.
 *
 * @module modules/facilities/infrastructure/sequelize/SequelizeReservationRepository
 */

import { Op } from 'sequelize';
import ReservationRepository from '../../domain/repositories/ReservationRepository';

const { FacilityResourceReservation, FacilityArea, Asset, Employee }: any = require('../../../../models/index');

class SequelizeReservationRepository extends ReservationRepository {
  async list(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.resource_type) where.resource_type = filters.resource_type;
    if (filters.facility_area_id) where.facility_area_id = filters.facility_area_id;
    if (filters.asset_id) where.asset_id = filters.asset_id;
    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      where.starts_at = {};
      if (filters.from) where.starts_at[Op.gte] = filters.from;
      if (filters.to) where.starts_at[Op.lte] = filters.to;
    }

    return FacilityResourceReservation.findAndCountAll({
      where,
      include: [
        { model: FacilityArea, as: 'facilityArea', attributes: ['id', 'name'], required: false },
        { model: Asset, as: 'asset', attributes: ['id', 'name', 'tag'], required: false },
        { model: Employee, as: 'reservedByEmployee', attributes: ['id', 'name'] },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['starts_at', 'ASC']],
    });
  }

  async findById(id: number) {
    return FacilityResourceReservation.findByPk(id, {
      include: [
        { model: FacilityArea, as: 'facilityArea', attributes: ['id', 'name'], required: false },
        { model: Asset, as: 'asset', attributes: ['id', 'name', 'tag'], required: false },
        { model: Employee, as: 'reservedByEmployee', attributes: ['id', 'name'] },
      ],
    });
  }

  async create(data: Record<string, unknown>) {
    return FacilityResourceReservation.create(data);
  }

  async update(id: number, data: Record<string, unknown>) {
    const reservation = await FacilityResourceReservation.findByPk(id);
    if (!reservation) return null;
    await reservation.update(data);
    return reservation;
  }

  async findOverlapping(filters: { facility_area_id?: number | null; asset_id?: number | null; starts_at: Date; ends_at: Date }) {
    const where: any = {
      status: 'confirmed',
      starts_at: { [Op.lt]: filters.ends_at },
      ends_at: { [Op.gt]: filters.starts_at },
    };
    if (filters.facility_area_id) where.facility_area_id = filters.facility_area_id;
    if (filters.asset_id) where.asset_id = filters.asset_id;
    return FacilityResourceReservation.findOne({ where });
  }
}

export = SequelizeReservationRepository;
