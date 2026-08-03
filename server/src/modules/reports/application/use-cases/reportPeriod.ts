const { ValidationError } = require('../../../../errors');

/**
 * Resolve o período do relatório a partir de `start_date`/`end_date`
 * (YYYY-MM-DD). Default: últimos 30 dias. O fim é expandido para 23:59:59
 * para incluir o dia inteiro.
 *
 * @param {Object} input - `{ start_date?, end_date? }`.
 * @returns {{ start: Date, end: Date, period: { start_date: string, end_date: string } }}
 * @throws {ValidationError} Se alguma data for inválida ou início > fim.
 */
function resolveReportPeriod(input: { start_date?: string; end_date?: string } = {}) {
  const end = input.end_date ? parseDate(input.end_date, 'end_date') : new Date();
  const start = input.start_date
    ? parseDate(input.start_date, 'start_date')
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (start > end) {
    throw new ValidationError('start_date não pode ser maior que end_date.');
  }

  const endOfDay = new Date(end);
  endOfDay.setHours(23, 59, 59, 999);

  return {
    start,
    end: endOfDay,
    period: {
      start_date: start.toISOString().slice(0, 10),
      end_date: endOfDay.toISOString().slice(0, 10),
    },
  };
}

/**
 * @param {string} value
 * @param {string} field
 * @returns {Date}
 * @throws {ValidationError}
 */
function parseDate(value, field) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${field} inválida: use o formato YYYY-MM-DD.`);
  }
  return date;
}

/**
 * Divisão protegida: retorna 0 quando o denominador é 0 (nunca NaN/Infinity).
 *
 * @param {number} numerator
 * @param {number} denominator
 * @returns {number} Fração 0-1 com 4 casas.
 */
function safeRate(numerator, denominator) {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 10000;
}

module.exports = { resolveReportPeriod, safeRate };
