/**
 * Use case: detalhar um roteiro de producao com suas etapas (gap G5).
 *
 * @module modules/production/application/use-cases/GetProductionRouteByIdUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import {
  computeTotalStandardTimeMinutes,
  computeTotalSetupTimeMinutes,
} from '../../domain/productionRouteRules';
import type ProductionRouteRepository from '../../domain/repositories/ProductionRouteRepository';

class GetProductionRouteByIdUseCase extends UseCase<{ id: number }, any> {
  private readonly productionRouteRepository: ProductionRouteRepository;

  /** @param productionRouteRepository - Repositorio de roteiro. */
  public constructor(productionRouteRepository: ProductionRouteRepository) {
    super();
    this.productionRouteRepository = productionRouteRepository;
  }

  /**
   * Busca o roteiro e anexa os totais derivados.
   *
   * `total_standard_time_minutes` e coluna persistida (recalculada a cada
   * gravacao de etapas); `total_setup_time_minutes` e DERIVADO na leitura, de
   * proposito — nao existe coluna para ele e somar setup ao tempo padrao
   * distorceria o OEE (ver `productionRouteRules.computeTotalStandardTimeMinutes`).
   *
   * @param input - `{ id }`.
   * @returns Roteiro com `steps` e totais.
   * @throws {NotFoundError} 404 se o roteiro nao existir.
   */
  public async execute(input: { id: number }): Promise<any> {
    const route = await this.productionRouteRepository.findRouteById(input.id);
    if (!route) throw new NotFoundError('Roteiro de producao nao encontrado.');

    const plain = typeof route.get === 'function' ? route.get({ plain: true }) : route;
    const steps = plain.steps || [];

    return {
      ...plain,
      total_standard_time_minutes: computeTotalStandardTimeMinutes(steps),
      total_setup_time_minutes: computeTotalSetupTimeMinutes(steps),
      steps_count: steps.length,
    };
  }
}

export = GetProductionRouteByIdUseCase;
