/**
 * Regras puras do resumo mensal de frequência (Grupo 10, RH) — cálculo de
 * competência (`YYYY-MM` → `[início, fim]`) e de dias de sobreposição de
 * um afastamento (`hr_absences`) dentro do período do resumo.
 *
 * @module modules/rh/domain/services/attendanceSummaryRules
 */

/** Início/fim (`YYYY-MM-DD`) do mês de competência informado como `YYYY-MM`. */
export function competenceMonthRange(competencia: string): { start: string; end: string } {
  const [year, month] = competencia.split('-').map(Number);
  const start = `${competencia}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${competencia}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

/**
 * Quantidade de dias corridos de um afastamento que caem dentro do período
 * `[periodStart, periodEnd]` (ambos `YYYY-MM-DD`, inclusive). Afastamento
 * ainda em curso (`actualEndDate=null`) é tratado como estendendo-se até o
 * fim do período informado — a fotografia é "quantos dias deste afastamento
 * caem neste mês", não a duração total do afastamento.
 *
 * @param startDate - Início do afastamento.
 * @param actualEndDate - Fim real do afastamento, ou `null` se ainda em curso.
 * @param expectedEndDate - Fim previsto (usado quando não há fim real ainda).
 * @param periodStart - Início do período do resumo.
 * @param periodEnd - Fim do período do resumo.
 * @returns Número de dias sobrepostos (`0` se não há sobreposição).
 */
export function absenceDaysOverlappingPeriod(
  startDate: string,
  actualEndDate: string | null,
  expectedEndDate: string | null,
  periodStart: string,
  periodEnd: string,
): number {
  const effectiveEnd = actualEndDate ?? expectedEndDate ?? periodEnd;
  const overlapStart = startDate > periodStart ? startDate : periodStart;
  const overlapEnd = effectiveEnd < periodEnd ? effectiveEnd : periodEnd;

  if (overlapStart > overlapEnd) return 0;

  const msPerDay = 24 * 60 * 60 * 1000;
  const startMs = new Date(`${overlapStart}T00:00:00Z`).getTime();
  const endMs = new Date(`${overlapEnd}T00:00:00Z`).getTime();
  return Math.round((endMs - startMs) / msPerDay) + 1;
}
