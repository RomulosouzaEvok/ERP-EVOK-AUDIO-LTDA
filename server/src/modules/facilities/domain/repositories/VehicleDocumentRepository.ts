/**
 * Contrato de repositório para `FacilityVehicleDocument` (RF-FAC-007 a 010).
 *
 * @module modules/facilities/domain/repositories/VehicleDocumentRepository
 */

class VehicleDocumentRepository {
  async listByAsset(_assetId: number): Promise<any[]> {
    throw new Error('VehicleDocumentRepository.listByAsset não implementado.');
  }

  async findById(_id: number): Promise<any | null> {
    throw new Error('VehicleDocumentRepository.findById não implementado.');
  }

  async create(_data: Record<string, any>): Promise<any> {
    throw new Error('VehicleDocumentRepository.create não implementado.');
  }

  async update(_id: number, _data: Record<string, any>): Promise<any | null> {
    throw new Error('VehicleDocumentRepository.update não implementado.');
  }

  /** Documento vigente/mais recente de um tipo para um veículo (usado nas validações de saída). */
  async findLatestByAssetAndType(_assetId: number, _docType: string): Promise<any | null> {
    throw new Error('VehicleDocumentRepository.findLatestByAssetAndType não implementado.');
  }
}

export = VehicleDocumentRepository;
