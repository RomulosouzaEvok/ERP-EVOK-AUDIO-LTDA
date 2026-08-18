import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * API do módulo RH — Bloco 6 (`docs/business/BLOCO_6_RH_API.md`), fluxos P0
 * hospedados sob `/api/rh/*`
 * (`server/src/modules/rh/presentation/routes/rh.ts`), **ao lado** do
 * módulo já existente `/api/employees` (`client/src/api/employees.ts`, não
 * duplicado aqui).
 *
 * Escopo desta passada (Fase A do frontend): Admissão (UC-69), Contrato de
 * Experiência (UC-68), Demissão (UC-70), Férias (UC-67) e Documentos do
 * Funcionário (RF-RH-027 a 030, gate de ASO reutilizado por Admissão e
 * Demissão). Os grupos P1/P2 do contrato (Cargos, Afastamentos, Benefícios,
 * Treinamentos etc.) ficam para uma rodada futura.
 *
 * RBAC (espelha o backend, `rh.ts` §0): toda rota exige o módulo `rh`
 * atribuído ao perfil de acesso do usuário (ou role `admin`); escrita exige
 * nível `operate`; duas ações exigem nível `approve` — concluir demissão
 * (`concludeTerminationProcess`) e decidir rescisão de contrato de
 * experiência (`decideEmployeeContract` com `decision: 'rescindir'`). Sem
 * o nível certo, o backend responde `403 FORBIDDEN` — as telas tratam isso
 * via `translateApiError`/desabilitação de botão, nunca escondem a rota
 * inteira (a leitura continua liberada a quem só tem `operate`).
 *
 * Datas de vigência/planejamento são `DATEONLY` (`"YYYY-MM-DD"`); valores
 * monetários (`salary`) trafegam como `string` (nunca `number`) para não
 * truncar `DECIMAL`.
 */

// ---------------------------------------------------------------------------
// Enums (fonte: server/src/modules/rh/presentation/validators/rhEnums.ts)
// ---------------------------------------------------------------------------

export type AdmissionStatus = 'documentos_pendentes' | 'aso_pendente' | 'aguardando_esocial' | 'concluida' | 'cancelada';
export type AsoResult = 'apto' | 'inapto' | 'apto_com_restricao';
export type ContractType = 'indeterminado' | 'experiencia' | 'aprendiz' | 'estagio';
export type ContractStatus = 'ativo' | 'prorrogado' | 'efetivado' | 'indeterminado_automatico' | 'rescindido';
export type TerminationType = 'pedido' | 'sem_justa_causa' | 'justa_causa' | 'termino_experiencia' | 'acordo';
export type NoticeModality = 'trabalhado' | 'indenizado';
export type TerminationStatus = 'aberto' | 'aguardando_aso' | 'aguardando_trct' | 'concluido' | 'cancelado';
export type DocumentType =
  | 'rg' | 'cpf' | 'ctps'
  | 'aso_admissional' | 'aso_periodico' | 'aso_retorno' | 'aso_mudanca_risco' | 'aso_demissional'
  | 'contrato' | 'certificado' | 'outro';
export type DocumentOrigin = 'rh' | 'sst';
export type AccrualStatus = 'em_curso' | 'programado' | 'gozado' | 'vencido_dobra' | 'zerado';
export type ScheduleStatus = 'planejado' | 'confirmado' | 'em_gozo' | 'concluido' | 'cancelado';
export type ChecklistDocument = 'rg' | 'cpf' | 'ctps_digital' | 'pis' | 'comprovante_residencia' | 'foto';
export type EmployeeWorkRegimeRh = 'clt' | 'pj' | 'estagiario' | 'aprendiz';
export type EmployeeShiftRh = 'morning' | 'afternoon' | 'night' | 'commercial' | 'rotating';
export type AbsenceType = 'doenca_ate_15d' | 'auxilio_doenca_inss' | 'acidente_trabalho' | 'maternidade' | 'paternidade' | 'licenca_outras';
export type BenefitCategory = 'vt' | 'vr' | 'va' | 'saude' | 'odonto' | 'vida' | 'outros';
export type BenefitFundingRule = 'percentual' | 'fixo';
export type BenefitEnrollmentStatus = 'ativo' | 'cancelado';
export type TimeImportBatchStatus = 'uploaded' | 'validated' | 'confirmed' | 'rejected';

// ---------------------------------------------------------------------------
// Grupo 2 — Admissão
// ---------------------------------------------------------------------------

export interface AdmissionProcess {
  id: number;
  job_vacancy_id: number | null;
  candidate_id: number | null;
  candidate_name: string;
  candidate_cpf: string | null;
  department_id: number;
  job_position_id: number | null;
  planned_start_date: string;
  checklist_rg: boolean;
  checklist_cpf: boolean;
  checklist_ctps: boolean;
  checklist_pis: boolean;
  checklist_proof_of_address: boolean;
  checklist_photo: boolean;
  status: AdmissionStatus;
  cancel_reason: string | null;
  aso_requested_at: string | null;
  aso_confirmed_at: string | null;
  aso_result: AsoResult | null;
  aso_valid_until: string | null;
  esocial_s2200_confirmed_at: string | null;
  esocial_s2200_confirmed_by: number | null;
  employee_id: number | null;
  contract_id: number | null;
  job_history_id: number | null;
  created_by: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListAdmissionProcessesParams {
  status?: AdmissionStatus;
  department_id?: number;
  page?: number;
  limit?: number;
}

export async function listAdmissionProcesses(params: ListAdmissionProcessesParams = {}) {
  const { data } = await httpClient.get<ListResponse<AdmissionProcess>>('/api/rh/admission-processes', { params });
  return data;
}

export async function getAdmissionProcess(id: number) {
  const { data } = await httpClient.get<ItemResponse<AdmissionProcess>>(`/api/rh/admission-processes/${id}`);
  return data.data;
}

export interface CreateAdmissionProcessInput {
  candidate_id?: number | null;
  job_vacancy_id?: number | null;
  candidate_name: string;
  candidate_cpf?: string | null;
  department_id: number;
  job_position_id?: number | null;
  planned_start_date: string;
  required_documents?: ChecklistDocument[];
}

/** `POST /api/rh/admission-processes` — RF-RH-007. */
export async function createAdmissionProcess(input: CreateAdmissionProcessInput) {
  const { data } = await httpClient.post<ItemResponse<AdmissionProcess>>('/api/rh/admission-processes', input);
  return data.data;
}

/** `POST /api/rh/admission-processes/:id/request-aso` — RF-RH-008 (sem payload). */
export async function requestAdmissionAso(id: number) {
  const { data } = await httpClient.post<ItemResponse<AdmissionProcess>>(`/api/rh/admission-processes/${id}/request-aso`, {});
  return data.data;
}

/** `PATCH /api/rh/admission-processes/:id/aso-confirmation` — grava o resultado do ASO admissional. */
export async function confirmAdmissionAsoResult(id: number, input: { aso_result: AsoResult; aso_valid_until?: string | null }) {
  const { data } = await httpClient.patch<ItemResponse<AdmissionProcess>>(`/api/rh/admission-processes/${id}/aso-confirmation`, input);
  return data.data;
}

/** `POST /api/rh/admission-processes/:id/checklist` — marca item de documento como recebido/pendente. */
export async function updateAdmissionChecklist(id: number, input: { document: ChecklistDocument; received: boolean }) {
  const { data } = await httpClient.post<ItemResponse<AdmissionProcess>>(`/api/rh/admission-processes/${id}/checklist`, input);
  return data.data;
}

export interface ConcludeAdmissionInput {
  employee: {
    name: string;
    cpf: string;
    hire_date: string;
    salary?: number;
    work_regime?: EmployeeWorkRegimeRh;
    shift?: EmployeeShiftRh;
  };
  contract_type: ContractType;
  /** Obrigatório quando `contract_type === 'experiencia'` (Art. 445, parágrafo único, CLT). */
  period_1_end_date?: string | null;
}

export interface ConcludeAdmissionResult {
  admission_process: AdmissionProcess;
  employee: { id: number; name: string; [key: string]: unknown };
  contract: unknown;
  job_history: unknown;
}

/** `POST /api/rh/admission-processes/:id/conclude` — RF-RH-009 (transacional). */
export async function concludeAdmissionProcess(id: number, input: ConcludeAdmissionInput) {
  const { data } = await httpClient.post<ItemResponse<ConcludeAdmissionResult>>(`/api/rh/admission-processes/${id}/conclude`, input);
  return data.data;
}

/** `PATCH /api/rh/admission-processes/:id/esocial-confirmation` — RF-RH-010. */
export async function confirmAdmissionEsocial(id: number) {
  const { data } = await httpClient.patch<ItemResponse<AdmissionProcess>>(`/api/rh/admission-processes/${id}/esocial-confirmation`, {
    s2200_confirmed: true,
  });
  return data.data;
}

/** `POST /api/rh/admission-processes/:id/cancel` — RF-RH-012 (nunca exclusão física, motivo obrigatório). */
export async function cancelAdmissionProcess(id: number, reason: string) {
  const { data } = await httpClient.post<ItemResponse<AdmissionProcess>>(`/api/rh/admission-processes/${id}/cancel`, { reason });
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 3 — Contrato de Experiência
// ---------------------------------------------------------------------------

export interface EmployeeContract {
  id: number;
  employee_id: number;
  type: ContractType;
  start_date: string;
  period_1_end_date: string | null;
  period_2_end_date: string | null;
  effective_end_date: string | null;
  status: ContractStatus;
  created_by: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListEmployeeContractsParams {
  employee_id?: number;
  status?: ContractStatus;
  type?: ContractType;
  expiring_in_days?: number;
  page?: number;
  limit?: number;
}

export async function listEmployeeContracts(params: ListEmployeeContractsParams = {}) {
  const { data } = await httpClient.get<ListResponse<EmployeeContract>>('/api/rh/employee-contracts', { params });
  return data;
}

export async function getEmployeeContract(id: number) {
  const { data } = await httpClient.get<ItemResponse<EmployeeContract>>(`/api/rh/employee-contracts/${id}`);
  return data.data;
}

/** `PATCH /api/rh/employee-contracts/:id/extend` — RF-RH-015 (única prorrogação, Art. 451 CLT). */
export async function extendEmployeeContract(id: number, period_2_end_date: string) {
  const { data } = await httpClient.patch<ItemResponse<EmployeeContract>>(`/api/rh/employee-contracts/${id}/extend`, {
    period_2_end_date,
  });
  return data.data;
}

export interface DecideEmployeeContractInput {
  decision: 'prorrogar' | 'efetivar' | 'rescindir';
  /** Obrigatório quando `decision === 'prorrogar'`. */
  period_2_end_date?: string;
  /** Obrigatório quando `decision === 'rescindir'`. */
  termination_reason?: string;
  /** Obrigatório quando `decision === 'rescindir'` (APR-2026-057/P14-P15). */
  notice_modality?: NoticeModality;
}

/**
 * `PATCH /api/rh/employee-contracts/:id/decision` — RF-RH-016.
 * `decision: 'rescindir'` exige nível `rh:approve` no backend (403 sem ele)
 * e retorna o `TerminationProcess` criado dentro de `data`.
 */
export async function decideEmployeeContract(id: number, input: DecideEmployeeContractInput) {
  const { data } = await httpClient.patch<ItemResponse<EmployeeContract | { termination_process_id: number; [key: string]: unknown }>>(
    `/api/rh/employee-contracts/${id}/decision`,
    input,
  );
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 4 — Demissão
// ---------------------------------------------------------------------------

export interface TerminationProcess {
  id: number;
  employee_id: number;
  termination_type: TerminationType;
  notice_date: string;
  notice_modality: NoticeModality;
  termination_reason: string;
  termination_date: string | null;
  trct_file_path: string | null;
  trct_paid_at: string | null;
  payment_deadline: string | null;
  s2299_confirmed_at: string | null;
  s2299_confirmed_by: number | null;
  aso_confirmed_at: string | null;
  aso_result: AsoResult | null;
  checklist_assets_returned: boolean;
  status: TerminationStatus;
  cancel_reason: string | null;
  concluded_by: number | null;
  concluded_at: string | null;
  created_by: number;
  /** Presente apenas em `POST /termination-processes` (RF-RH-019, sugestão não vinculante). */
  suggested_notice_date?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListTerminationProcessesParams {
  status?: TerminationStatus;
  employee_id?: number;
  /** RF-RH-018 — processos com prazo do Art. 477 §6º CLT a ≤3 dias ou vencido sem TRCT pago. */
  payment_deadline_at_risk?: boolean;
  page?: number;
  limit?: number;
}

export async function listTerminationProcesses(params: ListTerminationProcessesParams = {}) {
  const { data } = await httpClient.get<ListResponse<TerminationProcess>>('/api/rh/termination-processes', { params });
  return data;
}

export async function getTerminationProcess(id: number) {
  const { data } = await httpClient.get<ItemResponse<TerminationProcess>>(`/api/rh/termination-processes/${id}`);
  return data.data;
}

export interface CreateTerminationProcessInput {
  employee_id: number;
  termination_type: TerminationType;
  notice_date: string;
  notice_modality: NoticeModality;
  termination_reason: string;
  termination_date?: string | null;
}

/** `POST /api/rh/termination-processes` — RF-RH-017/019 (`payment_deadline` é calculado no servidor). */
export async function createTerminationProcess(input: CreateTerminationProcessInput) {
  const { data } = await httpClient.post<ItemResponse<TerminationProcess>>('/api/rh/termination-processes', input);
  return data.data;
}

/** `POST /api/rh/termination-processes/:id/request-aso` — RF-RH-020 (sem payload). */
export async function requestTerminationAso(id: number) {
  const { data } = await httpClient.post<ItemResponse<TerminationProcess>>(`/api/rh/termination-processes/${id}/request-aso`, {});
  return data.data;
}

/** `PATCH /api/rh/termination-processes/:id/aso-confirmation` — registra o resultado do ASO demissional. */
export async function confirmTerminationAsoResult(id: number, aso_result: AsoResult) {
  const { data } = await httpClient.patch<ItemResponse<TerminationProcess>>(`/api/rh/termination-processes/${id}/aso-confirmation`, {
    aso_result,
  });
  return data.data;
}

export interface AssetChecklistItem {
  id: number;
  description: string;
  returned: boolean;
}

export interface AssetChecklistResult {
  pending: boolean;
  assets: AssetChecklistItem[];
}

/** `GET /api/rh/termination-processes/:id/asset-checklist` — RF-RH-023 (read-only, Patrimônio). */
export async function getAssetChecklist(id: number) {
  const { data } = await httpClient.get<ItemResponse<AssetChecklistResult>>(`/api/rh/termination-processes/${id}/asset-checklist`);
  return data.data;
}

/**
 * `POST /api/rh/termination-processes/:id/trct` — RF-RH-021, multipart
 * (`rhFileUpload.single('file')` no backend). O arquivo é opcional — pode
 * ser usado só para marcar `paid: true` sem novo anexo.
 */
export async function attachTrct(id: number, input: { file?: File; paid?: boolean }) {
  const formData = new FormData();
  if (input.file) formData.append('file', input.file);
  if (input.paid !== undefined) formData.append('paid', String(input.paid));
  const { data } = await httpClient.post<ItemResponse<TerminationProcess>>(`/api/rh/termination-processes/${id}/trct`, formData, {
    headers: { 'Content-Type': undefined },
  });
  return data.data;
}

/** `PATCH /api/rh/termination-processes/:id/esocial-confirmation` — `s2299_confirmed_at`. */
export async function confirmTerminationEsocial(id: number) {
  const { data } = await httpClient.patch<ItemResponse<TerminationProcess>>(`/api/rh/termination-processes/${id}/esocial-confirmation`, {
    s2299_confirmed: true,
  });
  return data.data;
}

/**
 * `POST /api/rh/termination-processes/:id/conclude` — RF-RH-022,
 * transacional, exige nível `rh:approve` (403 sem ele). Desliga o
 * funcionário e desativa o login no mesmo ato.
 */
export async function concludeTerminationProcess(id: number) {
  const { data } = await httpClient.post<ItemResponse<TerminationProcess>>(`/api/rh/termination-processes/${id}/conclude`, {});
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 5 — Documentos do Funcionário (gate de ASO, reusado por admissão/demissão)
// ---------------------------------------------------------------------------

export interface EmployeeDocument {
  id: number;
  employee_id: number;
  doc_type: DocumentType;
  valid_until: string | null;
  fitness_result: AsoResult | null;
  origin: DocumentOrigin | null;
  file_path: string | null;
  uploaded_by: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListEmployeeDocumentsParams {
  employee_id?: number;
  doc_type?: DocumentType;
  expiring_in_days?: number;
  page?: number;
  limit?: number;
}

export async function listEmployeeDocuments(params: ListEmployeeDocumentsParams = {}) {
  const { data } = await httpClient.get<ListResponse<EmployeeDocument>>('/api/rh/employee-documents', { params });
  return data;
}

export interface CreateEmployeeDocumentInput {
  employee_id: number;
  doc_type: DocumentType;
  valid_until?: string | null;
  /** Obrigatório quando `doc_type` começa com `aso_` (RF-RH-028 — nunca laudo clínico). */
  fitness_result?: AsoResult;
  origin?: DocumentOrigin;
  file: File;
}

/** `POST /api/rh/employee-documents` — RF-RH-027, multipart. */
export async function createEmployeeDocument(input: CreateEmployeeDocumentInput) {
  const formData = new FormData();
  formData.append('employee_id', String(input.employee_id));
  formData.append('doc_type', input.doc_type);
  if (input.valid_until) formData.append('valid_until', input.valid_until);
  if (input.fitness_result) formData.append('fitness_result', input.fitness_result);
  if (input.origin) formData.append('origin', input.origin);
  formData.append('file', input.file);
  const { data } = await httpClient.post<ItemResponse<EmployeeDocument>>('/api/rh/employee-documents', formData, {
    headers: { 'Content-Type': undefined },
  });
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 6 — Férias
// ---------------------------------------------------------------------------

export interface VacationAccrualPeriod {
  id: number;
  employee_id: number;
  period_start: string;
  period_end: string;
  concessive_end: string;
  unexcused_absences: number;
  entitled_days: number;
  days_taken: number;
  status: AccrualStatus;
  zeroed_reason: string | null;
  zeroed_from_period_id: number | null;
  /** Anexado pelo controller — `'critical'` quando `status === 'vencido_dobra'` (Art. 137, caput, CLT). */
  alert_level: 'none' | 'critical';
  createdAt?: string;
  updatedAt?: string;
}

export interface ListAccrualPeriodsParams {
  employee_id?: number;
  status?: AccrualStatus;
  page?: number;
  limit?: number;
}

export async function listVacationAccrualPeriods(params: ListAccrualPeriodsParams = {}) {
  const { data } = await httpClient.get<ListResponse<VacationAccrualPeriod>>('/api/rh/vacation-accrual-periods', { params });
  return data;
}

export async function getVacationAccrualPeriod(id: number) {
  const { data } = await httpClient.get<ItemResponse<VacationAccrualPeriod>>(`/api/rh/vacation-accrual-periods/${id}`);
  return data.data;
}

/**
 * `POST /api/rh/vacation-accrual-periods/:id/recalculate` — RF-RH-032 (Art.
 * 130, CLT; idempotente). `unexcused_absences` só existe como override
 * manual enquanto `HrTimeSheetSummary` (P1) não está implementado.
 */
export async function recalculateVacationAccrualPeriod(id: number, unexcused_absences?: number) {
  const { data } = await httpClient.post<ItemResponse<VacationAccrualPeriod & { data_gap_detected?: boolean }>>(
    `/api/rh/vacation-accrual-periods/${id}/recalculate`,
    unexcused_absences !== undefined ? { unexcused_absences } : {},
  );
  return data.data;
}

export interface VacationSchedule {
  id: number;
  accrual_period_id: number;
  fraction_number: number;
  start_date: string;
  days: number;
  abono: boolean;
  abono_days: number | null;
  abono_requested_at: string | null;
  notice_sent_at: string | null;
  employee_agreement_confirmed: boolean;
  fractioning_justification: string | null;
  status: ScheduleStatus;
  revision_reason: string | null;
  superseded_by_id: number | null;
  financial_confirmed_at: string | null;
  created_by: number;
  accrualPeriod?: VacationAccrualPeriod & { employee?: { id: number; name: string; department_id: number } };
  createdAt?: string;
  updatedAt?: string;
}

export interface ListVacationSchedulesParams {
  employee_id?: number;
  accrual_period_id?: number;
  department_id?: number;
  page?: number;
  limit?: number;
}

export async function listVacationSchedules(params: ListVacationSchedulesParams = {}) {
  const { data } = await httpClient.get<ListResponse<VacationSchedule>>('/api/rh/vacation-schedules', { params });
  return data;
}

export interface VacationScheduleFields {
  start_date: string;
  days: number;
  abono?: boolean;
  /** Obrigatório quando `abono === true` (Art. 143, caput, CLT — limite de 1/3). */
  abono_days?: number;
  abono_requested_at?: string;
  aviso_em?: string;
  employee_agreement_confirmed?: boolean;
  /** Exigido pelo backend quando o percentual de equipe simultânea em férias é excedido (soft-block com override). */
  override_team_limit_justification?: string | null;
}

export interface CreateVacationScheduleInput extends VacationScheduleFields {
  accrual_period_id: number;
}

/**
 * `POST /api/rh/vacation-schedules` — RF-RH-035/036/037.
 *
 * @throws {AxiosError} 422 com `code` `EXCEEDS_ACCRUAL_DAYS` /
 *   `MAX_FRACTIONS_REACHED` / `INVALID_FRACTION_SIZE` /
 *   `ABONO_LIMIT_EXCEEDED` / `ABONO_DEADLINE_EXPIRED`; 400 quando
 *   `override_team_limit_justification` é exigido e está ausente.
 */
export async function createVacationSchedule(input: CreateVacationScheduleInput) {
  const { data } = await httpClient.post<ItemResponse<VacationSchedule & { warning?: string }>>('/api/rh/vacation-schedules', input);
  return data.data;
}

export interface ReviseVacationScheduleInput extends VacationScheduleFields {
  /** Motivo obrigatório — a revisão sempre cria um novo registro (RF-RH-040), nunca sobrescreve. */
  reason: string;
}

/** `POST /api/rh/vacation-schedules/:id/revise` — RF-RH-040 (gera novo registro com `superseded_by_id`). */
export async function reviseVacationSchedule(id: number, input: ReviseVacationScheduleInput) {
  const { data } = await httpClient.post<ItemResponse<{ schedule: VacationSchedule; [key: string]: unknown }>>(
    `/api/rh/vacation-schedules/${id}/revise`,
    input,
  );
  return data.data;
}

/** `POST /api/rh/vacation-schedules/:id/confirm-taken` — registra o gozo efetivo. */
export async function confirmVacationTaken(id: number, days_taken?: number) {
  const { data } = await httpClient.post<ItemResponse<VacationSchedule>>(
    `/api/rh/vacation-schedules/${id}/confirm-taken`,
    days_taken !== undefined ? { days_taken } : {},
  );
  return data.data;
}

export interface VacationCalendarParams {
  department_id?: number;
  from: string;
  to: string;
}

export interface VacationCalendarResult {
  from: string;
  to: string;
  department_id: number | null;
  department_active_headcount: number | null;
  simultaneous_percent: number | null;
  team_limit_percent: number;
  team_limit_exceeded: boolean;
  schedules: VacationSchedule[];
}

/** `GET /api/rh/vacation-schedules/calendar` — RF-RH-039 (visão por departamento/período). */
export async function getVacationCalendar(params: VacationCalendarParams) {
  const { data } = await httpClient.get<ItemResponse<VacationCalendarResult>>('/api/rh/vacation-schedules/calendar', { params });
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 7 — Afastamentos (UC-71, RF-RH-044 a 049)
// ---------------------------------------------------------------------------

export interface Absence {
  id: number;
  employee_id: number;
  type: AbsenceType;
  start_date: string;
  expected_end_date: string | null;
  actual_end_date: string | null;
  extended_program: boolean;
  /**
   * Dado de saúde (RNF-RH-01) — o backend OMITE esta chave inteira da
   * resposta (não retorna `null`) para quem não tem interseção de módulos
   * `rh`+`sst`/admin (`rhSensitiveFields.sanitizeAbsence`). A UI precisa
   * tratar `cid === undefined` como "sem permissão para ver", diferente de
   * `cid === null` (não informado ainda).
   */
  cid?: string | null;
  document_id: number | null;
  s2230_confirmed_at: string | null;
  s2230_confirmed_by: number | null;
  accrual_period_impact_id: number | null;
  accrual_impact_days: number | null;
  created_by: number;
  /** Presente apenas na resposta de `POST /absences` (RF-RH-041/049, Art. 133 IV CLT). */
  accrual_period_zeroed?: boolean;
  /** Presente apenas na resposta de `POST /absences` quando o CID não foi informado. */
  warning?: string;
  /**
   * Presente apenas na resposta de `PATCH /absences/:id/return` (RF-RH-047-A,
   * decisão do dono de 2026-08-12) — benefícios VT/VR que este afastamento
   * havia suspendido e que a reativação automática religou no retorno.
   * Lista vazia quando não havia nada suspenso por este afastamento.
   */
  reactivated_benefits?: ReactivatedBenefit[];
  createdAt?: string;
  updatedAt?: string;
}

/** Item de `Absence.reactivated_benefits` — RF-RH-047-A. */
export interface ReactivatedBenefit {
  id: number;
  benefit_type_id: number;
  category: string;
  /** Sempre o novo valor (pós-reativação) de `hr_employee_benefits.suspended_days`. */
  suspended_days: number;
}

export interface ListAbsencesParams {
  employee_id?: number;
  type?: AbsenceType;
  /** `true` filtra afastamentos ainda sem `actual_end_date`. */
  open?: boolean;
  page?: number;
  limit?: number;
}

export async function listAbsences(params: ListAbsencesParams = {}) {
  const { data } = await httpClient.get<ListResponse<Absence>>('/api/rh/absences', { params });
  return data;
}

export async function getAbsence(id: number) {
  const { data } = await httpClient.get<ItemResponse<Absence>>(`/api/rh/absences/${id}`);
  return data.data;
}

export interface CreateAbsenceInput {
  employee_id: number;
  type: AbsenceType;
  start_date: string;
  expected_end_date?: string;
  /** Adesão ao programa Empresa Cidadã (licença-maternidade estendida a 180 dias). */
  extended_program?: boolean;
  cid?: string | null;
  document_id?: number;
}

/**
 * `POST /api/rh/absences` — RF-RH-044/045/047/049. Transação única: abre o
 * afastamento, marca `employees.status='license'`, suspende VT/VR ativos e,
 * se o acumulado de afastamento previdenciário no período aquisitivo em
 * curso ultrapassar 6 meses, zera o período (resposta traz
 * `accrual_period_zeroed: true`).
 */
export async function createAbsence(input: CreateAbsenceInput) {
  const { data } = await httpClient.post<ItemResponse<Absence>>('/api/rh/absences', input);
  return data.data;
}

/**
 * `PATCH /api/rh/absences/:id/return` — RF-RH-048.
 * @throws {AxiosError} 422 `code: 'RETURN_ASO_REQUIRED'` quando o
 *   afastamento passa de 30 dias e não há ASO de retorno válido — a tela
 *   deve oferecer anexar o ASO via `createEmployeeDocument` (`doc_type:
 *   'aso_retorno'`) e repetir a chamada.
 */
export async function returnFromAbsence(id: number, actual_end_date: string) {
  const { data } = await httpClient.patch<ItemResponse<Absence>>(`/api/rh/absences/${id}/return`, { actual_end_date });
  return data.data;
}

/** `PATCH /api/rh/absences/:id/esocial-confirmation` — RF-RH-046 (S-2230). */
export async function confirmAbsenceEsocial(id: number) {
  const { data } = await httpClient.patch<ItemResponse<Absence>>(`/api/rh/absences/${id}/esocial-confirmation`, {
    s2230_confirmed: true,
  });
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 8 — Benefícios (RF-RH-050 a 054)
// ---------------------------------------------------------------------------

export interface BenefitType {
  id: number;
  name: string;
  category: BenefitCategory;
  funding_rule: BenefitFundingRule;
  supplier: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListBenefitTypesParams {
  category?: BenefitCategory;
  active?: boolean;
  page?: number;
  limit?: number;
}

export async function listBenefitTypes(params: ListBenefitTypesParams = {}) {
  const { data } = await httpClient.get<ListResponse<BenefitType>>('/api/rh/benefit-types', { params });
  return data;
}

export interface CreateBenefitTypeInput {
  name: string;
  category: BenefitCategory;
  funding_rule: BenefitFundingRule;
  supplier?: string | null;
  active?: boolean;
}

/** `POST /api/rh/benefit-types` — RF-RH-050. */
export async function createBenefitType(input: CreateBenefitTypeInput) {
  const { data } = await httpClient.post<ItemResponse<BenefitType>>('/api/rh/benefit-types', input);
  return data.data;
}

export interface UpdateBenefitTypeInput {
  name?: string;
  category?: BenefitCategory;
  funding_rule?: BenefitFundingRule;
  supplier?: string | null;
  active?: boolean;
}

/** `PUT /api/rh/benefit-types/:id` — sem `DELETE`, catálogo referenciado por adesões. */
export async function updateBenefitType(id: number, input: UpdateBenefitTypeInput) {
  const { data } = await httpClient.put<ItemResponse<BenefitType>>(`/api/rh/benefit-types/${id}`, input);
  return data.data;
}

export interface EmployeeBenefit {
  id: number;
  employee_id: number;
  benefit_type_id: number;
  enrollment_status: BenefitEnrollmentStatus;
  enrolled_at: string;
  canceled_at: string | null;
  /** `DECIMAL(12,2)` — trafega como `string` para não truncar. */
  discount_value: string | null;
  company_cost_value: string | null;
  dependents: unknown;
  suspended_days: number;
  created_by: number;
  benefitType?: BenefitType;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListEmployeeBenefitsParams {
  employee_id?: number;
  benefit_type_id?: number;
  enrollment_status?: BenefitEnrollmentStatus;
  page?: number;
  limit?: number;
}

export async function listEmployeeBenefits(params: ListEmployeeBenefitsParams = {}) {
  const { data } = await httpClient.get<ListResponse<EmployeeBenefit>>('/api/rh/employee-benefits', { params });
  return data;
}

export interface CreateEmployeeBenefitInput {
  employee_id: number;
  benefit_type_id: number;
  discount_value?: number;
  company_cost_value?: number;
  /** Só permitido quando o tipo de benefício é `saude`/`odonto` (senão 400 `DEPENDENTS_NOT_ALLOWED`). */
  dependents?: unknown;
}

/**
 * `POST /api/rh/employee-benefits` — RF-RH-051/052 (opt-in).
 * @throws {AxiosError} 422 `code: 'VT_DISCOUNT_LIMIT_EXCEEDED'` quando o
 *   desconto de VT excede 6% do salário-base (Lei 7.418/85); 409 quando já
 *   existe adesão ativa do par funcionário×tipo; 400 `code:
 *   'DEPENDENTS_NOT_ALLOWED'` quando `dependents` é enviado fora de
 *   saúde/odonto.
 */
export async function createEmployeeBenefit(input: CreateEmployeeBenefitInput) {
  const { data } = await httpClient.post<ItemResponse<EmployeeBenefit>>('/api/rh/employee-benefits', input);
  return data.data;
}

/** `POST /api/rh/employee-benefits/:id/cancel` — RF-RH-054 (opt-out, nunca exclusão física). */
export async function cancelEmployeeBenefit(id: number) {
  const { data } = await httpClient.post<ItemResponse<EmployeeBenefit>>(`/api/rh/employee-benefits/${id}/cancel`, {});
  return data.data;
}

export interface MonthlyBenefitReportItem {
  employee_id: number;
  department_id: number | null;
  cost_center_id: number | null;
  benefit_type_id: number;
  benefit_type_name: string | null;
  discount_value: string | null;
  company_cost_value: string | null;
}

export interface MonthlyBenefitReportDepartmentBucket {
  department_id: number | null;
  cost_center_id: number | null;
  company_cost_total: number;
  count: number;
}

export interface MonthlyBenefitReport {
  competencia: string;
  items: MonthlyBenefitReportItem[];
  by_department: MonthlyBenefitReportDepartmentBucket[];
}

/** `GET /api/rh/employee-benefits/monthly-report` — RF-RH-053. `competencia` no formato `YYYY-MM`. */
export async function getMonthlyBenefitReport(competencia: string) {
  const { data } = await httpClient.get<ItemResponse<MonthlyBenefitReport>>('/api/rh/employee-benefits/monthly-report', {
    params: { competencia },
  });
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 9 — Treinamentos (RF-RH-055 a 059)
// ---------------------------------------------------------------------------

export interface TrainingCourse {
  id: number;
  name: string;
  is_normative: boolean;
  nr_code: string | null;
  /** `null` = sem vencimento. Governado pela SST (RF-RH-059) — RH só administra o cadastro. */
  validity_months: number | null;
  workload_hours: string | null;
  active: boolean;
  /**
   * Presente apenas na resposta de `POST`/`PUT` (RF-INT-RH-SST-01, decisão
   * do dono de 2026-08-12) — `'sst_matrix'` quando `validity_months` veio da
   * matriz oficial do SST (sobrescreve o que foi digitado no formulário),
   * `'manual'` quando não há `nr_code` reconhecido na matriz (comportamento
   * de sempre, com o aviso RF-RH-059).
   */
  validity_source?: 'sst_matrix' | 'manual';
  /** Presente apenas quando `validity_source === 'manual'` e o curso é normativo (RF-RH-059). */
  warning?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListTrainingCoursesParams {
  is_normative?: boolean;
  active?: boolean;
  page?: number;
  limit?: number;
}

export async function listTrainingCourses(params: ListTrainingCoursesParams = {}) {
  const { data } = await httpClient.get<ListResponse<TrainingCourse>>('/api/rh/training-courses', { params });
  return data;
}

export interface CreateTrainingCourseInput {
  name: string;
  is_normative?: boolean;
  nr_code?: string | null;
  validity_months?: number | null;
  workload_hours?: number | null;
  active?: boolean;
}

/** `POST /api/rh/training-courses` — RF-RH-055. */
export async function createTrainingCourse(input: CreateTrainingCourseInput) {
  const { data } = await httpClient.post<ItemResponse<TrainingCourse>>('/api/rh/training-courses', input);
  return data.data;
}

export interface UpdateTrainingCourseInput {
  name?: string;
  is_normative?: boolean;
  nr_code?: string | null;
  validity_months?: number | null;
  workload_hours?: number | null;
  active?: boolean;
}

/** `PUT /api/rh/training-courses/:id` — sem `DELETE`. */
export async function updateTrainingCourse(id: number, input: UpdateTrainingCourseInput) {
  const { data } = await httpClient.put<ItemResponse<TrainingCourse>>(`/api/rh/training-courses/${id}`, input);
  return data.data;
}

export interface EmployeeTraining {
  id: number;
  employee_id: number;
  training_course_id: number;
  completed_at: string;
  instructor_or_provider: string | null;
  certificate_file_path: string | null;
  /** Calculado no servidor (`completed_at + validity_months`); `null` quando o curso não vence. */
  valid_until: string | null;
  created_by: number;
  trainingCourse?: TrainingCourse;
  /** Presente apenas na resposta de `POST /employee-trainings` quando o curso é normativo (RF-RH-059). */
  warning?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListEmployeeTrainingsParams {
  employee_id?: number;
  training_course_id?: number;
  /** Só treinamentos com `valid_until` dentro dos próximos N dias. */
  expiring_in_days?: number;
  department_id?: number;
  page?: number;
  limit?: number;
}

export async function listEmployeeTrainings(params: ListEmployeeTrainingsParams = {}) {
  const { data } = await httpClient.get<ListResponse<EmployeeTraining>>('/api/rh/employee-trainings', { params });
  return data;
}

export interface CreateEmployeeTrainingInput {
  employee_id: number;
  training_course_id: number;
  completed_at: string;
  instructor_or_provider?: string | null;
  certificate_file_path?: string | null;
}

/** `POST /api/rh/employee-trainings` — RF-RH-057 (`valid_until` calculado no servidor). */
export async function createEmployeeTraining(input: CreateEmployeeTrainingInput) {
  const { data } = await httpClient.post<ItemResponse<EmployeeTraining>>('/api/rh/employee-trainings', input);
  return data.data;
}

export interface CannotOperateReportItem {
  employee_id: number;
  employee_name: string;
  department_id: number | null;
  training_course_id: number;
  training_course_name: string;
  reason: 'ausente' | 'vencido';
  valid_until: string | null;
}

export interface CannotOperateReport {
  items: CannotOperateReportItem[];
  total: number;
}

/** `GET /api/rh/employee-trainings/cannot-operate-report` — RF-RH-058. Relatório (nunca bloqueia sozinho). */
export async function getCannotOperateReport(params: { department_id?: number } = {}) {
  const { data } = await httpClient.get<ItemResponse<CannotOperateReport>>('/api/rh/employee-trainings/cannot-operate-report', { params });
  return data.data;
}

// ---------------------------------------------------------------------------
// Grupo 10 — Frequência/Ponto (importação AEJ, docs/rh/04-FREQUENCIA.md)
// ---------------------------------------------------------------------------

export interface TimeImportItem {
  id: number;
  batch_id: number;
  employee_id: number | null;
  original_registration: string | null;
  cpf: string | null;
  work_date: string;
  hours_worked: string;
  overtime_50: string;
  overtime_100: string;
  night_hours: string;
  absence: boolean;
  absence_justified: boolean;
  absence_reason: string | null;
  employee?: { id: number; name: string; cpf: string } | null;
}

export interface RejectedTimeImportLine {
  line: number;
  raw: string;
  reason: string;
}

export interface TimeImportBatch {
  id: number;
  filename: string;
  competencia_inicio: string;
  competencia_fim: string;
  imported_by: number;
  imported_at: string;
  status: TimeImportBatchStatus;
  total_lines: number;
  matched_count: number;
  unmatched_count: number;
  rejected_count: number;
  unknown_record_types: Record<string, number> | null;
  rejected_lines: RejectedTimeImportLine[] | null;
  rejection_reason: string | null;
  confirmed_by: number | null;
  confirmed_at: string | null;
  importedBy?: { id: number; name: string };
  confirmedBy?: { id: number; name: string } | null;
  /** Presente apenas no detalhe (`GET /time-imports/:id`). */
  items?: TimeImportItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ListTimeImportBatchesParams {
  status?: TimeImportBatchStatus;
  /** `YYYY-MM`. */
  competencia?: string;
  page?: number;
  limit?: number;
}

/** `GET /api/rh/time-imports`. */
export async function listTimeImportBatches(params: ListTimeImportBatchesParams = {}) {
  const { data } = await httpClient.get<ListResponse<TimeImportBatch>>('/api/rh/time-imports', { params });
  return data;
}

export interface TimeImportBatchDetail {
  batch: TimeImportBatch;
  unmatched: TimeImportItem[];
}

/** `GET /api/rh/time-imports/:id` — detalhe com itens e não-casados destacados. */
export async function getTimeImportBatch(id: number) {
  const { data } = await httpClient.get<ItemResponse<TimeImportBatchDetail>>(`/api/rh/time-imports/${id}`);
  return data.data;
}

export interface CreateTimeImportBatchInput {
  competencia_inicio: string;
  competencia_fim: string;
  file: File;
}

export interface CreateTimeImportBatchResult {
  batch: TimeImportBatch;
  items_created?: number;
  matched_count: number;
  unmatched_count: number;
  rejected_count: number;
  unmatched: TimeImportItem[];
  rejected_lines: RejectedTimeImportLine[];
  unknown_record_types: Record<string, number>;
}

/** `POST /api/rh/time-imports` — upload multipart (campo `file`) do arquivo AEJ. */
export async function createTimeImportBatch(input: CreateTimeImportBatchInput) {
  const formData = new FormData();
  formData.append('competencia_inicio', input.competencia_inicio);
  formData.append('competencia_fim', input.competencia_fim);
  formData.append('file', input.file);
  const { data } = await httpClient.post<ItemResponse<CreateTimeImportBatchResult>>('/api/rh/time-imports', formData, {
    headers: { 'Content-Type': undefined },
  });
  return data.data;
}

/** `POST /api/rh/time-imports/:id/confirm` — só a partir de `status='validated'`. */
export async function confirmTimeImportBatch(id: number) {
  const { data } = await httpClient.post<ItemResponse<TimeImportBatch>>(`/api/rh/time-imports/${id}/confirm`, {});
  return data.data;
}

export interface MonthlyAttendanceSummaryItem {
  employee_id: number;
  employee_name: string;
  hours_worked: number;
  overtime_50: number;
  overtime_100: number;
  night_hours: number;
  absences_from_import: number;
  absences_justified: number;
  absence_days_from_hr_absences: number;
}

/** `GET /api/rh/attendance/monthly-summary?competencia=YYYY-MM&employee_id=`. */
export async function getMonthlyAttendanceSummary(params: { competencia: string; employee_id?: number }) {
  const { data } = await httpClient.get<ItemResponse<MonthlyAttendanceSummaryItem[]>>('/api/rh/attendance/monthly-summary', { params });
  return data.data;
}
