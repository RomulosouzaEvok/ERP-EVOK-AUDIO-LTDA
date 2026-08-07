/**
 * Implementação Sequelize/PostgreSQL do {@link VehicleRepository}.
 *
 * @module modules/facilities/infrastructure/sequelize/SequelizeVehicleRepository
 */

import { Op } from 'sequelize';
import VehicleRepository from '../../domain/repositories/VehicleRepository';

const { FacilityVehicleDetail, FacilityVehicleDocument, Asset, Department, Employee, MaintenanceOrder }: any = require('../../../../models/index');

class SequelizeVehicleRepository extends VehicleRepository {
  async listVehicles(filters: Record<string, any> = {}, pagination: Record<string, any> = {}) {
    const assetWhere: any = { asset_type: 'vehicle' };
    if (filters.status) assetWhere.status = filters.status;

    const detailWhere: any = {};
    if (filters.fuel_type) detailWhere.fuel_type = filters.fuel_type;

    let { count, rows } = await FacilityVehicleDetail.findAndCountAll({
      where: detailWhere,
      include: [
        {
          model: Asset,
          as: 'asset',
          where: assetWhere,
          include: [
            { model: Department, as: 'department', attributes: ['id', 'name'] },
            { model: Employee, as: 'responsible', attributes: ['id', 'name'] },
          ],
        },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['plate', 'ASC']],
    });

    if (filters.document_expiring) {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() + 30);
      const expiringAssetIds = new Set(
        (
          await FacilityVehicleDocument.findAll({
            where: { valid_until: { [Op.ne]: null, [Op.lte]: limitDate.toISOString().slice(0, 10) }, status: { [Op.ne]: 'renovado' } },
            attributes: ['asset_id'],
          })
        ).map((d: any) => d.asset_id),
      );
      rows = rows.filter((r: any) => expiringAssetIds.has(r.asset_id));
      count = rows.length;
    }

    if (filters.preventive_due) {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() + 30);
      const dueAssetIds = new Set(
        (
          await MaintenanceOrder.findAll({
            where: {
              asset_id: { [Op.ne]: null },
              status: { [Op.notIn]: ['completed', 'canceled'] },
              [Op.or]: [
                { next_maintenance_date: { [Op.ne]: null, [Op.lte]: limitDate.toISOString().slice(0, 10) } },
                { next_maintenance_km: { [Op.ne]: null } },
              ],
            },
            attributes: ['asset_id'],
          })
        ).map((m: any) => m.asset_id),
      );
      rows = rows.filter((r: any) => dueAssetIds.has(r.asset_id));
      count = rows.length;
    }

    return { rows, count };
  }

  async findVehicleByAssetId(assetId: number) {
    return FacilityVehicleDetail.findOne({
      where: { asset_id: assetId },
      include: [
        {
          model: Asset,
          as: 'asset',
          include: [
            { model: Department, as: 'department', attributes: ['id', 'name'] },
            { model: Employee, as: 'responsible', attributes: ['id', 'name'] },
          ],
        },
      ],
    });
  }

  async findVehicleByPlate(plate: string) {
    return FacilityVehicleDetail.findOne({ where: { plate } });
  }

  async createVehicleDetail(data: Record<string, unknown>, transaction?: unknown) {
    return FacilityVehicleDetail.create(data, { transaction: transaction as any });
  }

  async updateVehicleDetail(assetId: number, data: Record<string, unknown>, transaction?: unknown) {
    const detail = await FacilityVehicleDetail.findOne({ where: { asset_id: assetId }, transaction: transaction as any });
    if (!detail) return null;
    await detail.update(data, { transaction: transaction as any });
    return detail;
  }
}

export = SequelizeVehicleRepository;
