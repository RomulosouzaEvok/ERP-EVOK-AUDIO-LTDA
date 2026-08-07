import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * Módulo Jurídico (departamento 16, sigla JUR). Endpoints hospedados sob
 * `/api/legal/*` (`server/src/modules/legal/presentation/routes/legal.ts`).
 * Cobre 4 entidades: Contratos (com upload de instrumento e vencimento
 * próximo), Aditivos Contratuais (com upload), Lembretes de Prazo
 * Contratual e Propriedade Intelectual (com vencimento próximo) — CRUD
 * create/list/get/update (sem delete, mesma decisão de design dos módulos
 * Facilities/Marketing).
 */

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export type ContractType =
  | 'clt_indeterminado' | 'clt_determinado' | 'experiencia' | 'estagio' | 'aprendiz'
  | 'distribuicao' | 'representacao_comercial' | 'fornecimento' | 'prestacao_servicos'
  | 'confidencialidade' | 'licenciamento_marca' | 'outro';

export type ContractStatus = 'draft' | 'signed' | 'active' | 'expired' | 'terminated';

export interface Contract {
  id: number;
  contract_number: string;
  contract_type: ContractType;
  title: string;
  party_a: string;
  party_b: string;
  subject: string | null;
  value: string | number | null;
  start_date: string;
  end_date: string | null;
  auto_renewal: boolean;
  notice_period_days: number | null;
  file_path: string | null;
  status: ContractStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListContractsParams {
  status?: ContractStatus;
  contract_type?: ContractType;
  page?: number;
  limit?: number;
}

export interface CreateContractInput {
  contract_number: string;
  contract_type: ContractType;
  title: string;
  party_a: string;
  party_b: string;
  subject?: string;
  value?: number;
  start_date: string;
  end_date?: string;
  auto_renewal?: boolean;
  notice_period_days?: number;
  status?: ContractStatus;
}

export type UpdateContractInput = Partial<CreateContractInput>;

/** `GET /api/legal/contracts` — listagem paginada, filtros opcionais por `status`/`contract_type`. */
export async function listContracts(params: ListContractsParams = {}) {
  const { data } = await httpClient.get<ListResponse<Contract>>('/api/legal/contracts', { params });
  return data;
}

/** `GET /api/legal/contracts/expiring` — contratos vencendo em até `days` dias (ou já vencidos, ainda ativos). */
export async function listExpiringContracts(days = 30) {
  const { data } = await httpClient.get<ItemResponse<Contract[]>>('/api/legal/contracts/expiring', { params: { days } });
  return data.data;
}

/** `GET /api/legal/contracts/:id` — busca por id. */
export async function getContract(id: number) {
  const { data } = await httpClient.get<ItemResponse<Contract>>(`/api/legal/contracts/${id}`);
  return data.data;
}

/** `POST /api/legal/contracts` — cria um contrato (409 se `contract_number` duplicado). */
export async function createContract(input: CreateContractInput) {
  const { data } = await httpClient.post<ItemResponse<Contract>>('/api/legal/contracts', input);
  return data.data;
}

/** `PUT /api/legal/contracts/:id` — atualiza campos do contrato. */
export async function updateContract(id: number, input: UpdateContractInput) {
  const { data } = await httpClient.put<ItemResponse<Contract>>(`/api/legal/contracts/${id}`, input);
  return data.data;
}

/** `POST /api/legal/contracts/:id/file` — envia/substitui o instrumento (PDF/DOC) do contrato. */
export async function uploadContractFile(id: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  // Content-Type explicitamente indefinido: deixa o navegador computar o
  // boundary do multipart automaticamente (mesmo padrão de `uploadMaterialFile`).
  const { data } = await httpClient.post<ItemResponse<Contract>>(`/api/legal/contracts/${id}/file`, formData, {
    headers: { 'Content-Type': undefined },
  });
  return data.data;
}

// ---------------------------------------------------------------------------
// Aditivos contratuais
// ---------------------------------------------------------------------------

export type AddendumChangeType = 'term' | 'value' | 'clause' | 'party' | 'other';

export interface ContractAddendum {
  id: number;
  contract_id: number;
  addendum_number: number;
  description: string | null;
  change_type: AddendumChangeType;
  new_end_date: string | null;
  new_value: string | number | null;
  file_path: string | null;
  signed_date: string | null;
  createdAt?: string;
}

export interface ListAddendumsParams {
  contract_id?: number;
  page?: number;
  limit?: number;
}

export interface CreateAddendumInput {
  contract_id: number;
  addendum_number: number;
  description?: string;
  change_type: AddendumChangeType;
  new_end_date?: string;
  new_value?: number;
  signed_date?: string;
}

export type UpdateAddendumInput = Partial<Omit<CreateAddendumInput, 'contract_id'>>;

/** `GET /api/legal/contract-addendums` — listagem paginada, filtro opcional por `contract_id`. */
export async function listAddendums(params: ListAddendumsParams = {}) {
  const { data } = await httpClient.get<ListResponse<ContractAddendum>>('/api/legal/contract-addendums', { params });
  return data;
}

/** `POST /api/legal/contract-addendums` — cria um aditivo (404 se `contract_id` inexistente). */
export async function createAddendum(input: CreateAddendumInput) {
  const { data } = await httpClient.post<ItemResponse<ContractAddendum>>('/api/legal/contract-addendums', input);
  return data.data;
}

/** `PUT /api/legal/contract-addendums/:id` — atualiza campos do aditivo. */
export async function updateAddendum(id: number, input: UpdateAddendumInput) {
  const { data } = await httpClient.put<ItemResponse<ContractAddendum>>(`/api/legal/contract-addendums/${id}`, input);
  return data.data;
}

/** `POST /api/legal/contract-addendums/:id/file` — envia/substitui o arquivo do aditivo. */
export async function uploadAddendumFile(id: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await httpClient.post<ItemResponse<ContractAddendum>>(`/api/legal/contract-addendums/${id}/file`, formData, {
    headers: { 'Content-Type': undefined },
  });
  return data.data;
}

// ---------------------------------------------------------------------------
// Lembretes de prazo contratual
// ---------------------------------------------------------------------------

export type ReminderType = 'renewal' | 'expiration' | 'notice' | 'payment';

export interface ContractReminder {
  id: number;
  contract_id: number;
  reminder_type: ReminderType;
  reminder_date: string;
  days_before: number;
  notified: boolean;
  createdAt?: string;
}

export interface ListRemindersParams {
  contract_id?: number;
  page?: number;
  limit?: number;
}

export interface CreateReminderInput {
  contract_id: number;
  reminder_type: ReminderType;
  reminder_date: string;
  days_before?: number;
  notified?: boolean;
}

export type UpdateReminderInput = Partial<Omit<CreateReminderInput, 'contract_id'>>;

/** `GET /api/legal/contract-reminders` — listagem paginada, filtro opcional por `contract_id`. */
export async function listReminders(params: ListRemindersParams = {}) {
  const { data } = await httpClient.get<ListResponse<ContractReminder>>('/api/legal/contract-reminders', { params });
  return data;
}

/** `POST /api/legal/contract-reminders` — cria um lembrete (404 se `contract_id` inexistente). */
export async function createReminder(input: CreateReminderInput) {
  const { data } = await httpClient.post<ItemResponse<ContractReminder>>('/api/legal/contract-reminders', input);
  return data.data;
}

/** `PUT /api/legal/contract-reminders/:id` — atualiza campos do lembrete (ex.: marcar `notified`). */
export async function updateReminder(id: number, input: UpdateReminderInput) {
  const { data } = await httpClient.put<ItemResponse<ContractReminder>>(`/api/legal/contract-reminders/${id}`, input);
  return data.data;
}

// ---------------------------------------------------------------------------
// Propriedade Intelectual
// ---------------------------------------------------------------------------

export type IntellectualPropertyType = 'trademark' | 'patent' | 'industrial_design' | 'copyright' | 'trade_secret';
export type IntellectualPropertyStatus = 'filed' | 'examined' | 'granted' | 'expired' | 'abandoned';

export interface IntellectualProperty {
  id: number;
  ip_type: IntellectualPropertyType;
  title: string;
  description: string | null;
  registration_number: string | null;
  filing_date: string | null;
  grant_date: string | null;
  expiration_date: string | null;
  owner: string;
  status: IntellectualPropertyStatus;
  jurisdiction: string;
  createdAt?: string;
}

export interface ListIntellectualPropertyParams {
  ip_type?: IntellectualPropertyType;
  status?: IntellectualPropertyStatus;
  page?: number;
  limit?: number;
}

export interface CreateIntellectualPropertyInput {
  ip_type: IntellectualPropertyType;
  title: string;
  description?: string;
  registration_number?: string;
  filing_date?: string;
  grant_date?: string;
  expiration_date?: string;
  owner?: string;
  status?: IntellectualPropertyStatus;
  jurisdiction?: string;
}

export type UpdateIntellectualPropertyInput = Partial<CreateIntellectualPropertyInput>;

/** `GET /api/legal/intellectual-property` — listagem paginada, filtros opcionais por `ip_type`/`status`. */
export async function listIntellectualProperty(params: ListIntellectualPropertyParams = {}) {
  const { data } = await httpClient.get<ListResponse<IntellectualProperty>>('/api/legal/intellectual-property', { params });
  return data;
}

/** `GET /api/legal/intellectual-property/expiring` — ativos de PI vencendo em até `days` dias (ou já vencidos). */
export async function listExpiringIntellectualProperty(days = 30) {
  const { data } = await httpClient.get<ItemResponse<IntellectualProperty[]>>('/api/legal/intellectual-property/expiring', { params: { days } });
  return data.data;
}

/** `GET /api/legal/intellectual-property/:id` — busca por id. */
export async function getIntellectualProperty(id: number) {
  const { data } = await httpClient.get<ItemResponse<IntellectualProperty>>(`/api/legal/intellectual-property/${id}`);
  return data.data;
}

/** `POST /api/legal/intellectual-property` — cria um ativo de PI. */
export async function createIntellectualProperty(input: CreateIntellectualPropertyInput) {
  const { data } = await httpClient.post<ItemResponse<IntellectualProperty>>('/api/legal/intellectual-property', input);
  return data.data;
}

/** `PUT /api/legal/intellectual-property/:id` — atualiza campos do ativo de PI. */
export async function updateIntellectualProperty(id: number, input: UpdateIntellectualPropertyInput) {
  const { data } = await httpClient.put<ItemResponse<IntellectualProperty>>(`/api/legal/intellectual-property/${id}`, input);
  return data.data;
}
