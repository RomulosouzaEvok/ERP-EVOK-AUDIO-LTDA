/**
 * Client do painel de TV — `GET /api/dashboard/department-demands`.
 * Ver `docs/API.md` seção "14. Dashboard / Painel de TV" para o contrato completo.
 */

import { apiRequest } from './client';
import type { DepartmentDemand, DepartmentDemandsResponse } from './types';

export async function fetchDepartmentDemands(): Promise<DepartmentDemand[]> {
  const response = await apiRequest<DepartmentDemandsResponse>('/dashboard/department-demands');
  return response.data;
}
