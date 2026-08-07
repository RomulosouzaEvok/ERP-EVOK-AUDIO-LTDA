import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * Módulo Facilities (departamento 17, sigla FAC). Endpoints hospedados sob
 * `/api/facilities/*` (`server/src/modules/facilities/presentation/routes/facilities.ts`).
 * Cobre 4 entidades de cadastro/controle: Frota de veículos, Abastecimento,
 * Programação de Limpeza e Áreas Físicas — CRUD create/list/get/update
 * (sem delete, ver decisão em `docs/administrativo/03-FACILITIES.md`).
 */

// ---------------------------------------------------------------------------
// Frota de veículos
// ---------------------------------------------------------------------------

export type VehicleFuelType = 'gasoline' | 'ethanol' | 'diesel' | 'flex' | 'electric';
export type VehicleStatus = 'active' | 'maintenance' | 'deactivated' | 'sold';

export interface Vehicle {
  id: number;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  fuel_type: VehicleFuelType | null;
  renavam: string | null;
  chassi: string | null;
  insurance_company: string | null;
  insurance_policy: string | null;
  insurance_expiry: string | null;
  last_oil_change: string | null;
  next_oil_change_km: number | null;
  current_km: number;
  status: VehicleStatus;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListVehiclesParams {
  status?: VehicleStatus;
  page?: number;
  limit?: number;
}

export interface CreateVehicleInput {
  plate: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  fuel_type?: VehicleFuelType;
  renavam?: string;
  chassi?: string;
  insurance_company?: string;
  insurance_policy?: string;
  insurance_expiry?: string;
  last_oil_change?: string;
  next_oil_change_km?: number;
  current_km?: number;
  status?: VehicleStatus;
  notes?: string;
}

export type UpdateVehicleInput = Partial<CreateVehicleInput>;

/** `GET /api/facilities/vehicles` — listagem paginada, filtro opcional por `status`. */
export async function listVehicles(params: ListVehiclesParams = {}) {
  const { data } = await httpClient.get<ListResponse<Vehicle>>('/api/facilities/vehicles', { params });
  return data;
}

/** `GET /api/facilities/vehicles/:id` — busca por id. */
export async function getVehicle(id: number) {
  const { data } = await httpClient.get<ItemResponse<Vehicle>>(`/api/facilities/vehicles/${id}`);
  return data.data;
}

/** `POST /api/facilities/vehicles` — cria um veículo (409 se placa duplicada). */
export async function createVehicle(input: CreateVehicleInput) {
  const { data } = await httpClient.post<ItemResponse<Vehicle>>('/api/facilities/vehicles', input);
  return data.data;
}

/** `PUT /api/facilities/vehicles/:id` — atualiza campos do veículo. */
export async function updateVehicle(id: number, input: UpdateVehicleInput) {
  const { data } = await httpClient.put<ItemResponse<Vehicle>>(`/api/facilities/vehicles/${id}`, input);
  return data.data;
}

// ---------------------------------------------------------------------------
// Abastecimento
// ---------------------------------------------------------------------------

export interface FuelRecord {
  id: number;
  vehicle_id: number;
  vehicle?: { id: number; plate: string; brand: string | null; model: string | null };
  record_date: string;
  km_at_refuel: number | null;
  liters: string | number;
  price_per_liter: string | number;
  total_cost: string | number;
  fuel_station: string | null;
  driver_id: number | null;
  driver?: { id: number; name: string };
  createdAt?: string;
}

export interface ListFuelRecordsParams {
  vehicle_id?: number;
  page?: number;
  limit?: number;
}

export interface CreateFuelRecordInput {
  vehicle_id: number;
  record_date: string;
  km_at_refuel?: number;
  liters: number;
  price_per_liter: number;
  total_cost?: number;
  fuel_station?: string;
  driver_id?: number;
}

export type UpdateFuelRecordInput = Partial<CreateFuelRecordInput>;

/** `GET /api/facilities/fuel-records` — listagem paginada, filtro opcional por `vehicle_id`. */
export async function listFuelRecords(params: ListFuelRecordsParams = {}) {
  const { data } = await httpClient.get<ListResponse<FuelRecord>>('/api/facilities/fuel-records', { params });
  return data;
}

/** `GET /api/facilities/fuel-records/:id` — busca por id. */
export async function getFuelRecord(id: number) {
  const { data } = await httpClient.get<ItemResponse<FuelRecord>>(`/api/facilities/fuel-records/${id}`);
  return data.data;
}

/** `POST /api/facilities/fuel-records` — cria um registro de abastecimento (404 se veículo inexistente). */
export async function createFuelRecord(input: CreateFuelRecordInput) {
  const { data } = await httpClient.post<ItemResponse<FuelRecord>>('/api/facilities/fuel-records', input);
  return data.data;
}

/** `PUT /api/facilities/fuel-records/:id` — atualiza campos do registro de abastecimento. */
export async function updateFuelRecord(id: number, input: UpdateFuelRecordInput) {
  const { data } = await httpClient.put<ItemResponse<FuelRecord>>(`/api/facilities/fuel-records/${id}`, input);
  return data.data;
}

// ---------------------------------------------------------------------------
// Programação de limpeza
// ---------------------------------------------------------------------------

export type CleaningFrequency = 'daily' | 'alternate' | 'weekly' | 'biweekly' | 'monthly';

export interface CleaningSchedule {
  id: number;
  area: string;
  frequency: CleaningFrequency;
  responsible_person: string | null;
  last_cleaning: string | null;
  next_cleaning: string | null;
  notes: string | null;
  createdAt?: string;
}

export interface ListCleaningSchedulesParams {
  frequency?: CleaningFrequency;
  page?: number;
  limit?: number;
}

export interface CreateCleaningScheduleInput {
  area: string;
  frequency: CleaningFrequency;
  responsible_person?: string;
  last_cleaning?: string;
  next_cleaning?: string;
  notes?: string;
}

export type UpdateCleaningScheduleInput = Partial<CreateCleaningScheduleInput>;

/** `GET /api/facilities/cleaning-schedules` — listagem paginada, filtro opcional por `frequency`. */
export async function listCleaningSchedules(params: ListCleaningSchedulesParams = {}) {
  const { data } = await httpClient.get<ListResponse<CleaningSchedule>>('/api/facilities/cleaning-schedules', { params });
  return data;
}

/** `GET /api/facilities/cleaning-schedules/:id` — busca por id. */
export async function getCleaningSchedule(id: number) {
  const { data } = await httpClient.get<ItemResponse<CleaningSchedule>>(`/api/facilities/cleaning-schedules/${id}`);
  return data.data;
}

/** `POST /api/facilities/cleaning-schedules` — cria uma programação de limpeza. */
export async function createCleaningSchedule(input: CreateCleaningScheduleInput) {
  const { data } = await httpClient.post<ItemResponse<CleaningSchedule>>('/api/facilities/cleaning-schedules', input);
  return data.data;
}

/** `PUT /api/facilities/cleaning-schedules/:id` — atualiza campos da programação de limpeza. */
export async function updateCleaningSchedule(id: number, input: UpdateCleaningScheduleInput) {
  const { data } = await httpClient.put<ItemResponse<CleaningSchedule>>(`/api/facilities/cleaning-schedules/${id}`, input);
  return data.data;
}

// ---------------------------------------------------------------------------
// Áreas físicas
// ---------------------------------------------------------------------------

export type AreaType = 'production' | 'warehouse' | 'office' | 'lab' | 'amenities' | 'external';

export interface FacilityArea {
  id: number;
  name: string;
  area_type: AreaType;
  square_meters: string | number | null;
  department_id: number | null;
  department?: { id: number; name: string };
  capacity_persons: number | null;
  notes: string | null;
  createdAt?: string;
}

export interface ListAreasParams {
  area_type?: AreaType;
  department_id?: number;
  page?: number;
  limit?: number;
}

export interface CreateAreaInput {
  name: string;
  area_type: AreaType;
  square_meters?: number;
  department_id?: number;
  capacity_persons?: number;
  notes?: string;
}

export type UpdateAreaInput = Partial<CreateAreaInput>;

/** `GET /api/facilities/areas` — listagem paginada, filtros opcionais por `area_type`/`department_id`. */
export async function listAreas(params: ListAreasParams = {}) {
  const { data } = await httpClient.get<ListResponse<FacilityArea>>('/api/facilities/areas', { params });
  return data;
}

/** `GET /api/facilities/areas/:id` — busca por id. */
export async function getArea(id: number) {
  const { data } = await httpClient.get<ItemResponse<FacilityArea>>(`/api/facilities/areas/${id}`);
  return data.data;
}

/** `POST /api/facilities/areas` — cria uma área física. */
export async function createArea(input: CreateAreaInput) {
  const { data } = await httpClient.post<ItemResponse<FacilityArea>>('/api/facilities/areas', input);
  return data.data;
}

/** `PUT /api/facilities/areas/:id` — atualiza campos da área física. */
export async function updateArea(id: number, input: UpdateAreaInput) {
  const { data } = await httpClient.put<ItemResponse<FacilityArea>>(`/api/facilities/areas/${id}`, input);
  return data.data;
}
