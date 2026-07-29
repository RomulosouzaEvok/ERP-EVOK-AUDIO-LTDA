/**
 * 📝 Utilitários de manipulação de strings.
 *
 * @module shared/utils/strings
 */

/**
 * Remove acentos de uma string.
 *
 * @param str - String com possíveis acentos.
 * @returns String sem acentos.
 *
 * @example
 * removeAccents('João Silva') // => 'Joao Silva'
 */
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Gera um código alfanumérico único baseado em timestamp e random.
 *
 * @param prefix - Prefixo do código (ex.: 'PO', 'OP', 'NC').
 * @returns Código no formato `<prefixo>-<timestamp>-<random>`.
 *
 * @example
 * generateCode('PO') // => 'PO-1730000000000-a1b2c3'
 */
export function generateCode(prefix: string): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Gera um número de ordem de produção no padrão `OP-<ano>-<sequencial>`.
 *
 * @param year - Ano de referência (padrão: ano corrente).
 * @param sequential - Número sequencial (padrão: 1).
 * @returns Número formatado.
 *
 * @example
 * generateProductionOrderNumber(2026, 1) // => 'OP-2026-0001'
 */
export function generateProductionOrderNumber(year?: number, sequential: number = 1): string {
  const y = year ?? new Date().getFullYear();
  return `OP-${y}-${String(sequential).padStart(4, '0')}`;
}

/**
 * Gera número de pedido de compra no formato `PO-<timestamp>`.
 *
 * @returns Número do pedido.
 *
 * @example
 * generatePurchaseOrderNumber() // => 'PO-1730000000000'
 */
export function generatePurchaseOrderNumber(): string {
  return `PO-${Date.now()}`;
}

/**
 * Trunca uma string para um comprimento máximo, adicionando reticências.
 *
 * @param str - String a truncar.
 * @param maxLength - Comprimento máximo (padrão: 100).
 * @returns String truncada.
 *
 * @example
 * truncate('Texto muito longo para exibir', 10) // => 'Texto mu...'
 */
export function truncate(str: string, maxLength: number = 100): string {
  if (!str || str.length <= maxLength) return str ?? '';
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Capitaliza a primeira letra de cada palavra.
 *
 * @param str - String a capitalizar.
 * @returns String capitalizada.
 *
 * @example
 * capitalizeWords('joão silva') // => 'João Silva'
 */
export function capitalizeWords(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Sanitiza uma string para uso seguro em logs (remove caracteres de controle).
 *
 * @param str - String a sanitizar.
 * @returns String sanitizada.
 */
export function sanitizeForLog(str: string): string {
  if (!str) return '';
  return str.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
}
