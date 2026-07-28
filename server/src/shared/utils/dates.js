/**
 * Helpers simples de manipulação/validação de data usados pelo projeto.
 */

/**
 * Verifica se um valor representa uma data válida.
 *
 * @param {Date|string|number} value - Valor a validar (Date, string ISO/parseável, ou timestamp).
 * @returns {boolean} `true` se `value` puder ser convertido para uma data válida.
 */
function isValidDate(value) {
  if (value === null || value === undefined || value === '') return false;
  const d = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(d.getTime());
}

/**
 * Formata uma data no padrão brasileiro `dd/mm/aaaa`.
 *
 * @param {Date|string|number} value - Data a formatar.
 * @returns {string} Data formatada como `dd/mm/aaaa`, ou string vazia se `value` for inválido.
 */
function formatDateBR(value) {
  if (!isValidDate(value)) return '';
  const d = value instanceof Date ? value : new Date(value);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

module.exports = { isValidDate, formatDateBR };
