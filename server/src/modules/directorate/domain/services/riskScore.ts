/**
 * Cálculo puro do `risk_score` de um risco corporativo (Diretoria).
 *
 * `risk_score = probability × impact`, cada um mapeado
 * `low=1, medium=2, high=3, critical=4` (escala 1–4, ISO 31000-friendly:
 * matriz 4×4, score de 1 a 16). É a ÚNICA fonte da fórmula — o use case de
 * criação/atualização de risco chama esta função e NUNCA aceita
 * `risk_score` vindo do payload HTTP, para que o cliente da API não possa
 * "decidir" a própria severidade do risco.
 *
 * @module modules/directorate/domain/services/riskScore
 */

/** Nível de probabilidade/impacto (espelha o ENUM `business_risks.probability`/`.impact`). */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** Peso numérico de cada nível, 1 (baixo) a 4 (crítico). */
const LEVEL_WEIGHT: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/**
 * Calcula o score de um risco a partir de probabilidade e impacto.
 *
 * @param probability - Probabilidade do risco se materializar.
 * @param impact - Impacto caso o risco se materialize.
 * @returns Score inteiro de 1 a 16 (`LEVEL_WEIGHT[probability] * LEVEL_WEIGHT[impact]`).
 */
export function calculateRiskScore(probability: RiskLevel, impact: RiskLevel): number {
  return LEVEL_WEIGHT[probability] * LEVEL_WEIGHT[impact];
}
