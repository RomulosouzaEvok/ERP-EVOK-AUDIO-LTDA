import { httpClient } from './httpClient';
import type { ItemResponse } from './types';

/**
 * API de Departamentos (RH). Endpoints hospedados sob `/api/departments`
 * (`server/src/modules/departments/presentation/routes/departments.ts`).
 * Leitura exige apenas sessão autenticada; escrita (`POST`/`PUT`/`DELETE`)
 * exige role `admin` (`authorize('admin')` no backend — não é um módulo de
 * `access-profiles`, é checagem de role pura).
 */

export interface Department {
  id: number;
  code: string;
  name: string;
  sigla: string;
  description: string | null;
  manager_id: number | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** `GET /api/departments` — lista departamentos ativos (sem paginação, sem filtro de inativos). */
export async function listDepartments() {
  const { data } = await httpClient.get<ItemResponse<Department[]>>('/api/departments');
  return data.data;
}

/** `GET /api/departments/:id` — busca um departamento pelo id. */
export async function getDepartment(id: number) {
  const { data } = await httpClient.get<ItemResponse<Department>>(`/api/departments/${id}`);
  return data.data;
}

export interface CreateDepartmentInput {
  code: string;
  name: string;
  sigla: string;
  description?: string | null;
}

/**
 * `POST /api/departments` — cria um novo departamento (exige role `admin`).
 *
 * @throws {AxiosError} 400 `ValidationError` (código/nome ausentes); 409 `ConflictError` (código/nome já existem).
 */
export async function createDepartment(input: CreateDepartmentInput) {
  const { data } = await httpClient.post<ItemResponse<Department>>('/api/departments', input);
  return data.data;
}

export interface UpdateDepartmentInput {
  code?: string;
  name?: string;
  sigla?: string;
  description?: string | null;
  active?: boolean;
  manager_id?: number | null;
}

/**
 * `PUT /api/departments/:id` — atualiza um departamento (exige role `admin`).
 *
 * @throws {AxiosError} 404 `NotFoundError`; 409 `ConflictError` (código/nome já existem).
 */
export async function updateDepartment(id: number, input: UpdateDepartmentInput) {
  const { data } = await httpClient.put<ItemResponse<Department>>(`/api/departments/${id}`, input);
  return data.data;
}

/**
 * `DELETE /api/departments/:id` — inativa (soft delete, `active = false`) um departamento (exige role `admin`).
 *
 * @throws {AxiosError} 404 `NotFoundError`.
 */
export async function deactivateDepartment(id: number) {
  const { data } = await httpClient.delete<ItemResponse<{ message: string }>>(`/api/departments/${id}`);
  return data.data;
}
