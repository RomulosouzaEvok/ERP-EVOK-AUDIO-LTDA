/**
 * 📐 Regras de negócio puras (sem I/O) de Afastamentos — RF-RH-044 a 049,
 * UC-71.
 *
 * @module modules/rh/domain/services/absenceRules
 */

/** CLT art. 392 — licença-maternidade: 120 dias corridos (180 com Empresa Cidadã). */
export const MATERNITY_LEAVE_DEFAULT_DAYS = 120;
export const MATERNITY_LEAVE_EXTENDED_DAYS = 180;

/** ADCT art. 10 §1º — licença-paternidade: 5 dias corridos. */
export const PATERNITY_LEAVE_DEFAULT_DAYS = 5;

/** Tipos de afastamento cujo `cid` não é aplicável (nunca gera warning por ausência de CID). */
const CID_NOT_APPLICABLE_TYPES: readonly string[] = ['maternidade', 'paternidade'];

/**
 * Soma `days` dias corridos a uma data `YYYY-MM-DD`.
 *
 * @param startDate - Data base (`YYYY-MM-DD`).
 * @param days - Dias corridos a somar.
 * @returns Data resultante (`YYYY-MM-DD`).
 */
export function addDays(startDate: string, days: number): string {
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * RF-RH-046 — calcula o default de `expected_end_date` por tipo de
 * afastamento, quando não informado no payload.
 *
 * @param type - Tipo do afastamento (`hr_absences.type`).
 * @param startDate - Data de início (`YYYY-MM-DD`).
 * @param extendedProgram - Adesão ao Empresa Cidadã (só se aplica a `maternidade`; `[VERIFICAR COM RH DA EMPRESA]`).
 * @returns Data prevista de fim (`YYYY-MM-DD`), ou `null` quando o tipo não tem default (RH informa manualmente).
 */
export function calculateDefaultExpectedEndDate(
  type: string,
  startDate: string,
  extendedProgram: boolean = false,
): string | null {
  if (type === 'maternidade') {
    const days = extendedProgram ? MATERNITY_LEAVE_EXTENDED_DAYS : MATERNITY_LEAVE_DEFAULT_DAYS;
    return addDays(startDate, days);
  }
  if (type === 'paternidade') {
    return addDays(startDate, PATERNITY_LEAVE_DEFAULT_DAYS);
  }
  return null;
}

/**
 * RF-RH-044 — `cid` ausente gera warning (não bloqueia), exceto para os
 * tipos em que CID não é aplicável de imediato.
 *
 * @param type - Tipo do afastamento.
 * @param cid - CID informado no payload (ou `undefined`/`null`).
 * @returns `true` se a ausência de CID deve gerar warning.
 */
export function shouldWarnMissingCid(type: string, cid: string | null | undefined): boolean {
  return !cid && !CID_NOT_APPLICABLE_TYPES.includes(type);
}

/**
 * Duração em dias corridos (inclusive) de um intervalo `[start, end]`.
 *
 * @param startDate - Data de início (`YYYY-MM-DD`).
 * @param endDate - Data de fim (`YYYY-MM-DD`).
 * @returns Número de dias corridos, incluindo ambas as pontas.
 */
export function durationInDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

/**
 * RF-RH-048 — afastamento com duração > 30 dias exige ASO de retorno
 * (`hasValidAso`, gate compartilhado) antes de reverter o funcionário para
 * `active`.
 *
 * @param startDate - Data de início do afastamento (`YYYY-MM-DD`).
 * @param actualEndDate - Data efetiva de retorno (`YYYY-MM-DD`).
 * @returns `true` se o afastamento excede 30 dias e exige o gate de ASO.
 */
export function requiresReturnAso(startDate: string, actualEndDate: string): boolean {
  return durationInDays(startDate, actualEndDate) > 30;
}

/** Tipos de afastamento previdenciário que contam para o zeramento de período aquisitivo (Art. 133, IV, CLT — RF-RH-041/049). */
export const INSS_ABSENCE_TYPES: readonly string[] = ['auxilio_doenca_inss', 'acidente_trabalho'];

/**
 * Categorias de `HrBenefitType` suspensas durante afastamento (RF-RH-047) e
 * reativadas no retorno (RF-RH-047-A). Compartilhada por
 * `CreateAbsenceUseCase` (suspensão) e `ReturnFromAbsenceUseCase`
 * (reativação) para as duas pontas nunca divergirem sobre qual categoria é
 * afetada.
 */
export const SUSPENDABLE_BENEFIT_CATEGORIES: readonly string[] = ['vt', 'vr'];
