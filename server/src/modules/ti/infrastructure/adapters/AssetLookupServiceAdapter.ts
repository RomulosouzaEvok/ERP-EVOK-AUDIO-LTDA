/**
 * Adapter de `AssetLookupService` — lê/atualiza `Asset` (model Sequelize
 * real de `server/src/models/Asset.ts`), isolando o resto do módulo `ti` de
 * um import direto (baixo acoplamento).
 *
 * @module modules/ti/infrastructure/adapters/AssetLookupServiceAdapter
 */

import AssetLookupService from '../../application/services/AssetLookupService';

const { Asset }: any = require('../../../../models/index');

class AssetLookupServiceAdapter extends AssetLookupService {
  public async findById(assetId: number | string): Promise<any | null> {
    return Asset.findByPk(assetId);
  }

  public async updateResponsible(assetId: number | string, data: { responsible_id: number | null; location?: string | null }, transaction?: any): Promise<void> {
    const payload: Record<string, unknown> = { responsible_id: data.responsible_id };
    if (data.location !== undefined) payload.location = data.location;
    await Asset.update(payload, { where: { id: assetId }, ...(transaction ? { transaction } : {}) });
  }
}

export = AssetLookupServiceAdapter;
