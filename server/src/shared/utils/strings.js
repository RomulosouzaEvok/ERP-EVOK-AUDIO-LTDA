/**
 * Helpers simples de manipulação de strings usados pelo projeto.
 */

/**
 * Converte uma string em um slug URL-friendly: minúsculas, sem acentos,
 * espaços/pontuação substituídos por hífen, sem hífens duplicados/nas pontas.
 *
 * @param {string} value - Texto de origem (ex.: "Alto-Falante 12\" Premium").
 * @returns {string} Slug normalizado (ex.: "alto-falante-12-premium").
 */
function slugify(value) {
  if (!value) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normaliza espaços em branco de uma string: remove espaços nas pontas e
 * colapsa múltiplos espaços internos em um único espaço.
 *
 * @param {string} value - Texto de origem.
 * @returns {string} Texto com espaçamento normalizado.
 */
function normalizeWhitespace(value) {
  if (!value) return '';
  return String(value).trim().replace(/\s+/g, ' ');
}

module.exports = { slugify, normalizeWhitespace };
