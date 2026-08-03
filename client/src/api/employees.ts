import { httpClient } from './httpClient';
import type { ListResponse } from './types';

export interface Employee {
  id: number;
  name: string;
  department_id?: number | null;
  department?: { id: number; name: string } | null;
  status?: string;
}

/** `GET /api/employees`. */
export async function listEmployees(params: { page?: number; limit?: number; search?: string } = {}) {
  const { data } = await httpClient.get<ListResponse<Employee>>('/api/employees', { params });
  return data;
}
