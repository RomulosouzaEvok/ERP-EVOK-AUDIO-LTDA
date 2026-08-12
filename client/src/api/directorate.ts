import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * API do módulo Diretoria (`/api/directorate/*`,
 * `server/src/modules/directorate/presentation/`), entregue em 2026-08-12.
 *
 * RBAC (espelha `presentation/routes/directorate.ts`): `GET /org-chart` é a
 * única rota liberada a qualquer autenticado; toda LEITURA do restante exige
 * o módulo `diretoria`; toda ESCRITA (provimento de cargo, criação/edição de
 * planejamento, registro de ata, criação/edição de risco) exige nível
 * `diretoria:approve`.
 *
 * Atas de reunião são IMUTÁVEIS após criação — propositalmente sem
 * `update`/`delete` (nem no backend, nem aqui). Se uma ata está errada,
 * registra-se uma ata retificadora nova.
 *
 * `risk_score` é sempre calculado no servidor (`probability × impact`,
 * `low=1, medium=2, high=3, critical=4`, escala 1–16) — o payload de
 * criação/edição de risco NUNCA envia `risk_score` (o schema Zod do backend
 * é `.strict()` e rejeitaria).
 */

// ---------------------------------------------------------------------------
// Enums (fonte: server/src/modules/directorate/presentation/validators/directorateValidators.ts)
// ---------------------------------------------------------------------------

export type StrategicPlanningStatus = 'not_started' | 'in_progress' | 'achieved' | 'not_achieved';
export type MeetingType = 'directors' | 'commercial' | 'industrial' | 'financial' | 'board' | 'general';
export type RiskCategory = 'operational' | 'financial' | 'market' | 'regulatory' | 'reputation' | 'supply';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RiskStatus = 'active' | 'mitigated' | 'accepted' | 'closed';

// ---------------------------------------------------------------------------
// Organograma Executivo
// ---------------------------------------------------------------------------

export interface OrgChartDepartment {
  id: number;
  code: string;
  name: string;
  sigla: string;
}

export interface OrgChartDirectorate {
  id: number;
  code: string;
  name: string;
  position_title: string;
  manager: { id: number; name: string; position: string | null } | null;
  vacant: boolean;
  departments: OrgChartDepartment[];
}

export interface OrgChart {
  directorates: OrgChartDirectorate[];
}

/** `GET /api/directorate/org-chart` — liberado a qualquer autenticado. */
export async function getOrgChart() {
  const { data } = await httpClient.get<ItemResponse<OrgChart>>('/api/directorate/org-chart');
  return data.data;
}

/**
 * `PATCH /api/directorate/directorates/:id/manager` — prove (`manager_id`
 * de um funcionário ativo) ou vaga (`manager_id: null`) o cargo de diretor.
 * Exige `diretoria:approve`.
 *
 * @throws {AxiosError} 422 quando `manager_id` aponta para funcionário com
 *   `status !== 'active'` (regra `DIRETORIA-CARGO-VAGO`).
 */
export async function assignDirectorateManager(directorateId: number, managerId: number | null) {
  const { data } = await httpClient.patch<ItemResponse<OrgChartDirectorate>>(
    `/api/directorate/directorates/${directorateId}/manager`,
    { manager_id: managerId },
  );
  return data.data;
}

// ---------------------------------------------------------------------------
// Planejamento Estratégico
// ---------------------------------------------------------------------------

export interface StrategicPlanning {
  id: number;
  year: number;
  objective: string;
  directorate_id: number | null;
  department_id: number | null;
  kpi: string | null;
  /** `DECIMAL(15,2)` — trafega como `string` (nunca truncar). */
  target_value: string | null;
  actual_value: string | null;
  /** `DECIMAL(5,2)`, percentual do peso do objetivo — trafega como `string`. */
  weight: string | null;
  status: StrategicPlanningStatus;
  responsible_id: number | null;
  created_by: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListStrategicPlanningsParams {
  year?: number;
  directorate_id?: number;
  department_id?: number;
  status?: StrategicPlanningStatus;
  page?: number;
  limit?: number;
}

export async function listStrategicPlannings(params: ListStrategicPlanningsParams = {}) {
  const { data } = await httpClient.get<ListResponse<StrategicPlanning>>('/api/directorate/strategic-plannings', { params });
  return data;
}

export async function getStrategicPlanning(id: number) {
  const { data } = await httpClient.get<ItemResponse<StrategicPlanning>>(`/api/directorate/strategic-plannings/${id}`);
  return data.data;
}

export interface StrategicPlanningInput {
  year: number;
  objective: string;
  /** Mutuamente exclusivo com `department_id` (CHECK `strategic_plannings_owner_xor_ck`) — nunca envie os dois. */
  directorate_id?: number | null;
  department_id?: number | null;
  kpi?: string | null;
  target_value?: number | null;
  weight?: number | null;
  status?: StrategicPlanningStatus;
  responsible_id?: number | null;
}

/** `POST /api/directorate/strategic-plannings` — exige `diretoria:approve`. */
export async function createStrategicPlanning(input: StrategicPlanningInput) {
  const { data } = await httpClient.post<ItemResponse<StrategicPlanning>>('/api/directorate/strategic-plannings', input);
  return data.data;
}

/** `PUT /api/directorate/strategic-plannings/:id` — exige `diretoria:approve` (não altera `actual_value`, ver `updateStrategicPlanningActual`). */
export async function updateStrategicPlanning(id: number, input: Partial<StrategicPlanningInput>) {
  const { data } = await httpClient.put<ItemResponse<StrategicPlanning>>(`/api/directorate/strategic-plannings/${id}`, input);
  return data.data;
}

/** `PATCH /api/directorate/strategic-plannings/:id/actual` — registra o realizado; `status` é derivado no servidor. */
export async function updateStrategicPlanningActual(id: number, actual_value: number) {
  const { data } = await httpClient.patch<ItemResponse<StrategicPlanning>>(
    `/api/directorate/strategic-plannings/${id}/actual`,
    { actual_value },
  );
  return data.data;
}

// ---------------------------------------------------------------------------
// Atas de Reunião (SEM update/delete — imutável após criação)
// ---------------------------------------------------------------------------

export interface MeetingMinute {
  id: number;
  meeting_date: string;
  meeting_type: MeetingType;
  title: string;
  participants: string | null;
  summary: string | null;
  decisions: unknown[];
  action_items: unknown[];
  file_path: string | null;
  created_by: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListMeetingMinutesParams {
  meeting_type?: MeetingType;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function listMeetingMinutes(params: ListMeetingMinutesParams = {}) {
  const { data } = await httpClient.get<ListResponse<MeetingMinute>>('/api/directorate/meeting-minutes', { params });
  return data;
}

export async function getMeetingMinute(id: number) {
  const { data } = await httpClient.get<ItemResponse<MeetingMinute>>(`/api/directorate/meeting-minutes/${id}`);
  return data.data;
}

export interface CreateMeetingMinuteInput {
  meeting_date: string;
  meeting_type: MeetingType;
  title: string;
  participants?: string | null;
  summary?: string | null;
  decisions?: unknown[];
  action_items?: unknown[];
  file_path?: string | null;
}

/**
 * `POST /api/directorate/meeting-minutes` — exige `diretoria:approve`.
 * Não existe `update`/`delete`: registro de governança imutável. Ata
 * errada = registrar uma ata retificadora nova.
 */
export async function createMeetingMinute(input: CreateMeetingMinuteInput) {
  const { data } = await httpClient.post<ItemResponse<MeetingMinute>>('/api/directorate/meeting-minutes', input);
  return data.data;
}

// ---------------------------------------------------------------------------
// Riscos Corporativos
// ---------------------------------------------------------------------------

export interface BusinessRisk {
  id: number;
  risk_category: RiskCategory;
  description: string;
  probability: RiskLevel;
  impact: RiskLevel;
  /** Calculado no servidor (`probability × impact`, 1..16) — nunca aceito do payload. */
  risk_score: number;
  mitigation_actions: string | null;
  contingency_plan: string | null;
  responsible_id: number | null;
  review_date: string | null;
  status: RiskStatus;
  created_by: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListBusinessRisksParams {
  status?: RiskStatus;
  risk_category?: RiskCategory;
  page?: number;
  limit?: number;
}

export async function listBusinessRisks(params: ListBusinessRisksParams = {}) {
  const { data } = await httpClient.get<ListResponse<BusinessRisk>>('/api/directorate/business-risks', { params });
  return data;
}

export async function getBusinessRisk(id: number) {
  const { data } = await httpClient.get<ItemResponse<BusinessRisk>>(`/api/directorate/business-risks/${id}`);
  return data.data;
}

/** Payload de criação/edição — `risk_score` NUNCA vai aqui (o backend rejeita, `.strict()`). */
export interface BusinessRiskInput {
  risk_category: RiskCategory;
  description: string;
  probability: RiskLevel;
  impact: RiskLevel;
  mitigation_actions?: string | null;
  contingency_plan?: string | null;
  responsible_id?: number | null;
  review_date?: string | null;
  status?: RiskStatus;
}

/** `POST /api/directorate/business-risks` — exige `diretoria:approve`. */
export async function createBusinessRisk(input: BusinessRiskInput) {
  const { data } = await httpClient.post<ItemResponse<BusinessRisk>>('/api/directorate/business-risks', input);
  return data.data;
}

/** `PUT /api/directorate/business-risks/:id` — exige `diretoria:approve`; `risk_score` é recalculado se `probability`/`impact` mudam. */
export async function updateBusinessRisk(id: number, input: Partial<BusinessRiskInput>) {
  const { data } = await httpClient.put<ItemResponse<BusinessRisk>>(`/api/directorate/business-risks/${id}`, input);
  return data.data;
}
