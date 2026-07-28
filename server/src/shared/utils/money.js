/**
 * Helpers de arredondamento e conversão monetária para evitar erros clássicos
 * de ponto flutuante (ex.: `0.1 + 0.2 !== 0.3`) em cálculos financeiros.
 */

/**
 * Arredonda um valor para 2 casas decimais de forma robusta, evitando
 * artefatos de ponto flutuante (ex.: `1.005 * 100` não é exatamente `100.5`
 * em JS). Usa correção por `Number.EPSILON` antes do `Math.round`.
 *
 * @param {number} value - Valor a arredondar.
 * @returns {number} Valor arredondado para 2 casas decimais.
 */
function round2(value) {
  const n = Number(value) || 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Converte um valor monetário (em reais, com casas decimais) para centavos
 * (inteiro), útil para cálculos que exigem precisão inteira exata.
 *
 * @param {number} value - Valor em reais (ex.: 10.5).
 * @returns {number} Valor em centavos, arredondado para o inteiro mais próximo (ex.: 1050).
 */
function toCents(value) {
  const n = Number(value) || 0;
  return Math.round((n + Number.EPSILON) * 100);
}

/**
 * Converte um valor em centavos (inteiro) de volta para reais.
 *
 * @param {number} cents - Valor em centavos (ex.: 1050).
 * @returns {number} Valor em reais com 2 casas decimais (ex.: 10.5).
 */
function fromCents(cents) {
  const n = Number(cents) || 0;
  return round2(n / 100);
}

module.exports = { round2, toCents, fromCents };
