import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

export interface Product {
  id: number;
  name: string;
  code: string;
  description?: string;
  category_id?: number | null;
  price: string;
  cost_price: string;
  quantity: string;
  min_quantity: string;
  status: 'active' | 'inactive';
  unit: string;
  product_type?: string;
  photo_path?: string | null;
}

export interface QrCodeResult {
  format: 'png' | 'svg';
  qrDataUrl?: string;
  qrSvg?: string;
  qrCodeData: string;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category_id?: number;
}

export interface ProductInput {
  name: string;
  code: string;
  category_id: number;
  unit: string;
  min_quantity: number;
  cost_price: number;
  price: number;
  description?: string;
}

/** `GET /api/products`. */
export async function listProducts(params: ProductListParams = {}) {
  const { data } = await httpClient.get<ListResponse<Product>>('/api/products', { params });
  return data;
}

/** `POST /api/products`. */
export async function createProduct(input: ProductInput) {
  const { data } = await httpClient.post<ItemResponse<Product>>('/api/products', input);
  return data.data;
}

/** `PUT /api/products/:id`. */
export async function updateProduct(id: number, input: Partial<ProductInput>) {
  const { data } = await httpClient.put<ItemResponse<Product>>(`/api/products/${id}`, input);
  return data.data;
}

/** `DELETE /api/products/:id` — inativa o produto (bloqueia com 409 se vinculado a BOM/movimento). */
export async function deactivateProduct(id: number) {
  const { data } = await httpClient.delete<ItemResponse<unknown>>(`/api/products/${id}`);
  return data.data;
}

export interface StockMovementInput {
  product_id: number;
  type: 'in' | 'out';
  quantity: number;
  warehouse_code: string;
  description?: string;
}

/** `POST /api/products/movements` — movimentação manual de estoque. */
export async function createStockMovement(input: StockMovementInput) {
  const { data } = await httpClient.post<ItemResponse<{ product: Product; movementId: number }>>(
    '/api/products/movements',
    input,
  );
  return data.data;
}

/** `POST /api/products/:id/photo` — envia/substitui a foto do produto. */
export async function uploadProductPhoto(id: number, file: File) {
  const formData = new FormData();
  formData.append('photo', file);
  // Content-Type explicitamente indefinido: deixa o navegador computar o
  // boundary do multipart automaticamente.
  const { data } = await httpClient.post<ItemResponse<Product>>(`/api/products/${id}/photo`, formData, {
    headers: { 'Content-Type': undefined },
  });
  return data.data;
}

/** `GET /api/products/:id/qrcode` — gera o QR Code do produto. */
export async function getProductQrCode(id: number, format: 'png' | 'svg' = 'png') {
  const { data } = await httpClient.get<ItemResponse<QrCodeResult>>(`/api/products/${id}/qrcode`, { params: { format } });
  return data.data;
}

/** `GET /api/categories`. */
export interface Category {
  id: number;
  name: string;
}

export async function listCategories() {
  const { data } = await httpClient.get<ItemResponse<Category[]>>('/api/categories');
  return data.data;
}
