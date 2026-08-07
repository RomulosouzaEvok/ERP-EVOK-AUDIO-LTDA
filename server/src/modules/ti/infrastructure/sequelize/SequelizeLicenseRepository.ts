/**
 * Implementação Sequelize do repositório de ItSoftwareLicenseDetail/
 * ItLicenseSeat (view enriquecida sobre `assets`, nunca CRUD paralelo —
 * BR-TI-008).
 *
 * @module modules/ti/infrastructure/sequelize/SequelizeLicenseRepository
 */

import LicenseRepository from '../../domain/repositories/LicenseRepository';

const { ItSoftwareLicenseDetail, ItLicenseSeat, Asset, Employee }: any = require('../../../../models/index');

class SequelizeLicenseRepository extends LicenseRepository {
  public async findAndCountLicenses(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.license_type) where.license_type = filters.license_type;
    if (filters.vendor) where.vendor = filters.vendor;

    return ItSoftwareLicenseDetail.findAndCountAll({
      where,
      include: [{ model: Asset, as: 'asset', attributes: ['id', 'name', 'license_expires_at', 'asset_type'] }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['id', 'DESC']],
    });
  }

  public async findByAssetId(assetId: number | string): Promise<any | null> {
    return ItSoftwareLicenseDetail.findOne({
      where: { asset_id: assetId },
      include: [{ model: Asset, as: 'asset', attributes: ['id', 'name', 'license_expires_at', 'asset_type'] }],
    });
  }

  public async listExpiring(windowDays: number[]): Promise<any[]> {
    const { Op } = require('sequelize');
    const maxWindow = Math.max(...windowDays);
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + maxWindow);

    const details = await ItSoftwareLicenseDetail.findAll({
      include: [{
        model: Asset,
        as: 'asset',
        attributes: ['id', 'name', 'license_expires_at'],
        where: { license_expires_at: { [Op.ne]: null, [Op.lte]: limitDate.toISOString().slice(0, 10) } },
      }],
    });
    return details;
  }

  public async createLicenseDetail(data: Record<string, unknown>): Promise<any> {
    return ItSoftwareLicenseDetail.create(data);
  }

  public async updateLicenseDetail(assetId: number | string, data: Record<string, unknown>): Promise<any | null> {
    const detail = await ItSoftwareLicenseDetail.findOne({ where: { asset_id: assetId } });
    if (!detail) return null;
    await detail.update(data);
    return detail;
  }

  public async countActiveSeats(licenseDetailId: number | string): Promise<number> {
    return ItLicenseSeat.count({ where: { license_detail_id: licenseDetailId, revoked_at: null } });
  }

  public async listSeats(licenseDetailId: number | string): Promise<any[]> {
    return ItLicenseSeat.findAll({
      where: { license_detail_id: licenseDetailId },
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'name'] }],
      order: [['assigned_at', 'DESC']],
    });
  }

  public async createSeat(data: Record<string, unknown>): Promise<any> {
    return ItLicenseSeat.create(data);
  }

  public async findSeatById(seatId: number | string): Promise<any | null> {
    return ItLicenseSeat.findByPk(seatId);
  }

  public async revokeSeat(seatId: number | string): Promise<any | null> {
    const seat = await ItLicenseSeat.findByPk(seatId);
    if (!seat) return null;
    await seat.update({ revoked_at: new Date() });
    return seat;
  }
}

export = SequelizeLicenseRepository;
