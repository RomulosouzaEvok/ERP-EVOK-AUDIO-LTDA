import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

export type AssetType = 'machine' | 'equipment' | 'tool' | 'furniture' | 'vehicle' | 'it' | 'other';
export type AssetStatus = 'active' | 'in_maintenance' | 'decommissioned' | 'lost';

export interface Asset {
  id: number;
  tag: string;
  name: string;
  description?: string | null;
  location?: string | null;
  asset_type: AssetType;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  purchase_date?: string | null;
  purchase_value?: string | null;
  current_value?: string | null;
  status: AssetStatus;
  photo_path?: string | null;
  notes?: string | null;
}

export interface AssetListParams {
  page?: number;
  limit?: number;
  status?: AssetStatus;
  department_id?: number;
}

export interface AssetInput {
  tag: string;
  name: string;
  description?: string;
  location?: string;
  asset_type?: AssetType;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_value?: number;
  useful_life_months?: number;
  notes?: string;
}

export interface QrCodeResult {
  format: 'png' | 'svg';
  qrDataUrl?: string;
  qrSvg?: string;
  qrCodeData: string;
}

/** `GET /api/assets`. */
export async function listAssets(params: AssetListParams = {}) {
  const { data } = await httpClient.get<ListResponse<Asset>>('/api/assets', { params });
  return data;
}

/** `GET /api/assets/:id`. */
export async function getAsset(id: number) {
  const { data } = await httpClient.get<ItemResponse<Asset>>(`/api/assets/${id}`);
  return data.data;
}

/** `POST /api/assets`. */
export async function createAsset(input: AssetInput) {
  const { data } = await httpClient.post<ItemResponse<Asset>>('/api/assets', input);
  return data.data;
}

/** `PUT /api/assets/:id`. */
export async function updateAsset(id: number, input: Partial<AssetInput>) {
  const { data } = await httpClient.put<ItemResponse<Asset>>(`/api/assets/${id}`, input);
  return data.data;
}

/** `DELETE /api/assets/:id` — inativa o ativo. */
export async function deactivateAsset(id: number) {
  const { data } = await httpClient.delete<ItemResponse<unknown>>(`/api/assets/${id}`);
  return data.data;
}

/** `POST /api/assets/:id/photo` — envia/substitui a foto do ativo. */
export async function uploadAssetPhoto(id: number, file: File) {
  const formData = new FormData();
  formData.append('photo', file);
  // Content-Type explicitamente indefinido: deixa o navegador computar o
  // boundary do multipart automaticamente (o default do httpClient é
  // 'application/json', que quebraria o upload se não for sobrescrito).
  const { data } = await httpClient.post<ItemResponse<Asset>>(`/api/assets/${id}/photo`, formData, {
    headers: { 'Content-Type': undefined },
  });
  return data.data;
}

/** `GET /api/assets/:id/qrcode` — gera o QR Code do ativo. */
export async function getAssetQrCode(id: number, format: 'png' | 'svg' = 'png') {
  const { data } = await httpClient.get<ItemResponse<QrCodeResult>>(`/api/assets/${id}/qrcode`, { params: { format } });
  return data.data;
}
