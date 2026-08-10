/**
 * Use case: liberar (ativar) um roteiro de producao (gap G5).
 *
 * Este e o ato que CONGELA o roteiro: a partir daqui nem o cabecalho nem as
 * etapas mudam, e qualquer alteracao exige uma nova revisao
 * (`ReviseProductionRouteUseCase`). O roteiro ativo anterior do mesmo produto
 * passa automaticamente a `superseded`, mantendo suas etapas intactas — e
 * assim que as OPs ja abertas nao sao afetadas por uma troca de roteiro (ver
 * `docs/producao/04-ROTEIROS.md`, secao "Roteiro no sistema (API)").
 *
 * @module modules/production/application/use-cases/ActivateProductionRouteUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import {
  assertStatusTransition,
  assertHasSteps,
  normalizeAndValidateSteps,
  computeTotalStandardTimeMinutes,
} from '../../domain/productionRouteRules';
import { resolveRouteStepWorkCenters } from '../services/resolveRouteStepWorkCenters';
import type ProductionRouteRepository from '../../domain/repositories/ProductionRouteRepository';

/** Entrada da ativacao. */
interface ActivateProductionRouteInput {
  id: number;
  /** Sempre `req.user.id` (JWT) — nunca aceito do body (anti-spoofing P0). */
  approved_by: number | null;
  transaction: any;
}

class ActivateProductionRouteUseCase extends UseCase<ActivateProductionRouteInput, any> {
  private readonly productionRouteRepository: ProductionRouteRepository;

  /** @param productionRouteRepository - Repositorio de roteiro. */
  public constructor(productionRouteRepository: ProductionRouteRepository) {
    super();
    this.productionRouteRepository = productionRouteRepository;
  }

  /**
   * Revalida o conteudo e ativa o roteiro, substituindo a revisao ativa anterior.
   *
   * A revalidacao NAO e redundante: entre o rascunho e a liberacao um centro
   * de trabalho pode ter sido desativado, e um roteiro ativo apontando para
   * centro morto quebra o custeio de mao-de-obra silenciosamente.
   *
   * @param input - `{ id, approved_by, transaction }`.
   * @returns `{ route, superseded_route_id }`.
   * @throws {NotFoundError} 404 se o roteiro nao existir.
   * @throws {BusinessRuleError} 422 `G5-ROUTE-STATUS-TRANSITION` se o status atual nao admitir ativacao.
   * @throws {BusinessRuleError} 422 `G5-SEQ-EMPTY` se o roteiro nao tiver etapa.
   * @throws {BusinessRuleError} 422 `G5-SEQ-*` / `G5-WC-*` se o conteudo tiver deixado de ser valido.
   */
  public async execute(input: ActivateProductionRouteInput): Promise<any> {
    const { transaction } = input;

    const route = await this.productionRouteRepository.findRouteByIdForUpdate(input.id, transaction);
    if (!route) throw new NotFoundError('Roteiro de producao nao encontrado.');

    assertStatusTransition(route.status, 'active');

    const persistedSteps = await this.productionRouteRepository.listSteps(route.id, transaction);
    assertHasSteps(persistedSteps);

    const plainSteps = persistedSteps.map((step: any) => (typeof step.get === 'function' ? step.get({ plain: true }) : step));
    const steps = normalizeAndValidateSteps(plainSteps);
    await resolveRouteStepWorkCenters(steps, this.productionRouteRepository, transaction);

    // So pode existir 1 roteiro ativo por produto (guarda tambem no banco:
    // indice unico parcial `uq_production_routes_active_per_product`).
    const currentActive = await this.productionRouteRepository.findActiveRouteByProduct(route.product_id, transaction);
    let supersededRouteId: number | null = null;

    if (currentActive && Number(currentActive.id) !== Number(route.id)) {
      assertStatusTransition(currentActive.status, 'superseded');
      await this.productionRouteRepository.updateRouteFields(
        currentActive.id,
        { status: 'superseded' },
        transaction,
      );
      supersededRouteId = Number(currentActive.id);
    }

    await this.productionRouteRepository.updateRouteFields(route.id, {
      status: 'active',
      approved_by: input.approved_by ?? null,
      approved_at: new Date(),
      total_standard_time_minutes: computeTotalStandardTimeMinutes(steps),
    }, transaction);

    const updated = await this.productionRouteRepository.findRouteByIdRaw(route.id, transaction);

    return { route: updated, superseded_route_id: supersededRouteId };
  }
}

export = ActivateProductionRouteUseCase;
