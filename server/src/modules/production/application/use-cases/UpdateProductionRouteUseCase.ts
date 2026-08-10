/**
 * Use case: atualizar o cabecalho de um roteiro de producao (gap G5).
 *
 * Escrita permitida SOMENTE em rascunho (`draft`). Roteiro liberado nao muda
 * — quem precisa mudar cria uma nova revisao
 * (`ReviseProductionRouteUseCase`), preservando o conteudo que as OPs em
 * andamento ja usaram.
 *
 * @module modules/production/application/use-cases/UpdateProductionRouteUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ConflictError, NotFoundError } from '../../../../errors';
import { PRODUCTION_ROUTE_RULES, assertRouteIsDraft } from '../../domain/productionRouteRules';
import type ProductionRouteRepository from '../../domain/repositories/ProductionRouteRepository';

/** Entrada da atualizacao de cabecalho. */
interface UpdateProductionRouteInput {
  id: number;
  route_code?: string;
  revision?: string;
  description?: string | null;
  transaction?: any;
}

class UpdateProductionRouteUseCase extends UseCase<UpdateProductionRouteInput, any> {
  private readonly productionRouteRepository: ProductionRouteRepository;

  /** @param productionRouteRepository - Repositorio de roteiro. */
  public constructor(productionRouteRepository: ProductionRouteRepository) {
    super();
    this.productionRouteRepository = productionRouteRepository;
  }

  /**
   * Atualiza `route_code`, `revision` e/ou `description` de um rascunho.
   *
   * @param input - Campos a atualizar (`id` obrigatorio).
   * @returns Roteiro atualizado (cru).
   * @throws {NotFoundError} 404 se o roteiro nao existir.
   * @throws {BusinessRuleError} 422 `G5-ROUTE-NOT-DRAFT` se o roteiro nao estiver em rascunho.
   * @throws {ConflictError} 409 `G5-ROUTE-CODE-DUP` / `G5-REVISION-DUP` em duplicidade.
   */
  public async execute(input: UpdateProductionRouteInput): Promise<any> {
    const { transaction } = input;

    const route = transaction
      ? await this.productionRouteRepository.findRouteByIdForUpdate(input.id, transaction)
      : await this.productionRouteRepository.findRouteByIdRaw(input.id);

    if (!route) throw new NotFoundError('Roteiro de producao nao encontrado.');
    assertRouteIsDraft(route, 'alterar o cabecalho do roteiro');

    const data: Record<string, any> = {};

    if (input.route_code !== undefined) {
      const routeCode = String(input.route_code).trim().toUpperCase();
      if (routeCode !== route.route_code) {
        const existing = await this.productionRouteRepository.findRouteByCode(routeCode, transaction);
        if (existing && Number(existing.id) !== Number(route.id)) {
          throw new ConflictError(
            `Ja existe um roteiro com o codigo ${routeCode}.`,
            { rule: PRODUCTION_ROUTE_RULES.ROUTE_CODE_DUPLICATE, route_code: routeCode },
          );
        }
      }
      data.route_code = routeCode;
    }

    if (input.revision !== undefined) {
      const revision = String(input.revision).trim().toUpperCase();
      if (revision !== route.revision) {
        const existing = await this.productionRouteRepository.findRouteByProductAndRevision(
          route.product_id,
          revision,
          transaction,
        );
        if (existing && Number(existing.id) !== Number(route.id)) {
          throw new ConflictError(
            `Este produto ja tem um roteiro na revisao ${revision}.`,
            { rule: PRODUCTION_ROUTE_RULES.REVISION_DUPLICATE, revision },
          );
        }
      }
      data.revision = revision;
    }

    if (input.description !== undefined) {
      data.description = input.description ?? null;
    }

    if (Object.keys(data).length > 0) {
      await this.productionRouteRepository.updateRouteFields(route.id, data, transaction);
    }

    return this.productionRouteRepository.findRouteByIdRaw(route.id, transaction);
  }
}

export = UpdateProductionRouteUseCase;
