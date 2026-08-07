/**
 * Adapter de `AssetService` — cria/lê/atualiza `Asset` via o model
 * Sequelize real (`server/src/models/Asset.ts`), mesmo padrão de
 * `MaintenanceOrderServiceAdapter` do módulo `ti`. Usado por
 * `CreateVehicleUseCase` (RF-FAC-006) para criar o `Asset`
 * (`asset_type='vehicle'`) na mesma transação da extensão
 * `FacilityVehicleDetail`.
 *
 * @module modules/facilities/infrastructure/adapters/AssetServiceAdapter
 */

import AssetService from '../../application/services/AssetService';

const { Asset }: any = require('../../../../models/index');

class AssetServiceAdapter extends AssetService {
  public async create(data: {
    tag: string;
    name: string;
    asset_type: string;
    brand?: string | null;
    model?: string | null;
    department_id?: number | null;
    responsible_id?: number | null;
    status?: string;
    notes?: string | null;
  }, transaction?: unknown): Promise<any> {
    return Asset.create(
      {
        tag: data.tag,
        name: data.name,
        asset_type: data.asset_type,
        brand: data.brand ?? null,
        model: data.model ?? null,
        department_id: data.department_id ?? null,
        responsible_id: data.responsible_id ?? null,
        status: data.status ?? 'active',
        notes: data.notes ?? null,
      },
      { transaction: transaction as any },
    );
  }

  public async findById(assetId: number): Promise<any | null> {
    return Asset.findByPk(assetId);
  }

  public async update(assetId: number, data: Record<string, unknown>, transaction?: unknown): Promise<any | null> {
    const asset = await Asset.findByPk(assetId, { transaction: transaction as any });
    if (!asset) return null;
    await asset.update(data, { transaction: transaction as any });
    return asset;
  }
}

export = AssetServiceAdapter;
