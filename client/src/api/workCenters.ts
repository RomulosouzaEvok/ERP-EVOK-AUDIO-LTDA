import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

export interface WorkCenterShift {
  id: number | string;
  work_center_id: number | string;
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface WorkCenter {
  id: number | string;
  code: string;
  name: string;
  description: string | null;
  machines_count: number;
  capacity_hours_per_day: number | string;
  efficiency_factor: number | string;
  active: boolean;
  shifts?: WorkCenterShift[];
}

export interface ListWorkCentersParams {
  active?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateWorkCenterInput {
  code: string;
  name: string;
  description?: string;
  machines_count: number;
  capacity_hours_per_day: number;
  efficiency_factor: number;
}

export interface UpdateWorkCenterInput {
  code?: string;
  name?: string;
  description?: string;
  machines_count?: number;
  capacity_hours_per_day?: number;
  efficiency_factor?: number;
  active?: boolean;
}

export interface ShiftInput {
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface WorkCenterLoadRow {
  id: number | string;
  code: string;
  name: string;
  machines_count: number;
  capacity_hours: number;
  load_hours: number;
  utilization_rate: number | null;
  steps_count: number;
}

export interface WorkCenterLoadReport {
  horizon_days: number;
  centers: WorkCenterLoadRow[];
}

export async function listWorkCenters(params: ListWorkCentersParams = {}) {
  const { data } = await httpClient.get<ListResponse<WorkCenter>>('/api/work-centers', { params });
  return data;
}

export async function getWorkCenterById(id: number | string) {
  const { data } = await httpClient.get<ItemResponse<WorkCenter>>(`/api/work-centers/${id}`);
  return data.data;
}

export async function createWorkCenter(input: CreateWorkCenterInput) {
  const { data } = await httpClient.post<ItemResponse<WorkCenter>>('/api/work-centers', input);
  return data.data;
}

export async function updateWorkCenter(id: number | string, input: UpdateWorkCenterInput) {
  const { data } = await httpClient.put<ItemResponse<WorkCenter>>(`/api/work-centers/${id}`, input);
  return data.data;
}

export async function replaceWorkCenterShifts(id: number | string, shifts: ShiftInput[]) {
  const { data } = await httpClient.put<ItemResponse<WorkCenter>>(`/api/work-centers/${id}/shifts`, { shifts });
  return data.data;
}

export async function getWorkCenterLoad(days: number) {
  const { data } = await httpClient.get<ItemResponse<WorkCenterLoadReport>>('/api/work-centers/load', {
    params: { days },
  });
  return data.data;
}
