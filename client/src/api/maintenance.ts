import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * API do módulo `maintenance` — ordens de manutenção de ativos (máquinas,
 * equipamentos), montadas sob `/api/maintenance`
 * (`server/src/modules/maintenance/presentation/routes/maintenance.ts`).
 *
 * **Risco conhecido de backend** (não corrigido nesta entrega — fora do
 * escopo de frontend): `CreateMaintenanceOrderUseCase.ts` envia ao
 * repositório os campos `description` e não gera `order_number`, mas o
 * model `MaintenanceOrder` exige `problem_description` (NOT NULL) e
 * `order_number` (NOT NULL, UNIQUE, sem valor padrão). Isso faz com que
 * **toda chamada `POST /api/maintenance` retorne 500** hoje
 * (`SequelizeValidationError`/`SequelizeUniqueConstraintError` de coluna
 * nula). A tela envia o payload no formato que o use case espera
 * (`description`, não `problem_description`) — quando o backend for
 * corrigido para mapear corretamente os campos, nenhuma mudança é
 * necessária aqui. Ver relatório de handoff para detalhes.
 */

export type MaintenanceOrderStatus = 'open' | 'scheduled' | 'in_progress' | 'waiting_parts' | 'completed' | 'canceled';
export type MaintenanceOrderType = 'preventive' | 'corrective' | 'predictive' | 'emergency' | 'overhaul';
export type MaintenanceOrderPriority = 'low' | 'normal' | 'high' | 'emergency';
export type MaintenanceOrderResult = 'completed' | 'partial' | 'transferred' | 'canceled';

export interface MaintenanceOrder {
  id: number;
  order_number: string;
  asset_id: number;
  maintenance_type: MaintenanceOrderType;
  priority: MaintenanceOrderPriority;
  problem_description: string;
  reported_by: number | null;
  report_date: string;
  diagnosed_problem: string | null;
  diagnosed_by: number | null;
  diagnosis_date: string | null;
  service_performed: string | null;
  technician_id: number | null;
  start_date: string | null;
  completion_date: string | null;
  parts_cost: string;
  labor_cost: string;
  total_cost: string;
  downtime_hours: string;
  result: MaintenanceOrderResult | null;
  notes: string | null;
  scheduled_date: string | null;
  frequency_days: number | null;
  next_maintenance_date: string | null;
  status: MaintenanceOrderStatus;
  created_by: number | null;
  createdAt?: string;
  updatedAt?: string;
  asset?: { id: number; name: string; tag: string };
  technician?: { id: number; name: string } | null;
  reporter?: { id: number; name: string } | null;
  diagnoser?: { id: number; name: string } | null;
}

export interface MaintenanceOrderListParams {
  page?: number;
  limit?: number;
  status?: MaintenanceOrderStatus;
  asset_id?: number;
}

/**
 * Payload de criação — nomes de campo espelham exatamente o que
 * `CreateMaintenanceOrderUseCase.ts` lê de `req.body` (`asset_id` e
 * `description` são obrigatórios; `reportedBy` vem do JWT no backend, não é
 * enviado pelo client).
 */
export interface CreateMaintenanceOrderInput {
  asset_id: number;
  description: string;
  priority?: MaintenanceOrderPriority;
  maintenance_type?: MaintenanceOrderType;
}

/** Campos aceitos por `UpdateMaintenanceOrderUseCase.ts` (`ALLOWED_FIELDS`). */
export interface UpdateMaintenanceOrderInput {
  description?: string;
  diagnosis?: string;
  solution?: string;
  parts_used?: string;
  cost?: number;
  status?: MaintenanceOrderStatus;
  priority?: MaintenanceOrderPriority;
  maintenance_type?: MaintenanceOrderType;
  technician_id?: number;
  start_date?: string;
  completion_date?: string;
  notes?: string;
}

/** `GET /api/maintenance` — lista ordens de manutenção (filtros e paginação). */
export async function listMaintenanceOrders(params: MaintenanceOrderListParams = {}) {
  const { data } = await httpClient.get<ListResponse<MaintenanceOrder>>('/api/maintenance', { params });
  return data;
}

/** `GET /api/maintenance/:id`. */
export async function getMaintenanceOrder(id: number) {
  const { data } = await httpClient.get<ItemResponse<MaintenanceOrder>>(`/api/maintenance/${id}`);
  return data.data;
}

/** `POST /api/maintenance` — exige role `admin` ou `operator`. */
export async function createMaintenanceOrder(input: CreateMaintenanceOrderInput) {
  const { data } = await httpClient.post<ItemResponse<MaintenanceOrder>>('/api/maintenance', input);
  return data.data;
}

/** `PUT /api/maintenance/:id` — exige role `admin` ou `operator`. */
export async function updateMaintenanceOrder(id: number, input: UpdateMaintenanceOrderInput) {
  const { data } = await httpClient.put<ItemResponse<MaintenanceOrder>>(`/api/maintenance/${id}`, input);
  return data.data;
}

/** `DELETE /api/maintenance/:id` — cancela a ordem (`status='canceled'`). Exige role `admin`. */
export async function cancelMaintenanceOrder(id: number) {
  const { data } = await httpClient.delete<ItemResponse<{ message: string }>>(`/api/maintenance/${id}`);
  return data.data;
}
