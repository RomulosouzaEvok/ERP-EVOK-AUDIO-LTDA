import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * API de Múltiplos Depósitos (Bloco 4, UC-42). Todos os endpoints estão
 * hospedados sob `/api/inventory/*` (não em um prefixo `/api/warehouses`
 * próprio — ver `server/src/modules/inventory/presentation/routes/inventory.ts`
 * e `docs/governance/TODO.md` Bloco 4.2, "Desvios de contrato").
 */

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * `GET /api/inventory/warehouses` — lista depósitos ativos (o backend hoje
 * NÃO aceita filtro para incluir inativos — `ListWarehousesUseCase.ts`
 * força `where: { active: true }` sem parâmetro de override). Um depósito
 * desativado pela tela de gestão (`WarehousesPage`) some desta lista e não
 * há, no contrato atual, forma de reativá-lo pela API — limitação
 * conhecida, ver `docs/governance/TODO.md` Bloco 4.3.
 */
export async function listWarehouses() {
  const { data } = await httpClient.get<ItemResponse<Warehouse[]>>('/api/inventory/warehouses');
  return data.data;
}

export interface CreateWarehouseInput {
  code: string;
  name: string;
  description?: string | null;
  active?: boolean;
}

/**
 * `POST /api/inventory/warehouses` — cria um novo depósito (exige
 * `estoque:approve`). `code` é normalizado para uppercase pelo backend.
 *
 * @param input - dados do novo depósito.
 * @returns o depósito criado.
 * @throws {AxiosError} 400 `VALIDATION_ERROR` (campo obrigatório ausente ou
 *   campo extra não permitido pelo schema `.strict()`); 409 `CONFLICT`
 *   (já existe depósito com este código, comparação case-insensitive).
 */
export async function createWarehouse(input: CreateWarehouseInput) {
  const { data } = await httpClient.post<ItemResponse<Warehouse>>('/api/inventory/warehouses', input);
  return data.data;
}

export interface UpdateWarehouseInput {
  name?: string;
  description?: string | null;
  active?: boolean;
}

/**
 * `PUT /api/inventory/warehouses/:id` — edita um depósito existente (exige
 * `estoque:approve`). NUNCA envie `code` — o schema é `.strict()` e rejeita
 * com 400 se `code` vier no corpo (é imutável após a criação).
 *
 * @param id - id do depósito.
 * @param input - campos a atualizar (`name`, `description`, `active`).
 * @returns o depósito atualizado, com `code` inalterado.
 * @throws {AxiosError} 404 `NOT_FOUND` se o depósito não existir.
 */
export async function updateWarehouse(id: number, input: UpdateWarehouseInput) {
  const { data } = await httpClient.put<ItemResponse<Warehouse>>(`/api/inventory/warehouses/${id}`, input);
  return data.data;
}

export interface WarehouseStockRow {
  id: number;
  product_id: number;
  warehouse_id: number;
  quantity: string;
  product?: { id: number; name: string; code: string };
  warehouse?: { id: number; code: string; name: string };
}

export interface WarehouseStockListParams {
  product_id?: number;
  warehouse_code?: string;
  page?: number;
  limit?: number;
}

/** `GET /api/inventory/warehouse-stock?product_id=&warehouse_code=&page=&limit=` — saldo por par produto×depósito. */
export async function listWarehouseStock(params: WarehouseStockListParams = {}) {
  const { data } = await httpClient.get<ListResponse<WarehouseStockRow>>('/api/inventory/warehouse-stock', {
    params,
  });
  return data;
}

export type WarehouseTransferStatus = 'pending' | 'approved' | 'rejected';

export interface WarehouseTransfer {
  id: number;
  product_id: number;
  from_warehouse_id: number;
  to_warehouse_id: number;
  quantity: string;
  reason: string;
  user_id: number;
  approved_by: number | null;
  status: WarehouseTransferStatus;
  createdAt: string;
  updatedAt: string;
  product?: { id: number; name: string; code: string };
  fromWarehouse?: { id: number; code: string; name: string };
  toWarehouse?: { id: number; code: string; name: string };
  requestedBy?: { id: number; name: string; email: string };
  approvedBy?: { id: number; name: string; email: string } | null;
}

export interface WarehouseTransferListParams {
  status?: WarehouseTransferStatus;
}

/** `GET /api/inventory/transfers?status=` — lista transferências entre depósitos. */
export async function listTransfers(params: WarehouseTransferListParams = {}) {
  const { data } = await httpClient.get<ItemResponse<WarehouseTransfer[]>>('/api/inventory/transfers', {
    params,
  });
  return data.data;
}

export interface CreateWarehouseTransferInput {
  product_id: number;
  from_warehouse_code: string;
  to_warehouse_code: string;
  quantity: number;
  reason: string;
}

/** `POST /api/inventory/transfers` — solicita transferência (`status='pending'`, não altera saldo). */
export async function createTransfer(input: CreateWarehouseTransferInput) {
  const { data } = await httpClient.post<ItemResponse<WarehouseTransfer>>('/api/inventory/transfers', input);
  return data.data;
}

/** `PUT /api/inventory/transfers/:id/approve` — aprova (exige `estoque:approve`), executa débito/crédito. */
export async function approveTransfer(id: number) {
  const { data } = await httpClient.put<ItemResponse<WarehouseTransfer>>(`/api/inventory/transfers/${id}/approve`);
  return data.data;
}

/** `PUT /api/inventory/transfers/:id/reject` — rejeita (exige `estoque:approve`), `reason` obrigatório. */
export async function rejectTransfer(id: number, reason: string) {
  const { data } = await httpClient.put<ItemResponse<WarehouseTransfer>>(`/api/inventory/transfers/${id}/reject`, {
    reason,
  });
  return data.data;
}
