/**
 * 💰 Utilitários de manipulação monetária.
 *
 * Todas as operações financeiras devem usar centavos (`number` inteiro)
 * internamente para evitar erros de arredondamento com ponto flutuante.
 * A conversão para reais (exibição) ocorre apenas na camada de
 * apresentação (controllers/respostas JSON).
 *
 * @module shared/utils/money
 */

/**
 * Converte um valor em reais (ex.: `1234.56`) para centavos (`123456`).
 *
 * @param amount - Valor em reais (ex.: `1234.56`).
 * @returns Valor em centavos como inteiro.
 * @throws {Error} Se o valor não for um número finito.
 *
 * @example
 * toCents(1234.56)   // => 123456
 * toCents(0)         // => 0
 * toCents(99.99)     // => 9999
 */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new Error(`Valor inválido para conversão: ${amount}`);
  }
  return Math.round(amount * 100);
}

/**
 * Converte um valor em centavos (`123456`) para reais (`1234.56`).
 *
 * @param cents - Valor em centavos (inteiro).
 * @returns Valor em reais com 2 casas decimais.
 * @throws {Error} Se o valor não for um número finito.
 *
 * @example
 * fromCents(123456)  // => 1234.56
 * fromCents(0)       // => 0
 * fromCents(9999)    // => 99.99
 */
export function fromCents(cents: number): number {
  if (!Number.isFinite(cents)) {
    throw new Error(`Valor em centavos inválido: ${cents}`);
  }
  return Math.round(cents * 100) / 100 / 100;
}

/**
 * Arredonda um valor monetário para 2 casas decimais (regra comercial).
 *
 * @param value - Valor a arredondar.
 * @returns Valor arredondado para 2 casas.
 *
 * @example
 * roundMoney(1234.567) // => 1234.57
 * roundMoney(99.999)   // => 100.00
 */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
