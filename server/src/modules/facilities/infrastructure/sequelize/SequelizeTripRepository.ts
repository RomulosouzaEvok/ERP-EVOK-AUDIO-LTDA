/**
 * Implementação Sequelize do {@link TripRepository}.
 *
 * @module modules/facilities/infrastructure/sequelize/SequelizeTripRepository
 */

import { Op } from 'sequelize';
import TripRepository from '../../domain/repositories/TripRepository';

const { FacilityVehicleTrip, FacilityDriver, Asset, Employee }: any = require('../../../../models/index');

class SequelizeTripRepository extends TripRepository {
  async list(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const where: any = {};
    if (filters.asset_id) where.asset_id = filters.asset_id;
    if (filters.driver_id) where.driver_id = filters.driver_id;
    if (filters.status) where.status = filters.status;
    if (filters.purpose) where.purpose = filters.purpose;

    return FacilityVehicleTrip.findAndCountAll({
      where,
      include: [
        { model: Asset, as: 'asset', attributes: ['id', 'name', 'tag'] },
        { model: FacilityDriver, as: 'driver', include: [{ model: Employee, as: 'employee', attributes: ['id', 'name'] }] },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
    });
  }

  async findById(id: number) {
    return FacilityVehicleTrip.findByPk(id, {
      include: [
        { model: Asset, as: 'asset' },
        { model: FacilityDriver, as: 'driver', include: [{ model: Employee, as: 'employee', attributes: ['id', 'name'] }] },
      ],
    });
  }

  async findByIdForUpdate(id: number, transaction: unknown) {
    return FacilityVehicleTrip.findByPk(id, { transaction: transaction as any, lock: (transaction as any).LOCK.UPDATE });
  }

  async create(data: Record<string, unknown>) {
    return FacilityVehicleTrip.create(data);
  }

  async update(id: number, data: Record<string, unknown>, transaction?: unknown) {
    const trip = await FacilityVehicleTrip.findByPk(id, { transaction: transaction as any });
    if (!trip) return null;
    await trip.update(data, { transaction: transaction as any });
    return trip;
  }

  async findMaxReturnKm(assetId: number): Promise<number | null> {
    const max = await FacilityVehicleTrip.max('return_km', { where: { asset_id: assetId, return_km: { [Op.ne]: null } } });
    return max === null || max === undefined ? null : Number(max);
  }

  async findOpenTrip(filters: { asset_id?: number; driver_id?: number }) {
    const where: any = { status: 'out' };
    if (filters.asset_id) where.asset_id = filters.asset_id;
    if (filters.driver_id) where.driver_id = filters.driver_id;
    return FacilityVehicleTrip.findOne({ where });
  }
}

export = SequelizeTripRepository;
