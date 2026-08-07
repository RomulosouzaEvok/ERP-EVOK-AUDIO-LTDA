import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * Módulo Facilities (departamento 17, sigla FAC). Endpoints hospedados sob
 * `/api/facilities/*` (`server/src/modules/facilities/presentation/routes/facilities.ts`),
 * contrato completo em `docs/business/BLOCO_4_FAC_API.md` (60 endpoints,
 * BLOCO 4 — correção 2026-08-07).
 *
 * BREAKING CHANGE (D-2): veículo agora é extensão 1:1 de `Asset`
 * (`asset_type='vehicle'`) — o identificador de negócio de um veículo em
 * todas as rotas (`/vehicles/:assetId`, `/documents`, `/trips`,
 * `/fuel-records`, `/fines`) é sempre `asset_id`, nunca mais um id de
 * tabela própria de veículo. **Nota de reconciliação de implementação**: a
 * listagem/detalhe de `GET /vehicles` retorna a linha crua de
 * `facility_vehicle_details` (com `id` = PK própria da extensão, diferente
 * de `asset_id`) — sempre use `asset_id` para navegar/rotear, nunca `id`.
 *
 * Tipos de FK são sempre `number` (INTEGER autoIncrement no banco), nunca
 * UUID. Valores monetários (`DECIMAL`) chegam como `string` no JSON.
 */

// ---------------------------------------------------------------------------
// Grupo 1 — Frota: Veículo (extensão de Asset) + Documento
// ---------------------------------------------------------------------------

export type VehicleFuelType = 'gasoline' | 'ethanol' | 'diesel' | 'flex' | 'electric';
export type AssetStatus = 'active' | 'in_maintenance' | 'decommissioned' | 'lost' | 'returned_to_supplier';

export interface VehicleAssetSummary {
  id: number;
  tag: string;
  name: string;
  asset_type: string;
  brand: string | null;
  model: string | null;
  status: AssetStatus;
  department_id: number | null;
  responsible_id: number | null;
  department?: { id: number; name: string } | null;
  responsible?: { id: number; name: string } | null;
}

/** Linha de `facility_vehicle_details` — `id` é a PK própria da extensão; use sempre `asset_id` para navegar/rotear. */
export interface Vehicle {
  id: number;
  asset_id: number;
  plate: string;
  renavam: string | null;
  chassi: string | null;
  color: string | null;
  year: number | null;
  fuel_type: VehicleFuelType | null;
  current_km: number;
  tank_capacity_liters: string | number | null;
  required_cnh_category: string | null;
  last_oil_change: string | null;
  next_oil_change_km: number | null;
  insurance_company: string | null;
  insurance_policy: string | null;
  insurance_expiry: string | null;
  notes: string | null;
  asset?: VehicleAssetSummary;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListVehiclesParams {
  status?: AssetStatus;
  fuel_type?: VehicleFuelType;
  document_expiring?: boolean;
  preventive_due?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateVehicleInput {
  brand: string;
  model: string;
  responsible_id?: number;
  department_id?: number;
  plate: string;
  renavam?: string;
  chassi?: string;
  color?: string;
  year?: number;
  fuel_type: VehicleFuelType;
  current_km?: number;
  tank_capacity_liters?: number;
  required_cnh_category?: string;
  notes?: string;
}

export interface CreateVehicleResult {
  asset_id: number;
  asset: VehicleAssetSummary;
  vehicle_detail: Vehicle;
}

export type UpdateVehicleInput = Partial<
  Pick<
    CreateVehicleInput,
    'plate' | 'renavam' | 'chassi' | 'color' | 'year' | 'fuel_type' | 'tank_capacity_liters' | 'required_cnh_category' | 'notes'
  >
>;

/** `GET /api/facilities/vehicles` — join Asset (`asset_type='vehicle'`) + extensão. */
export async function listVehicles(params: ListVehiclesParams = {}) {
  const { data } = await httpClient.get<ListResponse<Vehicle>>('/api/facilities/vehicles', { params });
  return data;
}

/** `GET /api/facilities/vehicles/:assetId` — detalhe completo (asset + extensão). */
export async function getVehicle(assetId: number) {
  const { data } = await httpClient.get<ItemResponse<Vehicle>>(`/api/facilities/vehicles/${assetId}`);
  return data.data;
}

/** `POST /api/facilities/vehicles` — cria Asset + FacilityVehicleDetail numa transação (RF-FAC-006). */
export async function createVehicle(input: CreateVehicleInput) {
  const { data } = await httpClient.post<ItemResponse<CreateVehicleResult>>('/api/facilities/vehicles', input);
  return data.data;
}

/** `PUT /api/facilities/vehicles/:assetId` — atualiza só a extensão (marca/modelo/status vêm de `PUT /api/assets/:id`). */
export async function updateVehicle(assetId: number, input: UpdateVehicleInput) {
  const { data } = await httpClient.put<ItemResponse<Vehicle>>(`/api/facilities/vehicles/${assetId}`, input);
  return data.data;
}

// ---- Documento de veículo com vencimento (RF-FAC-007 a 010) ----

export type VehicleDocType = 'crlv_licenciamento' | 'seguro' | 'ipva' | 'outro';
export type VehicleDocStatus = 'vigente' | 'vencido' | 'renovado';

export interface VehicleDocument {
  id: number;
  asset_id: number;
  doc_type: VehicleDocType;
  reference: string | null;
  issuer: string | null;
  valid_until: string | null;
  cost: string | number | null;
  file_path: string | null;
  status: VehicleDocStatus;
  released_by: number | null;
  released_at: string | null;
  notes: string | null;
  createdAt?: string;
}

export interface CreateVehicleDocumentInput {
  doc_type: VehicleDocType;
  reference?: string;
  issuer?: string;
  valid_until?: string;
  has_expiration?: boolean;
  cost?: number;
  file_path?: string;
}

export interface RenewVehicleDocumentInput {
  valid_until: string;
  reference?: string;
  cost?: number;
  file_path?: string;
}

export interface ReleaseVehicleDocumentInput {
  release_reason: string;
}

export async function listVehicleDocuments(assetId: number) {
  const { data } = await httpClient.get<ItemResponse<VehicleDocument[]>>(`/api/facilities/vehicles/${assetId}/documents`);
  return data.data;
}

export async function createVehicleDocument(assetId: number, input: CreateVehicleDocumentInput) {
  const { data } = await httpClient.post<ItemResponse<VehicleDocument>>(`/api/facilities/vehicles/${assetId}/documents`, input);
  return data.data;
}

export async function renewVehicleDocument(assetId: number, docId: number, input: RenewVehicleDocumentInput) {
  const { data } = await httpClient.post<ItemResponse<VehicleDocument>>(`/api/facilities/vehicles/${assetId}/documents/${docId}/renew`, input);
  return data.data;
}

/** Nível `approve` — libera saída com documento `seguro` vencido (RF-FAC-010). */
export async function releaseVehicleDocument(assetId: number, docId: number, input: ReleaseVehicleDocumentInput) {
  const { data } = await httpClient.post<ItemResponse<VehicleDocument>>(`/api/facilities/vehicles/${assetId}/documents/${docId}/release`, input);
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 2 — Condutor (Autorização de Condução)
// ---------------------------------------------------------------------------

export interface Driver {
  id: number;
  employee_id: number;
  employee?: { id: number; name: string } | null;
  cnh_number: string;
  cnh_category: string;
  cnh_valid_until: string;
  cnh_file_path: string | null;
  authorized: boolean;
  authorized_by: number | null;
  authorized_at: string | null;
  notes: string | null;
  createdAt?: string;
}

export interface ListDriversParams {
  authorized?: boolean;
  cnh_expiring?: boolean;
  employee_id?: number;
  page?: number;
  limit?: number;
}

export interface CreateDriverInput {
  employee_id: number;
  cnh_number: string;
  cnh_category: string;
  cnh_valid_until: string;
  cnh_file_path?: string;
}

export type UpdateDriverInput = Partial<Pick<CreateDriverInput, 'cnh_number' | 'cnh_category' | 'cnh_valid_until' | 'cnh_file_path'>>;

export async function listDrivers(params: ListDriversParams = {}) {
  const { data } = await httpClient.get<ListResponse<Driver>>('/api/facilities/drivers', { params });
  return data;
}

export async function getDriver(id: number) {
  const { data } = await httpClient.get<ItemResponse<Driver>>(`/api/facilities/drivers/${id}`);
  return data.data;
}

export async function createDriver(input: CreateDriverInput) {
  const { data } = await httpClient.post<ItemResponse<Driver>>('/api/facilities/drivers', input);
  return data.data;
}

export async function updateDriver(id: number, input: UpdateDriverInput) {
  const { data } = await httpClient.put<ItemResponse<Driver>>(`/api/facilities/drivers/${id}`, input);
  return data.data;
}

export async function authorizeDriver(id: number) {
  const { data } = await httpClient.post<ItemResponse<Driver>>(`/api/facilities/drivers/${id}/authorize`, {});
  return data.data;
}

/** Nível `approve` — suspende condutor (RF-FAC-015). */
export async function suspendDriver(id: number, suspension_reason: string) {
  const { data } = await httpClient.post<ItemResponse<Driver>>(`/api/facilities/drivers/${id}/suspend`, { suspension_reason });
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 3 — Diário de Uso (Trips) + Abastecimento
// ---------------------------------------------------------------------------

export type TripPurpose = 'delivery' | 'executive' | 'errand' | 'other';
export type TripStatus = 'scheduled' | 'out' | 'returned' | 'canceled';

export interface Trip {
  id: number;
  asset_id: number;
  driver_id: number;
  requested_by: number | null;
  purpose: TripPurpose;
  destination: string | null;
  departure_at: string | null;
  departure_km: number | null;
  return_at: string | null;
  return_km: number | null;
  fuel_level_out: number | null;
  fuel_level_in: number | null;
  incidents: string | null;
  odometer_override_reason: string | null;
  odometer_override_approved_by: number | null;
  odometer_override_approved_at: string | null;
  status: TripStatus;
  cancel_reason: string | null;
  createdAt?: string;
}

export interface ListTripsParams {
  asset_id?: number;
  driver_id?: number;
  status?: TripStatus;
  purpose?: TripPurpose;
  page?: number;
  limit?: number;
}

export interface CreateTripInput {
  asset_id: number;
  driver_id: number;
  purpose: TripPurpose;
  destination?: string;
  scheduled_departure_at?: string;
}

export interface DepartTripInput {
  departure_km?: number;
  fuel_level_out?: number;
  notes?: string;
  /** Obrigatória junto com nível `approve` quando `departure_km` é menor que o maior `return_km` conhecido (RF-FAC-017). */
  divergence_justification?: string;
}

export interface ReturnTripInput {
  return_km: number;
  fuel_level_in?: number;
  incidents?: string;
}

export async function listTrips(params: ListTripsParams = {}) {
  const { data } = await httpClient.get<ListResponse<Trip>>('/api/facilities/trips', { params });
  return data;
}

export async function getTrip(id: number) {
  const { data } = await httpClient.get<ItemResponse<Trip>>(`/api/facilities/trips/${id}`);
  return data.data;
}

export async function createTrip(input: CreateTripInput) {
  const { data } = await httpClient.post<ItemResponse<Trip>>('/api/facilities/trips', input);
  return data.data;
}

/** Nível `operate`, ou `approve` se houver divergência de odômetro (E1-E4 do UC-58). */
export async function departTrip(id: number, input: DepartTripInput) {
  const { data } = await httpClient.post<ItemResponse<Trip>>(`/api/facilities/trips/${id}/depart`, input);
  return data.data;
}

export async function returnTrip(id: number, input: ReturnTripInput) {
  const { data } = await httpClient.post<ItemResponse<Trip>>(`/api/facilities/trips/${id}/return`, input);
  return data.data;
}

export async function cancelTrip(id: number, cancel_reason: string) {
  const { data } = await httpClient.post<ItemResponse<Trip>>(`/api/facilities/trips/${id}/cancel`, { cancel_reason });
  return data.data;
}

// ---- Abastecimento (BREAKING: vehicle_id → asset_id) ----

export interface FuelRecord {
  id: number;
  asset_id: number;
  record_date: string;
  km_at_refuel: number | null;
  liters: string | number;
  price_per_liter: string | number;
  total_cost: string | number;
  fuel_station: string | null;
  driver_id: number | null;
  full_tank: boolean;
  invoice_ref: string | null;
  trip_id: number | null;
  consumption_alert?: boolean | null;
  createdAt?: string;
}

export interface ListFuelRecordsParams {
  asset_id?: number;
  full_tank?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateFuelRecordInput {
  asset_id: number;
  record_date?: string;
  km_at_refuel?: number;
  liters: number;
  unit_price: number;
  total_cost?: number;
  fuel_station?: string;
  driver_id?: number;
  full_tank?: boolean;
  invoice_ref?: string;
  trip_id?: number | null;
}

export interface UpdateFuelRecordInput {
  invoice_ref?: string;
  fuel_station?: string;
  unit_price?: number;
  total_cost?: number;
  full_tank?: boolean;
}

export async function listFuelRecords(params: ListFuelRecordsParams = {}) {
  const { data } = await httpClient.get<ListResponse<FuelRecord>>('/api/facilities/fuel-records', { params });
  return data;
}

export async function getFuelRecord(id: number) {
  const { data } = await httpClient.get<ItemResponse<FuelRecord>>(`/api/facilities/fuel-records/${id}`);
  return data.data;
}

export async function createFuelRecord(input: CreateFuelRecordInput) {
  const { data } = await httpClient.post<ItemResponse<FuelRecord>>('/api/facilities/fuel-records', input);
  return data.data;
}

/** Não permite alterar `km_at_refuel`/`liters` após criado (RNF-FAC-01). */
export async function updateFuelRecord(id: number, input: UpdateFuelRecordInput) {
  const { data } = await httpClient.put<ItemResponse<FuelRecord>>(`/api/facilities/fuel-records/${id}`, input);
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 4 — Multa (Prazo Legal de Indicação de Condutor)
// ---------------------------------------------------------------------------

export type FineIndicationStatus = 'pending' | 'indicated' | 'expired_nic' | 'not_applicable';
export type FineStatus = 'open' | 'paid' | 'appealed' | 'canceled';

export interface Fine {
  id: number;
  asset_id: number;
  infraction_at: string;
  location: string | null;
  infraction_code: string | null;
  description: string | null;
  amount: string | number;
  points: number | null;
  notice_received_at: string | null;
  indication_deadline: string | null;
  identified_driver_id: number | null;
  indicated_at: string | null;
  indication_status: FineIndicationStatus;
  charge_to_driver: boolean;
  financial_ref: string | null;
  accounts_payable_id: number | null;
  status: FineStatus;
  notes: string | null;
  suggested_driver_id?: number | null;
  createdAt?: string;
}

export interface ListFinesParams {
  asset_id?: number;
  indication_status?: FineIndicationStatus;
  status?: FineStatus;
  deadline_expiring_days?: number;
  page?: number;
  limit?: number;
}

export interface CreateFineInput {
  asset_id: number;
  infraction_at: string;
  location?: string;
  infraction_code: string;
  description?: string;
  amount: number;
  points?: number;
  notice_received_at?: string;
}

export interface IndicateFineInput {
  identified_driver_id: number;
  indicated_at: string;
  protocol_number?: string;
}

export interface PayFineInput {
  payment_date: string;
  cost_center_id?: number;
}

export async function listFines(params: ListFinesParams = {}) {
  const { data } = await httpClient.get<ListResponse<Fine>>('/api/facilities/fines', { params });
  return data;
}

export async function getFine(id: number) {
  const { data } = await httpClient.get<ItemResponse<Fine>>(`/api/facilities/fines/${id}`);
  return data.data;
}

export async function createFine(input: CreateFineInput) {
  const { data } = await httpClient.post<ItemResponse<Fine>>('/api/facilities/fines', input);
  return data.data;
}

export async function getSuggestedFineDriver(id: number) {
  const { data } = await httpClient.get<ItemResponse<{ suggested_driver_id: number | null }>>(`/api/facilities/fines/${id}/suggested-driver`);
  return data.data;
}

/** Nível `approve` — confirma indicação (ato humano, RF-FAC-032). */
export async function indicateFineDriver(id: number, input: IndicateFineInput) {
  const { data } = await httpClient.post<ItemResponse<Fine>>(`/api/facilities/fines/${id}/indicate`, input);
  return data.data;
}

export async function appealFine(id: number) {
  const { data } = await httpClient.post<ItemResponse<Fine>>(`/api/facilities/fines/${id}/appeal`, {});
  return data.data;
}

/** Nível `approve` — gera título em Contas a Pagar categoria "Frota". */
export async function payFine(id: number, input: PayFineInput) {
  const { data } = await httpClient.post<ItemResponse<Fine>>(`/api/facilities/fines/${id}/pay`, input);
  return data.data;
}

export async function chargeDriverFine(id: number, financial_ref: string) {
  const { data } = await httpClient.post<ItemResponse<Fine>>(`/api/facilities/fines/${id}/charge-driver`, { financial_ref });
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 5 — Manutenção Predial (via maintenance_orders estendida, D-1)
// ---------------------------------------------------------------------------

export type FacilitySpecialty = 'electrical' | 'plumbing' | 'civil' | 'hvac' | 'roofing' | 'gardening' | 'other';
export type MaintenanceTicketPriority = 'low' | 'normal' | 'high' | 'emergency';
export type MaintenanceTicketStatus = 'open' | 'scheduled' | 'in_progress' | 'waiting_parts' | 'completed' | 'canceled';

export interface MaintenanceTicket {
  id: number;
  facility_area_id: number | null;
  facility_area?: { id: number; name: string } | null;
  facility_specialty: FacilitySpecialty | null;
  asset_id: number | null;
  description: string;
  reported_by: number | null;
  priority: MaintenanceTicketPriority;
  personal_safety_risk?: boolean | null;
  sst_notified_at?: string | null;
  status: MaintenanceTicketStatus;
  service_performed: string | null;
  parts_cost: string | number | null;
  labor_cost: string | number | null;
  next_maintenance_km: number | null;
  frequency_days: number | null;
  createdAt?: string;
}

export interface ListMaintenanceTicketsParams {
  facility_specialty?: FacilitySpecialty;
  priority?: MaintenanceTicketPriority;
  status?: MaintenanceTicketStatus;
  facility_area_id?: number;
  page?: number;
  limit?: number;
}

export interface CreateMaintenanceTicketInput {
  facility_area_id: number;
  facility_specialty: FacilitySpecialty;
  asset_id?: number | null;
  description: string;
}

export interface TriageMaintenanceTicketInput {
  priority: MaintenanceTicketPriority;
  personal_safety_risk?: boolean;
}

export interface SupplyConsumed {
  item_id: string;
  quantity: number;
  unit?: string;
}

export interface ExecuteMaintenanceTicketInput {
  service_performed: string;
  parts_cost?: number;
  labor_cost?: number;
  supplies_consumed?: SupplyConsumed[];
}

/** `GET`/`GET :id` exigem `manutencao` OU `facilities` (composição de módulos). */
export async function listMaintenanceTickets(params: ListMaintenanceTicketsParams = {}) {
  const { data } = await httpClient.get<ListResponse<MaintenanceTicket>>('/api/facilities/maintenance-tickets', { params });
  return data;
}

export async function getMaintenanceTicket(id: number) {
  const { data } = await httpClient.get<ItemResponse<MaintenanceTicket>>(`/api/facilities/maintenance-tickets/${id}`);
  return data.data;
}

/** Auto-serviço — apenas `authenticate`, sem exigir o módulo `facilities` (RF-FAC-040). */
export async function createMaintenanceTicket(input: CreateMaintenanceTicketInput) {
  const { data } = await httpClient.post<ItemResponse<MaintenanceTicket>>('/api/facilities/maintenance-tickets', input);
  return data.data;
}

export async function triageMaintenanceTicket(id: number, input: TriageMaintenanceTicketInput) {
  const { data } = await httpClient.post<ItemResponse<MaintenanceTicket>>(`/api/facilities/maintenance-tickets/${id}/triage`, input);
  return data.data;
}

export async function executeMaintenanceTicket(id: number, input: ExecuteMaintenanceTicketInput) {
  const { data } = await httpClient.post<ItemResponse<MaintenanceTicket>>(`/api/facilities/maintenance-tickets/${id}/execute`, input);
  return data.data;
}

export async function closeMaintenanceTicket(id: number) {
  const { data } = await httpClient.post<ItemResponse<MaintenanceTicket>>(`/api/facilities/maintenance-tickets/${id}/close`, {});
  return data.data;
}

export async function generatePreventiveMaintenanceTicket(id: number, frequency_days: number) {
  const { data } = await httpClient.post<ItemResponse<MaintenanceTicket>>(`/api/facilities/maintenance-tickets/${id}/generate-preventive`, {
    frequency_days,
  });
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 7 — Visitantes e Correspondência
// ---------------------------------------------------------------------------

export interface Visitor {
  id: number;
  name: string;
  /** Mascarado em listagem (`***.***.789-00`), completo apenas quando embutido no detalhe de uma visita. */
  document: string;
  company: string | null;
  phone: string | null;
  photo_path: string | null;
  createdAt?: string;
}

export interface ListVisitorsParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateVisitorInput {
  name: string;
  document: string;
  company?: string;
  phone?: string;
  photo_path?: string;
}

export async function listVisitors(params: ListVisitorsParams = {}) {
  const { data } = await httpClient.get<ListResponse<Visitor>>('/api/facilities/visitors', { params });
  return data;
}

export async function createVisitor(input: CreateVisitorInput) {
  const { data } = await httpClient.post<ItemResponse<Visitor>>('/api/facilities/visitors', input);
  return data.data;
}

export type VisitStatus = 'scheduled' | 'onsite' | 'completed' | 'no_show' | 'canceled';

export interface Visit {
  id: number;
  visitor_id: number;
  visitor?: Visitor;
  host_employee_id: number;
  host?: { id: number; name: string } | null;
  scheduled_at: string | null;
  checkin_at: string | null;
  checkout_at: string | null;
  badge_number: string | null;
  purpose: string | null;
  areas_authorized: string | string[] | null;
  status: VisitStatus;
  createdAt?: string;
}

export interface ListVisitsParams {
  status?: VisitStatus;
  host_employee_id?: number;
  page?: number;
  limit?: number;
}

export interface CreateVisitInput {
  visitor: CreateVisitorInput;
  host_employee_id: number;
  scheduled_at?: string | null;
  badge_number?: string;
  purpose?: string;
  areas_authorized?: string[];
}

export interface OnsiteOverdueVisit {
  id: number;
  visitor_id: number;
  visitor_name: string;
  host_employee_id: number;
  checkin_at: string;
  hours_onsite: number;
  overdue: boolean;
}

export async function listVisits(params: ListVisitsParams = {}) {
  const { data } = await httpClient.get<ListResponse<Visit>>('/api/facilities/visits', { params });
  return data;
}

export async function getVisit(id: number) {
  const { data } = await httpClient.get<ItemResponse<Visit>>(`/api/facilities/visits/${id}`);
  return data.data;
}

/** Check-in — cria/reaproveita `Visitante` (por `document`) + `Visita`, `status='onsite'`. */
export async function createVisit(input: CreateVisitInput) {
  const { data } = await httpClient.post<ItemResponse<Visit>>('/api/facilities/visits', input);
  return data.data;
}

export async function checkoutVisit(id: number) {
  const { data } = await httpClient.post<ItemResponse<Visit>>(`/api/facilities/visits/${id}/checkout`, {});
  return data.data;
}

/** Dashboard: visitantes `onsite` além do horário-limite configurado (RF-FAC-046). */
export async function listOnsiteOverdueVisits() {
  const { data } = await httpClient.get<ItemResponse<OnsiteOverdueVisit[]>>('/api/facilities/visits/onsite-overdue');
  return data.data;
}

// ---- Correspondência ----

export type CorrespondenceType = 'letter' | 'package' | 'document' | 'other';

export interface Correspondence {
  id: number;
  received_at: string;
  sender: string | null;
  recipient_employee_id: number | null;
  recipient_employee?: { id: number; name: string } | null;
  recipient_department_id: number | null;
  recipient_department?: { id: number; name: string } | null;
  type: CorrespondenceType;
  delivered_at: string | null;
  delivered_to: string | null;
  notes: string | null;
  createdAt?: string;
}

export interface ListCorrespondenceParams {
  delivered?: boolean;
  recipient_employee_id?: number;
  recipient_department_id?: number;
  page?: number;
  limit?: number;
}

export interface CreateCorrespondenceInput {
  received_at?: string;
  sender?: string;
  recipient_employee_id?: number;
  recipient_department_id?: number;
  type?: CorrespondenceType;
  notes?: string;
}

export async function listCorrespondence(params: ListCorrespondenceParams = {}) {
  const { data } = await httpClient.get<ListResponse<Correspondence>>('/api/facilities/correspondences', { params });
  return data;
}

export async function createCorrespondence(input: CreateCorrespondenceInput) {
  const { data } = await httpClient.post<ItemResponse<Correspondence>>('/api/facilities/correspondences', input);
  return data.data;
}

export async function deliverCorrespondence(id: number, delivered_to: string) {
  const { data } = await httpClient.post<ItemResponse<Correspondence>>(`/api/facilities/correspondences/${id}/deliver`, { delivered_to });
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 8 — Limpeza: Plano × Execução
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
  facility_area_id: number | null;
  responsible_employee_id: number | null;
  active: boolean;
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
  facility_area_id?: number;
  responsible_employee_id?: number;
  active?: boolean;
}

export type UpdateCleaningScheduleInput = Partial<CreateCleaningScheduleInput>;

export interface CleaningAdherence {
  plan_id: number;
  from: string;
  to: string;
  expected: number;
  executed: number;
  adherence_pct: number;
}

/** Nível `approve` para create/update (BREAKING — era `operate`, RF-FAC-057). */
export async function listCleaningSchedules(params: ListCleaningSchedulesParams = {}) {
  const { data } = await httpClient.get<ListResponse<CleaningSchedule>>('/api/facilities/cleaning-schedules', { params });
  return data;
}

export async function getCleaningSchedule(id: number) {
  const { data } = await httpClient.get<ItemResponse<CleaningSchedule>>(`/api/facilities/cleaning-schedules/${id}`);
  return data.data;
}

export async function createCleaningSchedule(input: CreateCleaningScheduleInput) {
  const { data } = await httpClient.post<ItemResponse<CleaningSchedule>>('/api/facilities/cleaning-schedules', input);
  return data.data;
}

export async function updateCleaningSchedule(id: number, input: UpdateCleaningScheduleInput) {
  const { data } = await httpClient.put<ItemResponse<CleaningSchedule>>(`/api/facilities/cleaning-schedules/${id}`, input);
  return data.data;
}

export async function getCleaningAdherence(id: number, from: string, to: string) {
  const { data } = await httpClient.get<ItemResponse<CleaningAdherence>>(`/api/facilities/cleaning-schedules/${id}/adherence`, {
    params: { from, to },
  });
  return data.data;
}

export interface CleaningExecution {
  id: number;
  plan_id: number;
  executed_at: string;
  executed_by: number | null;
  executedByEmployee?: { id: number; name: string } | null;
  ok: boolean;
  notes: string | null;
  createdAt?: string;
}

export interface ListCleaningExecutionsParams {
  plan_id?: number;
  ok?: boolean;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface CreateCleaningExecutionInput {
  plan_id: number;
  executed_at?: string;
  ok?: boolean;
  notes?: string;
  supplies_consumed?: SupplyConsumed[];
}

export async function listCleaningExecutions(params: ListCleaningExecutionsParams = {}) {
  const { data } = await httpClient.get<ListResponse<CleaningExecution>>('/api/facilities/cleaning-executions', { params });
  return data;
}

export async function createCleaningExecution(input: CreateCleaningExecutionInput) {
  const { data } = await httpClient.post<ItemResponse<CleaningExecution>>('/api/facilities/cleaning-executions', input);
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 9 — Reserva de Recursos (P2)
// ---------------------------------------------------------------------------

export type ReservationResourceType = 'room' | 'equipment';
export type ReservationStatus = 'confirmed' | 'canceled' | 'completed';

export interface ResourceReservation {
  id: number;
  resource_type: ReservationResourceType;
  facility_area_id: number | null;
  facility_area?: { id: number; name: string } | null;
  asset_id: number | null;
  reserved_by: number;
  starts_at: string;
  ends_at: string;
  subject: string | null;
  status: ReservationStatus;
  createdAt?: string;
}

export interface ListReservationsParams {
  resource_type?: ReservationResourceType;
  facility_area_id?: number;
  asset_id?: number;
  status?: ReservationStatus;
  page?: number;
  limit?: number;
}

export interface CreateReservationInput {
  resource_type: ReservationResourceType;
  facility_area_id?: number | null;
  asset_id?: number | null;
  starts_at: string;
  ends_at: string;
  subject?: string;
}

export async function listReservations(params: ListReservationsParams = {}) {
  const { data } = await httpClient.get<ListResponse<ResourceReservation>>('/api/facilities/resource-reservations', { params });
  return data;
}

export async function getReservation(id: number) {
  const { data } = await httpClient.get<ItemResponse<ResourceReservation>>(`/api/facilities/resource-reservations/${id}`);
  return data.data;
}

/** Rejeita sobreposição de intervalo com `409 CONFLICT` (RF-FAC-055). */
export async function createReservation(input: CreateReservationInput) {
  const { data } = await httpClient.post<ItemResponse<ResourceReservation>>('/api/facilities/resource-reservations', input);
  return data.data;
}

export async function cancelReservation(id: number) {
  const { data } = await httpClient.post<ItemResponse<ResourceReservation>>(`/api/facilities/resource-reservations/${id}/cancel`, {});
  return data.data;
}

// ---------------------------------------------------------------------------
// Áreas físicas (mantido, sem mudança de contrato)
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

export async function listAreas(params: ListAreasParams = {}) {
  const { data } = await httpClient.get<ListResponse<FacilityArea>>('/api/facilities/areas', { params });
  return data;
}

export async function getArea(id: number) {
  const { data } = await httpClient.get<ItemResponse<FacilityArea>>(`/api/facilities/areas/${id}`);
  return data.data;
}

export async function createArea(input: CreateAreaInput) {
  const { data } = await httpClient.post<ItemResponse<FacilityArea>>('/api/facilities/areas', input);
  return data.data;
}

export async function updateArea(id: number, input: UpdateAreaInput) {
  const { data } = await httpClient.put<ItemResponse<FacilityArea>>(`/api/facilities/areas/${id}`, input);
  return data.data;
}
