/**
 * Use case: criar um roteiro de producao em rascunho (gap G5).
 *
 * O roteiro SEMPRE nasce em `draft`, independente do que venha no body: a
 * liberacao e um ato separado (`ActivateProductionRouteUseCase`), que grava
 * `approved_by`/`approved_at` e congela o conteudo.
 *
 * @module modules/production/application/use-cases/CreateProductionRouteUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ConflictError, BusinessRuleError, NotFoundError } from '../../../../errors';
import {
  PRODUCTION_ROUTE_RULES,
  normalizeAndValidateSteps,
  computeTotalStandardTimeMinutes,
  type ProductionRouteStepInput,
} from '../../domain/productionRouteRules';
import { resolveRouteStepWorkCenters } from '../services/resolveRouteStepWorkCenters';
import type ProductionRouteRepository from '../../domain/repositories/ProductionRouteRepository';

/** Tipos de produto que admitem roteiro de fabricacao (o que a fabrica produz). */
const PRODUCIBLE_PRODUCT_TYPES = ['finished', 'semi_finished'];

/** Entrada da criacao de roteiro. */
interface CreateProductionRouteInput {
  product_id: number;
  route_code: string;
  revision?: string;
  description?: string | null;
  steps?: ProductionRouteStepInput[];
  /** Sempre `req.user.id` (JWT) — nunca aceito do body (anti-spoofing P0). */
  created_by: number | null;
  transaction?: any;
}

class CreateProductionRouteUseCase extends UseCase<CreateProductionRouteInput, any> {
  private readonly productionRouteRepository: ProductionRouteRepository;

  /** @param productionRouteRepository - Repositorio de roteiro. */
  public constructor(productionRouteRepository: ProductionRouteRepository) {
    super();
    this.productionRouteRepository = productionRouteRepository;
  }

  /**
   * Cria o cabecalho do roteiro e, opcionalmente, suas etapas.
   *
   * @param input - Dados do roteiro (`created_by` vem do JWT).
   * @returns Roteiro criado (cabecalho).
   * @throws {NotFoundError} 404 se o produto nao existir.
   * @throws {BusinessRuleError} 422 `G5-PRODUCT-NOT-PRODUCIBLE` se o produto estiver inativo ou nao for fabricavel.
   * @throws {ConflictError} 409 `G5-ROUTE-CODE-DUP` / `G5-REVISION-DUP` em duplicidade.
   * @throws {BusinessRuleError} 422 nas regras de sequencia e de centro de trabalho das etapas.
   */
  public async execute(input: CreateProductionRouteInput): Promise<any> {
    const { transaction } = input;
    const routeCode = String(input.route_code).trim().toUpperCase();
    const revision = String(input.revision ?? '00').trim().toUpperCase();

    const product = await this.productionRouteRepository.findProductByIdRaw(input.product_id, transaction);
    if (!product) throw new NotFoundError('Produto nao encontrado.');

    if (product.status !== 'active') {
      throw new BusinessRuleError(
        `Produto "${product.name}" esta inativo e nao pode receber roteiro de producao.`,
        { rule: PRODUCTION_ROUTE_RULES.PRODUCT_NOT_PRODUCIBLE, product_status: product.status },
      );
    }

    if (!PRODUCIBLE_PRODUCT_TYPES.includes(product.product_type)) {
      throw new BusinessRuleError(
        `Roteiro de producao so existe para produto acabado ou subconjunto. "${product.name}" e "${product.product_type}".`,
        { rule: PRODUCTION_ROUTE_RULES.PRODUCT_NOT_PRODUCIBLE, product_type: product.product_type },
      );
    }

    const existingCode = await this.productionRouteRepository.findRouteByCode(routeCode, transaction);
    if (existingCode) {
      throw new ConflictError(
        `Ja existe um roteiro com o codigo ${routeCode}.`,
        { rule: PRODUCTION_ROUTE_RULES.ROUTE_CODE_DUPLICATE, route_code: routeCode },
      );
    }

    const existingRevision = await this.productionRouteRepository.findRouteByProductAndRevision(
      input.product_id,
      revision,
      transaction,
    );
    if (existingRevision) {
      throw new ConflictError(
        `O produto ${product.code} ja tem um roteiro na revisao ${revision}.`,
        { rule: PRODUCTION_ROUTE_RULES.REVISION_DUPLICATE, revision },
      );
    }

    const steps = normalizeAndValidateSteps(input.steps || []);
    const resolvedSteps = await resolveRouteStepWorkCenters(steps, this.productionRouteRepository, transaction);

    // Dual-write best-effort de item_id (Fase 4.8 expand-contract): quando ha
    // Item canonico com o mesmo codigo do produto legado, o roteiro ja nasce
    // amarrado aos dois. Ausencia de Item NAO bloqueia o cadastro.
    const itemId = await this.productionRouteRepository.findItemIdByProductCode(product.code, transaction);

    const route = await this.productionRouteRepository.createRoute({
      product_id: input.product_id,
      item_id: itemId,
      route_code: routeCode,
      revision,
      status: 'draft',
      description: input.description ?? null,
      total_standard_time_minutes: computeTotalStandardTimeMinutes(resolvedSteps),
      created_by: input.created_by ?? null,
      approved_by: null,
      approved_at: null,
    }, transaction);

    for (const step of resolvedSteps) {
      await this.productionRouteRepository.createStep(
        { ...step, production_route_id: route.id },
        transaction,
      );
    }

    return route;
  }
}

export = CreateProductionRouteUseCase;
