import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

export interface Client {
  id: number;
  name: string;
  cpf_cnpj: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  status: string;
}

export interface ClientInput {
  name: string;
  cpf_cnpj: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  city?: string;
  state?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
}

/** `GET /api/clients`. */
export async function listClients(params: { page?: number; limit?: number; search?: string } = {}) {
  const { data } = await httpClient.get<ListResponse<Client>>('/api/clients', { params });
  return data;
}

/** `POST /api/clients`. */
export async function createClient(input: ClientInput) {
  const { data } = await httpClient.post<ItemResponse<Client>>('/api/clients', input);
  return data.data;
}

/** `PUT /api/clients/:id`. */
export async function updateClient(id: number, input: Partial<ClientInput>) {
  const { data } = await httpClient.put<ItemResponse<Client>>(`/api/clients/${id}`, input);
  return data.data;
}

/** `DELETE /api/clients/:id`. */
export async function deactivateClient(id: number) {
  await httpClient.delete(`/api/clients/${id}`);
}
