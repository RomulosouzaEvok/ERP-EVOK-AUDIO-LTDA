/**
 * Adapter read-only de `AssetService` — lê `Asset.responsible_id` (módulo
 * Patrimônio) sem duplicar a lógica de devolução, que continua sendo ação
 * exclusiva de `modules/assets` (RF-RH-023, §2 do contrato de API).
 *
 * Nota de implementação: o schema atual de `assets` não tem um campo de
 * "devolvido" — a devolução real é modelada como a mudança de
 * `responsible_id` (feita pelo módulo Patrimônio, fora deste contrato).
 * Portanto, todo ativo retornado por este adapter (ainda vinculado ao
 * `employee_id`) é, por definição, `returned: false` — assim que o
 * Patrimônio limpar/realocar `responsible_id`, o ativo deixa de aparecer
 * nesta consulta, o que marca o checklist de RF-RH-023 como "resolvido".
 *
 * @module modules/rh/infrastructure/adapters/AssetServiceAdapter
 */
import AssetService from '../../application/services/AssetService';

const { Asset }: any = require('../../../../models/index');

class AssetServiceAdapter extends AssetService {
  public async listByResponsible(employeeId: number): Promise<Array<{ id: number; description: string; returned: boolean }>> {
    const assets = await Asset.findAll({ where: { responsible_id: employeeId } });
    return assets.map((asset: any) => ({
      id: asset.id,
      description: asset.name ?? asset.description ?? `Ativo #${asset.id}`,
      returned: false,
    }));
  }
}

export = AssetServiceAdapter;
