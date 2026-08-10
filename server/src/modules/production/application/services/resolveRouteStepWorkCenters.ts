/**
 * Servico de aplicacao: valida e resolve o vinculo etapa -> centro de
 * trabalho de um roteiro de producao (gap G5).
 *
 * Usado em DOIS momentos, de proposito:
 * 1. ao gravar as etapas de um rascunho (`ReplaceProductionRouteStepsUseCase`);
 * 2. ao ativar o roteiro (`ActivateProductionRouteUseCase`) — porque um
 *    centro de trabalho pode ter sido desativado entre o rascunho e a
 *    liberacao, e um roteiro ativo apontando para centro morto quebra
 *    silenciosamente o custeio de mao-de-obra e a carga-maquina.
 *
 * @module modules/production/application/services/resolveRouteStepWorkCenters
 */

import { BusinessRuleError } from '../../../../errors';
import { PRODUCTION_ROUTE_RULES } from '../../domain/productionRouteRules';
import type ProductionRouteRepository from '../../domain/repositories/ProductionRouteRepository';

/** Etapa minima esperada por {@link resolveRouteStepWorkCenters}. */
interface StepWithWorkCenter {
  sequence: number;
  work_center_id?: number | null;
  work_center?: string | null;
  [key: string]: any;
}

/**
 * Valida os `work_center_id` das etapas em UMA consulta e devolve as etapas
 * com o campo legado `work_center` preenchido a partir do cadastro
 * estruturado (quando o usuario nao informou texto proprio).
 *
 * `work_center_id` e OPCIONAL na tabela (coluna nullable, fase expand do
 * `work_centers`): etapa sem centro estruturado continua valida — ela
 * simplesmente nao entra na carga-maquina nem no custeio por hora-maquina.
 *
 * @param steps - Etapas normalizadas (lista completa do roteiro).
 * @param repository - Repositorio de roteiro (para a busca dos centros).
 * @param transaction - Transacao Sequelize ativa (opcional).
 * @returns Mesmas etapas, com `work_center` legado resolvido.
 * @throws {BusinessRuleError} 422 `G5-WC-NOT-FOUND` quando um `work_center_id` nao existe.
 * @throws {BusinessRuleError} 422 `G5-WC-INACTIVE` quando o centro existe mas esta inativo.
 */
export async function resolveRouteStepWorkCenters<T extends StepWithWorkCenter>(
  steps: T[],
  repository: ProductionRouteRepository,
  transaction?: any,
): Promise<T[]> {
  const ids = [...new Set(
    (steps || [])
      .map((step) => step.work_center_id)
      .filter((id): id is number => id !== null && id !== undefined),
  )];

  if (ids.length === 0) return steps;

  const workCenters = await repository.findWorkCentersByIds(ids, transaction);
  const byId = new Map(workCenters.map((workCenter) => [Number(workCenter.id), workCenter]));

  const missing = ids.filter((id) => !byId.has(Number(id)));
  if (missing.length > 0) {
    throw new BusinessRuleError(
      `Centro de trabalho inexistente referenciado pelo roteiro: ${missing.join(', ')}.`,
      { rule: PRODUCTION_ROUTE_RULES.WORK_CENTER_NOT_FOUND, work_center_ids: missing },
    );
  }

  const inactive = ids.filter((id) => byId.get(Number(id))?.active === false);
  if (inactive.length > 0) {
    throw new BusinessRuleError(
      `Centro de trabalho inativo nao pode ser usado em roteiro: ${inactive.map((id) => byId.get(Number(id))?.code ?? id).join(', ')}.`,
      { rule: PRODUCTION_ROUTE_RULES.WORK_CENTER_INACTIVE, work_center_ids: inactive },
    );
  }

  return steps.map((step) => {
    if (step.work_center_id === null || step.work_center_id === undefined) return step;
    const workCenter = byId.get(Number(step.work_center_id));
    // Mantem o texto legado sincronizado (ele ainda e lido no historico de
    // apontamento, `SequelizeProductionOrderRepository.listTrackingByOrder`).
    return { ...step, work_center: step.work_center ?? workCenter?.code ?? null };
  });
}

export default resolveRouteStepWorkCenters;
