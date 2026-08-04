import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * API do módulo `serviceOrders` — ordens de serviço de assistência técnica
 * (reparo de produto vendido a um cliente), montadas sob
 * `/api/service-orders`
 * (`server/src/modules/serviceOrders/presentation/routes/serviceOrders.ts`).
 * Domínio distinto de `maintenance` (que trata de ativos internos/máquinas):
 * aqui o vínculo é `client_id` + `product_id`, não `asset_id`.
 *
 * **Risco conhecido de backend** (não corrigido nesta entrega): o campo
 * enviado como `equipment_desc` (nome lido por
 * `CreateServiceOrderUseCase.ts`) nunca é persistido — a coluna do model é
 * `equipment_description`, e o repositório grava a chave errada (`equipment_desc`,
 * que o Sequelize simplesmente ignora por não ser um atributo do model).
 * Diferente do módulo `maintenance`, isso não quebra a criação (o campo é
 * opcional), mas o valor digitado pelo operador é silenciosamente perdido.
 * Ver relatório de handoff.
 */

export type ServiceOrderStatus =
  | 'open'
  | 'diagnosing'
  | 'in_progress'
  | 'waiting_parts'
  | 'completed'
  | 'delivered'
  | 'canceled';
export type ServiceOrderPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ServiceOrder {
  id: number;
  order_number: string;
  client_id: number;
  product_id: number | null;
  equipment_description: string | null;
  reported_issue: string | null;
  diagnosed_issue: string | null;
  service_performed: string | null;
  labor_cost: string;
  total_amount: string;
  status: ServiceOrderStatus;
  priority: ServiceOrderPriority;
  entry_date: string;
  completion_date: string | null;
  delivery_date: string | null;
  technician_id: number | null;
  responsible_id: number | null;
  warranty_days: number;
  notes: string | null;
  created_by: number | null;
  createdAt?: string;
  updatedAt?: string;
  client?: { id: number; name: string };
  product?: { id: number; name: string; code: string } | null;
  technician?: { id: number; name: string } | null;
}

export interface ServiceOrderListParams {
  page?: number;
  limit?: number;
  status?: ServiceOrderStatus;
  client_id?: number;
}

/**
 * Payload de criação — nomes de campo espelham exatamente o que
 * `CreateServiceOrderUseCase.ts` lê de `req.body` (`client_id` obrigatório;
 * `order_number`/`status`/`entry_date` são gerados pelo backend).
 */
export interface CreateServiceOrderInput {
  client_id: number;
  product_id?: number;
  equipment_desc?: string;
  reported_issue?: string;
  priority?: ServiceOrderPriority;
  technician_id?: number;
  responsible_id?: number;
  notes?: string;
}

/** Campos aceitos por `UpdateServiceOrderUseCase.ts` (`ALLOWED_FIELDS`). */
export interface UpdateServiceOrderInput {
  diagnosed_issue?: string;
  service_performed?: string;
  labor_cost?: number;
  total_amount?: number;
  status?: ServiceOrderStatus;
  priority?: ServiceOrderPriority;
  technician_id?: number;
  responsible_id?: number;
  notes?: string;
  completion_date?: string;
  delivery_date?: string;
  warranty_days?: number;
}

/** `GET /api/service-orders` — lista ordens de serviço (filtros e paginação). */
export async function listServiceOrders(params: ServiceOrderListParams = {}) {
  const { data } = await httpClient.get<ListResponse<ServiceOrder>>('/api/service-orders', { params });
  return data;
}

/** `GET /api/service-orders/:id`. */
export async function getServiceOrder(id: number) {
  const { data } = await httpClient.get<ItemResponse<ServiceOrder>>(`/api/service-orders/${id}`);
  return data.data;
}

/** `POST /api/service-orders` — exige role `admin` ou `operator`. */
export async function createServiceOrder(input: CreateServiceOrderInput) {
  const { data } = await httpClient.post<ItemResponse<ServiceOrder>>('/api/service-orders', input);
  return data.data;
}

/** `PUT /api/service-orders/:id` — exige role `admin` ou `operator`. */
export async function updateServiceOrder(id: number, input: UpdateServiceOrderInput) {
  const { data } = await httpClient.put<ItemResponse<ServiceOrder>>(`/api/service-orders/${id}`, input);
  return data.data;
}

/** `DELETE /api/service-orders/:id` — cancela a ordem (`status='canceled'`). Exige role `admin`. */
export async function cancelServiceOrder(id: number) {
  const { data } = await httpClient.delete<ItemResponse<{ message: string }>>(`/api/service-orders/${id}`);
  return data.data;
}
