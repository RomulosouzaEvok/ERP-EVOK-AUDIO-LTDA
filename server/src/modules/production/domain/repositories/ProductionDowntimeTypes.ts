/**
 * Tipos compartilhados do repositório de Paradas de Máquina (`ProductionDowntime`).
 *
 * Extraído para arquivo próprio porque `ProductionDowntimeRepository.ts` usa
 * `export =` (CommonJS) — misturar `export interface`/`export type` (ESM) no
 * mesmo arquivo quebra o `tsx` em runtime (`X_module is not defined`), bug já
 * visto hoje em `GetOeeReportUseCase.ts` e `ProductionDowntime.ts`.
 *
 * @module modules/production/domain/repositories/ProductionDowntimeTypes
 */

/** Filtro de `GET /api/production/downtimes`. */
export interface ListDowntimesFilters {
  work_center_id?: number;
  from?: string;
  to?: string;
  open?: boolean;
  limit: number;
  offset: number;
}
