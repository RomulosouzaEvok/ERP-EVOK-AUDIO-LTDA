/**
 * Regras de dominio do Roteiro de Producao (gap G5).
 *
 * Um roteiro (`production_routes` + `production_route_steps`) descreve a
 * sequencia de operacoes industriais de um produto acabado/subconjunto. Ele
 * ja era LIDO pelo sistema (custeio de mao-de-obra na conclusao da OP, carga
 * por centro de trabalho e OEE), mas nao tinha nenhuma API de cadastro — so
 * era populavel por script. Ver
 * `docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`, Decisao 4:
 * a API de roteiro e PRE-REQUISITO do apontamento obrigatorio (G4), porque
 * exigir apontamento sem roteiro cadastravel seria regra inexequivel.
 *
 * Este arquivo concentra as regras puras (sem Sequelize, sem HTTP) para que
 * possam ser testadas isoladamente e reaproveitadas por todos os use cases:
 * ciclo de vida do roteiro, integridade da sequencia de operacoes e
 * normalizacao de etapas.
 *
 * @module modules/production/domain/productionRouteRules
 */

import { BusinessRuleError } from '../../../errors';

/**
 * Catalogo de codigos de regra devolvidos em `error.details.rule`.
 *
 * Todo erro de regra de negocio do modulo de roteiro carrega um destes
 * codigos, no mesmo padrao ja adotado em `purchases/domain/constants.ts`
 * (G11). O prefixo `G5-` identifica o gap de origem.
 */
export const PRODUCTION_ROUTE_RULES = {
  /** Roteiro nao esta em `draft` — conteudo congelado, exige nova revisao. */
  ROUTE_NOT_DRAFT: 'G5-ROUTE-NOT-DRAFT',
  /** Transicao de status pedida nao e valida a partir do status atual. */
  ROUTE_STATUS_TRANSITION: 'G5-ROUTE-STATUS-TRANSITION',
  /** `route_code` ja usado por outro roteiro (unico global). */
  ROUTE_CODE_DUPLICATE: 'G5-ROUTE-CODE-DUP',
  /** Par (produto, revisao) ja existe (unico no banco). */
  REVISION_DUPLICATE: 'G5-REVISION-DUP',
  /** Produto inexistente, inativo ou de tipo que nao se fabrica. */
  PRODUCT_NOT_PRODUCIBLE: 'G5-PRODUCT-NOT-PRODUCIBLE',
  /** Roteiro sem nenhuma etapa — nao pode ser ativado. */
  SEQUENCE_EMPTY: 'G5-SEQ-EMPTY',
  /** Duas etapas com a mesma `sequence`. */
  SEQUENCE_DUPLICATE: 'G5-SEQ-DUP',
  /** Sequencia com buraco: precisa ser 1..N contigua. */
  SEQUENCE_GAP: 'G5-SEQ-GAP',
  /** Duas etapas com o mesmo `step_code` dentro do roteiro. */
  STEP_CODE_DUPLICATE: 'G5-STEP-CODE-DUP',
  /** `work_center_id` informado nao existe em `work_centers`. */
  WORK_CENTER_NOT_FOUND: 'G5-WC-NOT-FOUND',
  /** `work_center_id` informado existe mas esta inativo. */
  WORK_CENTER_INACTIVE: 'G5-WC-INACTIVE',
  /** Etapa do roteiro ja referenciada por apontamento — nao pode sumir. */
  ROUTE_IN_USE: 'G5-ROUTE-IN-USE',
} as const;

/** Codigo de regra do modulo de roteiro. */
export type ProductionRouteRule = typeof PRODUCTION_ROUTE_RULES[keyof typeof PRODUCTION_ROUTE_RULES];

/**
 * Status possiveis de um roteiro — literais conferidos contra o ENUM real da
 * coluna `production_routes.status` (`server/src/models/ProductionRoute.ts`,
 * criada via sync na baseline `20260731-000001`). NAO inventar literal aqui:
 * valor fora do ENUM passa por typecheck e so explode como 500 do Postgres.
 */
export const PRODUCTION_ROUTE_STATUSES = ['draft', 'active', 'inactive', 'superseded'] as const;

/** Status de um roteiro de producao. */
export type ProductionRouteStatus = typeof PRODUCTION_ROUTE_STATUSES[number];

/**
 * Ciclo de vida do roteiro.
 *
 * - `draft`      → editavel a vontade (cabecalho e etapas).
 * - `active`     → CONGELADO. Alterar exige `POST /:id/revise` (nova revisao
 *                  em `draft`), preservando o roteiro que as OPs em
 *                  andamento ja usaram.
 * - `inactive`   → aposentado manualmente; pode voltar a `active`.
 * - `superseded` → substituido automaticamente por uma revisao mais nova.
 *                  Estado final: nao volta.
 */
export const PRODUCTION_ROUTE_TRANSITIONS: Record<ProductionRouteStatus, readonly ProductionRouteStatus[]> = {
  draft: ['active'],
  active: ['inactive', 'superseded'],
  inactive: ['active'],
  superseded: [],
};

/** Etapa de roteiro como chega da camada HTTP (ja validada por schema). */
export interface ProductionRouteStepInput {
  sequence: number;
  step_code: string;
  name: string;
  work_center?: string | null;
  work_center_id?: number | null;
  standard_time_minutes?: number;
  setup_time_minutes?: number;
  instructions?: string | null;
  quality_check_required?: boolean;
  is_active?: boolean;
}

/** Etapa normalizada, pronta para persistencia. */
export interface NormalizedProductionRouteStep {
  sequence: number;
  step_code: string;
  name: string;
  work_center: string | null;
  work_center_id: number | null;
  standard_time_minutes: number;
  setup_time_minutes: number;
  instructions: string | null;
  quality_check_required: boolean;
  is_active: boolean;
}

/**
 * Garante que o roteiro esta em `draft` antes de qualquer escrita de
 * conteudo (cabecalho ou etapas).
 *
 * Esta e a regra que responde "o que acontece com as OPs ja abertas quando o
 * roteiro muda": nada — um roteiro `active` nao muda. Quem precisa mudar cria
 * uma NOVA REVISAO, e a revisao anterior fica `superseded` com todas as suas
 * etapas intactas, continuando a servir de referencia para os apontamentos
 * que ja apontaram para ela.
 *
 * @param route - Roteiro carregado do banco (precisa ter `status`).
 * @param action - Descricao da acao tentada, usada na mensagem de erro.
 * @throws {BusinessRuleError} 422 com `details.rule = 'G5-ROUTE-NOT-DRAFT'`.
 */
export function assertRouteIsDraft(route: { status?: string; route_code?: string }, action: string): void {
  if (route.status !== 'draft') {
    throw new BusinessRuleError(
      `Roteiro esta com status "${route.status}": ${action} so e permitido enquanto o roteiro esta em rascunho (draft). Crie uma nova revisao para alterar um roteiro ja liberado.`,
      { rule: PRODUCTION_ROUTE_RULES.ROUTE_NOT_DRAFT, status: route.status },
    );
  }
}

/**
 * Valida uma transicao de status do roteiro contra {@link PRODUCTION_ROUTE_TRANSITIONS}.
 *
 * @param current - Status atual do roteiro.
 * @param next - Status pretendido.
 * @throws {BusinessRuleError} 422 com `details.rule = 'G5-ROUTE-STATUS-TRANSITION'`.
 */
export function assertStatusTransition(current: string, next: ProductionRouteStatus): void {
  const allowed = PRODUCTION_ROUTE_TRANSITIONS[current as ProductionRouteStatus];
  if (!allowed || !allowed.includes(next)) {
    throw new BusinessRuleError(
      `Transicao de status invalida para o roteiro: "${current}" -> "${next}".`,
      {
        rule: PRODUCTION_ROUTE_RULES.ROUTE_STATUS_TRANSITION,
        current,
        next,
        allowed: allowed ? [...allowed] : [],
      },
    );
  }
}

/**
 * Normaliza e valida a lista completa de etapas de um roteiro.
 *
 * Regras aplicadas (todas com `details.rule`):
 * 1. `sequence` nao pode repetir (`G5-SEQ-DUP`);
 * 2. `sequence` precisa ser 1..N CONTIGUA, sem buraco (`G5-SEQ-GAP`) — a
 *    mesma numeracao usada por `production_order_tracking.sequence`, o que
 *    permite casar apontamento com etapa sem tabela de-para;
 * 3. `step_code` nao pode repetir dentro do mesmo roteiro
 *    (`G5-STEP-CODE-DUP`).
 *
 * A lista devolvida vem ORDENADA por `sequence`, com `step_code` em
 * uppercase/trim e todos os campos opcionais resolvidos para os defaults da
 * tabela — de modo que o use case nunca precise repetir esse tratamento.
 *
 * @param steps - Etapas recebidas (lista completa; substituicao total).
 * @returns Etapas normalizadas e ordenadas.
 * @throws {BusinessRuleError} 422 em duplicidade de sequencia, buraco de sequencia ou `step_code` repetido.
 */
export function normalizeAndValidateSteps(steps: ProductionRouteStepInput[]): NormalizedProductionRouteStep[] {
  const normalized: NormalizedProductionRouteStep[] = (steps || []).map((step) => ({
    sequence: Number(step.sequence),
    step_code: String(step.step_code).trim().toUpperCase(),
    name: String(step.name).trim(),
    work_center: step.work_center === undefined || step.work_center === null || step.work_center === ''
      ? null
      : String(step.work_center).trim(),
    work_center_id: step.work_center_id ?? null,
    standard_time_minutes: Number(step.standard_time_minutes ?? 0),
    setup_time_minutes: Number(step.setup_time_minutes ?? 0),
    instructions: step.instructions === undefined || step.instructions === null || step.instructions === ''
      ? null
      : String(step.instructions),
    quality_check_required: step.quality_check_required ?? false,
    is_active: step.is_active ?? true,
  }));

  const duplicatedSequences = findDuplicates(normalized.map((step) => step.sequence));
  if (duplicatedSequences.length > 0) {
    throw new BusinessRuleError(
      `Sequencia de operacoes duplicada no roteiro: ${duplicatedSequences.join(', ')}.`,
      { rule: PRODUCTION_ROUTE_RULES.SEQUENCE_DUPLICATE, duplicated: duplicatedSequences },
    );
  }

  const ordered = [...normalized].sort((a, b) => a.sequence - b.sequence);
  const expected = ordered.map((_step, index) => index + 1);
  const received = ordered.map((step) => step.sequence);
  const hasGap = received.some((value, index) => value !== expected[index]);

  if (hasGap) {
    throw new BusinessRuleError(
      `Sequencia de operacoes com buraco: esperado ${expected.join(', ')} e recebido ${received.join(', ')}. As etapas devem ser numeradas de 1 a N, sem pular numero.`,
      { rule: PRODUCTION_ROUTE_RULES.SEQUENCE_GAP, expected, received },
    );
  }

  const duplicatedCodes = findDuplicates(ordered.map((step) => step.step_code));
  if (duplicatedCodes.length > 0) {
    throw new BusinessRuleError(
      `Codigo de etapa duplicado no roteiro: ${duplicatedCodes.join(', ')}.`,
      { rule: PRODUCTION_ROUTE_RULES.STEP_CODE_DUPLICATE, duplicated: duplicatedCodes },
    );
  }

  return ordered;
}

/**
 * Exige que o roteiro tenha ao menos uma etapa (usado na ativacao).
 *
 * @param steps - Etapas do roteiro.
 * @throws {BusinessRuleError} 422 com `details.rule = 'G5-SEQ-EMPTY'`.
 */
export function assertHasSteps(steps: unknown[]): void {
  if (!steps || steps.length === 0) {
    throw new BusinessRuleError(
      'Roteiro sem nenhuma etapa nao pode ser ativado.',
      { rule: PRODUCTION_ROUTE_RULES.SEQUENCE_EMPTY },
    );
  }
}

/**
 * Soma o tempo padrao das etapas ATIVAS, para gravar em
 * `production_routes.total_standard_time_minutes`.
 *
 * Convencao (deliberada, para nao conflitar com o OEE): so entra
 * `standard_time_minutes` — tempo padrao POR UNIDADE. `setup_time_minutes` e
 * tempo por LOTE e NAO e somado aqui, exatamente como ja documentado em
 * `GetOeeReportUseCase` e `reports/domain/reportTypes.ts`. O calculo de carga
 * por centro de trabalho (`SequelizeWorkCenterRepository.aggregateLoadByWorkCenter`)
 * soma os dois, mas la o setup e contado uma vez por etapa, nao por unidade.
 *
 * @param steps - Etapas normalizadas.
 * @returns Total em minutos, arredondado a 2 casas (coluna DECIMAL(10,2)).
 */
export function computeTotalStandardTimeMinutes(steps: Array<{ standard_time_minutes: number; is_active: boolean }>): number {
  const total = (steps || [])
    .filter((step) => step.is_active !== false)
    .reduce((sum, step) => sum + Number(step.standard_time_minutes || 0), 0);

  return Math.round(total * 100) / 100;
}

/**
 * Soma o tempo de setup das etapas ativas (derivado, NAO persistido — ver
 * {@link computeTotalStandardTimeMinutes} para o porque da separacao).
 *
 * @param steps - Etapas normalizadas.
 * @returns Total de setup em minutos, arredondado a 2 casas.
 */
export function computeTotalSetupTimeMinutes(steps: Array<{ setup_time_minutes: number; is_active: boolean }>): number {
  const total = (steps || [])
    .filter((step) => step.is_active !== false)
    .reduce((sum, step) => sum + Number(step.setup_time_minutes || 0), 0);

  return Math.round(total * 100) / 100;
}

/**
 * Localiza valores repetidos em uma lista (helper interno).
 *
 * @param values - Lista de valores comparaveis por igualdade estrita.
 * @returns Valores que aparecem mais de uma vez, sem repeticao.
 */
function findDuplicates<T>(values: T[]): T[] {
  const seen = new Set<T>();
  const duplicated = new Set<T>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicated.add(value);
    }
    seen.add(value);
  }

  return [...duplicated];
}

export default PRODUCTION_ROUTE_RULES;
