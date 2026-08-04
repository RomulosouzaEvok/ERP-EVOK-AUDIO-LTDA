import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';
import type { UserRole } from './auth';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  /** Perfil de acesso de área atualmente atribuído (UC-33) — `null` se nenhum. Nome resolvido no client cruzando com `listAccessProfiles`. */
  accessProfileId?: number | null;
}

export interface UserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

/** `GET /api/users`. */
export async function listUsers(params: { page?: number; limit?: number; search?: string; role?: UserRole; active?: boolean } = {}) {
  const { data } = await httpClient.get<ListResponse<User>>('/api/users', { params });
  return data;
}

/** `POST /api/users`. */
export async function createUser(input: UserInput) {
  const { data } = await httpClient.post<ItemResponse<User>>('/api/users', input);
  return data.data;
}

/** `PUT /api/users/:id`. */
export async function updateUser(id: number, input: Partial<Pick<User, 'name' | 'email' | 'role' | 'active'>>) {
  const { data } = await httpClient.put<ItemResponse<User>>(`/api/users/${id}`, input);
  return data.data;
}

/** `DELETE /api/users/:id` — inativa o usuário. */
export async function deactivateUser(id: number) {
  await httpClient.delete(`/api/users/${id}`);
}

/** `POST /api/users/:id/revoke-sessions` — revogação emergencial (SEC-12). */
export async function revokeUserSessions(id: number) {
  const { data } = await httpClient.post<ItemResponse<{ message: string }>>(`/api/users/${id}/revoke-sessions`);
  return data.data.message;
}
