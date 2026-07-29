/**
 * 📅 Utilitários de manipulação de datas.
 *
 * @module shared/utils/dates
 */

/**
 * Formata uma data para o padrão ISO (YYYY-MM-DD).
 *
 * @param date - Data, string ISO ou timestamp.
 * @returns Data formatada como YYYY-MM-DD.
 *
 * @example
 * formatDate('2024-01-15T10:00:00.000Z') // => '2024-01-15'
 * formatDate(new Date())                   // => '2024-01-15'
 */
export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/**
 * Retorna o primeiro dia do mês de uma data.
 *
 * @param date - Data de referência.
 * @returns Nova data no primeiro dia do mês.
 *
 * @example
 * startOfMonth('2024-01-15') // => Date('2024-01-01')
 */
export function startOfMonth(date: Date | string | number = new Date()): Date {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Retorna o último dia do mês de uma data.
 *
 * @param date - Data de referência.
 * @returns Nova data no último dia do mês (23:59:59.999).
 *
 * @example
 * endOfMonth('2024-01-15') // => Date('2024-01-31 23:59:59.999')
 */
export function endOfMonth(date: Date | string | number = new Date()): Date {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Adiciona dias a uma data.
 *
 * @param date - Data base.
 * @param days - Número de dias a adicionar (pode ser negativo).
 * @returns Nova data com os dias adicionados.
 */
export function addDays(date: Date | string | number, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Verifica se uma data está no passado (antes de agora).
 *
 * @param date - Data a verificar.
 * @returns `true` se a data já passou.
 */
export function isPast(date: Date | string | number): boolean {
  return new Date(date).getTime() < Date.now();
}

/**
 * Verifica se uma data está vencida (passado e não é hoje).
 *
 * @param date - Data de vencimento.
 * @returns `true` se a data já passou e não é hoje.
 */
export function isOverdue(date: Date | string | number): boolean {
  const d = new Date(date);
  const today = new Date();
  return d.getTime() < today.getTime() &&
    d.toISOString().slice(0, 10) !== today.toISOString().slice(0, 10);
}

/**
 * Calcula a diferença em dias entre duas datas.
 *
 * @param a - Primeira data.
 * @param b - Segunda data (padrão: agora).
 * @returns Número de dias de diferença (pode ser negativo).
 */
export function daysDiff(a: Date | string | number, b: Date | string | number = new Date()): number {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}
