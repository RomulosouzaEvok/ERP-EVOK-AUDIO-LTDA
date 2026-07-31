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
  quantity: number;
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

/** `GET /api/categories`. */
export interface Category {
  id: number;
  name: string;
}

export async function listCategories() {
  const { data } = await httpClient.get<ItemResponse<Category[]>>('/api/categories');
  return data.data;
}
