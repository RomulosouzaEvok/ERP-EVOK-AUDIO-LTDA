import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

export type BomStatus = 'draft' | 'active' | 'inactive' | 'superseded';

export interface Bom {
  id: number;
  product_id: number;
  revision?: string;
  status: BomStatus;
  product?: { id: number; name: string; code: string };
}

export interface BomItemInput {
  component_product_id: number;
  quantity: number;
}

export interface CreateBomInput {
  product_id: number;
  items: BomItemInput[];
  revision?: string;
  notes?: string;
}

/** `GET /api/engineering/bom`. */
export async function listBoms(params: { page?: number; limit?: number; product_id?: number; status?: string } = {}) {
  const { data } = await httpClient.get<ListResponse<Bom>>('/api/engineering/bom', { params });
  return data;
}

/** `POST /api/engineering/bom`. */
export async function createBom(input: CreateBomInput) {
  const { data } = await httpClient.post<ItemResponse<{ bom: Bom; items: unknown[] }>>('/api/engineering/bom', input);
  return data.data.bom;
}

export interface ExplodedComponent {
  component_id: number;
  component_name: string;
  component_code: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  stock_available: number;
}

export interface BomExplosion {
  bom_id: number;
  product_id: number;
  product_name: string;
  requested_quantity: number;
  total_cost: number;
  components: ExplodedComponent[];
}

/** `GET /api/engineering/bom/:id/explode?qty=` — `qty` é obrigatório (> 0). */
export async function explodeBom(id: number, qty: number) {
  const { data } = await httpClient.get<ItemResponse<BomExplosion>>(`/api/engineering/bom/${id}/explode`, {
    params: { qty },
  });
  return data.data;
}

/** `GET /api/engineering/bom/product/:productId` — BOM ativa de um produto acabado, ou null. */
export async function getActiveBomByProduct(productId: number) {
  const { data } = await httpClient.get<ItemResponse<Bom | null>>(`/api/engineering/bom/product/${productId}`);
  return data.data;
}
