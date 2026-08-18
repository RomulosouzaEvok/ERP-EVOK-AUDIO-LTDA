import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/**
 * API do módulo SST (Segurança e Saúde do Trabalho, departamento 15).
 * Endpoints hospedados sob `/api/sst/*`
 * (`server/src/modules/sst/presentation/routes/sst.ts`), contrato completo
 * em `docs/business/BLOCO_1_SST_API.md`.
 *
 * Cobre apenas os endpoints consumidos pelas telas construídas nesta
 * passada (EPI, ASO, Acidente/CAT, fila eSocial, CIPA, Treinamentos) — não
 * os 75 do contrato completo. Ver `docs/governance/HANDOFF_CODEX.md` para o
 * que ficou de fora.
 */

// ---------------------------------------------------------------------------
// EPI (NR-6)
// ---------------------------------------------------------------------------

export interface EpiType {
  id: number;
  nome: string;
  ca_numero: string;
  ca_validade: string;
  fabricante: string | null;
  vida_util_dias: number;
  tamanhos: string[] | null;
  foto_url: string | null;
  item_id: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListEpiTypesParams {
  active?: boolean;
  ca_valido?: boolean;
  item_id?: string;
}

export async function listEpiTypes(params: ListEpiTypesParams = {}) {
  const { data } = await httpClient.get<ListResponse<EpiType>>('/api/sst/epi-types', { params });
  return data;
}

export interface CreateEpiTypeInput {
  nome: string;
  ca_numero: string;
  ca_validade: string;
  fabricante?: string | null;
  vida_util_dias: number;
  tamanhos?: string[];
  foto_url?: string | null;
  item_id?: string | null;
  active?: boolean;
}

export async function createEpiType(input: CreateEpiTypeInput) {
  const { data } = await httpClient.post<ItemResponse<EpiType>>('/api/sst/epi-types', input);
  return data.data;
}

export async function updateEpiType(id: number, input: Partial<CreateEpiTypeInput>) {
  const { data } = await httpClient.put<ItemResponse<EpiType>>(`/api/sst/epi-types/${id}`, input);
  return data.data;
}

export interface EpiMatrixEntry {
  id: number;
  position: string | null;
  department_id: number | null;
  epi_type_id: number;
  epi_type?: Pick<EpiType, 'id' | 'nome' | 'ca_numero'>;
  quantidade_padrao: number;
  observacao: string | null;
}

export interface ListEpiMatrixParams {
  position?: string;
  department_id?: number;
  epi_type_id?: number;
}

export async function listEpiMatrix(params: ListEpiMatrixParams = {}) {
  const { data } = await httpClient.get<ListResponse<EpiMatrixEntry>>('/api/sst/epi-matrix', { params });
  return data;
}

export interface CreateEpiMatrixInput {
  position?: string | null;
  department_id?: number | null;
  epi_type_id: number;
  quantidade_padrao: number;
  observacao?: string | null;
}

export async function createEpiMatrix(input: CreateEpiMatrixInput) {
  const { data } = await httpClient.post<ItemResponse<EpiMatrixEntry>>('/api/sst/epi-matrix', input);
  return data.data;
}

export type EpiDeliveryMotivo = 'primeira_entrega' | 'troca_periodica' | 'dano' | 'perda' | 'mudanca_funcao';
export type EpiDeliveryStatus = 'rascunho' | 'confirmada';
export type EpiEvidenciaTipo = 'assinatura_digitalizada' | 'aceite_eletronico' | 'biometria';

export interface EpiDelivery {
  id: number;
  employee_id: number;
  employee?: { id: number; name: string } | null;
  epi_type_id: number;
  epi_type?: Pick<EpiType, 'id' | 'nome' | 'ca_numero'>;
  quantidade: number;
  motivo: EpiDeliveryMotivo;
  data_entrega: string;
  data_prevista_troca: string;
  status: EpiDeliveryStatus;
  evidencia: { tipo: EpiEvidenciaTipo; arquivo_url: string } | null;
  entregue_por?: number;
  confirmado_em?: string | null;
  confirmado_por?: number | null;
  devolucao?: { data_devolucao: string; condicao: string } | null;
}

export interface ListEpiDeliveriesParams {
  employee_id?: number;
  epi_type_id?: number;
  status?: EpiDeliveryStatus;
  motivo?: EpiDeliveryMotivo;
  vencendo_em_dias?: number;
  page?: number;
  limit?: number;
}

export async function listEpiDeliveries(params: ListEpiDeliveriesParams = {}) {
  const { data } = await httpClient.get<ListResponse<EpiDelivery>>('/api/sst/epi-deliveries', { params });
  return data;
}

export interface CreateEpiDeliveryInput {
  employee_id: number;
  epi_type_id: number;
  quantidade: number;
  motivo: EpiDeliveryMotivo;
  data_entrega: string;
}

/** @throws {AxiosError} 422 `BUSINESS_RULE_VIOLATION` — CA do TipoEPI já vencido na data de entrega. */
export async function createEpiDelivery(input: CreateEpiDeliveryInput) {
  const { data } = await httpClient.post<ItemResponse<EpiDelivery>>('/api/sst/epi-deliveries', input);
  return data.data;
}

export async function attachEpiEvidence(id: number, tipo_evidencia: EpiEvidenciaTipo, arquivo_url: string) {
  const { data } = await httpClient.patch<ItemResponse<EpiDelivery>>(`/api/sst/epi-deliveries/${id}/evidence`, {
    tipo_evidencia,
    arquivo_url,
  });
  return data.data;
}

/**
 * `POST /api/sst/epi-deliveries/:id/confirm` — confirma a entrega (imutável
 * a partir daqui) e dispara baixa de estoque.
 *
 * @throws {AxiosError} 422 `BUSINESS_RULE_VIOLATION` (CA vencido ou sem evidência); 409 `CONFLICT` (estoque insuficiente); 403 (nível `operate` sem `approve`).
 */
export async function confirmEpiDelivery(id: number) {
  const { data } = await httpClient.post<ItemResponse<EpiDelivery>>(`/api/sst/epi-deliveries/${id}/confirm`);
  return data.data;
}

export async function returnEpiDelivery(id: number, data_devolucao: string, condicao: string) {
  const { data } = await httpClient.post<ItemResponse<{ id: number; entrega_epi_id: number }>>(
    `/api/sst/epi-deliveries/${id}/return`,
    { data_devolucao, condicao },
  );
  return data.data;
}

export interface EpiFicha {
  employee_id: number;
  entregas: EpiDelivery[];
  gerado_em: string;
}

export async function getEpiFicha(employeeId: number) {
  const { data } = await httpClient.get<ItemResponse<EpiFicha>>(`/api/sst/epi-deliveries/ficha/${employeeId}`);
  return data.data;
}

export interface EpiPendingReportEntry {
  employee_id: number;
  employee_name?: string;
  position: string | null;
  epi_type_id: number;
  epi_type_nome: string;
}

export async function getEpiPendingReport() {
  const { data } = await httpClient.get<ItemResponse<EpiPendingReportEntry[]>>('/api/sst/epi-deliveries/pending-report');
  return data.data;
}

// ---------------------------------------------------------------------------
// ASO / PCMSO (NR-7)
// ---------------------------------------------------------------------------

export type AsoTipo = 'admissional' | 'periodico' | 'retorno_trabalho' | 'mudanca_riscos' | 'demissional';
export type AsoResultado = 'apto' | 'inapto' | 'apto_com_restricoes';
export type AsoStatus = 'apto' | 'inapto' | 'apto_com_restricoes' | 'pendente';

export interface AsoSummary {
  id: number;
  employee_id: number;
  employee?: { id: number; name: string } | null;
  tipo: AsoTipo;
  data_realizacao: string;
  resultado: AsoResultado;
  data_vencimento: string | null;
}

export interface AsoDetail extends AsoSummary {
  restricoes: string | null;
  medico_examinador: string;
  medico_coordenador_pcmso: string;
  arquivo_url: string | null;
}

export interface ListAsoParams {
  employee_id?: number;
  tipo?: AsoTipo;
  resultado?: AsoResultado;
  vencendo_em_dias?: number;
  page?: number;
  limit?: number;
}

export async function listAso(params: ListAsoParams = {}) {
  const { data } = await httpClient.get<ListResponse<AsoSummary>>('/api/sst/aso', { params });
  return data;
}

export async function getAso(id: number) {
  const { data } = await httpClient.get<ItemResponse<AsoDetail>>(`/api/sst/aso/${id}`);
  return data.data;
}

export interface CreateAsoInput {
  employee_id: number;
  tipo: AsoTipo;
  data_realizacao: string;
  resultado: AsoResultado;
  restricoes?: string | null;
  medico_examinador: string;
  medico_coordenador_pcmso: string;
  arquivo_url?: string | null;
}

/** @throws {AxiosError} 422 `BUSINESS_RULE_VIOLATION` — sem PlanoExames cadastrado para a função/GES do funcionário. */
export async function createAso(input: CreateAsoInput) {
  const { data } = await httpClient.post<ItemResponse<AsoDetail>>('/api/sst/aso', input);
  return data.data;
}

export interface AsoStatusResponse {
  employee_id: number;
  status: AsoStatus;
  tipo_ultimo_aso: AsoTipo | null;
  data_ultimo_aso: string | null;
  vencimento: string | null;
}

/** Rota de exceção `sst`|`rh` (RF-SST-021) — nunca retorna dado clínico. */
export async function getAsoStatus(employeeId: number) {
  const { data } = await httpClient.get<ItemResponse<AsoStatusResponse>>(`/api/sst/aso/status/${employeeId}`);
  return data.data;
}

export interface AsoUpcomingEntry {
  employee_id: number;
  employee_name?: string;
  tipo: AsoTipo;
  data_vencimento: string;
  dias_restantes: number;
}

export async function listAsoUpcoming() {
  const { data } = await httpClient.get<ItemResponse<AsoUpcomingEntry[]>>('/api/sst/aso/upcoming');
  return data.data;
}

// ---------------------------------------------------------------------------
// Acidente e CAT (Lei 8.213/91)
// ---------------------------------------------------------------------------

export type AccidentTipo = 'tipico' | 'trajeto' | 'doenca_ocupacional';
export type AccidentGravidade = 'sem_afastamento' | 'com_afastamento' | 'incapacidade_permanente' | 'obito';
export type AccidentStatus = 'aberto' | 'encerrado';

export interface Accident {
  id: number;
  employee_id: number;
  employee?: { id: number; name: string } | null;
  data_hora: string;
  tipo: AccidentTipo;
  local_setor: string;
  descricao: string;
  parte_corpo: string;
  agente_causador: string;
  gravidade: AccidentGravidade;
  dias_perdidos: number;
  testemunhas: number[];
  status: AccidentStatus;
  prazo_limite_cat?: string | null;
  has_investigation?: boolean;
  has_cat?: boolean;
}

export interface ListAccidentsParams {
  employee_id?: number;
  tipo?: AccidentTipo;
  gravidade?: AccidentGravidade;
  status?: AccidentStatus;
  com_cat?: boolean;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export async function listAccidents(params: ListAccidentsParams = {}) {
  const { data } = await httpClient.get<ListResponse<Accident>>('/api/sst/accidents', { params });
  return data;
}

export async function getAccident(id: number) {
  const { data } = await httpClient.get<ItemResponse<Accident>>(`/api/sst/accidents/${id}`);
  return data.data;
}

export interface CreateAccidentInput {
  employee_id: number;
  data_hora: string;
  tipo: AccidentTipo;
  local_setor: string;
  descricao: string;
  parte_corpo: string;
  agente_causador: string;
  gravidade: AccidentGravidade;
  dias_perdidos?: number;
  testemunhas?: number[];
}

export async function createAccident(input: CreateAccidentInput) {
  const { data } = await httpClient.post<ItemResponse<Accident>>('/api/sst/accidents', input);
  return data.data;
}

export async function createAccidentComplement(id: number, campo: string, valor: string | number, motivo: string) {
  const { data } = await httpClient.post<ItemResponse<Accident>>(`/api/sst/accidents/${id}/complements`, {
    campo,
    valor,
    motivo,
  });
  return data.data;
}

/** @throws {AxiosError} 422 `BUSINESS_RULE_VIOLATION` — acidente com afastamento sem investigação/ação corretiva. */
export async function closeAccident(id: number) {
  const { data } = await httpClient.post<ItemResponse<Accident>>(`/api/sst/accidents/${id}/close`);
  return data.data;
}

export type CatTipo = 'inicial' | 'obito' | 'reabertura';

export interface Cat {
  id: number;
  accident_id: number;
  tipo: CatTipo;
  prazo_limite: string;
  status: 'pendente_transmissao' | 'transmitida';
  esocial_event_id?: number;
  createdAt?: string;
}

/** @throws {AxiosError} 422 `BUSINESS_RULE_VIOLATION` — tentativa de emitir 2ª CAT inicial (usar reopen). */
export async function emitCat(accidentId: number) {
  const { data } = await httpClient.post<ItemResponse<{ cat: Cat; esocial_event_id?: number }>>(
    `/api/sst/accidents/${accidentId}/cat`,
  );
  return data.data;
}

export async function listCats(accidentId: number) {
  const { data } = await httpClient.get<ItemResponse<Cat[]>>(`/api/sst/accidents/${accidentId}/cat`);
  return data.data;
}

export async function reopenCat(catId: number) {
  const { data } = await httpClient.post<ItemResponse<Cat>>(`/api/sst/cat/${catId}/reopen`);
  return data.data;
}

export interface CreateInvestigationInput {
  participantes: number[];
  causas: string[];
  evidencias?: string[];
  acoes_corretivas?: Array<{ descricao: string; responsavel_id: number; prazo: string }>;
}

export async function createInvestigation(accidentId: number, input: CreateInvestigationInput) {
  const { data } = await httpClient.post<ItemResponse<{ id: number }>>(
    `/api/sst/accidents/${accidentId}/investigation`,
    input,
  );
  return data.data;
}

export async function getInvestigation(accidentId: number) {
  const { data } = await httpClient.get<ItemResponse<CreateInvestigationInput & { id: number }>>(
    `/api/sst/accidents/${accidentId}/investigation`,
  );
  return data.data;
}

// ---------------------------------------------------------------------------
// Fila de eventos eSocial SST (S-2210/S-2220/S-2240)
// ---------------------------------------------------------------------------

export type EsocialEventTipo = 'S-2210' | 'S-2220' | 'S-2240';
export type EsocialEventStatus = 'pendente' | 'enviado' | 'aceito' | 'rejeitado';

export interface EsocialEvent {
  id: number;
  tipo: EsocialEventTipo;
  entidade_origem: { tipo: string; id: number };
  prazo_legal: string | null;
  status: EsocialEventStatus;
  recibo: string | null;
  data_envio: string | null;
  tentativas: number;
}

export interface ListEsocialEventsParams {
  tipo?: EsocialEventTipo;
  status?: EsocialEventStatus;
  vencido?: boolean;
}

export async function listEsocialEvents(params: ListEsocialEventsParams = {}) {
  const { data } = await httpClient.get<ItemResponse<EsocialEvent[]>>('/api/sst/esocial-events', { params });
  return data.data;
}

/** @throws {AxiosError} 400 — evento não está `rejeitado`; 403 — nível `operate` sem `approve`. */
export async function resendEsocialEvent(id: number) {
  const { data } = await httpClient.post<ItemResponse<EsocialEvent>>(`/api/sst/esocial-events/${id}/resend`);
  return data.data;
}

// ---------------------------------------------------------------------------
// CIPA (NR-5, CF/88)
// ---------------------------------------------------------------------------

export interface CipaDimensioning {
  headcount_ativo: number;
  titulares: number;
  suplentes: number;
  enquadramento_cnae?: string;
}

export async function getCipaDimensioning() {
  const { data } = await httpClient.get<ItemResponse<CipaDimensioning>>('/api/sst/cipa/dimensioning');
  return data.data;
}

export type CipaPapel = 'presidente' | 'vice_presidente' | 'secretario' | 'titular' | 'suplente';
export type CipaOrigem = 'eleito' | 'designado';

export interface CipaMandate {
  id: number;
  data_inicio: string;
  data_fim: string;
  members?: CipaMember[];
}

export interface CipaMember {
  id: number;
  employee_id: number;
  employee?: { id: number; name: string } | null;
  origem: CipaOrigem;
  papel: CipaPapel;
  votos_recebidos: number | null;
  fim_estabilidade: string | null;
  posse_registrada?: boolean;
}

export async function listCipaMandates() {
  const { data } = await httpClient.get<ItemResponse<CipaMandate[]>>('/api/sst/cipa/mandates');
  return data.data;
}

export async function getCipaMandate(id: number) {
  const { data } = await httpClient.get<ItemResponse<CipaMandate>>(`/api/sst/cipa/mandates/${id}`);
  return data.data;
}

export async function listCipaMeetings(params: { mandate_id?: number; tipo?: string; mes?: string } = {}) {
  const { data } = await httpClient.get<ItemResponse<CipaMeeting[]>>('/api/sst/cipa/meetings', { params });
  return data.data;
}

export interface CipaMeeting {
  id: number;
  mandate_id: number;
  tipo: 'ordinaria' | 'extraordinaria';
  data: string;
  ata_texto: string | null;
  ata_arquivo_url: string | null;
}

export async function createCipaMeeting(input: {
  mandate_id: number;
  tipo: 'ordinaria' | 'extraordinaria';
  data: string;
  ata_texto?: string;
  ata_arquivo_url?: string;
}) {
  const { data } = await httpClient.post<ItemResponse<CipaMeeting>>('/api/sst/cipa/meetings', input);
  return data.data;
}

export interface CipaStability {
  employee_id: number;
  estavel: boolean;
  fim_estabilidade: string | null;
  papel: CipaPapel | null;
  mandato_id: number | null;
}

export async function getCipaStability(employeeId: number) {
  const { data } = await httpClient.get<ItemResponse<CipaStability>>(`/api/sst/cipa/stability/${employeeId}`);
  return data.data;
}

// ---------------------------------------------------------------------------
// Treinamentos de Segurança (NRs)
// ---------------------------------------------------------------------------

export type TrainingNorma =
  | 'NR-6'
  | 'NR-10'
  | 'NR-11'
  | 'NR-12'
  | 'NR-17'
  | 'NR-20'
  | 'NR-23_brigada'
  | 'primeiros_socorros'
  | 'CIPA'
  | 'DDS_tema'
  | 'outro';

export interface Training {
  id: number;
  employee_id: number;
  employee?: { id: number; name: string } | null;
  norma: TrainingNorma;
  data: string;
  carga_horaria: number;
  instrutor_entidade: string;
  certificado_url: string | null;
  identificacao_operador: string | null;
  validade: string | null;
}

export interface ListTrainingsParams {
  employee_id?: number;
  norma?: TrainingNorma;
  vencido?: boolean;
  page?: number;
  limit?: number;
}

export async function listTrainings(params: ListTrainingsParams = {}) {
  const { data } = await httpClient.get<ListResponse<Training>>('/api/sst/trainings', { params });
  return data;
}

export interface CreateTrainingInput {
  employee_id: number;
  norma: TrainingNorma;
  data: string;
  carga_horaria: number;
  instrutor_entidade: string;
  certificado_url?: string;
  identificacao_operador?: string;
}

export async function createTraining(input: CreateTrainingInput) {
  const { data } = await httpClient.post<ItemResponse<Training>>('/api/sst/trainings', input);
  return data.data;
}

export interface TrainingBlocklistEntry {
  employee_id: number;
  position: string | null;
  norma: TrainingNorma;
  validade_vencida_em: string;
}

export async function getTrainingBlocklist() {
  const { data } = await httpClient.get<ItemResponse<TrainingBlocklistEntry[]>>('/api/sst/trainings/blocklist');
  return data.data;
}
