/**
 * Tipos compartilhados dos contratos JSON da API do ERP consumidos pelo app
 * mobile. Espelha os DTOs reais retornados pelos use cases do backend
 * (`server/src/modules/auth`, `server/src/modules/mobileInventory`) — não
 * modele campos que o backend não envia.
 */

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface LoginResponseData {
  token: string;
  user: AuthUser;
}

export type MovementType = 'in' | 'out';

export interface ScanItemRequest {
  product_code: string;
  quantity: number;
  type: MovementType;
  warehouse_code: string;
  description?: string;
}

export interface ScanProductSummary {
  id: number;
  name: string;
  code: string;
}

/**
 * Movimentação de estoque. Duas origens possíveis com formatos levemente
 * diferentes:
 *   - `GET /movements`: instância Sequelize de `InventoryMovement`
 *     (`server/src/models/InventoryMovement.ts`), com `product`/`user`
 *     populados via `include`.
 *   - resposta de `POST /scan`: objeto plano retornado por
 *     `InventoryService.adjust` (`server/src/services/inventoryService.ts`),
 *     que também inclui `quantityAfter`.
 * Por isso os campos abaixo são todos opcionais — trate a ausência de
 * qualquer um deles na UI.
 */
export interface InventoryMovement {
  id: number;
  product_id?: number;
  item_id?: string | null;
  user_id?: number;
  warehouse_id?: number | null;
  type?: 'in' | 'out' | 'adjustment' | string;
  quantity?: number | string;
  quantityAfter?: number;
  unit_cost?: number | string;
  description?: string | null;
  reference_id?: number | null;
  reference_type?: string | null;
  createdAt?: string;
  product?: { id: number; name: string; code: string };
  user?: { id: number; name: string };
  [key: string]: unknown;
}

export interface ScanItemResponseData {
  product: ScanProductSummary;
  movement: InventoryMovement;
  new_quantity: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListMovementsResponse {
  success: true;
  data: InventoryMovement[];
  pagination: PaginationMeta;
}

/**
 * Contratos do submódulo de Inventário Cíclico (Contagens), espelhando
 * `server/src/models/InventoryCount.ts` / `InventoryCountItem.ts` e o
 * envelope devolvido por
 * `server/src/modules/inventory/presentation/controllers/inventoryCountController.ts`.
 *
 * Workflow de status da contagem: `draft` -> `counting` -> `pending_approval`
 * -> `approved` -> `adjusted` (ou `pending_approval` -> `rejected`).
 * Aprovar/rejeitar é exclusivo do painel web — fora de escopo do app mobile.
 */
export type InventoryCountStatus =
  | 'draft'
  | 'counting'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'adjusted';

export type InventoryCountType = 'cycle' | 'full' | 'spot';

export type InventoryCountItemStatus = 'pending' | 'counted' | 'adjusted';

export interface InventoryCountUserRef {
  id: number;
  name: string;
}

/**
 * Cabeçalho de uma contagem de inventário, como devolvido por
 * `GET /api/inventory-counts` (lista, sem `items`).
 */
export interface InventoryCount {
  id: number;
  count_number: string;
  status: InventoryCountStatus;
  count_type: InventoryCountType;
  warehouse_id: number | null;
  location: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  approved_at?: string | null;
  created_by: number;
  approved_by?: number | null;
  assigned_to?: number | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: InventoryCountUserRef | null;
  approvedBy?: InventoryCountUserRef | null;
  assignedTo?: InventoryCountUserRef | null;
}

/** Item individual de uma contagem, sempre acompanhado do `product` (via `include`). */
export interface InventoryCountItemDTO {
  id: number;
  inventory_count_id: number;
  product_id: number;
  item_id?: string | null;
  system_quantity: number | string;
  counted_quantity: number | string | null;
  variance_quantity: number | string | null;
  status: InventoryCountItemStatus;
  counted_by?: number | null;
  counted_at?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  product?: { id: number; name: string; code: string; quantity: number | string };
  countedBy?: InventoryCountUserRef | null;
}

/** Detalhe de uma contagem (`GET /:id`, `POST /:id/start`, `POST /:id/submit`), com `items`. */
export interface InventoryCountDetail extends InventoryCount {
  items: InventoryCountItemDTO[];
}

export interface ListInventoryCountsResponse {
  success: true;
  data: InventoryCount[];
  pagination: PaginationMeta;
}
