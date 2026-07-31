import { httpClient } from './httpClient';
import type { ListResponse } from './types';

export interface AuditLog {
  id: number;
  user_id?: number | null;
  user_name?: string | null;
  action: string;
  entity_type: string;
  entity_id?: number | null;
  entity_description?: string | null;
  description?: string | null;
  success: boolean;
  createdAt: string;
}

/** `GET /api/audit-logs`. */
export async function listAuditLogs(params: { page?: number; limit?: number; entity_type?: string; entity_id?: number; action?: string } = {}) {
  const { data } = await httpClient.get<ListResponse<AuditLog>>('/api/audit-logs', { params });
  return data;
}
