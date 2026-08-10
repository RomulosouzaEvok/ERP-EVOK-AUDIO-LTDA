/**
 * Use case: criar uma NOVA REVISAO de um roteiro existente (gap G5).
 *
 * Esta e a resposta do sistema a pergunta "e quando o roteiro precisa
 * mudar?": nao se edita um roteiro liberado — clona-se em um rascunho novo,
 * altera-se o rascunho e libera-se. O roteiro anterior sobrevive intacto
 * (vira `superseded` na ativacao da nova revisao), preservando o que as OPs
 * ja abertas e os apontamentos ja feitos referenciam.
 *
 * @module modules/production/application/use-cases/ReviseProductionRouteUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ConflictError, NotFoundError } from '../../../../errors';
import { PRODUCTION_ROUTE_RULES } from '../../domain/productionRouteRules';
import type ProductionRouteRepository from '../../domain/repositories/ProductionRouteRepository';

/** Entrada da criacao de revisao. */
interface ReviseProductionRouteInput {
  id: number;
  /** Revisao da copia. Quando ausente, e sugerida a partir das revisoes ja usadas. */
  revision?: string;
  /** `route_code` da copia. Quando ausente, e derivado como `<code>-R<revisao>`. */
  route_code?: string;
  description?: string | null;
  /** Sempre `req.user.id` (JWT) — nunca aceito do body (anti-spoofing P0). */
  created_by: number | null;
  transaction: any;
}

class ReviseProductionRouteUseCase extends UseCase<ReviseProductionRouteInput, any> {
  private readonly productionRouteRepository: ProductionRouteRepository;

  /** @param productionRouteRepository - Repositorio de roteiro. */
  public constructor(productionRouteRepository: ProductionRouteRepository) {
    super();
    this.productionRouteRepository = productionRouteRepository;
  }

  /**
   * Clona o roteiro de origem (cabecalho + etapas) em um rascunho novo.
   *
   * @param input - `{ id, revision?, route_code?, description?, created_by, transaction }`.
   * @returns Roteiro rascunho criado (cru).
   * @throws {NotFoundError} 404 se o roteiro de origem nao existir.
   * @throws {ConflictError} 409 `G5-REVISION-DUP` / `G5-ROUTE-CODE-DUP` em duplicidade.
   */
  public async execute(input: ReviseProductionRouteInput): Promise<any> {
    const { transaction } = input;

    const source = await this.productionRouteRepository.findRouteByIdRaw(input.id, transaction);
    if (!source) throw new NotFoundError('Roteiro de producao nao encontrado.');

    const usedRevisions = await this.productionRouteRepository.listRevisionsByProduct(source.product_id, transaction);
    const revision = input.revision !== undefined
      ? String(input.revision).trim().toUpperCase()
      : suggestNextRevision(usedRevisions);

    if (usedRevisions.map((value) => value.toUpperCase()).includes(revision)) {
      throw new ConflictError(
        `Este produto ja tem um roteiro na revisao ${revision}.`,
        { rule: PRODUCTION_ROUTE_RULES.REVISION_DUPLICATE, revision, used_revisions: usedRevisions },
      );
    }

    const routeCode = (input.route_code !== undefined
      ? String(input.route_code)
      : `${source.route_code}-R${revision}`
    ).trim().toUpperCase();

    const existingCode = await this.productionRouteRepository.findRouteByCode(routeCode, transaction);
    if (existingCode) {
      throw new ConflictError(
        `Ja existe um roteiro com o codigo ${routeCode}.`,
        { rule: PRODUCTION_ROUTE_RULES.ROUTE_CODE_DUPLICATE, route_code: routeCode },
      );
    }

    const draft = await this.productionRouteRepository.createRoute({
      product_id: source.product_id,
      item_id: source.item_id ?? null,
      route_code: routeCode,
      revision,
      status: 'draft',
      description: input.description !== undefined ? input.description : source.description,
      total_standard_time_minutes: source.total_standard_time_minutes,
      created_by: input.created_by ?? null,
      approved_by: null,
      approved_at: null,
    }, transaction);

    const sourceSteps = await this.productionRouteRepository.listSteps(source.id, transaction);

    for (const rawStep of sourceSteps) {
      const step = typeof rawStep.get === 'function' ? rawStep.get({ plain: true }) : rawStep;
      await this.productionRouteRepository.createStep({
        production_route_id: draft.id,
        sequence: step.sequence,
        step_code: step.step_code,
        name: step.name,
        work_center: step.work_center ?? null,
        work_center_id: step.work_center_id ?? null,
        standard_time_minutes: step.standard_time_minutes,
        setup_time_minutes: step.setup_time_minutes,
        instructions: step.instructions ?? null,
        quality_check_required: step.quality_check_required ?? false,
        is_active: step.is_active ?? true,
      }, transaction);
    }

    return draft;
  }
}

/**
 * Sugere a proxima revisao numerica a partir das ja usadas pelo produto
 * (`'00'` -> `'01'` -> `'02'`...). Revisoes nao numericas (ex.: `'A'`) sao
 * ignoradas na conta — nesse caso o usuario informa a revisao manualmente.
 *
 * @param usedRevisions - Revisoes ja existentes para o produto.
 * @returns Proxima revisao com 2 digitos.
 */
function suggestNextRevision(usedRevisions: string[]): string {
  const numeric = (usedRevisions || [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  const next = numeric.length > 0 ? Math.max(...numeric) + 1 : 1;

  return String(next).padStart(2, '0');
}

export = ReviseProductionRouteUseCase;
