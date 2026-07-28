/**
 * Helper de paginação para padronizar leitura de `page`/`limit` a partir da
 * query string, aplicando defaults seguros e um teto máximo de `limit` para
 * evitar listagens sem limite (`SELECT *` acidental de tabelas grandes).
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Extrai e normaliza parâmetros de paginação a partir de `req.query`.
 *
 * @param {Object} query - Objeto `req.query` do Express (ou equivalente).
 * @param {string|number} [query.page] - Página desejada (1-based). Default 1.
 * @param {string|number} [query.limit] - Quantidade de itens por página. Default 10, máximo 100.
 * @returns {{page: number, limit: number, offset: number}} Parâmetros normalizados prontos para uso com Sequelize (`limit`/`offset`).
 */
function paginate(query = {}) {
  let page = parseInt(query.page, 10);
  if (!Number.isFinite(page) || page < 1) page = DEFAULT_PAGE;

  let limit = parseInt(query.limit, 10);
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

module.exports = { paginate, DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT };
