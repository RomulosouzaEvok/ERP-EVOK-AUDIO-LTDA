/**
 * 📐 Constantes globais do sistema.
 *
 * Valores compartilhados entre todos os módulos. Separado de
 * `types/erp.d.ts` porque `.d.ts` não emite código em runtime.
 *
 * @module shared/utils/constants
 */

/** Profundidade máxima de explosão recursiva de BOM. */
export const BOM_MAX_DEPTH = 10;

/** Página padrão para listagens paginadas. */
export const PAGINATION_DEFAULT_PAGE = 1;

/** Limite padrão de itens por página. */
export const PAGINATION_DEFAULT_LIMIT = 10;

/** Limite máximo absoluto de itens por página (segurança). */
export const PAGINATION_MAX_LIMIT = 100;

