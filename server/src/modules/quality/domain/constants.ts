/**
 * Constantes de negócio do módulo Qualidade — **G7, inspeção como entidade e
 * gate de liberação de lote** (decisão D-H do dono do produto em 2026-08-10,
 * registrada em `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4).
 *
 * Mesmo padrão já aprovado em `modules/purchases/domain/constants.ts` (G11) e
 * `modules/juridico/domain/constants.ts` (RF-JUR-003): a regra mora numa
 * função pura, testável sem banco, e o identificador da regra viaja em
 * `details.rule` de todo erro de negócio para que o teste (e a tela) saibam
 * que a recusa veio da regra certa, e não de um mock incompleto.
 *
 * ## A regra, em uma frase
 *
 * Um lote só sai de `quarantine`/`blocked` se a inspeção **mais recente**
 * daquele lote tiver veredito `approved` ou `approved_under_concession`.
 *
 * ## Por que "a mais recente", e não "existe alguma aprovada"
 *
 * Porque é a única leitura que sobrevive ao retrabalho e à reprovação
 * posterior. Se a regra fosse "existe alguma inspeção aprovada", um lote
 * aprovado na entrada e **reprovado depois** (defeito descoberto em processo,
 * RNC aberta, lote bloqueado) continuaria liberável para sempre com base na
 * aprovação antiga — o oposto do que a ISO 9001 §8.7 manda ("prevenir uso ou
 * entrega não pretendidos"). Com "a mais recente", a re-inspeção depois do
 * retrabalho é o mecanismo natural de reabertura: basta registrar a nova
 * inspeção, sem nenhum estado extra para administrar.
 *
 * ## O que NÃO está aqui (e por quê)
 *
 * Não há AQL, nível de inspeção, nem tabela Ac/Re. A ISO 2859-1 fornece as
 * tabelas, mas **a escolha dos números é decisão da Engenharia da Qualidade /
 * contrato**, e o dono não a tomou (ver
 * `docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md` §Decisão 5,
 * item (c), e a pendência 4 de "o que o dono precisa confirmar"). Inventar um
 * AQL aqui seria transformar suposição em norma. O veredito é do inspetor
 * humano; o sistema guarda a evidência e faz o gate.
 *
 * @module modules/quality/domain/constants
 */

/**
 * Identificador da regra, propagado em `details.rule` de todo erro de negócio
 * do gate de qualidade.
 */
export const QUALITY_INSPECTION_RULE = 'G7';

/** Estágios válidos de inspeção (espelham o ENUM `quality_inspections.stage`). */
export const INSPECTION_STAGES = ['incoming', 'in_process', 'final'] as const;

/** Vereditos válidos (espelham o ENUM `quality_inspections.verdict`). */
export const INSPECTION_VERDICTS = ['approved', 'rejected', 'approved_under_concession'] as const;

/**
 * Vereditos que autorizam a liberação do lote.
 *
 * `approved_under_concession` entra aqui **de propósito**: a aceitação sob
 * concessão é um desfecho previsto pela ISO 9001 §8.7 e o material realmente
 * segue para uso — o que a norma exige é que a decisão fique registrada e
 * justificada, não que seja impossível. A justificativa é obrigatória na
 * criação da inspeção (ver `CreateQualityInspectionUseCase`).
 */
export const RELEASING_VERDICTS = ['approved', 'approved_under_concession'] as const;

/** Estágio da inspeção. */
export type InspectionStage = (typeof INSPECTION_STAGES)[number];

/** Veredito da inspeção. */
export type InspectionVerdict = (typeof INSPECTION_VERDICTS)[number];

/**
 * Motivo pelo qual a liberação de um lote foi recusada pelo gate (G7).
 *
 * - `no_inspection`: nenhuma inspeção registrada para o lote — é o caso do
 *   "clique com observação livre" que existia antes de 2026-08-10;
 * - `last_inspection_rejected`: a inspeção mais recente reprovou o lote.
 */
export type LotReleaseDenialReason = 'no_inspection' | 'last_inspection_rejected';

/** Resultado da avaliação do gate de liberação. */
export type LotReleaseDecision =
  | { allowed: true; inspectionId: number; verdict: InspectionVerdict }
  | { allowed: false; reason: LotReleaseDenialReason; inspectionId: number | null; verdict: InspectionVerdict | null };

/** Forma mínima de inspeção lida pelo gate (o registro completo tem mais campos). */
interface InspectionLike {
  id: number;
  verdict: string;
}

/**
 * Decide se um lote pode ser liberado, dada a inspeção mais recente dele
 * (G7 / ISO 9001 §8.6).
 *
 * Função pura: não toca banco, não lança — devolve a decisão para que o caso
 * de uso monte o erro com `details` completo. É o ponto único onde a regra
 * mora; `ReleaseLotUseCase` apenas a consulta.
 *
 * @param latestInspection - Inspeção mais recente do lote (`inspected_at DESC`, desempate por `id DESC`), ou `null` se não houver nenhuma.
 * @returns Decisão do gate: liberada (com a inspeção que a autoriza) ou recusada (com o motivo).
 */
export function decideLotRelease(latestInspection: InspectionLike | null | undefined): LotReleaseDecision {
  if (!latestInspection) {
    return { allowed: false, reason: 'no_inspection', inspectionId: null, verdict: null };
  }

  const verdict = latestInspection.verdict as InspectionVerdict;
  if ((RELEASING_VERDICTS as readonly string[]).includes(verdict)) {
    return { allowed: true, inspectionId: latestInspection.id, verdict };
  }

  return {
    allowed: false,
    reason: 'last_inspection_rejected',
    inspectionId: latestInspection.id,
    verdict,
  };
}
