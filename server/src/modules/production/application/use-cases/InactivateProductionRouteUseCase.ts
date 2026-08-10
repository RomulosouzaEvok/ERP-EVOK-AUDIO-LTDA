/**
 * Use case: inativar um roteiro de producao liberado (gap G5).
 *
 * `inactive` significa "aposentado, mas nao substituido": o produto fica sem
 * roteiro ativo ate que uma revisao nova seja liberada. Diferente de
 * `superseded` (que e automatico e final), `inactive` e reversivel.
 *
 * @module modules/production/application/use-cases/InactivateProductionRouteUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import { assertStatusTransition } from '../../domain/productionRouteRules';
import type ProductionRouteRepository from '../../domain/repositories/ProductionRouteRepository';

/** Entrada da inativacao. */
interface InactivateProductionRouteInput {
  id: number;
  transaction?: any;
}

class InactivateProductionRouteUseCase extends UseCase<InactivateProductionRouteInput, any> {
  private readonly productionRouteRepository: ProductionRouteRepository;

  /** @param productionRouteRepository - Repositorio de roteiro. */
  public constructor(productionRouteRepository: ProductionRouteRepository) {
    super();
    this.productionRouteRepository = productionRouteRepository;
  }

  /**
   * Move o roteiro de `active` para `inactive`.
   *
   * @param input - `{ id, transaction }`.
   * @returns Roteiro atualizado (cru).
   * @throws {NotFoundError} 404 se o roteiro nao existir.
   * @throws {BusinessRuleError} 422 `G5-ROUTE-STATUS-TRANSITION` se o roteiro nao estiver ativo.
   */
  public async execute(input: InactivateProductionRouteInput): Promise<any> {
    const { transaction } = input;

    const route = transaction
      ? await this.productionRouteRepository.findRouteByIdForUpdate(input.id, transaction)
      : await this.productionRouteRepository.findRouteByIdRaw(input.id);

    if (!route) throw new NotFoundError('Roteiro de producao nao encontrado.');

    assertStatusTransition(route.status, 'inactive');

    await this.productionRouteRepository.updateRouteFields(route.id, { status: 'inactive' }, transaction);

    return this.productionRouteRepository.findRouteByIdRaw(route.id, transaction);
  }
}

export = InactivateProductionRouteUseCase;
