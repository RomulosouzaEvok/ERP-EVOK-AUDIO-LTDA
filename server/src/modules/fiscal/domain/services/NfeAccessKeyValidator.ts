/**
 * Valida a chave de acesso de uma NF-e (44 dígitos numéricos, com dígito
 * verificador módulo 11 nos primeiros 43 dígitos).
 *
 * @module modules/fiscal/domain/services/NfeAccessKeyValidator
 */

function isValidNfeAccessKey(key: string): boolean {
  const digits = String(key || '').replace(/\D/g, '');
  if (digits.length !== 44) return false;

  const base = digits.slice(0, 43);
  const checkDigit = Number(digits[43]);

  let weight = 2;
  let sum = 0;
  for (let i = base.length - 1; i >= 0; i--) {
    sum += Number(base[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }

  const remainder = sum % 11;
  const expectedCheckDigit = remainder < 2 ? 0 : 11 - remainder;

  return expectedCheckDigit === checkDigit;
}

module.exports = { isValidNfeAccessKey };
