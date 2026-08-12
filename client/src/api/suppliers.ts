import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

export interface Supplier {
  id: number;
  company_name: string;
  trade_name?: string;
  cnpj: string;
  phone?: string | null;
  email?: string | null;
  status: string;
  /** G11: fornecedor estrangeiro — toda compra dele exige aprovação da diretoria. */
  is_foreign?: boolean;
}

export interface SupplierInput {
  company_name: string;
  trade_name?: string;
  cnpj: string;
  /**
   * G11 — **obrigatório na criação** (`POST /api/suppliers` responde 400 sem
   * ele desde 2026-08-11). Comanda a alçada de compra: fornecedor
   * estrangeiro exige aprovação da diretoria em qualquer valor.
   */
  is_foreign?: boolean;
  ie?: string;
  phone?: string;
  email?: string;
  address?: string;
  contact_name?: string;
  contact_phone?: string;
  payment_terms?: string;
  delivery_time?: string;
  notes?: string;
}

/** `GET /api/suppliers`. */
export async function listSuppliers(params: { page?: number; limit?: number; search?: string } = {}) {
  const { data } = await httpClient.get<ListResponse<Supplier>>('/api/suppliers', { params });
  return data;
}

/** `POST /api/suppliers`. */
export async function createSupplier(input: SupplierInput) {
  const { data } = await httpClient.post<ItemResponse<Supplier>>('/api/suppliers', input);
  return data.data;
}

/** `PUT /api/suppliers/:id`. */
export async function updateSupplier(id: number, input: Partial<SupplierInput>) {
  const { data } = await httpClient.put<ItemResponse<Supplier>>(`/api/suppliers/${id}`, input);
  return data.data;
}

/** `DELETE /api/suppliers/:id`. */
export async function deactivateSupplier(id: number) {
  await httpClient.delete(`/api/suppliers/${id}`);
}
