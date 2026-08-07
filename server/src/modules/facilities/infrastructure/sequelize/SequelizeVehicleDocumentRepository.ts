/**
 * Implementação Sequelize do {@link VehicleDocumentRepository}.
 *
 * @module modules/facilities/infrastructure/sequelize/SequelizeVehicleDocumentRepository
 */

import VehicleDocumentRepository from '../../domain/repositories/VehicleDocumentRepository';

const { FacilityVehicleDocument }: any = require('../../../../models/index');

class SequelizeVehicleDocumentRepository extends VehicleDocumentRepository {
  async listByAsset(assetId: number) {
    return FacilityVehicleDocument.findAll({ where: { asset_id: assetId }, order: [['valid_until', 'ASC']] });
  }

  async findById(id: number) {
    return FacilityVehicleDocument.findByPk(id);
  }

  async create(data: Record<string, unknown>) {
    return FacilityVehicleDocument.create(data);
  }

  async update(id: number, data: Record<string, unknown>) {
    const doc = await FacilityVehicleDocument.findByPk(id);
    if (!doc) return null;
    await doc.update(data);
    return doc;
  }

  async findLatestByAssetAndType(assetId: number, docType: string) {
    return FacilityVehicleDocument.findOne({
      where: { asset_id: assetId, doc_type: docType, status: { [require('sequelize').Op.ne]: 'renovado' } },
      order: [['valid_until', 'DESC']],
    });
  }
}

export = SequelizeVehicleDocumentRepository;
