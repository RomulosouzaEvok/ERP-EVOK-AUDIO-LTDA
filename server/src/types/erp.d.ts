/**
 * 🏭 ERP EVOK ÁUDIO — Core Type Definitions
 *
 * Compartilhado entre todos os módulos TypeScript do sistema.
 * Define tipos base de domínio, API, paginação, erros e utilidades.
 *
 * @module types/erp
 */

// ======================================================================
// TIPOS DE DOMÍNIO BASE
// ======================================================================

/** Roles de usuário do sistema. */
export type UserRole = 'admin' | 'operator' | 'financial';

/** Status binário de entidades que usam soft delete ou ativação. */
export type ActiveStatus = 'active' | 'inactive';

/** Tipos de produto conforme classificação industrial. */
export type ProductType =
  | 'finished'        // PRODUTO_ACABADO
  | 'semi_finished'   // SUBCONJUNTO
  | 'component'       // COMPONENTE
  | 'raw_material';   // MATERIA_PRIMA

/** Status de um produto. */
export type ProductStatus = 'active' | 'inactive';

/** Status de uma venda. */
export type SaleStatus = 'quote' | 'confirmed' | 'invoiced' | 'shipped' | 'canceled';

/** Status de um pedido de compra. */
export type PurchaseStatus = 'pending' | 'approved' | 'sent' | 'partial' | 'received' | 'canceled';

/** Status de item de pedido de compra. */
export type PurchaseItemStatus = 'pending' | 'partial' | 'received' | 'canceled';

/** Status de uma ordem de produção. */
export type ProductionOrderStatus = 'planned' | 'released' | 'in_progress' | 'paused' | 'completed' | 'canceled';

/** Status de um financeiro (receber/pagar). */
export type FinancialStatus = 'pending' | 'paid' | 'overdue' | 'canceled';

/** Status de uma BOM (Bill of Materials). */
export type BOMStatus = 'draft' | 'active' | 'inactive' | 'superseded';

/** Tipos de movimentação de estoque. */
export type MovementType = 'in' | 'out' | 'adjustment';

/** Tipos de referência de movimentação. */
export type MovementReferenceType = 'sale' | 'purchase' | 'production' | 'adjustment';

/** Métodos de pagamento. */
export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'boleto' | 'transfer';

/** Prioridade de produção/OS. */
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

// ======================================================================
// TIPOS DE ENDPOINT (PAGINAÇÃO)
// ======================================================================

/** Parâmetros de paginação normalizados. */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/** Metadados de paginação retornados em listas. */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ======================================================================
// ENVELOPES DE RESPOSTA HTTP
// ======================================================================

/** Resposta de sucesso padrão da API. */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  pagination?: PaginationMeta;
  [key: string]: unknown;
}

/** Detalhes de um erro padronizado. */
export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

/** Resposta de erro padrão da API. */
export interface ApiErrorResponse {
  success: false;
  error: string | ApiErrorDetail;
}

/** Resposta genérica da API (união de sucesso e erro). */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ======================================================================
// TIPOS DE QUERY STRING
// ======================================================================

/** Parâmetros de query para listagens com busca e filtro. */
export interface ListQueryParams {
  page?: number | string;
  limit?: number | string;
  search?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  [key: string]: unknown;
}

// ======================================================================
// TIPOS DE AUDITORIA
// ======================================================================

/** Ações de auditoria padronizadas. */
export type AuditAction = 'create' | 'update' | 'delete' | 'soft_delete' | 'login' | 'login_failed' | 'status_change' | 'approve' | 'reject';

/** Payload para registro de auditoria. */
export interface AuditLogPayload {
  userId: number | string;
  action: AuditAction | string;
  entity: string;
  entityId?: number | string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  description?: string;
  ip?: string;
  userAgent?: string;
}

// ======================================================================
// TIPOS DE ARQUIVO/UPLOAD
// ======================================================================

/** Resultado de validação de magic bytes de arquivo. */
export interface FileMagicValidation {
  valid: boolean;
  mime: string | null;
}

// ======================================================================
// CONSTANTES GLOBAIS (apenas tipo, runtime em shared/utils)
// ======================================================================

/** Profundidade máxima de explosão de BOM (valor em shared/utils/constants.ts). */
export declare const BOM_MAX_DEPTH: 10;
/** Página padrão de paginação (valor em shared/utils/constants.ts). */
export declare const PAGINATION_DEFAULT_PAGE: 1;
/** Limite padrão por página (valor em shared/utils/constants.ts). */
export declare const PAGINATION_DEFAULT_LIMIT: 10;
/** Limite máximo por página (valor em shared/utils/constants.ts). */
export declare const PAGINATION_MAX_LIMIT: 100;
