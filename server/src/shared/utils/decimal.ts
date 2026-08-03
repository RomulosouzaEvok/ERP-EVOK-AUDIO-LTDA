/**
 * 📊 Utilitários de manipulação de quantidades decimais industriais.
 *
 * Funcoes compartilhadas para arredondamento consistente de quantidades
 * em operacoes de MRP, BOM e inventario.
 *
 * Escala: quantidades industriais usam 6 casas decimais (ng/ml/L).
 * Distinto de monetary (2 casas) — vide money.ts para custos.
 *
 * @module shared/utils/decimal
 */

import { z } from 'zod';

/**
 * Schema zod para validar quantidades industriais com ate 6 casas decimais.
 * Usa comparacao de string (nao de ponto flutuante) para evitar falsos
 * positivos por arredondamento (ex: 0.1 + 0.2 !== 0.3).
 *
 * @param message - Mensagem de erro customizada (padrao: pt-BR generico).
 */
export function decimalQuantitySchema(message = 'Valor decimal deve ter no maximo 6 casas.') {
  return z.coerce.number().positive().refine((value) => {
    const [, decimals = ''] = value.toString().split('.');
    return decimals.length <= 6;
  }, { message });
}

/**
 * Arredonda quantidade industrial para escala consistente.
 *
 * @param value - Quantidade a arredondar.
 * @param scale - Casas decimais (padrao: 6 para quantidades).
 * @returns Quantidade arredondada.
 *
 * @example
 * roundQuantity(15.1234567)  // => 15.123457
 * roundQuantity(10.5)        // => 10.5
 * roundQuantity(0.0000001)   // => 0
 */
export function roundQuantity(value: number, scale: number = 6): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const factor = Math.pow(10, scale);
  return Math.round(value * factor) / factor;
}

/**
 * Valida se uma quantidade esta dentro de tolerancia (ou identica).
 *
 * Útil para comparar quantidades de lotes/consumo respeitando
 * acumulacao de erro de ponto flutuante.
 *
 * @param actual - Quantidade real.
 * @param expected - Quantidade esperada.
 * @param tolerance - Margem de erro (padrao: 0.0001).
 * @returns true se diferenca <= tolerance.
 *
 * @example
 * isQuantityWithinTolerance(10.0000001, 10, 0.0001)  // => true
 * isQuantityWithinTolerance(10.01, 10, 0.001)        // => false
 */
export function isQuantityWithinTolerance(actual: number, expected: number, tolerance: number = 0.0001): boolean {
  return Math.abs(actual - expected) <= tolerance;
}
