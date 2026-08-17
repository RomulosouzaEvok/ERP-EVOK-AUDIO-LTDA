/**
 * Client do módulo `mobileInventory` — leitor de QR Code / código de barras
 * de estoque.
 *
 * Contratos exatos (ver
 * `server/src/modules/mobileInventory/presentation/controllers/mobileInventoryController.ts`
 * e `ScanItemUseCase.ts` / `ListMobileInventoryMovementsUseCase.ts`):
 *
 *   POST /api/mobile-inventory/scan
 *     Request:  { product_code, quantity, type: 'in'|'out', warehouse_code, description? }
 *     Response: { success: true, data: { product: {id,name,code}, movement, new_quantity } }
 *     Requer permissão `estoque:operate` (403 se o perfil não tiver o nível).
 *
 *   GET /api/mobile-inventory/movements?page=&limit=
 *     Response: { success: true, data: Movement[], pagination: { total, page, limit, totalPages } }
 */

import { apiRequest } from './client';
import type { ListMovementsResponse, ScanItemRequest, ScanItemResponseData } from './types';

export interface ScanItemApiResponse {
  success: true;
  data: ScanItemResponseData;
}

export async function scanItem(payload: ScanItemRequest): Promise<ScanItemResponseData> {
  const response = await apiRequest<ScanItemApiResponse>('/mobile-inventory/scan', {
    method: 'POST',
    body: payload,
  });
  return response.data;
}

export interface ListMovementsParams {
  page?: number;
  limit?: number;
}

export async function listMovements(params: ListMovementsParams = {}): Promise<ListMovementsResponse> {
  const { page = 1, limit = 20 } = params;
  return apiRequest<ListMovementsResponse>('/mobile-inventory/movements', {
    method: 'GET',
    query: { page, limit },
  });
}
