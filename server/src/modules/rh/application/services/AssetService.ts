/**
 * Interface de serviço read-only para o checklist de devolução de ativos na
 * demissão (RF-RH-023) — consulta `Asset.responsible_id`, nunca duplica o
 * módulo Patrimônio.
 *
 * @module modules/rh/application/services/AssetService
 */
abstract class AssetService {
  abstract listByResponsible(employeeId: number): Promise<Array<{ id: number; description: string; returned: boolean }>>;
}

export = AssetService;
