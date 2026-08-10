/**
 * Regras de dominio do Apontamento de Producao obrigatorio (gap G4).
 *
 * ## Por que isto e LEI, e nao preferencia de processo
 *
 * A Evok Audio fabrica alto-falantes (CNAE 2640-0/00, **divisao 26**). O
 * **Ajuste SINIEF 2/09, clausula 3a §7o III** (redacao do Ajuste SINIEF
 * 46/22) obriga os "demais estabelecimentos industriais" das divisoes 10 a 32
 * ao **Bloco K** da EFD ICMS/IPI desde **01/01/2019**. Dois dispositivos do
 * mesmo texto fecham a discussao:
 *
 * - **§10** — *"Somente a escrituracao completa do Bloco K na EFD desobriga a
 *   escrituracao do Livro modelo 3"*. Quem transmite apenas K200/K280
 *   continua legalmente obrigado ao **Livro Registro de Controle da Producao
 *   e do Estoque (modelo 3)**, que exige consumo e producao **por ordem de
 *   producao** — exatamente o que o apontamento por etapa registra.
 * - **§13** — a escrituracao simplificada da Lei 13.874/2019 *"implica a
 *   guarda da informacao da escrituracao completa do Bloco K que podera ser
 *   exigida em procedimentos de fiscalizacao"*. **Dispensa transmitir, nao
 *   dispensa registrar.** O dado tem de existir no ERP de qualquer forma.
 *
 * Some-se a isso a exigencia de **custo integrado e coordenado com o restante
 * da escrituracao** (RIR/2018): estoque de produto acabado valorizado com
 * mao-de-obra direta R$ 0,00 nao e custo real — e custo incompleto, sujeito a
 * arbitramento pelo Fisco.
 *
 * Fonte e ressalvas (inclusive os pontos marcados `[NAO CONFIRMADO NA FONTE]`,
 * que NAO sao tratados aqui como norma):
 * `docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`, Decisao 4.
 *
 * ## O que este modulo resolve, concretamente
 *
 * Antes do G4, `ChangeProductionOrderStatusUseCase` tinha tres saidas
 * silenciosas que produziam OP concluida sem nenhum lastro de execucao:
 *
 * 1. **`reconcileTrackingOnCompletion` retornava cedo** quando a OP nao tinha
 *    NENHUM apontamento (*"fluxo simples permanece valido"*);
 * 2. **`calculateLaborCost` retornava 0** — sem apontamento, sem `started_at`/
 *    `finished_at`, ou com duracao nao positiva, a etapa era pulada com
 *    `continue` e o custo de mao-de-obra saia zero **sem erro nenhum**;
 * 3. **taxa horaria ausente virava zero**: centro de trabalho com
 *    `cost_per_hour` nulo/zerado e `default_labor_rate_per_hour` zerado
 *    davam custo de MO zero, de novo em silencio.
 *
 * As tres viravam a mesma coisa no balanco: **produto acabado entrando em
 * estoque sem mao-de-obra**. Este modulo transforma cada uma delas em erro de
 * regra de negocio com codigo proprio em `details.rule`.
 *
 * ## Escopo deliberado — o que este modulo NAO faz
 *
 * - **Nao gera os registros K200/K230/K235/K280.** O leiaute e definido em Ato
 *   COTEPE e muda; gerar arquivo esta fora do G4. O G4 garante que o **dado
 *   existe** para ser gerado.
 * - **Nao amarra a OP a uma revisao de roteiro.** `production_orders` nao tem
 *   a coluna e cria-la exige migration + decisao de negocio (dependencia
 *   registrada pelo agente do G5 no commit `c21f81b`). A mitigacao possivel
 *   sem migration esta em
 *   {@link module:modules/production/application/use-cases/ChangeProductionOrderStatusUseCase}:
 *   ao liberar a OP, cada linha de apontamento nasce apontando para o
 *   `production_route_step_id` da revisao ativa **naquele momento**, e roteiro
 *   ativo e imutavel (regra G5). O vinculo COMO EXECUTADO fica gravado nas
 *   linhas de apontamento, nao no cabecalho da OP.
 *
 * Regras puras: sem Sequelize, sem HTTP, sem `process.env` lido aqui dentro —
 * o modo de vigencia chega por parametro. Mesmo padrao de
 * `productionRouteRules.ts` (G5) e `purchases/domain/constants.ts` (G11).
 *
 * @module modules/production/domain/productionTrackingRules
 */

import { BusinessRuleError } from '../../../errors';

/**
 * Catalogo de codigos devolvidos em `error.details.rule`.
 *
 * O prefixo `G4-` identifica o gap de origem, no mesmo padrao de
 * `PRODUCTION_ROUTE_RULES` (`G5-`). Todo erro lancado por este modulo carrega
 * um destes codigos — o cliente nunca precisa casar mensagem por substring.
 */
export const PRODUCTION_TRACKING_RULES = {
  /** OP sem NENHUMA linha de apontamento. Bloco K/Livro modelo 3 sem lastro. */
  TRACKING_REQUIRED: 'G4-TRACKING-REQUIRED',
  /** Ha etapa `pending`/`in_progress`/`paused` — a OP nao terminou de fato. */
  TRACKING_STEP_OPEN: 'G4-TRACKING-STEP-OPEN',
  /** Existe apontamento, mas nenhuma etapa `completed` (ex.: tudo `skipped`). */
  TRACKING_NO_COMPLETED_STEP: 'G4-TRACKING-NO-COMPLETED',
  /** Etapa `completed` sem `started_at`/`finished_at` ou com duracao <= 0. */
  TRACKING_TIME_MISSING: 'G4-TRACKING-TIME-MISSING',
  /** `quantity_produced` maior que o apontado na ultima etapa concluida. */
  TRACKING_QUANTITY_EXCEEDS: 'G4-TRACKING-QTY-EXCEEDS',
  /** Nenhuma taxa horaria resolvivel: custo de mao-de-obra sairia zero. */
  LABOR_RATE_MISSING: 'G4-LABOR-RATE-MISSING',
  /**
   * `PRODUCTION_TRACKING_REQUIRED` com valor fora de `block`/`warn`.
   *
   * NAO e erro HTTP: e codigo de log. Valor invalido cai em `block` (o lado
   * seguro — a lei aplicada), e o fato e logado com este codigo. Um typo
   * jamais pode DESLIGAR uma regra fiscal em silencio.
   */
  MODE_INVALID: 'G4-TRACKING-MODE-INVALID',
} as const;

/** Codigo de regra do modulo de apontamento. */
export type ProductionTrackingRule = typeof PRODUCTION_TRACKING_RULES[keyof typeof PRODUCTION_TRACKING_RULES];

/**
 * Modo de vigencia da obrigatoriedade de apontamento.
 *
 * - `block` (**padrao**) — a lei aplicada: sem apontamento a OP nao conclui, e
 *   liberar a OP materializa as etapas do roteiro ativo.
 * - `warn` — janela de transicao (UAT / chao de fabrica ainda sem roteiro
 *   cadastrado): a pendencia e registrada em log estruturado e a conclusao
 *   passa. **Nao materializa etapas na liberacao** — ligar a materializacao
 *   sem ligar o bloqueio criaria etapas pendentes que a regra pre-existente de
 *   "etapa em aberto" barraria assim mesmo, tornando o `warn` inutil.
 *
 * Boa pratica recomendada em `PESQUISA_NORMATIVA_...md`, Decisao 4 ("Regra
 * macia"). **`warn` e temporario por desenho** e precisa estar desligado no
 * Go-Live — ver `docs/tributario/04-BLOCO_K.md`.
 */
export type TrackingEnforcementMode = 'block' | 'warn';

/** Modos aceitos em `PRODUCTION_TRACKING_REQUIRED`. */
export const TRACKING_ENFORCEMENT_MODES: readonly TrackingEnforcementMode[] = ['block', 'warn'];

/** Modo aplicado quando a variavel de ambiente esta ausente ou invalida. */
export const DEFAULT_TRACKING_ENFORCEMENT_MODE: TrackingEnforcementMode = 'block';

/** Resultado da leitura do modo, com o valor invalido preservado para log. */
export interface TrackingEnforcementModeResolution {
  /** Modo efetivamente aplicado. */
  mode: TrackingEnforcementMode;
  /** Valor bruto recebido, presente APENAS quando ele era invalido. */
  invalidValue?: string;
}

/**
 * Etapa de apontamento como as consultas do repositorio a devolvem.
 *
 * Numeros decimais chegam do Postgres como STRING (`DECIMAL(18,6)`), por isso
 * todo campo numerico aceita `string` e e convertido aqui dentro.
 */
export interface TrackingStepSnapshot {
  id?: number;
  sequence?: number;
  status?: string;
  started_at?: Date | string | null;
  finished_at?: Date | string | null;
  quantity_good?: number | string | null;
  routeStep?: {
    id?: number;
    work_center_id?: number | null;
    workCenter?: { id?: number; cost_per_hour?: number | string | null } | null;
  } | null;
}

/** Status de apontamento que ainda nao terminaram. */
const OPEN_STEP_STATUSES = ['pending', 'in_progress', 'paused'];

/** Tolerancia de comparacao de quantidade (mesma ja usada no modulo). */
const QUANTITY_EPSILON = 0.0001;

/**
 * Le o modo de vigencia a partir do valor bruto da variavel de ambiente.
 *
 * Ausente/vazio → `block` (a lei). Valor desconhecido → tambem `block`, porem
 * com `invalidValue` preenchido para que o chamador registre um log de erro:
 * `PRODUCTION_TRACKING_REQUIRED=blok` nao pode virar "obrigatoriedade
 * desligada" sem ninguem perceber.
 *
 * @param rawValue - Conteudo de `process.env.PRODUCTION_TRACKING_REQUIRED`.
 * @returns Modo aplicado e, quando for o caso, o valor invalido recebido.
 */
export function resolveTrackingEnforcementMode(rawValue?: string | null): TrackingEnforcementModeResolution {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
    return { mode: DEFAULT_TRACKING_ENFORCEMENT_MODE };
  }

  const normalized = String(rawValue).trim().toLowerCase();
  if ((TRACKING_ENFORCEMENT_MODES as readonly string[]).includes(normalized)) {
    return { mode: normalized as TrackingEnforcementMode };
  }

  return { mode: DEFAULT_TRACKING_ENFORCEMENT_MODE, invalidValue: String(rawValue) };
}

/**
 * Converte a duracao apontada de uma etapa em horas.
 *
 * Devolve `null` (e nao `0`) quando a duracao **nao pode ser medida** —
 * faltando `started_at`/`finished_at`, com data invalida, ou com duracao nao
 * positiva. A distincao importa: `0` seria somado ao custo como se a etapa
 * tivesse custado nada, que e justamente o zero silencioso que o G4 elimina.
 *
 * @param step - Etapa de apontamento.
 * @returns Horas apontadas (> 0), ou `null` se nao mensuravel.
 */
export function computeStepHours(step: TrackingStepSnapshot): number | null {
  if (!step.started_at || !step.finished_at) return null;

  const startedAt = new Date(step.started_at).getTime();
  const finishedAt = new Date(step.finished_at).getTime();
  if (!Number.isFinite(startedAt) || !Number.isFinite(finishedAt)) return null;

  const hours = (finishedAt - startedAt) / 3_600_000;
  if (!Number.isFinite(hours) || hours <= 0) return null;

  return hours;
}

/**
 * Resolve a taxa horaria de mao-de-obra de uma etapa.
 *
 * **A logica de resolucao e identica a que ja existia** em
 * `ChangeProductionOrderStatusUseCase.calculateLaborCost` — o G4 nao muda
 * nenhum numero de custo, apenas passa a exigir que o numero resolvido seja
 * positivo. Ordem: `production_route_steps.work_center_id` →
 * `work_centers.cost_per_hour`; na ausencia do centro (ou de um valor), o
 * fallback global `production_cost_settings.default_labor_rate_per_hour`.
 *
 * Observe que um centro de trabalho COM `cost_per_hour = 0` **nao** cai no
 * fallback (comportamento historico preservado) — ele resolve para `0`, o que
 * {@link assertLaborRateIsResolvable} passa a tratar como configuracao
 * incompleta em vez de custo zero valido.
 *
 * @param step - Etapa de apontamento com `routeStep.workCenter` incluido.
 * @param fallbackRatePerHour - `default_labor_rate_per_hour` da configuracao.
 * @returns Taxa resolvida e sua origem, ou `null` se nao houver taxa positiva.
 */
export function resolveStepLaborRate(
  step: TrackingStepSnapshot,
  fallbackRatePerHour: number,
): { rate: number; source: 'work_center' | 'default_labor_rate' } | null {
  const workCenter = step.routeStep?.workCenter;
  const hasWorkCenterRate = !!workCenter
    && workCenter.cost_per_hour !== null
    && workCenter.cost_per_hour !== undefined;

  const rate = hasWorkCenterRate
    ? parseFloat(String(workCenter!.cost_per_hour))
    : Number(fallbackRatePerHour);

  if (!Number.isFinite(rate) || rate <= 0) return null;

  return { rate, source: hasWorkCenterRate ? 'work_center' : 'default_labor_rate' };
}

/**
 * Exige que nenhuma etapa esteja em aberto (`pending`/`in_progress`/`paused`).
 *
 * Regra pre-existente (reconciliacao 1.3, bloqueador "apontamento x OP
 * desconectados"); o G4 apenas lhe da um `details.rule`. **Vale nos dois
 * modos** — nao faz parte da transicao: se o chao de fabrica ja abriu etapas,
 * fecha-las e obrigacao independente da vigencia do G4.
 *
 * @param orderNumber - Numero da OP, para a mensagem.
 * @param steps - Todas as etapas de apontamento da OP.
 * @throws {BusinessRuleError} 422 com `details.rule = 'G4-TRACKING-STEP-OPEN'`.
 */
export function assertNoOpenSteps(orderNumber: string, steps: TrackingStepSnapshot[]): void {
  const openSteps = (steps || []).filter((step) => OPEN_STEP_STATUSES.includes(String(step.status)));
  if (openSteps.length === 0) return;

  throw new BusinessRuleError(
    `OP ${orderNumber} nao pode ser concluida com ${openSteps.length} etapa(s) de apontamento em aberto.`,
    {
      rule: PRODUCTION_TRACKING_RULES.TRACKING_STEP_OPEN,
      open_steps: openSteps.map((step) => ({ id: step.id, sequence: step.sequence, status: step.status })),
    },
  );
}

/**
 * Exige que a OP tenha ao menos uma linha de apontamento.
 *
 * Substitui o `return` silencioso de `reconcileTrackingOnCompletion`. Sem
 * nenhuma linha nao ha como demonstrar consumo e producao por ordem — nem para
 * o Livro modelo 3 (§10), nem para o K230/K235.
 *
 * @param orderNumber - Numero da OP.
 * @param steps - Etapas de apontamento da OP.
 * @throws {BusinessRuleError} 422 com `details.rule = 'G4-TRACKING-REQUIRED'`.
 */
export function assertTrackingExists(orderNumber: string, steps: TrackingStepSnapshot[]): void {
  if (steps && steps.length > 0) return;

  throw new BusinessRuleError(
    `Nao e possivel concluir a OP ${orderNumber} sem nenhum apontamento de producao. `
    + 'Registre as etapas executadas (Producao > Chao de Fabrica) antes de concluir: o consumo e a producao '
    + 'por ordem sao exigidos pelo Livro Registro de Controle da Producao e do Estoque / Bloco K, e sem '
    + 'apontamento o produto acabado entraria em estoque sem custo de mao-de-obra. '
    + 'Se o produto ainda nao tem roteiro, cadastre-o em Producao > Roteiros de Fabricacao e libere a OP novamente.',
    { rule: PRODUCTION_TRACKING_RULES.TRACKING_REQUIRED, orderNumber },
  );
}

/**
 * Exige ao menos uma etapa `completed`.
 *
 * Fecha o buraco do "tudo pulado": uma OP com todas as etapas `skipped` tem
 * linhas de apontamento, mas nenhuma hora trabalhada — resultado identico a
 * nao ter apontamento nenhum.
 *
 * @param orderNumber - Numero da OP.
 * @param steps - Etapas de apontamento da OP.
 * @throws {BusinessRuleError} 422 com `details.rule = 'G4-TRACKING-NO-COMPLETED'`.
 */
export function assertHasCompletedStep(orderNumber: string, steps: TrackingStepSnapshot[]): void {
  const completed = (steps || []).filter((step) => String(step.status) === 'completed');
  if (completed.length > 0) return;

  throw new BusinessRuleError(
    `Nao e possivel concluir a OP ${orderNumber}: existe apontamento, mas nenhuma etapa foi concluida `
    + `(${(steps || []).length} etapa(s), todas puladas ou nao executadas). Pelo menos uma etapa precisa ser `
    + 'efetivamente executada e concluida para que haja producao apontada e custo de mao-de-obra real.',
    {
      rule: PRODUCTION_TRACKING_RULES.TRACKING_NO_COMPLETED_STEP,
      orderNumber,
      steps: (steps || []).map((step) => ({ id: step.id, sequence: step.sequence, status: step.status })),
    },
  );
}

/**
 * Exige que `quantity_produced` nao exceda a quantidade boa apontada na ultima
 * etapa concluida — a saida boa do processo e limitada pela operacao final.
 *
 * Regra pre-existente (reconciliacao 1.3); o G4 lhe da `details.rule`.
 *
 * @param orderNumber - Numero da OP.
 * @param steps - Etapas de apontamento da OP, ordenadas por `sequence`.
 * @param producedQty - Quantidade produzida declarada na conclusao.
 * @throws {BusinessRuleError} 422 com `details.rule = 'G4-TRACKING-QTY-EXCEEDS'`.
 */
export function assertProducedQuantityMatchesTracking(
  orderNumber: string,
  steps: TrackingStepSnapshot[],
  producedQty: number,
): void {
  const completedSteps = (steps || []).filter((step) => String(step.status) === 'completed');
  if (completedSteps.length === 0) return;

  const lastStep = completedSteps[completedSteps.length - 1];
  const lastGood = parseFloat(String(lastStep.quantity_good ?? 0));
  if (producedQty <= lastGood + QUANTITY_EPSILON) return;

  throw new BusinessRuleError(
    `quantity_produced (${producedQty}) excede a quantidade boa apontada na ultima etapa (${lastGood}) da OP ${orderNumber}.`,
    {
      rule: PRODUCTION_TRACKING_RULES.TRACKING_QUANTITY_EXCEEDS,
      last_step_sequence: lastStep.sequence,
      last_step_quantity_good: lastGood,
      quantity_produced: producedQty,
    },
  );
}

/**
 * Exige que TODA etapa `completed` tenha duracao mensuravel.
 *
 * Ate o G4, uma etapa concluida sem `started_at`/`finished_at` era pulada por
 * um `continue` dentro de `calculateLaborCost` e simplesmente nao entrava no
 * custo — a OP concluia com mao-de-obra menor (ou zero) sem qualquer aviso.
 *
 * @param orderNumber - Numero da OP.
 * @param steps - Etapas com `started_at`/`finished_at`.
 * @throws {BusinessRuleError} 422 com `details.rule = 'G4-TRACKING-TIME-MISSING'`.
 */
export function assertCompletedStepsHaveMeasurableTime(orderNumber: string, steps: TrackingStepSnapshot[]): void {
  const offenders = (steps || [])
    .filter((step) => String(step.status) === 'completed')
    .filter((step) => computeStepHours(step) === null);

  if (offenders.length === 0) return;

  throw new BusinessRuleError(
    `Nao e possivel concluir a OP ${orderNumber}: ${offenders.length} etapa(s) concluida(s) sem tempo apontado `
    + '(inicio e/ou fim ausentes, ou duracao nao positiva). Sem horas apontadas nao ha custo de mao-de-obra real, '
    + 'e o produto acabado entraria em estoque com custo incompleto.',
    {
      rule: PRODUCTION_TRACKING_RULES.TRACKING_TIME_MISSING,
      orderNumber,
      steps: offenders.map((step) => ({
        id: step.id,
        sequence: step.sequence,
        started_at: step.started_at ?? null,
        finished_at: step.finished_at ?? null,
      })),
    },
  );
}

/**
 * Exige que TODA etapa `completed` tenha taxa horaria positiva resolvivel.
 *
 * Sem isto, um centro de trabalho com `cost_per_hour` zerado (ou a ausencia do
 * fallback `default_labor_rate_per_hour`) produzia custo de mao-de-obra zero em
 * silencio. Para o RIR/2018 isso descaracteriza o custo integrado e coordenado
 * e expoe a empresa ao arbitramento do custo dos estoques.
 *
 * @param orderNumber - Numero da OP.
 * @param steps - Etapas com `routeStep.workCenter.cost_per_hour` incluido.
 * @param fallbackRatePerHour - `production_cost_settings.default_labor_rate_per_hour`.
 * @throws {BusinessRuleError} 422 com `details.rule = 'G4-LABOR-RATE-MISSING'`.
 */
export function assertLaborRateIsResolvable(
  orderNumber: string,
  steps: TrackingStepSnapshot[],
  fallbackRatePerHour: number,
): void {
  const offenders = (steps || [])
    .filter((step) => String(step.status) === 'completed')
    .filter((step) => resolveStepLaborRate(step, fallbackRatePerHour) === null);

  if (offenders.length === 0) return;

  throw new BusinessRuleError(
    `Nao e possivel concluir a OP ${orderNumber}: ${offenders.length} etapa(s) concluida(s) sem taxa horaria de `
    + 'mao-de-obra configurada. Defina `cost_per_hour` no centro de trabalho da etapa, ou uma taxa padrao em '
    + 'Producao > Configuracao de Custeio (`default_labor_rate_per_hour`). Com taxa zero o custo de mao-de-obra '
    + 'sairia zero e o estoque ficaria subavaliado.',
    {
      rule: PRODUCTION_TRACKING_RULES.LABOR_RATE_MISSING,
      orderNumber,
      default_labor_rate_per_hour: Number(fallbackRatePerHour) || 0,
      steps: offenders.map((step) => ({
        id: step.id,
        sequence: step.sequence,
        work_center_id: step.routeStep?.work_center_id ?? null,
        work_center_cost_per_hour: step.routeStep?.workCenter?.cost_per_hour ?? null,
      })),
    },
  );
}

export default PRODUCTION_TRACKING_RULES;
