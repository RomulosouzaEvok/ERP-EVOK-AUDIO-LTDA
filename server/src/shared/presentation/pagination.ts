/**
 * 📄 Helper de paginação para padronizar leitura de `page`/`limit` a partir
 * da query string, aplicando defaults seguros e um teto máximo de `limit`
 * para evitar listagens sem limite (`SELECT *` acidental de tabelas grandes).
 *
 * @module shared/presentation/pagination
 */

import type { PaginationParams } from '../../types/erp';
import { PAGINATION_DEFAULT_PAGE, PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT } from '../utils/constants';

/**
 * Extrai e normaliza parâmetros de paginação a partir de `req.query`.
 *
 * @param query - Objeto `req.query` do Express (ou equivalente).
 * @param query.page - Página desejada (1-based). Default 1.
 * @param query.limit - Quantidade de itens por página. Default 10, máximo 100.
 * @returns Parâmetros normalizados prontos para uso com Sequelize (`limit`/`offset`).
 */
export function paginate(query: Record<string, unknown> = {}): PaginationParams {
  let page = parseInt(String(query.page), 10);
  if (!Number.isFinite(page) || page < 1) page = PAGINATION_DEFAULT_PAGE;

  let limit = parseInt(String(query.limit), 10);
  if (!Number.isFinite(limit) || limit < 1) limit = PAGINATION_DEFAULT_LIMIT;
  if (limit > PAGINATION_MAX_LIMIT) limit = PAGINATION_MAX_LIMIT;

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export { PAGINATION_DEFAULT_PAGE, PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT };
