/**
 * Interface de serviço para criação/leitura/atualização de `Asset` a
 * partir do módulo `facilities` (D-2 — veículo é extensão 1:1 de `Asset`,
 * RF-FAC-001/006), sem import direto do model. Implementada por
 * `AssetServiceAdapter`.
 *
 * @module modules/facilities/application/services/AssetService
 */

interface CreateAssetData {
  tag: string;
  name: string;
  asset_type: string;
  brand?: string | null;
  model?: string | null;
  department_id?: number | null;
  responsible_id?: number | null;
  status?: string;
  notes?: string | null;
}

class AssetService {
  public async create(_data: CreateAssetData, _transaction?: unknown): Promise<any> {
    throw new Error('AssetService.create não implementado.');
  }

  public async findById(_assetId: number): Promise<any | null> {
    throw new Error('AssetService.findById não implementado.');
  }

  public async update(_assetId: number, _data: Record<string, unknown>, _transaction?: unknown): Promise<any | null> {
    throw new Error('AssetService.update não implementado.');
  }
}

export = AssetService;
