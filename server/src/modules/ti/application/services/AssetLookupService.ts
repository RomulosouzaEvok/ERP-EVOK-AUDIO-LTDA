/**
 * Interface de serviço para consulta/atualização de `Asset` a partir do
 * módulo `ti`, SEM import direto do model Sequelize `Asset` (baixo
 * acoplamento — `docs/business/BLOCO_2_TI_API.md`, "Estrutura de módulo").
 * Implementada por `AssetLookupServiceAdapter`.
 *
 * @module modules/ti/application/services/AssetLookupService
 */

class AssetLookupService {
  public async findById(_assetId: number | string): Promise<any | null> {
    throw new Error('AssetLookupService.findById não implementado.');
  }
  /** Atualiza `responsible_id`/`location` do asset (entrega/devolução de termo, RF-TI-018). */
  public async updateResponsible(_assetId: number | string, _data: { responsible_id: number | null; location?: string | null }, _transaction?: unknown): Promise<void> {
    throw new Error('AssetLookupService.updateResponsible não implementado.');
  }
}

export = AssetLookupService;
