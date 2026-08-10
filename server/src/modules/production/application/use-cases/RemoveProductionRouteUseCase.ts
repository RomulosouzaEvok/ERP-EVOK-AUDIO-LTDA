/**
 * Use case: remover um roteiro de producao em rascunho (gap G5).
 *
 * Remocao fisica so e admitida para rascunho NUNCA usado. Roteiro liberado
 * (ou ja substituido) e historico industrial: alimenta o custeio de
 * mao-de-obra das OPs concluidas e a rastreabilidade do Bloco K — nao se
 * apaga, se inativa.
 *
 * @module modules/production/application/use-cases/RemoveProductionRouteUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError } from '../../../../errors';
import { PRODUCTION_ROUTE_RULES, assertRouteIsDraft } from '../../domain/productionRouteRules';
import type ProductionRouteRepository from '../../domain/repositories/ProductionRouteRepository';

/** Entrada da remocao. */
interface RemoveProductionRouteInput {
  id: number;
  transaction: any;
}

class RemoveProductionRouteUseCase extends UseCase<RemoveProductionRouteInput, any> {
  private readonly productionRouteRepository: ProductionRouteRepository;

  /** @param productionRouteRepository - Repositorio de roteiro. */
  public constructor(productionRouteRepository: ProductionRouteRepository) {
    super();
    this.productionRouteRepository = productionRouteRepository;
  }

  /**
   * Remove o rascunho e suas etapas.
   *
   * @param input - `{ id, transaction }`.
   * @returns `{ id }` do roteiro removido.
   * @throws {NotFoundError} 404 se o roteiro nao existir.
   * @throws {BusinessRuleError} 422 `G5-ROUTE-NOT-DRAFT` se o roteiro nao estiver em rascunho.
   * @throws {BusinessRuleError} 422 `G5-ROUTE-IN-USE` se houver apontamento vinculado as etapas.
   */
  public async execute(input: RemoveProductionRouteInput): Promise<any> {
    const { transaction } = input;

    const route = await this.productionRouteRepository.findRouteByIdForUpdate(input.id, transaction);
    if (!route) throw new NotFoundError('Roteiro de producao nao encontrado.');

    assertRouteIsDraft(route, 'remover o roteiro');

    const trackingCount = await this.productionRouteRepository.countTrackingByRoute(route.id, transaction);
    if (trackingCount > 0) {
      throw new BusinessRuleError(
        `Roteiro possui ${trackingCount} apontamento(s) vinculado(s) as suas etapas e nao pode ser removido.`,
        { rule: PRODUCTION_ROUTE_RULES.ROUTE_IN_USE, tracking_count: trackingCount },
      );
    }

    await this.productionRouteRepository.deleteStepsByRoute(route.id, transaction);
    await this.productionRouteRepository.deleteRoute(route.id, transaction);

    return { id: Number(route.id) };
  }
}

export = RemoveProductionRouteUseCase;
