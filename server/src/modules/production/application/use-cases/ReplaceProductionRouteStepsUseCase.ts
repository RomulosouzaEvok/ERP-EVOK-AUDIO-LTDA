/**
 * Use case: substituir TODAS as etapas de um roteiro em rascunho (gap G5).
 *
 * Substituicao total (delete + insert), no mesmo padrao ja usado em
 * `ReplaceWorkCenterShiftsUseCase`: e a unica forma de garantir que a
 * sequencia final continua contigua e sem duplicidade sem precisar de um
 * diff parcial que o usuario nao consegue prever.
 *
 * @module modules/production/application/use-cases/ReplaceProductionRouteStepsUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError } from '../../../../errors';
import {
  PRODUCTION_ROUTE_RULES,
  assertRouteIsDraft,
  normalizeAndValidateSteps,
  computeTotalStandardTimeMinutes,
  type ProductionRouteStepInput,
} from '../../domain/productionRouteRules';
import { resolveRouteStepWorkCenters } from '../services/resolveRouteStepWorkCenters';
import type ProductionRouteRepository from '../../domain/repositories/ProductionRouteRepository';

/** Entrada da substituicao de etapas. */
interface ReplaceProductionRouteStepsInput {
  id: number;
  steps: ProductionRouteStepInput[];
  transaction: any;
}

class ReplaceProductionRouteStepsUseCase extends UseCase<ReplaceProductionRouteStepsInput, any> {
  private readonly productionRouteRepository: ProductionRouteRepository;

  /** @param productionRouteRepository - Repositorio de roteiro. */
  public constructor(productionRouteRepository: ProductionRouteRepository) {
    super();
    this.productionRouteRepository = productionRouteRepository;
  }

  /**
   * Valida e regrava a lista completa de etapas do rascunho.
   *
   * @param input - `{ id, steps, transaction }`.
   * @returns Etapas gravadas, ordenadas por `sequence`.
   * @throws {NotFoundError} 404 se o roteiro nao existir.
   * @throws {BusinessRuleError} 422 `G5-ROUTE-NOT-DRAFT` se o roteiro ja estiver liberado.
   * @throws {BusinessRuleError} 422 `G5-ROUTE-IN-USE` se alguma etapa ja tiver apontamento vinculado.
   * @throws {BusinessRuleError} 422 `G5-SEQ-DUP` / `G5-SEQ-GAP` / `G5-STEP-CODE-DUP` / `G5-WC-*` nas regras de conteudo.
   */
  public async execute(input: ReplaceProductionRouteStepsInput): Promise<any> {
    const { transaction } = input;

    const route = await this.productionRouteRepository.findRouteByIdForUpdate(input.id, transaction);
    if (!route) throw new NotFoundError('Roteiro de producao nao encontrado.');

    assertRouteIsDraft(route, 'alterar as etapas do roteiro');

    // Guarda de historico: mesmo em rascunho, se alguma etapa ja foi apontada
    // (`production_order_tracking.production_route_step_id`), apagar as etapas
    // zeraria o vinculo do apontamento com a operacao — e com ele o custeio de
    // mao-de-obra daquela OP.
    const trackingCount = await this.productionRouteRepository.countTrackingByRoute(route.id, transaction);
    if (trackingCount > 0) {
      throw new BusinessRuleError(
        `Roteiro ja possui ${trackingCount} apontamento(s) vinculado(s) as suas etapas: crie uma nova revisao em vez de reescrever as etapas.`,
        { rule: PRODUCTION_ROUTE_RULES.ROUTE_IN_USE, tracking_count: trackingCount },
      );
    }

    const steps = normalizeAndValidateSteps(input.steps || []);
    const resolvedSteps = await resolveRouteStepWorkCenters(steps, this.productionRouteRepository, transaction);

    await this.productionRouteRepository.deleteStepsByRoute(route.id, transaction);

    const created = [];
    for (const step of resolvedSteps) {
      created.push(await this.productionRouteRepository.createStep(
        { ...step, production_route_id: route.id },
        transaction,
      ));
    }

    await this.productionRouteRepository.updateRouteFields(
      route.id,
      { total_standard_time_minutes: computeTotalStandardTimeMinutes(resolvedSteps) },
      transaction,
    );

    return created;
  }
}

export = ReplaceProductionRouteStepsUseCase;
