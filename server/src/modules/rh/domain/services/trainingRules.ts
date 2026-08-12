/**
 * 📐 Regras de negócio puras (sem I/O) de Treinamentos — RF-RH-055 a 059.
 *
 * @module modules/rh/domain/services/trainingRules
 */

/**
 * RF-RH-057 — calcula `valid_until = completed_at + validity_months`, com a
 * mesma saturação de fim de mês que o PostgreSQL/JS `Date` aplicam (dia
 * ajustado para o último dia do mês de destino quando o mês de origem tem
 * mais dias — ex.: 31/01 + 1 mês → 28/02, não 03/03).
 *
 * @param completedAt - Data de conclusão (`YYYY-MM-DD`).
 * @param validityMonths - `HrTrainingCourse.validity_months` (`null` = sem vencimento).
 * @returns `valid_until` (`YYYY-MM-DD`), ou `null` quando `validityMonths` é `null`/ausente.
 */
export function calculateValidUntil(completedAt: string, validityMonths: number | null | undefined): string | null {
  if (validityMonths === null || validityMonths === undefined) return null;
  const [year, month, day] = completedAt.split('-').map(Number);
  const totalMonths = month - 1 + validityMonths;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const saturatedDay = Math.min(day, lastDayOfTargetMonth);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${targetYear}-${pad(targetMonth)}-${pad(saturatedDay)}`;
}

/**
 * RF-RH-059 — mensagem de aviso quando um curso normativo (`is_normative`)
 * tem `validity_months` informado livremente pelo RH, sem confirmação
 * síncrona com a SST (decisão registrada: sem integração síncrona nesta
 * rodada — ver `docs/business/BLOCO_6_RH_API.md` §11).
 */
export const NORMATIVE_VALIDITY_WARNING =
  'Confirme este valor com a SST — treinamentos normativos têm validade definida pela SST (RF-RH-059).';

/**
 * @param isNormative - `HrTrainingCourse.is_normative`.
 * @returns O texto de aviso quando `isNormative` for `true`, senão `null`.
 */
export function normativeWarning(isNormative: boolean): string | null {
  return isNormative ? NORMATIVE_VALIDITY_WARNING : null;
}

/**
 * RF-RH-058 — um treinamento está vencido/ausente para efeito do relatório
 * "quem não pode operar".
 *
 * @param validUntil - `HrEmployeeTraining.valid_until` do registro mais recente (`null` = sem vencimento definido, mas o registro existe).
 * @param today - Data de referência (`YYYY-MM-DD`, injetável para teste determinístico).
 * @returns `true` se `validUntil` está definido e já passou.
 */
export function isTrainingExpired(validUntil: string | null | undefined, today: string = new Date().toISOString().slice(0, 10)): boolean {
  if (!validUntil) return false;
  return validUntil < today;
}
